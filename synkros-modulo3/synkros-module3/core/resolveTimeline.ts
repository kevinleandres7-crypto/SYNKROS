// core/resolveTimeline.ts
//
// Requerimiento 2 del brief: "Desplazamiento Líquido". Este es el motor real.
//
// Estrategia: barrido de una sola pasada (O(n log n) por el sort inicial,
// O(n) el barrido) manteniendo un "cursor" = el instante en que queda libre
// la agenda tras colocar la última tarea.
//
//   - Si la tarea es FIXED o BUFFER: es inamovible. Su posición nunca cambia.
//     Si el cursor ya pasó su hora de inicio (una tarea flexible anterior se
//     alargó encima de ella), eso es una colisión dura: se intenta resolver
//     comprimiendo hacia atrás las tareas FLEXIBLE del tramo inmediatamente
//     anterior (nunca la FIXED). Si ni comprimiéndolas a su mínimo alcanza,
//     se reporta como conflicto — el algoritmo JAMÁS mueve ni recorta la FIXED
//     para "hacer que cierre".
//   - Si la tarea es FLEXIBLE: se reubica al primer instante libre disponible
//     (max entre su hora original y el cursor). Esto es lo que logra el
//     "empuje" en cascada: si una tarea de más atrás se corrió, todas las
//     flexibles siguientes se recorren automáticamente.
//
// Es un algoritmo greedy, no una optimización global (no es Programación
// Lineal / OR-Tools). Se eligió así porque para el caso de uso — reaccionar
// en tiempo real a un solo evento de voz — un greedy determinístico de O(n)
// es más apropiado que resolver un ILP en cada mensaje: la prioridad del
// brief es velocidad, no el reacomodo matemáticamente óptimo del día completo.

import { Task, Conflict, getEnd, cloneTask } from '../types';

export function resolveTimeline(input: Task[]): { timeline: Task[]; conflicts: Conflict[] } {
  const sorted = [...input].map(cloneTask).sort((a, b) => a.start.getTime() - b.start.getTime());

  const result: Task[] = [];
  const conflicts: Conflict[] = [];
  let cursor = -Infinity;

  for (const task of sorted) {
    if (task.type === 'FIXED' || task.type === 'BUFFER') {
      if (cursor > task.start.getTime()) {
        const overlapMs = cursor - task.start.getTime();
        const { remainingMs } = compressPrecedingRun(result, overlapMs);
        if (remainingMs > 0) {
          conflicts.push({
            taskId: task.id,
            message:
              `No se pudo liberar ${Math.ceil(remainingMs / 60_000)} min antes de "${task.title}" ` +
              `sin comprimir tareas flexibles por debajo de su duración mínima. ` +
              `"${task.title}" se mantiene intacta; revisar manualmente el tramo anterior.`,
          });
        }
      }
      result.push(task);
      cursor = getEnd(task).getTime();
    } else {
      const earliestStart = Math.max(task.start.getTime(), cursor);
      task.start = new Date(earliestStart);
      result.push(task);
      cursor = getEnd(task).getTime();
    }
  }

  return { timeline: result, conflicts };
}

/**
 * Comprime hacia atrás las tareas FLEXIBLE del tramo actual (desde la última
 * tarea FIXED/BUFFER hasta el final del array `result`) para liberar
 * `overlapMs` milisegundos antes de la próxima tarea inamovible.
 *
 * Comprime empezando por la tarea más cercana a la tarea inamovible (la
 * última del tramo) — es la que más recientemente "heredó" el retraso en
 * cascada, y es una elección de producto razonable: preferimos acortar el
 * bloque flexible justo antes de una reunión importante antes que uno de
 * hace varias horas. Muta `result` in-place y recalcula sus posiciones.
 */
function compressPrecedingRun(
  result: Task[],
  overlapMs: number
): { remainingMs: number } {
  let runStart = result.length;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].type === 'FIXED' || result[i].type === 'BUFFER') break;
    runStart = i;
  }
  const run = result.slice(runStart);
  if (run.length === 0) return { remainingMs: overlapMs };

  let remaining = overlapMs;

  for (let i = run.length - 1; i >= 0 && remaining > 0; i--) {
    const t = run[i];
    const minDurationMs = (t.minDurationMinutes ?? t.durationMinutes) * 60_000;
    const currentDurationMs = t.durationMinutes * 60_000;
    const compressibleMs = currentDurationMs - minDurationMs;
    if (compressibleMs <= 0) continue;

    const reduceMs = Math.min(compressibleMs, remaining);
    t.durationMinutes -= reduceMs / 60_000;
    remaining -= reduceMs;
  }

  // Recalcular posiciones del tramo comprimido en orden, ancladas al final
  // de lo que venga antes del tramo (otra FIXED/BUFFER, o su propio inicio).
  const boundaryStartMs =
    runStart > 0 ? getEnd(result[runStart - 1]).getTime() : run[0].start.getTime();

  let cursor = boundaryStartMs;
  for (const t of run) {
    t.start = new Date(cursor);
    cursor = getEnd(t).getTime();
  }

  return { remainingMs: Math.max(remaining, 0) };
}
