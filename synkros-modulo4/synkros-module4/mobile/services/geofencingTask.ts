// mobile/services/geofencingTask.ts
//
// Servicio en segundo plano que despierta la app cuando el GPS detecta un
// cambio significativo de posición -- no un tracking continuo (eso agotaría
// la batería y es innecesario: solo nos importa reevaluar cuando el usuario
// se movió lo suficiente como para que la predicción de tardanza cambie).
//
// Requiere en app.json/app.config.js los permisos:
//   ios: NSLocationAlwaysAndWhenInUseUsageDescription, UIBackgroundModes: ["location"]
//   android: ACCESS_BACKGROUND_LOCATION
// y las dependencias: expo-location, expo-task-manager

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { predictDelay } from './delayPrediction';

export const LOCATION_TASK_NAME = 'synkros-background-location';

/**
 * Contrato mínimo que este archivo necesita del resto de la app -- se
 * inyecta en `startGeofencing` para no acoplar esta tarea a Zustand ni a
 * ningún cliente HTTP específico. Facilita testear la lógica de arriba
 * (delayPrediction.ts) sin arrastrar mocks de red.
 */
export interface NextFixedEventProvider {
  getNextFixedEvent(): Promise<{
    id: string;
    title: string;
    startTime: string; // ISO
    locationLat: number;
    locationLng: number;
  } | null>;
}

export interface DelayAlertSink {
  /** Se invoca cuando el motor detecta que el usuario probablemente llegará tarde. */
  onLatePrediction(eventId: string, eventTitle: string, projectedDelayMinutes: number): void;
}

let dependencies: { events: NextFixedEventProvider; alerts: DelayAlertSink } | null = null;

// TaskManager.defineTask debe llamarse en el módulo raíz de la app (antes de
// cualquier render), no dentro de un componente -- por eso vive a nivel de
// archivo y no dentro de una función.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[geofencingTask] Error del background task:', error);
    return;
  }
  if (!dependencies) return; // la app aún no llamó a startGeofencing() en esta sesión

  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  const nextEvent = await dependencies.events.getNextFixedEvent();
  if (!nextEvent || nextEvent.locationLat == null || nextEvent.locationLng == null) {
    return; // no hay próximo evento FIXED con ubicación conocida -- nada que evaluar
  }

  const prediction = predictDelay({
    currentLat: latest.coords.latitude,
    currentLng: latest.coords.longitude,
    currentSpeedKmh: latest.coords.speed != null ? latest.coords.speed * 3.6 : null, // m/s -> km/h
    destinationLat: nextEvent.locationLat,
    destinationLng: nextEvent.locationLng,
    eventStartTime: new Date(nextEvent.startTime),
    now: new Date(),
  });

  if (prediction.willBeLate && prediction.projectedDelayMinutes) {
    dependencies.alerts.onLatePrediction(
      nextEvent.id,
      nextEvent.title,
      Math.round(prediction.projectedDelayMinutes)
    );
  }
});

/**
 * Arranca el monitoreo pasivo. `distanceInterval` es la clave de "solo
 * despertar en cambios significativos": 300m evita que el task se dispare
 * en cada semáforo, pero sigue siendo lo bastante sensible para detectar
 * que el usuario tomó una ruta más larga o quedó atrapado en tráfico.
 */
export async function startGeofencing(
  events: NextFixedEventProvider,
  alerts: DelayAlertSink
): Promise<void> {
  dependencies = { events, alerts };

  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Permiso de ubicación en primer plano denegado.');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Permiso de ubicación en segundo plano denegado.');
  }

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (alreadyRunning) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced, // suficiente para geofencing, más barato en batería que High
    distanceInterval: 300, // metros -- "cambio significativo", no tracking continuo
    deferredUpdatesInterval: 60_000, // agrupa actualizaciones cada 60s como mucho
    showsBackgroundLocationIndicator: true, // iOS: transparencia obligatoria con el usuario
    foregroundService: {
      // Android: sin esto, el SO puede matar el proceso en segundo plano
      notificationTitle: 'SYNKROS está monitoreando tu trayecto',
      notificationBody: 'Te avisaremos si vas a llegar tarde a tu próximo evento.',
    },
  });
}

export async function stopGeofencing(): Promise<void> {
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (alreadyRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  dependencies = null;
}
