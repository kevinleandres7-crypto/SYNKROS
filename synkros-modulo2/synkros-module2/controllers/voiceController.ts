// controllers/voiceController.ts
//
// Capa fina entre Express y el motor conversacional. Su único trabajo es:
// validar la forma del request, invocar el servicio, y traducir errores de
// dominio (SynkrosExtractionError) a códigos HTTP con mensajes seguros de
// mostrar al cliente (nunca reenvía el `cause` interno al frontend).

import { Request, Response } from 'express';
import { z } from 'zod';
import { processVoiceTranscript } from '../services/conversationEngine';
import { SynkrosExtractionError } from '../services/errors';

const RequestBodySchema = z.object({
  transcript: z.string().min(1).max(1000),
  nowISO: z.string().datetime().optional(),
  timezone: z.string().default('America/Lima'),
  todaysTasks: z
    .array(
      z.object({
        title: z.string(),
        type: z.enum(['FIXED', 'FLEXIBLE']),
        startTime: z.string(),
      })
    )
    .default([]),
});

const ERROR_STATUS_MAP: Record<SynkrosExtractionError['code'], number> = {
  EMPTY_TRANSCRIPT: 400,
  MODEL_TIMEOUT: 504,
  MODEL_REFUSED: 422,
  SCHEMA_VALIDATION_FAILED: 502,
  BUSINESS_RULE_VIOLATION: 502,
  UPSTREAM_ERROR: 502,
};

export async function handleVoiceTranscript(req: Request, res: Response): Promise<void> {
  const parseResult = RequestBodySchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'El cuerpo del request no tiene la forma esperada.',
      details: parseResult.error.flatten(),
    });
    return;
  }

  const { transcript, nowISO, timezone, todaysTasks } = parseResult.data;

  try {
    const extraction = await processVoiceTranscript({
      transcript,
      nowISO: nowISO ?? new Date().toISOString(),
      timezone,
      todaysTasks,
    });

    res.status(200).json({ data: extraction });
  } catch (err) {
    if (err instanceof SynkrosExtractionError) {
      res.status(ERROR_STATUS_MAP[err.code]).json({
        error: err.code,
        message: err.message,
      });
      return;
    }

    // Error no anticipado: no filtramos detalles internos al cliente.
    // eslint-disable-next-line no-console
    console.error('[voiceController] Error inesperado:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado procesando el mensaje.',
    });
  }
}
