// types.ts
//
// Contrato de datos del Core Engine. Deliberadamente NO importa nada de
// lenguaje natural ni de OpenAI/Gemini — este módulo no sabe que existe una
// IA, solo consume el JSON ya extraído por el Módulo 2.

export type TaskType = 'FIXED' | 'FLEXIBLE' | 'BUFFER';
export type CognitiveLoad = 'high' | 'low';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  /** Momento de inicio. Se usa Date en vez de string ISO para poder hacer
   *  aritmética de tiempo directa sin parsear en cada función. */
  start: Date;
  durationMinutes: number;
  /**
   * Duración mínima a la que se puede comprimir esta tarea si el algoritmo
   * necesita liberar espacio. Solo aplica a FLEXIBLE. Si no se especifica,
   * se asume no comprimible (minDuration = durationMinutes).
   */
  minDurationMinutes?: number;
  cognitiveLoad?: CognitiveLoad;
  /** true si esta tarea fue generada por el propio engine (buffer de descanso). */
  isBufferBlock?: boolean;
}

export interface Conflict {
  taskId: string;
  message: string;
}

export interface ReorganizationResult {
  timeline: Task[];
  conflicts: Conflict[];
  warnings: string[];
  /** Tiempo real de ejecución del algoritmo, en milisegundos. */
  executionTimeMs: number;
}

export function getEnd(task: Task): Date {
  return new Date(task.start.getTime() + task.durationMinutes * 60_000);
}

export function cloneTask(task: Task): Task {
  return { ...task, start: new Date(task.start.getTime()) };
}
