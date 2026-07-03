// server/controllers/oauthController.ts

import { Request, Response } from 'express';
import { buildGoogleAuthUrl, handleGoogleOAuthCallback, fullSyncGoogleCalendar } from '../services/googleCalendarSync';
import { registerGoogleWatchChannel } from '../services/googleCalendarWebhook';

export function redirectToGoogleConsent(req: Request, res: Response): void {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: 'userId es requerido' });
    return;
  }
  res.redirect(buildGoogleAuthUrl(userId));
}

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string;
  const userId = req.query.state as string; // el userId viaja en `state`, ver buildGoogleAuthUrl

  if (!code || !userId) {
    res.status(400).json({ error: 'Faltan parámetros code/state en el callback de Google.' });
    return;
  }

  try {
    await handleGoogleOAuthCallback(code, userId);
    // Tras conectar por primera vez: traer el calendario completo y
    // suscribirse a cambios futuros. Se hace en este orden porque el watch
    // channel no reemplaza el full sync inicial -- solo notifica cambios
    // A PARTIR de que se registra.
    await fullSyncGoogleCalendar(userId);
    await registerGoogleWatchChannel(userId);

    res.status(200).json({ status: 'connected' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[oauthController] Error en callback de Google:', err);
    res.status(502).json({ error: 'No se pudo completar la conexión con Google Calendar.' });
  }
}
