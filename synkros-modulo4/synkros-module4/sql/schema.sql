-- sql/schema.sql
--
-- Esquema de persistencia de SYNKROS. Diseñado para Supabase (Postgres +
-- Row Level Security), pero corre en cualquier Postgres ≥13 quitando las
-- secciones marcadas "Supabase-specific".
--
-- Decisiones clave documentadas inline con comentarios -- porque un schema
-- sin justificación es tan riesgoso como código sin comentarios.

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ─────────────────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────────────────
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  full_name     text,
  timezone      text not null default 'America/Lima',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column users.timezone is
  'IANA timezone (ej. America/Lima). El Core Engine (Módulo 3) y el motor
   conversacional (Módulo 2) dependen de esto para interpretar "la tarde",
   "mañana temprano", etc. correctamente.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. AUTH_TOKENS — credenciales OAuth cifradas
-- ─────────────────────────────────────────────────────────────────────────
-- Regla no negociable: NUNCA se guarda un access/refresh token en texto
-- plano. Se cifra con AES-256-GCM antes de llegar a esta tabla (ver
-- server/crypto/tokenEncryption.ts) — la base de datos solo ve ciphertext.
-- Si la DB se filtra, los tokens siguen siendo inútiles sin la clave de
-- cifrado (que vive fuera de la DB, en el secret manager del backend).

create table auth_tokens (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id) on delete cascade,
  provider                text not null check (provider in ('google', 'outlook', 'apple')),

  encrypted_access_token  text not null,
  encrypted_refresh_token text,           -- null si el provider no emite refresh token
  encryption_iv           text not null,  -- IV de AES-GCM del access token
  encryption_tag          text not null,  -- tag de autenticación del access token
  refresh_encryption_iv   text,           -- IV propio del refresh token -- NUNCA reusar el IV del access token
  refresh_encryption_tag  text,

  scope                   text,           -- scopes concedidos, para auditoría
  expires_at              timestamptz,    -- vencimiento del access_token (no del refresh)

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Un usuario tiene como máximo una fila de credenciales por proveedor.
  -- Reautenticar hace UPSERT sobre esta fila, no inserta una nueva.
  unique (user_id, provider)
);

create index idx_auth_tokens_user_provider on auth_tokens(user_id, provider);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. CALENDAR_EVENTS
-- ─────────────────────────────────────────────────────────────────────────
create table calendar_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,

  -- Origen del evento. 'synkros' = creado nativamente en la app (por voz,
  -- vía Módulo 2). Los demás vienen de una sincronización externa.
  provider          text not null check (provider in ('synkros', 'google', 'outlook', 'apple')),
  -- id del evento en el sistema externo. NULL para eventos nativos.
  -- Es lo que permite hacer upsert idempotente en cada sync sin duplicar.
  external_event_id text,

  title             text not null,
  start_time        timestamptz not null,
  end_time          timestamptz not null,

  -- El campo que separa el mundo del Módulo 3: FIXED nunca se mueve,
  -- FLEXIBLE sí, BUFFER es generado por el propio Core Engine.
  type              text not null check (type in ('FIXED', 'FLEXIBLE', 'BUFFER')) default 'FLEXIBLE',
  cognitive_load    text check (cognitive_load in ('high', 'low')),
  is_buffer_block   boolean not null default false,

  -- Coordenadas del destino, usadas por el Módulo 4 para geofencing /
  -- predicción de tardanza. Nulas para tareas sin ubicación física
  -- (ej. "trabajo profundo" en casa).
  location_lat      double precision,
  location_lng      double precision,
  location_label    text,

  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint chk_time_order check (end_time > start_time),

  -- Evita duplicados al re-sincronizar el mismo evento externo dos veces.
  -- Para eventos nativos (external_event_id IS NULL) esta constraint no
  -- aplica -- Postgres trata múltiples NULL como no-iguales en UNIQUE.
  unique (user_id, provider, external_event_id)
);

create index idx_calendar_events_user_start on calendar_events(user_id, start_time);
create index idx_calendar_events_type on calendar_events(user_id, type);

comment on constraint chk_time_order on calendar_events is
  'Defensa a nivel de base de datos: ni un bug del Core Engine ni una
   sincronización corrupta pueden dejar un evento con end_time <= start_time.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. CALENDAR_WATCH_CHANNELS — canales de Google Calendar Watch API
-- ─────────────────────────────────────────────────────────────────────────
-- Los "watch channels" de Google expiran (máximo ~7 días en Calendar API) y
-- deben renovarse antes de vencer, o el webhook deja de recibir eventos en
-- silencio. Esta tabla es lo que permite que un cron job sepa a quién
-- renovarle el canal antes de que caduque.

create table calendar_watch_channels (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  provider      text not null check (provider in ('google', 'outlook')),

  channel_id    text not null unique,  -- UUID que generamos nosotros al registrar el canal
  resource_id   text not null,         -- id que devuelve Google, necesario para des-suscribirse
  sync_token    text,                  -- token de sincronización incremental (se actualiza en cada pull)

  expiration    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_watch_channels_expiration on calendar_watch_channels(expiration);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. LOCATION_PINGS (opcional) — histórico corto de ubicaciones pasivas
-- ─────────────────────────────────────────────────────────────────────────
-- No es estrictamente necesaria para que el geofencing funcione (la
-- predicción de tardanza puede calcularse "en caliente" con el último
-- ping), pero se incluye porque sin un registro mínimo es imposible
-- depurar "por qué SYNKROS no detectó que iba tarde" cuando un usuario
-- reporte un bug. Se recomienda purgar filas de más de 24h con un cron.

create table location_pings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  latitude      double precision not null,
  longitude     double precision not null,
  speed_kmh     double precision,
  recorded_at   timestamptz not null default now()
);

create index idx_location_pings_user_time on location_pings(user_id, recorded_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security (Supabase-specific)
-- ─────────────────────────────────────────────────────────────────────────
-- Sin estas políticas, cualquier fila es accesible vía la API pública de
-- Supabase para cualquier usuario autenticado. Con RLS activado, cada quien
-- solo puede leer/escribir sus propias filas -- el filtro user_id = auth.uid()
-- se aplica a nivel de base de datos, no confiando en que el backend nunca
-- se olvide de filtrar en una query.

alter table users enable row level security;
alter table auth_tokens enable row level security;
alter table calendar_events enable row level security;
alter table calendar_watch_channels enable row level security;
alter table location_pings enable row level security;

create policy "users_select_own" on users
  for select using (id = auth.uid());

create policy "auth_tokens_owner_only" on auth_tokens
  for all using (user_id = auth.uid());

create policy "calendar_events_owner_only" on calendar_events
  for all using (user_id = auth.uid());

create policy "calendar_watch_channels_owner_only" on calendar_watch_channels
  for all using (user_id = auth.uid());

create policy "location_pings_owner_only" on location_pings
  for all using (user_id = auth.uid());

-- Nota: las operaciones de sincronización del backend (webhooks, cron de
-- renovación) corren con la service_role key de Supabase, que hace bypass
-- de RLS por diseño -- estas políticas protegen el acceso directo desde el
-- cliente móvil, no las operaciones de servidor a servidor.
