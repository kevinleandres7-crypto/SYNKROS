// components/MicButton.tsx
// Botón flotante inferior, siempre accesible con el pulgar (thumb zone).
// Al mantenerlo presionado dispara el streaming de voz — sin pantallas
// intermedias, sin confirmaciones. La retroalimentación es 100% visual:
// un anillo se expande y se desvanece mientras escucha.

import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';

interface MicButtonProps {
  isListening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
}

function MicIcon({ color, size }: { color: string; size: number }) {
  // Icono de micrófono dibujado a mano con Views — evita traer una librería
  // de iconos completa solo para un glifo.
  const capsuleWidth = size * 0.34;
  const capsuleHeight = size * 0.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: capsuleWidth,
          height: capsuleHeight,
          borderRadius: capsuleWidth / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: capsuleWidth * 1.6,
          height: capsuleWidth * 1.6,
          borderRadius: capsuleWidth * 0.8,
          borderWidth: 2,
          borderColor: color,
          borderTopWidth: 2,
          borderBottomColor: 'transparent',
          borderLeftColor: color,
          borderRightColor: color,
          position: 'absolute',
          top: capsuleHeight * 0.55,
          transform: [{ rotate: '180deg' }],
        }}
      />
      <View
        style={{
          width: 2,
          height: size * 0.16,
          backgroundColor: color,
          position: 'absolute',
          bottom: 0,
        }}
      />
    </View>
  );
}

export default function MicButton({ isListening, onPressIn, onPressOut, size = 72 }: MicButtonProps) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      ringOpacity.value = withTiming(0.5, { duration: 200 });
      ringScale.value = withRepeat(
        withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else {
      ringScale.value = withTiming(1, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isListening]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <View style={[styles.wrapper, { width: size * 1.8, height: size * 1.8 }]}>
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
      <Animated.View style={pressStyle}>
        <Pressable
          onPressIn={() => {
            pressScale.value = withTiming(0.92, { duration: 100 });
            onPressIn();
          }}
          onPressOut={() => {
            pressScale.value = withTiming(1, { duration: 150 });
            onPressOut();
          }}
          accessibilityRole="button"
          accessibilityLabel="Mantener presionado para hablar con SYNKROS"
          style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={isListening ? [colors.ai.violet, colors.ai.cyan] : ['#1E1E27', '#16161D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <MicIcon color={isListening ? '#FFFFFF' : colors.text.primary} size={size * 0.42} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.ai.cyan,
  },
});
