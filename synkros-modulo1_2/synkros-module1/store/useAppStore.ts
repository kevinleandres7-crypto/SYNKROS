// store/useAppStore.ts
// Estado global de SYNKROS. Un solo store con slices, siguiendo el patrón
// recomendado de Zustand para apps medianas (evita el over-engineering de
// múltiples stores desconectados).

import { create } from 'zustand';

export type TaskType = 'FIXED' | 'FLEXIBLE';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  startTime: string; // ISO
  durationMinutes: number;
  isBufferBlock?: boolean; // true si es un colchón post-tarea cognitiva
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export type AiNodeState = 'idle' | 'listening' | 'thinking' | 'alert';
export type ConnectionStatus = 'idle' | 'connecting' | 'streaming' | 'error';

interface AppState {
  // --- session ---
  userId: string | null;
  setUserId: (id: string | null) => void;

  // --- tasks ---
  currentTask: Task | null;
  timeline: Task[];
  setCurrentTask: (task: Task | null) => void;
  setTimeline: (tasks: Task[]) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  reorderFlexible: (id: string, newStartTime: string) => void;

  // --- chat ---
  messages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  isVoiceStreaming: boolean;
  pushMessage: (message: ChatMessage) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setVoiceStreaming: (streaming: boolean) => void;
  clearChat: () => void;

  // --- ui ---
  aiNodeState: AiNodeState;
  setAiNodeState: (state: AiNodeState) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),

  currentTask: null,
  timeline: [],
  setCurrentTask: (task) => set({ currentTask: task }),
  setTimeline: (tasks) => set({ timeline: tasks }),
  updateTask: (id, patch) =>
    set({
      timeline: get().timeline.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      currentTask:
        get().currentTask?.id === id ? { ...get().currentTask!, ...patch } : get().currentTask,
    }),
  reorderFlexible: (id, newStartTime) => {
    const task = get().timeline.find((t) => t.id === id);
    if (!task || task.type === 'FIXED') return; // regla dura: nunca mover FIXED
    set({
      timeline: get().timeline.map((t) =>
        t.id === id ? { ...t, startTime: newStartTime } : t
      ),
    });
  },

  messages: [],
  connectionStatus: 'idle',
  isVoiceStreaming: false,
  pushMessage: (message) => set({ messages: [...get().messages, message] }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setVoiceStreaming: (streaming) => set({ isVoiceStreaming: streaming }),
  clearChat: () => set({ messages: [] }),

  aiNodeState: 'idle',
  setAiNodeState: (state) => set({ aiNodeState: state }),
}));
