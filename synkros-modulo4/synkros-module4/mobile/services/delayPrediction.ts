// mobile/services/delayPrediction.ts
//
// Lógica pura, sin dependencias de React Native ni de ningún SDK de
// geolocalización -- a propósito, para poder testearla con Vitest sin
// simular un dispositivo. `geofencingTask.ts` es la única capa que la
// conecta con datos reales del GPS.

const EARTH_RADIUS_KM = 6371;

/** Distancia entre dos coordenadas usando la fórmula de Haversine. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface DelayPredictionInput {
  currentLat: number;
  currentLng: number;
  /** Velocidad actual reportada por el GPS, en km/h. */
  currentSpeedKmh: number | null;
  destinationLat: number;
  destinationLng: number;
  /** Hora de inicio del próximo evento FIXED. */
  eventStartTime: Date;
  now: Date;
}

export interface DelayPrediction {
  distanceKm: number;
  /** null si no hay suficiente señal de movimiento para estimar (ver nota abajo). */
  estimatedEtaMinutes: number | null;
  willBeLate: boolean | null;
  /** Minutos de retraso proyectado. Solo tiene sentido si willBeLate es true. */
  projectedDelayMinutes: number | null;
}

// Por debajo de esta velocidad no confiamos en el dato para proyectar un
// ETA -- un usuario detenido en un semáforo no está "yendo a 0 km/h para
// siempre", y dividir por una velocidad casi nula produce ETAs absurdos
// (horas para recorrer 500 metros). Es más honesto decir "no lo sé todavía"
// que dar una predicción falsa.
const MIN_RELIABLE_SPEED_KMH = 3;

/**
 * Estima si el usuario llegará tarde a su próximo evento FIXED, basándose en
 * su velocidad y distancia actuales. Es deliberadamente conservador: ante
 * datos insuficientes, devuelve `null` en vez de adivinar.
 */
export function predictDelay(input: DelayPredictionInput): DelayPrediction {
  const distanceKm = haversineDistanceKm(
    input.currentLat,
    input.currentLng,
    input.destinationLat,
    input.destinationLng
  );

  const minutesUntilEvent = (input.eventStartTime.getTime() - input.now.getTime()) / 60_000;

  const speed = input.currentSpeedKmh ?? 0;
  if (speed < MIN_RELIABLE_SPEED_KMH) {
    return {
      distanceKm,
      estimatedEtaMinutes: null,
      willBeLate: null,
      projectedDelayMinutes: null,
    };
  }

  const estimatedEtaMinutes = (distanceKm / speed) * 60;
  const projectedDelayMinutes = estimatedEtaMinutes - minutesUntilEvent;

  return {
    distanceKm,
    estimatedEtaMinutes,
    willBeLate: projectedDelayMinutes > 0,
    projectedDelayMinutes: projectedDelayMinutes > 0 ? projectedDelayMinutes : 0,
  };
}
