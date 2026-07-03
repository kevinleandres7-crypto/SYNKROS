// server/config/googleOAuthClient.ts

import { google } from 'googleapis';

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI // ej. https://api.synkros.app/auth/google/callback
  );
}

// Scope mínimo necesario: solo lectura. SYNKROS no necesita crear eventos
// directamente en el Google Calendar del usuario en esta versión -- las
// tareas que el usuario gestiona por voz viven como provider='synkros' en
// nuestra propia tabla. Pedir menos scope reduce fricción en la pantalla de
// consentimiento de Google y la superficie de riesgo si un token se filtra.
export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
