// services/__tests__/extractionSchema.test.ts
//
// Estas pruebas cubren la parte determinista del sistema: el schema y las
// reglas de negocio. Deliberadamente NO llaman a la API de OpenAI (eso
// requeriría mockear la red o gastar cuota); la llamada real se prueba en
// examples/run-example.ts como smoke test manual.

import { describe, it, expect } from 'vitest';
import { ExtractionSchema, assertBusinessRules } from '../../schemas/extractionSchema';

describe('ExtractionSchema', () => {
  it('acepta un resultado válido de delay_report', () => {
    const valid = {
      intent: 'delay_report',
      delay_minutes: 25,
      target_task: 'Taller de auto',
      flexibility_level: 'FIXED',
      protected_tasks: ['Junta con el cliente'],
      system_response: 'Entendido, anoté el retraso.',
    };
    expect(() => ExtractionSchema.parse(valid)).not.toThrow();
  });

  it('rechaza un intent fuera del enum', () => {
    const invalid = {
      intent: 'lo_que_sea',
      delay_minutes: null,
      target_task: null,
      flexibility_level: 'UNKNOWN',
      protected_tasks: [],
      system_response: 'x',
    };
    expect(() => ExtractionSchema.parse(invalid)).toThrow();
  });

  it('rechaza delay_minutes fuera de rango (negativo)', () => {
    const invalid = {
      intent: 'delay_report',
      delay_minutes: -5,
      target_task: 'Gimnasio',
      flexibility_level: 'FLEXIBLE',
      protected_tasks: [],
      system_response: 'x',
    };
    expect(() => ExtractionSchema.parse(invalid)).toThrow();
  });

  it('rechaza campos extra no declarados (modo strict)', () => {
    const invalid = {
      intent: 'energy_low',
      delay_minutes: null,
      target_task: null,
      flexibility_level: 'UNKNOWN',
      protected_tasks: [],
      system_response: 'x',
      campo_inventado: 'esto no debería pasar',
    };
    expect(() => ExtractionSchema.parse(invalid)).toThrow();
  });
});

describe('assertBusinessRules', () => {
  it('lanza error si delay_report no trae delay_minutes', () => {
    expect(() =>
      assertBusinessRules({
        intent: 'delay_report',
        delay_minutes: null,
        target_task: 'Taller',
        flexibility_level: 'FIXED',
        protected_tasks: [],
        system_response: 'x',
      })
    ).toThrow(/delay_minutes/);
  });

  it('lanza error si cancellation no trae target_task', () => {
    expect(() =>
      assertBusinessRules({
        intent: 'cancellation',
        delay_minutes: null,
        target_task: null,
        flexibility_level: 'UNKNOWN',
        protected_tasks: [],
        system_response: 'x',
      })
    ).toThrow(/target_task/);
  });

  it('no lanza error para un caso energy_low sin task ni delay', () => {
    expect(() =>
      assertBusinessRules({
        intent: 'energy_low',
        delay_minutes: null,
        target_task: null,
        flexibility_level: 'UNKNOWN',
        protected_tasks: [],
        system_response: 'Suena a que necesitas una pausa. ¿Quieres que mueva algo flexible?',
      })
    ).not.toThrow();
  });
});
