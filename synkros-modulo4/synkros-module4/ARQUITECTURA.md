# SYNKROS — Módulo 4: Capa de Integración y Sensores

## 1. Modelo de datos — decisiones clave

- **`auth_tokens` cifra access y refresh token con IVs independientes.**
  Una primera versión de este esquema compartía el IV entre ambos tokens
  para ahorrar dos columnas — es un anti-patrón real de AES-GCM (nonce
  reuse rompe la garantía de autenticación del modo GCM). Se corrigió antes
  de esta entrega: cada token tiene su propio par `encryption_iv` /
  `encryption_tag`. Ver `server/db/authTokensRepository.ts`.
- **`calendar_events` distingue `provider` de `type`.** `provider` dice de
  dónde vino el evento (google/outlook/synkros); `type` dice si el Módulo 3
  lo puede mover (FIXED/FLEXIBLE/BUFFER). Son ejes independientes a
  propósito: un evento importado de Google es FIXED por defecto (ver
  sección 3), pero nada impide que el usuario lo reclasifique como FLEXIBLE
  desde la app sin que eso afecte su `provider`.
- **`unique(user_id, provider, external_event_id)`** es lo que hace que
  sincronizar el mismo calendario 100 veces nunca duplique filas — cada
  sync hace `INSERT ... ON CONFLICT DO UPDATE`.
- **`calendar_watch_channels` es su propia tabla**, no una columna en
  `users`, porque un usuario podría eventualmente tener canales activos de
  Google Y Outlook simultáneamente, cada uno con su propio ciclo de vida de
  expiración/renovación.

## 2. Flujo OAuth + sincronización con Google Calendar

```
Usuario presiona "Conectar Google Calendar"
      │
      ▼
GET /auth/google?userId=...          (oauthController.redirectToGoogleConsent)
      │  redirige a Google con state=userId
      ▼
Usuario acepta en la pantalla de consentimiento de Google
      │
      ▼
GET /auth/google/callback?code=...&state=userId
      │  1. intercambia code por tokens (access + refresh)
      │  2. cifra y guarda en auth_tokens (IVs independientes)
      │  3. fullSyncGoogleCalendar()   -- trae los próximos 30 días
      │  4. registerGoogleWatchChannel() -- se suscribe a cambios futuros
      ▼
Calendario del usuario ya está en calendar_events (provider='google', type='FIXED')
```

**Por qué el 'watch' no reemplaza el full sync inicial:** Google Calendar
Watch API solo notifica cambios *a partir* del momento en que se registra el
canal. Sin el full sync inicial, SYNKROS nunca vería nada de lo que ya
existía en el calendario del usuario antes de conectar la cuenta.

**Cómo funciona el webhook en la práctica** (esto sorprende a quien lo
implementa por primera vez): Google **no manda el evento que cambió** en el
body del webhook. Manda un ping vacío con headers (`X-Goog-Channel-ID`,
`X-Goog-Resource-State`) que dice "algo cambió, ve a buscarlo". El handler
responde `200` de inmediato (Google exige respuesta rápida o reintenta con
backoff) y solo después dispara `incrementalSyncGoogleCalendar`, que trae el
diff real usando el `syncToken` guardado.

**Manejo de `syncToken` expirado:** Google devuelve HTTP 410 si el token es
demasiado viejo. La única recuperación es descartarlo y rehacer un full
sync — está manejado explícitamente en el `catch` de
`incrementalSyncGoogleCalendar`, no como un error genérico que tumba el sync.

**Renovación de canales:** los watch channels de Google expiran en máximo 7
días. `renewExpiringWatchChannels()` está pensado para correr como cron
diario — renueva cualquier canal que expire en menos de 24h. Si esto no
corre, el fallo es silencioso: no hay ningún error visible, el usuario
simplemente deja de ver sincronizados los eventos que crea fuera de SYNKROS.

## 3. Por qué los eventos importados son FIXED por defecto

Decisión de producto, no un descuido: un evento que el usuario creó *fuera*
de SYNKROS representa un compromiso con otra persona o sistema (una
reunión, un vuelo, una cita médica). Dejar que el Core Engine (Módulo 3) lo
mueva automáticamente sin que el usuario lo pida explícitamente sería
peligroso — SYNKROS terminaría reprogramando compromisos que el usuario ni
sabía que la app podía tocar. El usuario puede reclasificar un evento
importado como FLEXIBLE a mano desde el Flujo Líquido si de verdad es
negociable.

## 4. Geofencing — por qué "cambio significativo", no tracking continuo

`startLocationUpdatesAsync` usa `distanceInterval: 300` (metros) en vez de
un intervalo de tiempo fijo. Dos razones:
1. **Batería.** Un usuario quieto en su escritorio no necesita que el GPS
   se consulte cada 10 segundos solo para confirmar que sigue en el mismo
   sitio.
2. **Relevancia.** Lo único que le importa a la predicción de tardanza es
   si el usuario se movió lo suficiente como para que el ETA cambie — no
   cada micro-movimiento.

## 5. Por qué `predictDelay` devuelve `null` en vez de adivinar

Con velocidad por debajo de `MIN_RELIABLE_SPEED_KMH` (3 km/h — un usuario
detenido en un semáforo o en tráfico parado), dividir distancia entre
velocidad produce ETAs absurdos (horas para recorrer 500 metros). El diseño
prioriza no generar una alerta de pánico falsa ("¡vas a llegar 3 horas
tarde!") sobre dar siempre una respuesta. Es coherente con el principio
"Anti-Ansiedad" del Módulo 1: una predicción falsa genera más ansiedad que
ninguna predicción.

## 6. Cómo correr esto

```bash
npm install
# Backend
cp .env.example .env   # completar GOOGLE_CLIENT_ID/SECRET, DATABASE_URL, ENCRYPTION_KEY
psql $DATABASE_URL -f sql/schema.sql
npm test               # corre 9 tests: cifrado (round-trip + no reuso de IV) + predicción de tardanza
```

La parte de `mobile/services/geofencingTask.ts` está escrita para vivir
dentro del mismo proyecto Expo del Módulo 1 (usa `expo-location` y
`expo-task-manager`, ya presentes ahí). `mobile/services/delayPrediction.ts`
es lógica pura sin dependencias de React Native — por eso se pudo testear
de forma aislada sin simular un dispositivo.
