// screens/NowCardScreen.tsx
// "The Now Card" — pantalla de entrada de SYNKROS.
// Un solo foco visual: la tarjeta central con la tarea activa. Todo lo
// demás (status bar, header) se reduce al mínimo para no competir con ella.
// Estilizado con NativeWind (Tailwind) sobre la paleta definida en
// tailwind.config.js.

import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import AINode from '../components/AINode';
import MicButton from '../components/MicButton';

function useElapsedLabel(startTime: string | undefined) {
  const [label, setLabel] = useState('00:00');

  useEffect(() => {
    if (!startTime) {
      setLabel('00:00');
      return;
    }
    const start = new Date(startTime).getTime();

    const tick = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const mm = String(Math.floor(diffSec / 60)).padStart(2, '0');
      const ss = String(diffSec % 60).padStart(2, '0');
      setLabel(`${mm}:${ss}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return label;
}

const AI_STATE_LABEL: Record<string, string> = {
  idle: 'En calma',
  listening: 'Escuchando',
  thinking: 'Pensando',
  alert: 'Atención',
};

export default function NowCardScreen() {
  const currentTask = useAppStore((s) => s.currentTask);
  const aiNodeState = useAppStore((s) => s.aiNodeState);
  const setAiNodeState = useAppStore((s) => s.setAiNodeState);
  const isVoiceStreaming = useAppStore((s) => s.isVoiceStreaming);
  const setVoiceStreaming = useAppStore((s) => s.setVoiceStreaming);
  const elapsed = useElapsedLabel(currentTask?.startTime);

  const handleMicPressIn = () => {
    setVoiceStreaming(true);
    setAiNodeState('listening');
    // TODO(Módulo 2): abrir el socket de streaming de voz aquí.
  };

  const handleMicPressOut = () => {
    setVoiceStreaming(false);
    setAiNodeState('thinking');
    // TODO(Módulo 2): cerrar el stream y enviar el transcript acumulado.
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      {/* Header mínimo: solo el estado de la IA en texto, sin logo ni menú */}
      <View className="px-6 pt-4">
        <Text className="text-text-secondary font-body text-xs tracking-widest uppercase">
          {AI_STATE_LABEL[aiNodeState] ?? 'En calma'}
        </Text>
      </View>

      {/* Cuerpo central: AINode + Now Card, con máximo espacio negativo alrededor */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-10">
          <AINode state={aiNodeState} size={104} />
        </View>

        <View className="w-full bg-surface rounded-3xl px-7 py-10 items-center border border-white/5">
          {currentTask ? (
            <>
              <Text className="text-text-secondary font-body text-xs tracking-widest uppercase mb-3">
                Tarea activa
              </Text>
              <Text className="text-text-primary font-display text-3xl text-center leading-10">
                {currentTask.title}
              </Text>
              <Text className="text-text-secondary font-mono text-lg tracking-widest mt-6">
                {elapsed}
              </Text>
              {currentTask.isBufferBlock && (
                <Text className="text-ai-cyan font-body text-xs mt-3">
                  Bloque de descanso — sin exigencia cognitiva
                </Text>
              )}
            </>
          ) : (
            <>
              <Text className="text-text-primary font-display text-2xl text-center leading-9">
                Sin tarea activa
              </Text>
              <Text className="text-text-secondary font-body text-sm text-center mt-3">
                Mantén presionado el micrófono y cuéntale a SYNKROS qué sigue.
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Micrófono flotante, siempre en la thumb zone */}
      <View className="items-center pb-8">
        <MicButton
          isListening={isVoiceStreaming}
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
        />
      </View>
    </SafeAreaView>
  );
}
