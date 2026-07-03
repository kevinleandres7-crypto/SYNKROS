// server/controllers/webhookController.ts

import { Request, Response } from 'express';
import { handleGoogleWebhookNotification } from '../services/googleCalendarWebhook';

export async function handleGoogleCalendarWebhook(req: Request, res: Response): Promise<void> {
  // Google exige una respuesta 200 rápida (< unos pocos segundos) o
  // reintenta con backoff y eventualmente da por muerto el canal. Por eso
  // se responde 200 de inmediato y la sincronización real corre después --
  // nunca se debe hacer `await` del sync antes de responder.
  res.status(200).end();

  const channelId = req.header('X-Goog-Channel-ID');
  const resourceState = req.header('X-Goog-Resource-State');

  try {
    await handleGoogleWebhookNotification({ channelId, resourceState });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webhookController] Error procesando notificación de Google:', err);
    // No hay nada más que hacer acá -- ya respondimos 200. Si el sync falla,
    // el próximo webhook (o el cron de reconciliación) lo reintentará.
  }
}
