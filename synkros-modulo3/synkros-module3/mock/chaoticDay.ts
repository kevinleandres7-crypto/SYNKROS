// mock/chaoticDay.ts
//
// Un día deliberadamente caótico para estresar el algoritmo:
// - Dos pares de tareas de alta carga cognitiva quedan consecutivas (deben
//   disparar la inserción de buffers).
// - Hay tareas FIXED en medio del día que no deben moverse pase lo que pase.
// - El escenario de retraso reutiliza el ejemplo exacto del Módulo 2
//   ("voy tardísimo 25 min al taller... muéveme el gimnasio").

import { Task } from '../types';

const DAY = '2026-07-02'; // jueves — mismo día usado en los ejemplos anteriores

function at(time: string): Date {
  return new Date(`${DAY}T${time}:00-05:00`); // America/Lima
}

export const chaoticDay: Task[] = [
  {
    id: 'rutina-matutina',
    title: 'Rutina matutina',
    type: 'FLEXIBLE',
    start: at('08:00'),
    durationMinutes: 30,
    minDurationMinutes: 15,
    cognitiveLoad: 'low',
  },
  {
    id: 'reporte-q3',
    title: 'Trabajo profundo: Reporte Q3',
    type: 'FLEXIBLE',
    start: at('08:30'),
    durationMinutes: 60,
    minDurationMinutes: 30,
    cognitiveLoad: 'high',
  },
  {
    id: 'llamada-inversionistas',
    title: 'Llamada con inversionistas',
    type: 'FIXED', // inamovible, sin importar lo que pase antes
    start: at('09:30'),
    durationMinutes: 60,
    cognitiveLoad: 'high', // consecutiva con la anterior → dispara buffer
  },
  {
    id: 'correos',
    title: 'Responder correos',
    type: 'FLEXIBLE',
    start: at('10:30'),
    durationMinutes: 30,
    minDurationMinutes: 10,
    cognitiveLoad: 'low',
  },
  {
    id: 'taller-auto',
    title: 'Taller de auto',
    type: 'FIXED',
    start: at('11:00'),
    durationMinutes: 60,
    cognitiveLoad: 'low',
  },
  {
    id: 'almuerzo',
    title: 'Almuerzo',
    type: 'FLEXIBLE',
    start: at('12:00'),
    durationMinutes: 60,
    minDurationMinutes: 30,
    cognitiveLoad: 'low',
  },
  {
    id: 'diseno-ux',
    title: 'Sesión de diseño UX',
    type: 'FLEXIBLE',
    start: at('13:00'),
    durationMinutes: 60,
    minDurationMinutes: 30,
    cognitiveLoad: 'high',
  },
  {
    id: 'junta-cliente',
    title: 'Junta con el cliente',
    type: 'FIXED', // "no toques mi junta con el cliente" — Módulo 2
    start: at('14:00'),
    durationMinutes: 60,
    cognitiveLoad: 'high', // consecutiva con diseño UX → dispara segundo buffer
  },
  {
    id: 'gimnasio',
    title: 'Gimnasio',
    type: 'FLEXIBLE', // "muéveme el gimnasio de la tarde" — Módulo 2
    start: at('15:00'),
    durationMinutes: 60,
    minDurationMinutes: 30,
    cognitiveLoad: 'low',
  },
  {
    id: 'estudio-finanzas',
    title: 'Estudio de finanzas personales',
    type: 'FLEXIBLE',
    start: at('16:00'),
    durationMinutes: 60,
    minDurationMinutes: 30,
    cognitiveLoad: 'high',
  },
];
