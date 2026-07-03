// core/separateEvents.ts
//
// Requerimiento 1 del brief: separar estrictamente el calendario en dos
// grupos. Es una función pura y trivial a propósito — la complejidad del
// motor vive en resolveTimeline.ts, no acá. Esta separación es la que usan
// el resto de funciones para saber qué NUNCA pueden tocar.

import { Task } from '../types';

export interface SeparatedEvents {
  fixed: Task[];
  flexible: Task[];
  buffers: Task[];
}

export function separateEvents(timeline: Task[]): SeparatedEvents {
  const fixed: Task[] = [];
  const flexible: Task[] = [];
  const buffers: Task[] = [];

  for (const task of timeline) {
    if (task.type === 'FIXED') fixed.push(task);
    else if (task.type === 'BUFFER') buffers.push(task);
    else flexible.push(task);
  }

  return { fixed, flexible, buffers };
}
