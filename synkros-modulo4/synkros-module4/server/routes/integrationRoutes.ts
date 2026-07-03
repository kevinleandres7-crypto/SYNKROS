// server/routes/integrationRoutes.ts

import { Router, raw } from 'express';
import { redirectToGoogleConsent, handleGoogleCallback } from '../controllers/oauthController';
import { handleGoogleCalendarWebhook } from '../controllers/webhookController';

export const integrationRouter = Router();

integrationRouter.get('/auth/google', redirectToGoogleConsent);
integrationRouter.get('/auth/google/callback', handleGoogleCallback);

// Google no manda un body significativo, pero se acepta raw por si acaso --
// nunca se debe parsear como JSON un webhook cuyo body puede venir vacío.
integrationRouter.post('/webhooks/google-calendar', raw({ type: '*/*' }), handleGoogleCalendarWebhook);
