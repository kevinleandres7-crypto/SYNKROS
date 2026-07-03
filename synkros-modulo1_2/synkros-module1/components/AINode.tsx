// components/AINode.tsx
// Elemento firma de SYNKROS: un nodo de IA con halo real, no un simple
// círculo de gradiente. Tres capas:
//   1. Halo exterior — blur/glow suave, respira más lento (ambiente).
//   2. Orbe núcleo — gradiente violeta→cyan, respira con la curva asimétrica.
//   3. Punto de luz interior — da profundidad, sutil parallax al pulsar.
//
// El acabado "Apple-level" viene de capas + sombra coloreada + easing
// orgánico, no de un solo shape animado.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, breathingCurve } from '../theme/tokens';
import type { AiNodeState } from '../store/useAppStore';

interface AINodeProps {
  state: AiNodeState;
  size?: number;
}

const STATE_SPEED_MULTIPLIER: Record<AiNodeState, number> = {
  idle: 1,
  listening: 0.7,
  thinking: 0.45,
  alert: 0.3,
};

export default function AINode({ state, size = 120 }: AINodeProps) {
  const coreScale = useSharedValue(1);
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.35);

  useEffect(() => {
    const mult = STATE_SPEED_MULTIPLIER[state];

    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.1, {
          duration: breathingCurve.inhaleMs * mult,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, {
          duration: breathingCurve.exhaleMs * mult,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );

    // El halo respira en la misma cadencia pero con mayor amplitud y
    // desfasado en opacidad, para dar sensación de profundidad real.
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.35, {
          duration: breathingCurve.inhaleMs * mult,
          easing: Easing.out(Easing.sin),
        }),
        withTiming(1, {
          duration: breathingCurve.exhaleMs * mult,
          easing: Easing.in(Easing.sin),
        })
      ),
      -1,
      false
    );

    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: breathingCurve.inhaleMs * mult }),
        withTiming(0.25, { duration: breathingCurve.exhaleMs * mult })
      ),
      -1,
      false
    );
  }, [state]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  return (
    <View style={{ width: size * 1.8, height: size * 1.8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.halo,
          haloStyle,
          { width: size * 1.6, height: size * 1.6, borderRadius: (size * 1.6) / 2 },
        ]}
      >
        <LinearGradient
          colors={[colors.ai.violet, colors.ai.cyan]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ flex: 1, borderRadius: (size * 1.6) / 2 }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.core,
          coreStyle,
          { width: size, height: size, borderRadius: size / 2, position: 'absolute' },
        ]}
      >
        <LinearGradient
          colors={[colors.ai.violet, colors.ai.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: size / 2 }}
        />
        <View
          style={[
            styles.innerLight,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
              top: size * 0.18,
              left: size * 0.22,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
  },
  core: {
    shadowColor: colors.ai.violet,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  innerLight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
