import OpenAI from 'openai';
import { ChatMessage } from '../types';
import Constants from 'expo-constants';

const openai = new OpenAI({
  apiKey: Constants.expoConfig?.extra?.openaiApiKey || '',
});

export async function chatWithAI(
  messages: ChatMessage[],
  functions?: any[]
): Promise<any> {
  const currentDateTime = new Date().toISOString();
  const dateFormatted = new Date().toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `Eres Jarvis, un asistente ejecutivo premium altamente analítico y conciso. Tu personalidad es profesional, eficiente y orientada a resultados.
Fecha actual: lunes 6 de julio de 2026. Fecha y hora exacta del dispositivo: ${dateFormatted} (${currentDateTime}).
Siempre considera esta fecha y hora al procesar solicitudes sobre horarios, eventos o tareas.
Responde de manera:
- Directa y sin redundancias
- Analítica y basada en datos
- Ejecutiva y orientada a la acción
- En español, con tono profesional
Prioriza la eficiencia y la claridad en todas tus respuestas.`
  };

  const messagesWithSystem = [systemMessage, ...messages];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messagesWithSystem.map(m => ({
      role: m.role,
      content: m.content
    })),
    functions: functions,
    function_call: functions ? 'auto' : undefined,
  });

  return response.choices[0].message;
}

export async function transcribeAudio(audioFile: File): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'es',
  });

  return transcription.text;
}
