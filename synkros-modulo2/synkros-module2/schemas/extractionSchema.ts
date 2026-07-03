// schemas/extractionSchema.ts
//
// Contrato de datos entre el Motor Conversacional (Módulo 2) y el resto de
// SYNKROS. Este esquema es la ÚNICA fuente de verdad sobre la forma del JSON
// que la IA puede devolver — se usa tanto para forzar el "structured output"
// del modelo como para validar la respuesta antes de dejarla salir del
// servicio (nunca confiamos ciegamente en que el modelo respetó el esquema).

import { z } from 'zod';

/**
 * Intenciones que el motor es capaz de reconocer.
 * 'unclear' existe a propósito: es preferible que la IA admita que no
 * entendió a que invente un intent con baja confianza.
 */
export const IntentEnum = z.enum([
  'delay_report', // "voy tarde", "se me hizo tarde"
  'cancellation', // "cancela esto", "ya no voy a poder"
  'energy_low', // "estoy agotado", "no doy más"
  'reschedule_request', // "muévelo para más tarde", pedido explícito de mover algo
  'task_completed', // "ya terminé", "listo con esto"
  'unclear', // el modelo no tiene confianza suficiente para clasificar
]);
export type Intent = z.infer<typeof IntentEnum>;

/**
 * Nivel de flexibilidad detectado para la tarea objetivo. Este campo es una
 * SUGERENCIA del lenguaje del usuario, no la fuente de verdad — el Módulo 3
 * (Core Engine) es quien decide si una tarea es FIXED o FLEXIBLE según la
 * base de datos. Si el usuario dice "no toques mi junta", el modelo debe
 * poder decir 'FIXED' aunque el sistema aún no lo sepa con certeza.
 */
export const FlexibilityEnum = z.enum(['FIXED', 'FLEXIBLE', 'UNKNOWN']);
export type Flexibility = z.infer<typeof FlexibilityEnum>;

export const ExtractionSchema = z
  .object({
    intent: IntentEnum.describe(
      'La intención principal detectada en el mensaje del usuario.'
    ),

    delay_minutes: z
      .number()
      .int()
      .min(0)
      .max(480)
      .nullable()
      .describe(
        'Minutos de retraso mencionados explícita o implícitamente por el usuario. ' +
          'null si el mensaje no involucra un retraso (ej. cancelación o baja energía).'
      ),

    target_task: z
      .string()
      .min(1)
      .max(120)
      .nullable()
      .describe(
        'Nombre o descripción corta de la tarea afectada, tal como el usuario la nombró ' +
          '(ej. "el gimnasio", "la junta con el cliente"). null si no se menciona ninguna tarea específica.'
      ),

    flexibility_level: FlexibilityEnum.describe(
      'Flexibilidad percibida de la tarea objetivo según el lenguaje del usuario. ' +
        'UNKNOWN si el usuario no da pistas suficientes.'
    ),

    protected_tasks: z
      .array(z.string().min(1).max(120))
      .describe(
        'Tareas que el usuario mencionó explícitamente como intocables ' +
          '(ej. "no toques mi junta con el cliente"). Array vacío si no aplica.'
      ),

    system_response: z
      .string()
      .min(1)
      .max(240)
      .describe(
        'Frase corta, empática y en español, que la app le mostrará de vuelta al usuario. ' +
          'Debe confirmar la acción sin sonar robótica ni generar más ansiedad.'
      ),
  })
  .strict();

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

/**
 * Runtime narrower usado por el controller después de que Zod valida el
 * shape: revisa reglas de negocio que Zod por sí solo no puede expresar
 * (dependencias entre campos).
 */
export function assertBusinessRules(result: ExtractionResult): void {
  if (result.intent === 'delay_report' && result.delay_minutes === null) {
    throw new Error(
      'Regla de negocio violada: intent=delay_report requiere delay_minutes numérico.'
    );
  }
  if (
    (result.intent === 'cancellation' || result.intent === 'reschedule_request') &&
    !result.target_task
  ) {
    throw new Error(
      `Regla de negocio violada: intent=${result.intent} requiere target_task.`
    );
  }
}
