// core/insertCognitiveBuffers.ts
//
// Requerimiento 3 del brief: si dos tareas de alta densidad cognitiva quedan
// consecutivas (sin descanso natural de por medio), se inserta un buffer
// inamovible de 15 minutos entre ellas.
//
// CASO CRÍTICO manejado explícitamente: si la tarea siguiente es FIXED y no
// hay espacio (back-to-back), el motor primero intenta comprimir la tarea
// FLEXIBLE anterior hasta su duración mínima para "hacerle sitio" al buffer
// SIN tocar la FIXED. Si ni comprimiéndola al máximo alcanza el espacio
// necesario, el buffer se descarta (no se inserta) y se reporta una
// advertencia — nunca se genera un buffer que quede encimado con una tarea
// inamovible. La regla "jamás pisar un FIXED" tiene prioridad sobre la
// regla "siempre insertar el buffer".

import { Task, getEnd, cloneTask } from '../types';
import { resolveTimeline } from './resolveTimeline';

const DEFAULT_BUFFER_MINUTES = 15;

export interface InsertBuffersResult {
  timeline: Task[];
  buffersInserted: number;
  warnings: string[];
}

export function insertCognitiveBuffers(
  timeline: Task[],
  bufferMinutes: number = DEFAULT_BUFFER_MINUTES
): InsertBuffersResult {
  const sorted = [...timeline].map(cloneTask).sort((a, b) => a.start.getTime() - b.start.getTime());
  const withBuffers: Task[] = [];
  const warnings: string[] = [];
  let buffersInserted = 0;
  const bufferMs = bufferMinutes * 60_000;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const needsBuffer = next && current.cognitiveLoad === 'high' && next.cognitiveLoad === 'high';

    if (!needsBuffer) {
      withBuffers.push(current);
      continue;
    }

    let availableMs = next.start.getTime() - getEnd(current).getTime();

    // Ya hay suficiente respiro natural — no forzamos nada donde el usuario
    // ya dejó espacio.
    if (availableMs >= bufferMs) {
      withBuffers.push(current);
      continue;
    }

    const shortfallMs = bufferMs - availableMs;

    // Intento 1: liberar espacio comprimiendo la tarea actual (si es
    // FLEXIBLE y comprimible), SIN tocar la tarea siguiente bajo ninguna
    // circunstancia — sea FIXED, BUFFER o FLEXIBLE.
    if (current.type === 'FLEXIBLE') {
      const minDurationMs = (current.minDurationMinutes ?? current.durationMinutes) * 60_000;
      const currentDurationMs = current.durationMinutes * 60_000;
      const compressibleMs = currentDurationMs - minDurationMs;
      const reduceMs = Math.min(compressibleMs, shortfallMs);
      if (reduceMs > 0) {
        current.durationMinutes -= reduceMs / 60_000;
        availableMs += reduceMs;
      }
    }

    withBuffers.push(current);

    if (availableMs >= bufferMs) {
      // Cupo suficiente tras comprimir: insertamos el buffer completo,
      // anclado justo después del final (posiblemente más corto) de current.
      const buffer: Task = {
        id: `buffer-${current.id}-${next.id}`,
        title: 'Buffer de recuperación',
        type: 'BUFFER',
        start: getEnd(current),
        durationMinutes: bufferMinutes,
        cognitiveLoad: 'low',
        isBufferBlock: true,
      };
      withBuffers.push(buffer);
      buffersInserted += 1;
    } else if (next.type === 'FIXED' || next.type === 'BUFFER') {
      // No hay forma de abrir espacio sin tocar una tarea inamovible.
      // Se prioriza la regla dura "nunca pisar FIXED" sobre insertar el
      // buffer: se omite y se deja constancia explícita para revisión humana.
      warnings.push(
        `No se pudo insertar el buffer de ${bufferMinutes} min antes de "${next.title}": ` +
          `la tarea previa ya está en su duración mínima y "${next.title}" es inamovible. ` +
          `Quedaron solo ${Math.max(Math.round(availableMs / 60_000), 0)} min de por medio.`
      );
    } else {
      // La siguiente también es FLEXIBLE: insertamos el buffer igual y
      // dejamos que resolveTimeline empuje en cascada lo que venga después.
      const buffer: Task = {
        id: `buffer-${current.id}-${next.id}`,
        title: 'Buffer de recuperación',
        type: 'BUFFER',
        start: getEnd(current),
        durationMinutes: bufferMinutes,
        cognitiveLoad: 'low',
        isBufferBlock: true,
      };
      withBuffers.push(buffer);
      buffersInserted += 1;
    }
  }

  if (buffersInserted === 0) {
    return { timeline: sorted, buffersInserted: 0, warnings };
  }

  const { timeline: resolved } = resolveTimeline(withBuffers);
  return { timeline: resolved, buffersInserted, warnings };
}
