// core/applyDelay.ts
//
// Punto de entrada que consume directamente el JSON del Módulo 2
// (delay_minutes, target_task ya resuelto a un taskId por el llamador).
// Traduce "el usuario reportó un retraso" a una operación sobre la línea de
// tiempo y delega la resolución de colisiones a resolveTimeline.

import { Task, Conflict, cloneTask } from '../types';
import { resolveTimeline } from './resolveTimeline';

export interface ApplyDelayResult {
  timeline: Task[];
  conflicts: Conflict[];
  warnings: string[];
}

export function applyDelayAndReorganize(
  timeline: Task[],
  targetTaskId: string,
  delayMinutes: number
): ApplyDelayResult {
  const target = timeline.find((t) => t.id === targetTaskId);

  if (!target) {
    return {
      timeline,
      conflicts: [],
      warnings: [`No se encontró la tarea "${targetTaskId}" en el calendario actual.`],
    };
  }

  // Regla dura del brief: "bajo ninguna circunstancia debe mover... un FIXED".
  // Si el retraso reportado es sobre una tarea FIXED, el algoritmo NO la
  // desplaza. El retraso se registra como advertencia para que el Módulo 1
  // se lo muestre al usuario, pero el horario formal no cambia.
  if (target.type === 'FIXED') {
    return {
      timeline,
      conflicts: [],
      warnings: [
        `"${target.title}" es una tarea FIXED — no se mueve automáticamente. ` +
          `Se registró un retraso de ${delayMinutes} min; el usuario deberá gestionarlo manualmente.`,
      ],
    };
  }

  const updated = timeline.map((t) => {
    if (t.id !== targetTaskId) return t;
    const shifted = cloneTask(t);
    shifted.start = new Date(shifted.start.getTime() + delayMinutes * 60_000);
    return shifted;
  });

  const { timeline: resolved, conflicts } = resolveTimeline(updated);

  return { timeline: resolved, conflicts, warnings: [] };
}
