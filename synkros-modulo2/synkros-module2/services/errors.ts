// services/errors.ts
//
// Errores tipados para que el controller HTTP y el Core Engine (Módulo 3)
// puedan reaccionar distinto según qué falló, en vez de recibir un Error
// genérico y tener que parsear el mensaje como texto.

export class SynkrosExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'EMPTY_TRANSCRIPT'
      | 'MODEL_TIMEOUT'
      | 'MODEL_REFUSED'
      | 'SCHEMA_VALIDATION_FAILED'
      | 'BUSINESS_RULE_VIOLATION'
      | 'UPSTREAM_ERROR',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SynkrosExtractionError';
  }
}
