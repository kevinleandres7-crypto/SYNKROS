// __tests__/coreEngine.test.ts
//
// La garantía más importante del brief ("jamás mover o pisar un FIXED") no
// se valida mirando la consola — se valida programáticamente contra
// cualquier escenario. Estas pruebas son las que de verdad importan en este
// módulo: si algún día alguien refactoriza resolveTimeline y rompe esta
// invariante, este test debe fallar en CI antes de que llegue a producción.

import { describe, it, expect } from 'vitest';
import { chaoticDay } from '../mock/chaoticDay';
import { separateEvents } from '../core/separateEvents';
import { runReorganization } from '../core/reorganizationEngine';
import { getEnd, Task } from '../types';

function findOverlaps(timeline: Task[]): Array<[Task, Task]> {
  const sorted = [...timeline].sort((a, b) => a.start.getTime() - b.start.getTime());
  const overlaps: Array<[Task, Task]> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (getEnd(sorted[i]).getTime() > sorted[i + 1].start.getTime()) {
      overlaps.push([sorted[i], sorted[i + 1]]);
    }
  }
  return overlaps;
}

describe('separateEvents', () => {
  it('separa correctamente FIXED y FLEXIBLE del día caótico', () => {
    const { fixed, flexible } = separateEvents(chaoticDay);
    expect(fixed).toHaveLength(3);
    expect(flexible).toHaveLength(7);
    expect(fixed.every((t) => t.type === 'FIXED')).toBe(true);
    expect(flexible.every((t) => t.type === 'FLEXIBLE')).toBe(true);
  });
});

describe('runReorganization — invariantes duras', () => {
  it('nunca produce solapamientos en la línea de tiempo final', () => {
    const result = runReorganization(chaoticDay, {
      targetTaskId: 'reporte-q3',
      delayMinutes: 30,
    });
    expect(findOverlaps(result.timeline)).toEqual([]);
  });

  it('ninguna tarea FIXED cambia de horario tras un retraso en una FLEXIBLE', () => {
    const before = chaoticDay.filter((t) => t.type === 'FIXED');
    const result = runReorganization(chaoticDay, {
      targetTaskId: 'reporte-q3',
      delayMinutes: 30,
    });
    const after = result.timeline.filter((t) => t.type === 'FIXED');

    for (const originalTask of before) {
      const match = after.find((t) => t.id === originalTask.id);
      expect(match).toBeDefined();
      expect(match!.start.getTime()).toBe(originalTask.start.getTime());
      expect(match!.durationMinutes).toBe(originalTask.durationMinutes);
    }
  });

  it('rechaza mover una tarea FIXED cuando se le reporta un retraso directamente', () => {
    const before = chaoticDay.find((t) => t.id === 'taller-auto')!;
    const result = runReorganization(chaoticDay, {
      targetTaskId: 'taller-auto',
      delayMinutes: 25,
    });
    const after = result.timeline.find((t) => t.id === 'taller-auto')!;

    expect(after.start.getTime()).toBe(before.start.getTime());
    expect(result.warnings.some((w) => w.includes('FIXED'))).toBe(true);
  });

  it('inserta un buffer de 15 min cuando dos tareas de alta carga quedan consecutivas', () => {
    const result = runReorganization(chaoticDay, {
      targetTaskId: 'reporte-q3',
      delayMinutes: 30,
    });
    const buffers = result.timeline.filter((t) => t.isBufferBlock);
    expect(buffers.length).toBeGreaterThanOrEqual(1);
    expect(buffers.every((b) => b.durationMinutes === 15)).toBe(true);
  });

  it('nunca genera un buffer que se solape con la tarea FIXED siguiente', () => {
    const result = runReorganization(chaoticDay, {
      targetTaskId: 'reporte-q3',
      delayMinutes: 30,
    });
    const junta = result.timeline.find((t) => t.id === 'junta-cliente')!;
    const buffer = result.timeline.find((t) => t.id.startsWith('buffer-') && t.id.includes('junta-cliente'));

    expect(junta.start.getTime()).toBe(new Date('2026-07-02T14:00:00-05:00').getTime());
    if (buffer) {
      expect(getEnd(buffer).getTime()).toBeLessThanOrEqual(junta.start.getTime());
    }
  });

  it('ejecuta la reorganización completa en menos de 20ms incluso con conflictos', () => {
    const result = runReorganization(chaoticDay, {
      targetTaskId: 'reporte-q3',
      delayMinutes: 30,
    });
    expect(result.executionTimeMs).toBeLessThan(20);
  });
});
