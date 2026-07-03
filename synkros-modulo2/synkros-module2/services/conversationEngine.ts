// services/conversationEngine.ts
//
// El "cerebro" de SYNKROS. Responsabilidad única: recibir un transcript de
// voz + contexto del día, y devolver un ExtractionResult validado. No sabe
// nada de HTTP, Express, ni de la UI — eso vive en controllers/.
//
// Modelo elegido: GPT-4o-mini vía Structured Outputs nativo de OpenAI
// (`response_format: json_schema` con `strict: true`). Se eligió sobre
// Gemini Flash por dos razones prácticas para este caso de uso:
//   1. El modo `strict` de OpenAI garantiza (a nivel de API, no de prompt)
//      que el JSON cumple el schema exacto — Gemini Flash soporta JSON mode
//      pero su cumplimiento de schemas anidados es menos estricto hoy.
//   2. Menor latencia percibida en llamadas cortas como esta, crítico
//      porque el usuario está esperando con la app abierta, hablando.
// Si el equipo prefiere Gemini por costo, el único archivo que cambia es
// este — el contrato (ExtractionResult) y el prompt no dependen del proveedor.

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  ExtractionSchema,
  ExtractionResult,
  assertBusinessRules,
} from '../schemas/extractionSchema';
import { buildSynkrosSystemPrompt } from '../prompts/systemPrompt';
import { SynkrosExtractionError } from './errors';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2; // 1 intento real + 1 reintento si falla validación

export interface TaskContext {
  title: string;
  type: 'FIXED' | 'FLEXIBLE';
  startTime: string; // ISO
}

export interface ProcessTranscriptInput {
  transcript: string;
  nowISO: string;
  timezone: string;
  todaysTasks: TaskContext[];
}

/**
 * Procesa un transcript de voz caótico y devuelve la extracción estructurada.
 * Lanza SynkrosExtractionError con un `code` específico en cualquier fallo,
 * nunca deja pasar un objeto parcialmente válido.
 */
export async function processVoiceTranscript(
  input: ProcessTranscriptInput
): Promise<ExtractionResult> {
  const transcript = input.transcript?.trim();

  if (!transcript) {
    throw new SynkrosExtractionError(
      'El transcript llegó vacío. Probablemente un error de captura de audio en el Módulo 1.',
      'EMPTY_TRANSCRIPT'
    );
  }

  const systemPrompt = buildSynkrosSystemPrompt({
    nowISO: input.nowISO,
    timezone: input.timezone,
    todaysTasks: input.todaysTasks,
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await callModelOnce(systemPrompt, transcript);
      assertBusinessRules(result);
      return result;
    } catch (err) {
      lastError = err;
      // Solo reintentamos si el fallo fue de validación/negocio — un timeout
      // o error de red no se arregla reintentando con el mismo prompt de inmediato.
      const isRetryable =
        err instanceof SynkrosExtractionError &&
        (err.code === 'SCHEMA_VALIDATION_FAILED' || err.code === 'BUSINESS_RULE_VIOLATION');
      if (!isRetryable || attempt === MAX_ATTEMPTS) break;
    }
  }

  if (lastError instanceof SynkrosExtractionError) throw lastError;
  throw new SynkrosExtractionError(
    'No se pudo procesar el mensaje de voz tras reintentar.',
    'UPSTREAM_ERROR',
    lastError
  );
}

async function callModelOnce(
  systemPrompt: string,
  transcript: string
): Promise<ExtractionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const completion = await client.beta.chat.completions.parse(
      {
        model: MODEL,
        temperature: 0.3, // baja: queremos consistencia en la extracción, no creatividad
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: zodResponseFormat(ExtractionSchema, 'synkros_extraction'),
      },
      { signal: controller.signal }
    );

    const choice = completion.choices[0];

    if (choice.message.refusal) {
      throw new SynkrosExtractionError(
        `El modelo rechazó procesar el mensaje: ${choice.message.refusal}`,
        'MODEL_REFUSED'
      );
    }

    const parsed = choice.message.parsed;
    if (!parsed) {
      throw new SynkrosExtractionError(
        'El modelo no devolvió un objeto parseado (posible corte de respuesta).',
        'SCHEMA_VALIDATION_FAILED'
      );
    }

    // Segunda validación explícita con Zod, además de la que hace el SDK.
    // Redundante a propósito: si el SDK de OpenAI cambia de comportamiento
    // en una versión futura, esta línea sigue protegiendo el contrato.
    return ExtractionSchema.parse(parsed);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new SynkrosExtractionError(
        `El modelo no respondió dentro de ${REQUEST_TIMEOUT_MS}ms.`,
        'MODEL_TIMEOUT',
        err
      );
    }
    if (err instanceof SynkrosExtractionError) throw err;
    if (err?.name === 'ZodError') {
      throw new SynkrosExtractionError(
        'La respuesta del modelo no cumplió el schema de extracción.',
        'SCHEMA_VALIDATION_FAILED',
        err
      );
    }
    throw new SynkrosExtractionError(
      'Error de comunicación con el proveedor del modelo.',
      'UPSTREAM_ERROR',
      err
    );
  } finally {
    clearTimeout(timeout);
  }
}
