// server/services/googleCalendarSync.ts
//
// Responsable de: (1) el flujo OAuth completo, (2) leer los eventos base del
// usuario la primera vez (full sync), (3) traer solo lo que cambió en syncs
// posteriores (incremental sync vía syncToken -- evita traer todo el
// calendario cada vez que hay un webhook).

import { google, calendar_v3 } from 'googleapis';
import { createGoogleOAuthClient, GOOGLE_CALENDAR_SCOPES } from '../config/googleOAuthClient';
import { upsertAuthTokens, getAuthTokens } from '../db/authTokensRepository';
import { upsertCalendarEvent } from '../db/calendarEventsRepository';
import { query } from '../db/client';

// ─────────────────────────────────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────────────────────────────────

export function buildGoogleAuthUrl(userId: string): string {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // imprescindible: sin esto Google no emite refresh_token
    prompt: 'consent', // fuerza a reemitir refresh_token aunque el usuario ya haya autorizado antes
    scope: GOOGLE_CALENDAR_SCOPES,
    state: userId, // vincula el callback a nuestro propio userId, no al de Google
  });
}

export async function handleGoogleOAuthCallback(code: string, userId: string): Promise<void> {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Google no devolvió un access_token en el intercambio de código.');
  }

  await upsertAuthTokens(userId, 'google', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope ?? null,
  });
}

/**
 * Reconstruye un cliente OAuth2 autorizado para un usuario, con refresco
 * automático de token. `googleapis` refresca solo cuando detecta que el
 * access_token expiró, usando el refresh_token guardado -- pero cuando eso
 * pasa, el nuevo access_token vive solo en memoria hasta que lo persistimos
 * de vuelta explícitamente (por eso el listener 'tokens' abajo).
 */
async function getAuthorizedClient(userId: string) {
  const stored = await getAuthTokens(userId, 'google');
  if (!stored) {
    throw new Error(`Usuario ${userId} no tiene Google Calendar conectado.`);
  }

  const client = createGoogleOAuthClient();
  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken ?? undefined,
    expiry_date: stored.expiresAt?.getTime(),
  });

  client.on('tokens', (newTokens) => {
    // Si Google rotó el access_token (y a veces el refresh_token) durante
    // esta sesión, lo persistimos de inmediato -- de lo contrario, la
    // próxima ejecución (ej. el próximo webhook) fallaría con un token viejo.
    if (newTokens.access_token) {
      void upsertAuthTokens(userId, 'google', {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token ?? null,
        expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        scope: newTokens.scope ?? null,
      });
    }
  });

  return client;
}

// ─────────────────────────────────────────────────────────────────────────
// Mapeo Google Event → modelo interno de SYNKROS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Heurística de clasificación FIXED/FLEXIBLE para eventos importados.
 * Por defecto, TODO evento que viene de un calendario externo se marca
 * FIXED. Es una decisión de producto deliberada, no un descuido: un evento
 * que el usuario creó fuera de SYNKROS (una reunión, un vuelo, una cita
 * médica) representa un compromiso con otra persona o sistema -- mover eso
 * automáticamente sin que el usuario lo pida explícitamente sería peligroso.
 * El usuario puede reclasificar un evento importado como FLEXIBLE a mano
 * desde el Flujo Líquido (Módulo 1) si de verdad es negociable.
 */
function mapGoogleEventToInternal(userId: string, event: calendar_v3.Schema$Event) {
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) return null;

  return {
    userId,
    provider: 'google' as const,
    externalEventId: event.id,
    title: event.summary ?? '(sin título)',
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end.dateTime),
    type: 'FIXED' as const,
    locationLat: null, // Google Calendar da `location` como texto libre, no lat/lng --
    locationLng: null, // requeriría geocodificarlo aparte; se deja para una iteración futura.
    locationLabel: event.location ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sync
// ─────────────────────────────────────────────────────────────────────────

const SYNC_HORIZON_DAYS = 30; // no tiene sentido traer eventos de dentro de 2 años

export async function fullSyncGoogleCalendar(userId: string): Promise<{ imported: number }> {
  const auth = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + SYNC_HORIZON_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let pageToken: string | undefined;
  let imported = 0;
  let nextSyncToken: string | undefined;

  do {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true, // expande eventos recurrentes a instancias individuales
      orderBy: 'startTime',
      pageToken,
    });

    for (const event of response.data.items ?? []) {
      const mapped = mapGoogleEventToInternal(userId, event);
      if (mapped) {
        await upsertCalendarEvent(mapped);
        imported++;
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
    nextSyncToken = response.data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  if (nextSyncToken) {
    await query(
      `update calendar_watch_channels set sync_token = $1, updated_at = now()
       where user_id = $2 and provider = 'google'`,
      [nextSyncToken, userId]
    );
  }

  return { imported };
}

export async function incrementalSyncGoogleCalendar(userId: string): Promise<{ imported: number }> {
  const rows = await query<{ sync_token: string | null }>(
    `select sync_token from calendar_watch_channels where user_id = $1 and provider = 'google'`,
    [userId]
  );
  const syncToken = rows[0]?.sync_token;

  if (!syncToken) {
    // Nunca hubo un sync previo (o el canal se recreó) -- no hay de otra
    // más que empezar de cero con un full sync.
    return fullSyncGoogleCalendar(userId);
  }

  const auth = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      syncToken,
    });

    let imported = 0;
    for (const event of response.data.items ?? []) {
      const mapped = mapGoogleEventToInternal(userId, event);
      if (mapped) {
        await upsertCalendarEvent(mapped);
        imported++;
      }
    }

    if (response.data.nextSyncToken) {
      await query(
        `update calendar_watch_channels set sync_token = $1, updated_at = now()
         where user_id = $2 and provider = 'google'`,
        [response.data.nextSyncToken, userId]
      );
    }

    return { imported };
  } catch (err: any) {
    // Google invalida el syncToken (HTTP 410 Gone) si pasó demasiado tiempo
    // o el usuario revocó/re-otorgó permisos. La única recuperación posible
    // es descartar el token y rehacer un full sync desde cero.
    if (err?.code === 410) {
      return fullSyncGoogleCalendar(userId);
    }
    throw err;
  }
}
