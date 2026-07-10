import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { chatWithAI } from '../services/openai';
import { scheduleFunctions, createEvent, updateEvent, deleteEvent } from '../services/scheduleFunctions';
import { ChatMessage, VoiceState } from '../types';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isThinking: false,
    isSpeaking: false,
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    try {
      setupAudio();
    } catch (error) {
      Alert.alert('Error de Audio', 'No se pudo inicializar el audio. Algunas funciones pueden no estar disponibles.');
    }
    return () => {
      try {
        if (recordingRef.current) {
          recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        console.error('Error cleaning up audio:', error);
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to setup audio:', error);
    }
  };

  const startRecording = async () => {
    try {
      setVoiceState({ ...voiceState, isListening: true });
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to record audio denied');
        setVoiceState({ ...voiceState, isListening: false });
        return;
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      await recording.startAsync();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setVoiceState({ ...voiceState, isListening: false });
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setVoiceState({ ...voiceState, isListening: false });

      if (uri) {
        // TODO: Transcribe audio using OpenAI Whisper
        const transcribedText = 'Texto transcrito de ejemplo';
        handleSendMessage(transcribedText);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setVoiceState({ ...voiceState, isListening: false });
    }
  };

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages([...messages, userMessage]);
    setInputText('');
    setVoiceState({ ...voiceState, isThinking: true });

    try {
      const response = await chatWithAI([...messages, userMessage], scheduleFunctions);

      if (response.function_call) {
        const { name, arguments: args } = response.function_call;
        let functionResult;

        try {
          switch (name) {
            case 'createEvent':
              functionResult = await createEvent(
                'user-id-placeholder',
                args.title,
                args.start_time,
                args.end_time,
                args.description
              );
              break;
            case 'updateEvent':
              functionResult = await updateEvent(args.id, args);
              break;
            case 'deleteEvent':
              functionResult = await deleteEvent(args.id);
              break;
          }
        } catch (functionError: any) {
          console.error('Function execution error:', functionError);
          functionResult = { error: functionError.message || 'Error al ejecutar función' };
        }

        const followUpResponse = await chatWithAI(
          [
            ...messages,
            userMessage,
            response,
            { role: 'function', name, content: JSON.stringify(functionResult) },
          ],
          scheduleFunctions
        );

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: followUpResponse.content || 'Evento procesado exitosamente',
        };
        setMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.content || '',
        };
        setMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);
      }

      setVoiceState({ ...voiceState, isThinking: false });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar tu mensaje. Por favor intenta nuevamente.');
      setVoiceState({ ...voiceState, isThinking: false });
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    return (
      <View
        key={index}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {message.content}
        </Text>
      </View>
    );
  };

  const renderVoiceIndicator = () => {
    if (voiceState.isListening) {
      return (
        <View style={styles.voiceIndicator}>
          <View style={[styles.pulseDot, styles.pulse]} />
          <Text style={styles.voiceText}>Escuchando...</Text>
        </View>
      );
    }
    if (voiceState.isThinking) {
      return (
        <View style={styles.voiceIndicator}>
          <ActivityIndicator color="#00d4ff" size="small" />
          <Text style={styles.voiceText}>Pensando...</Text>
        </View>
      );
    }
    if (voiceState.isSpeaking) {
      return (
        <View style={styles.voiceIndicator}>
          <View style={[styles.pulseDot, styles.pulse]} />
          <Text style={styles.voiceText}>Hablando...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <Text style={styles.headerLogoText}>S</Text>
        </View>
        <Text style={styles.headerTitle}>SYNKROS</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>
              Hola, soy SYNKROS. ¿En qué puedo ayudarte hoy?
            </Text>
          </View>
        ) : (
          messages.map((msg: ChatMessage, idx: number) => renderMessage(msg, idx))
        )}
      </ScrollView>

      {renderVoiceIndicator()}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor="#666"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.voiceButton, voiceState.isListening && styles.voiceButtonActive]}
          onPress={voiceState.isListening ? stopRecording : startRecording}
          disabled={voiceState.isThinking}
        >
          <Text style={styles.voiceButtonText}>
            {voiceState.isListening ? '⏹' : '🎤'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => handleSendMessage()}
          disabled={voiceState.isThinking || voiceState.isListening}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a0a0f',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#00d4ff',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: '#0a0a0f',
  },
  assistantText: {
    color: '#ffffff',
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00d4ff',
    marginRight: 8,
  },
  pulse: {
    opacity: 0.6,
  },
  voiceText: {
    color: '#00d4ff',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a24',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    maxHeight: 100,
    marginRight: 8,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  voiceButtonText: {
    fontSize: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#0a0a0f',
    fontWeight: 'bold',
  },
});
