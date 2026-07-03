// components/PanicButton.tsx
// Único elemento de la UI que usa el acento "caliente" (state.danger).
// Deliberadamente simple: en un momento de ansiedad, el usuario no debería
// tener que pensar qué hace este botón.

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme/tokens';

interface PanicButtonProps {
  onPress: () => void;
  label?: string;
}

export default function PanicButton({ onPress, label = 'Necesito ayuda ahora' }: PanicButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.state.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: colors.text.primary,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
});
