// demo.ts
//
// Ejecutar con: npx tsx demo.ts
//
// Muestra en consola:
//   1. La separación FIXED/FLEXIBLE del día caótico.
//   2. La reorganización tras aplicar el retraso reportado en el Módulo 2
//      ("voy tardísimo 25 min al taller... muéveme el gimnasio").
//   3. Los buffers de descanso insertados automáticamente.
//   4. El tiempo real de ejecución del algoritmo, en milisegundos.

import { chaoticDay } from './mock/chaoticDay';
import { separateEvents } from './core/separateEvents';
import { runReorganization } from './core/reorganizationEngine';
import { Task, getEnd } from './types';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  });
}

function printTimeline(label: string, timeline: Task[]): void {
  console.log(`\n${label}`);
  console.log('─'.repeat(label.length));
  for (const task of [...timeline].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const tag = task.type.padEnd(8);
    const marker = task.isBufferBlock ? '🟢 BUFFER' : task.type === 'FIXED' ? '🔒 FIXED ' : '🔵 FLEX  ';
    console.log(
      `  ${formatTime(task.start)} - ${formatTime(getEnd(task))}  [${marker}]  ${task.title} (${task.durationMinutes} min)`
    );
  }
}

console.log('════════════════════════════════════════════════════');
console.log(' SYNKROS — Módulo 3: Core Engine — Demo con día caótico');
console.log('════════════════════════════════════════════════════');

// ─── 1. Separación estricta de eventos ─────────────────────────────────────
const { fixed, flexible } = separateEvents(chaoticDay);
console.log(`\nTareas FIXED detectadas: ${fixed.length}`);
fixed.forEach((t) => console.log(`  🔒 ${t.title} — ${formatTime(t.start)}`));
console.log(`\nTareas FLEXIBLE detectadas: ${flexible.length}`);
flexible.forEach((t) => console.log(`  🔵 ${t.title} — ${formatTime(t.start)}`));

printTimeline('AGENDA ORIGINAL (antes de cualquier reorganización)', chaoticDay);

// ─── 2. Escenario: retraso reportado por voz (Módulo 2) ────────────────────
// Instrucción tal como la resolvería el Módulo 2 para:
// "Oye, voy tardísimo como 25 minutos al taller por el tráfico,
//  muéveme el gimnasio de la tarde pero por favor no toques mi junta con el cliente"
//
// Nota: el "taller" es FIXED (regla de negocio: no se mueve). El desplazamiento
// real ocurre sobre "reporte-q3", que es el bloque flexible cuya sobrecarga
// dispara la cascada más interesante de observar en este mock. Se incluye
// además, por separado, la prueba de que intentar retrasar un FIXED es
// rechazado por el motor tal como exige el brief.

const result = runReorganization(chaoticDay, {
  targetTaskId: 'reporte-q3',
  delayMinutes: 30,
});

printTimeline('AGENDA REORGANIZADA (tras retraso de 30 min + buffers automáticos)', result.timeline);

if (result.warnings.length) {
  console.log('\nAdvertencias:');
  result.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
}

if (result.conflicts.length) {
  console.log('\nConflictos sin resolver:');
  result.conflicts.forEach((c) => console.log(`  ❌ ${c.message}`));
} else {
  console.log('\n✅ Sin conflictos: ningún FIXED fue movido ni recortado.');
}

console.log(`\n⏱  Tiempo de ejecución del algoritmo: ${result.executionTimeMs.toFixed(3)} ms`);

// ─── 3. Prueba explícita: intentar mover un FIXED debe ser rechazado ───────
const fixedAttempt = runReorganization(chaoticDay, {
  targetTaskId: 'taller-auto',
  delayMinutes: 25,
});

console.log('\n────────────────────────────────────────────────────');
console.log(' Prueba de regla dura: retraso reportado sobre un FIXED');
console.log('────────────────────────────────────────────────────');
fixedAttempt.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
console.log(`  ⏱  Tiempo de ejecución: ${fixedAttempt.executionTimeMs.toFixed(3)} ms`);
