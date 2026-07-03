// prompts/schemaDescription.ts
//
// Genera la descripción en texto plano del esquema que se inserta en el
// system prompt. Se mantiene separada de extractionSchema.ts a propósito:
// el schema Zod es la fuente de verdad para VALIDAR, este texto es la fuente
// de verdad para EXPLICARLE al modelo qué se espera, en su propio idioma.
// Si el schema cambia, este archivo es el primer lugar a revisar.

export function buildJsonSchemaDescription(): string {
  return `{
  "intent": "delay_report" | "cancellation" | "energy_low" | "reschedule_request" | "task_completed" | "unclear",
  "delay_minutes": number | null,       // entero, minutos de retraso. null si no aplica
  "target_task": string | null,         // nombre de la tarea afectada, tal como la nombró el usuario
  "flexibility_level": "FIXED" | "FLEXIBLE" | "UNKNOWN",
  "protected_tasks": string[],          // tareas que el usuario dijo explícitamente que no se toquen
  "system_response": string             // frase empática en español, máximo ~240 caracteres
}`;
}
