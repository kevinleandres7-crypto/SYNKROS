// core/reorganizationEngine.ts
//
// Punto de entrada único para el resto de SYNKROS. Recibe la línea de tiempo
// actual y (opcionalmente) el JSON estructurado que ya produjo el Módulo 2,
// y devuelve el calendario reorganizado. No conoce OpenAI, Gemini, ni Zod —
// solo el shape mínimo que necesita del resultado de extracción.

import { Task, ReorganizationResult } from '../types';
import { separateEvents } from './separateEvents';
import { applyDelayAndReorganize } from './applyDelay';
import { insertCognitiveBuffers } from './insertCognitiveBuffers';
import { resolveTimeline } from './resolveTimeline';

/**
 * Shape mínimo que este módulo necesita del ExtractionResult del Módulo 2.
 * Se declara localmente (en vez de importar el schema de Zod del Módulo 2)
 * para mantener el Core Engine sin dependencias del middleware de IA —
 * puede probarse y usarse de forma completamente aislada.
 */
export interface DelayInstruction {
  targetTaskId: string;
  delayMinutes: number;
}

export function runReorganization(
  timeline: Task[],
  delayInstruction?: DelayInstruction,
  options?: { bufferMinutes?: number }
): ReorganizationResult {
  const startedAt = performance.now();

  const warnings: string[] = [];
  let working = timeline;

  if (delayInstruction) {
    const delayResult = applyDelayAndReorganize(
      working,
      delayInstruction.targetTaskId,
      delayInstruction.delayMinutes
    );
    working = delayResult.timeline;
    warnings.push(...delayResult.warnings);
  }

  const { timeline: withBuffers, buffersInserted, warnings: bufferWarnings } = insertCognitiveBuffers(
    working,
    options?.bufferMinutes
  );
  if (buffersInserted > 0) {
    warnings.push(
      `Se insertaron ${buffersInserted} buffer(s) de descanso entre tareas de alta carga cognitiva.`
    );
  }
  warnings.push(...bufferWarnings);

  const { timeline: finalTimeline, conflicts } = resolveTimeline(withBuffers);

  const executionTimeMs = performance.now() - startedAt;

  return {
    timeline: finalTimeline,
    conflicts,
    warnings,
    executionTimeMs,
  };
}

export { separateEvents };
