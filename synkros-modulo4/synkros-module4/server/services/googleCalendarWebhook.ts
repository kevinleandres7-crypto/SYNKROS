// server/services/googleCalendarWebhook.ts
//
// Cómo funciona realmente el Watch API de Google (esto sorprende a quien lo
// implementa por primera vez): el webhook NO manda el evento que cambió.
// Manda un ping vacío que dice "algo cambió en este calendario, ve a
// buscarlo tú mismo". Por eso `handleGoogleWebhookNotification` no lee body
// alguno -- solo lee headers, identifica de qué usuario/canal se trata, y
// dispara un incrementalSync que sí trae el diff real usando el syncToken.

import crypto from 'crypto';
import { google } from 'googleapis';
import { createGoogleOAuthClient } from '../config/googleOAuthClient';
import { getAuthTokens } from '../db/authTokensRepository';
import { query } from '../db/client';
import { incrementalSyncGoogleCalendar } from './googleCalendarSync';

const WATCH_CHANNEL_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 días (el máximo de Google es 7)

export async function registerGoogleWatchChannel(userId: string): Promise<void> {
  const stored = await getAuthTokens(userId, 'google');
  if (!stored) throw new Error(`Usuario ${userId} no tiene Google Calendar conectado.`);

  const client = createGoogleOAuthClient();
  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken ?? undefined,
  });
  const calendar = google.calendar({ version: 'v3', auth: client });

  const channelId = crypto.randomUUID();
  const expiration = Date.now() + WATCH_CHANNEL_TTL_MS;

  const response = await calendar.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: process.env.GOOGLE_WEBHOOK_URL, // ej. https://api.synkros.app/webhooks/google-calendar
      expiration: String(expiration),
    },
  });

  await query(
    `insert into calendar_watch_channels (user_id, provider, channel_id, resource_id, expiration)
     values ($1, 'google', $2, $3, $4)
     on conflict (channel_id) do nothing`,
    [userId, channelId, response.data.resourceId, new Date(expiration)]
  );
}

/**
 * Handler del endpoint que recibe los pings de Google. Google identifica el
 * canal vía headers, no vía body -- el body de estas notificaciones va vacío.
 */
export interface GoogleWebhookHeaders {
  channelId: string | undefined; // X-Goog-Channel-ID
  resourceState: string | undefined; // X-Goog-Resource-State: 'sync' | 'exists' | 'not_exists'
}

export async function handleGoogleWebhookNotification(headers: GoogleWebhookHeaders): Promise<void> {
  const { channelId, resourceState } = headers;

  if (!channelId) return; // request malformado o no viene de Google -- se ignora, no se falla ruidosamente

  // 'sync' es el ping inicial que Google manda al crear el canal, solo para
  // confirmar que el webhook responde 200 -- no representa un cambio real.
  if (resourceState === 'sync') return;

  const rows = await query<{ user_id: string }>(
    `select user_id from calendar_watch_channels where channel_id = $1`,
    [channelId]
  );
  const userId = rows[0]?.user_id;
  if (!userId) return; // canal desconocido/expirado -- nada que sincronizar

  await incrementalSyncGoogleCalendar(userId);
}

/**
 * Cron diario: renueva cualquier canal que expire en menos de 24h. Los
 * canales de Google Calendar Watch NUNCA se renuevan solos -- si esto no
 * corre, el webhook deja de recibir notificaciones sin ningún error visible,
 * y el usuario simplemente deja de ver sus reuniones nuevas sincronizadas.
 */
export async function renewExpiringWatchChannels(): Promise<{ renewed: number }> {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiring = await query<{ user_id: string }>(
    `select distinct user_id from calendar_watch_channels
     where provider = 'google' and expiration < $1`,
    [soon]
  );

  let renewed = 0;
  for (const row of expiring) {
    await registerGoogleWatchChannel(row.user_id);
    renewed++;
  }
  return { renewed };
}
