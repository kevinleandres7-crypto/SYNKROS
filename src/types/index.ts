export interface ScheduleEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VoiceState {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
}
