// screens/CentroComandoScreen.tsx
// Interfaz de chat por voz. La conexión WebSocket real vive en el Módulo 2
// (motor conversacional) — aquí solo se define el contrato del hook
// `useVoiceSocket` y el consumo de estado, para que ambos módulos se puedan
// desarrollar en paralelo sin bloquearse.

import React, { useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useAppStore, ChatMessage } from '../store/useAppStore';
import AINode from '../components/AINode';
import PanicButton from '../components/PanicButton';
import { colors, fonts, radii, spacing } from '../theme/tokens';

// --- Contrato esperado del Módulo 2 ---
// Esta función se reemplaza por la implementación real de WebSocket streaming.
// Se deja como stub tipado para no bloquear el desarrollo del Frontend.
function useVoiceSocket() {
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const pushMessage = useAppStore((s) => s.pushMessage);
  const setAiNodeState = useAppStore((s) => s.setAiNodeState);

  const startStreaming = useCallback(() => {
    setConnectionStatus('connecting');
    setAiNodeState('listening');
    // TODO(Módulo 2): abrir socket real hacia el motor conversacional.
  }, []);

  const stopStreaming = useCallback((transcript: string) => {
    setConnectionStatus('idle');
    setAiNodeState('thinking');
    const message: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      text: transcript,
      timestamp: new Date().toISOString(),
    };
    pushMessage(message);
    // TODO(Módulo 2): enviar transcript, recibir intent estructurado y
    // empujar la respuesta de la IA con pushMessage({ role: 'ai', ... }).
  }, []);

  return { startStreaming, stopStreaming };
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

export default function CentroComandoScreen() {
  const messages = useAppStore((s) => s.messages);
  const aiNodeState = useAppStore((s) => s.aiNodeState);
  const isVoiceStreaming = useAppStore((s) => s.isVoiceStreaming);
  const setVoiceStreaming = useAppStore((s) => s.setVoiceStreaming);
  const { startStreaming, stopStreaming } = useVoiceSocket();
  const draftRef = useRef('');

  const handlePressIn = () => {
    setVoiceStreaming(true);
    startStreaming();
  };

  const handlePressOut = () => {
    setVoiceStreaming(false);
    stopStreaming(draftRef.current || '(transcripción pendiente del Módulo 2)');
  };

  const handlePanic = () => {
    // TODO(Módulo 3): disparar recalculo de emergencia del día completo.
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AINode state={aiNodeState} size={40} />
        <Text style={styles.headerTitle}>Comando</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messagesContent}
        inverted={false}
      />

      <View style={styles.footer}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.voiceButton,
            (pressed || isVoiceStreaming) && styles.voiceButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mantener presionado para hablar"
        >
          <Text style={styles.voiceButtonText}>
            {isVoiceStreaming ? 'Escuchando…' : 'Mantén presionado para hablar'}
          </Text>
        </Pressable>

        <PanicButton onPress={handlePanic} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  messagesContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  bubbleAi: {
    backgroundColor: colors.bg.surface,
    borderBottomLeftRadius: radii.sm,
  },
  bubbleUser: {
    backgroundColor: colors.ai.violet,
    borderBottomRightRadius: radii.sm,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  footer: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  voiceButton: {
    backgroundColor: colors.bg.surface,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: colors.ai.violet,
  },
  voiceButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text.primary,
  },
});
