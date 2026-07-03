// examples/run-example.ts
//
// Ejemplo standalone para probar el motor sin levantar el servidor HTTP.
// Ejecutar con: npx tsx examples/run-example.ts
// Requiere OPENAI_API_KEY en el entorno.

import { processVoiceTranscript } from '../services/conversationEngine';

async function main() {
  const transcript =
    'Oye, voy tardísimo como 25 minutos al taller por el tráfico, ' +
    'muéveme el gimnasio de la tarde pero por favor no toques mi junta con el cliente';

  const result = await processVoiceTranscript({
    transcript,
    nowISO: new Date().toISOString(),
    timezone: 'America/Lima',
    todaysTasks: [
      { title: 'Gimnasio', type: 'FLEXIBLE', startTime: '2026-07-02T17:00:00-05:00' },
      { title: 'Junta con el cliente', type: 'FIXED', startTime: '2026-07-02T15:00:00-05:00' },
      { title: 'Taller de auto', type: 'FIXED', startTime: '2026-07-02T13:00:00-05:00' },
    ],
  });

  console.log(JSON.stringify(result, null, 2));

  // Salida esperada aproximada (el modelo puede variar la redacción exacta
  // de system_response, pero la estructura y los valores clave deben coincidir):
  //
  // {
  //   "intent": "delay_report",
  //   "delay_minutes": 25,
  //   "target_task": "Taller de auto",
  //   "flexibility_level": "FIXED",
  //   "protected_tasks": ["Junta con el cliente"],
  //   "system_response": "Entendido, anoté los 25 minutos de retraso al taller y ya moví tu gimnasio. Tu junta con el cliente no se toca."
  // }
}

main().catch((err) => {
  console.error('Error ejecutando el ejemplo:', err);
  process.exit(1);
});
