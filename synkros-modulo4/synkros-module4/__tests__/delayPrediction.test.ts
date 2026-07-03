// __tests__/delayPrediction.test.ts
import { describe, it, expect } from 'vitest';
import { haversineDistanceKm, predictDelay } from '../mobile/services/delayPrediction';

describe('haversineDistanceKm', () => {
  it('calcula ~766 km entre Lima y Arequipa (referencia conocida)', () => {
    // Coordenadas aproximadas de Lima y Arequipa, Perú.
    const distance = haversineDistanceKm(-12.0464, -77.0428, -16.409, -71.5375);
    expect(distance).toBeGreaterThan(720);
    expect(distance).toBeLessThan(820);
  });

  it('devuelve ~0 para el mismo punto', () => {
    const distance = haversineDistanceKm(-12.0464, -77.0428, -12.0464, -77.0428);
    expect(distance).toBeCloseTo(0, 3);
  });
});

describe('predictDelay', () => {
  const now = new Date('2026-07-02T13:45:00-05:00');

  it('predice que NO llegará tarde si el ETA es menor al tiempo disponible', () => {
    // ~4.4 km de distancia, 40 km/h -> ETA ~6.6 min. Evento en 20 min.
    const result = predictDelay({
      currentLat: -12.05,
      currentLng: -77.04,
      currentSpeedKmh: 40,
      destinationLat: -12.09,
      destinationLng: -77.04,
      eventStartTime: new Date(now.getTime() + 20 * 60_000),
      now,
    });

    expect(result.willBeLate).toBe(false);
    expect(result.projectedDelayMinutes).toBe(0);
  });

  it('predice que SÍ llegará tarde si el ETA excede el tiempo disponible', () => {
    // Misma distancia, evento en solo 3 minutos -> imposible llegar a tiempo.
    const result = predictDelay({
      currentLat: -12.05,
      currentLng: -77.04,
      currentSpeedKmh: 40,
      destinationLat: -12.09,
      destinationLng: -77.04,
      eventStartTime: new Date(now.getTime() + 3 * 60_000),
      now,
    });

    expect(result.willBeLate).toBe(true);
    expect(result.projectedDelayMinutes).toBeGreaterThan(0);
  });

  it('devuelve null (no adivina) cuando la velocidad es demasiado baja para confiar', () => {
    const result = predictDelay({
      currentLat: -12.05,
      currentLng: -77.04,
      currentSpeedKmh: 1, // detenido en tráfico / semáforo
      destinationLat: -12.09,
      destinationLng: -77.04,
      eventStartTime: new Date(now.getTime() + 10 * 60_000),
      now,
    });

    expect(result.willBeLate).toBeNull();
    expect(result.estimatedEtaMinutes).toBeNull();
  });

  it('trata currentSpeedKmh: null igual que velocidad insuficiente, sin lanzar error', () => {
    const result = predictDelay({
      currentLat: -12.05,
      currentLng: -77.04,
      currentSpeedKmh: null,
      destinationLat: -12.09,
      destinationLng: -77.04,
      eventStartTime: new Date(now.getTime() + 10 * 60_000),
      now,
    });

    expect(result.willBeLate).toBeNull();
  });
});
