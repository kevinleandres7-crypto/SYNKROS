// theme/tokens.ts
// Sistema de tokens de SYNKROS — "tinta digital que respira"
// Un solo lugar de verdad para color/tipografía/spacing. Nada de hex sueltos en las pantallas.

export const colors = {
  bg: {
    base: '#0A0A0F',       // negro mate, no negro puro
    surface: '#16161D',    // tarjetas / inputs
    surfaceRaised: '#1E1E27',
  },
  ai: {
    violet: '#7C5CFF',     // extremo "inhalación" del nodo
    cyan: '#00E5CC',       // extremo "exhalación" del nodo
  },
  task: {
    fixed: '#4A4A57',      // bloques no movibles (candado)
    flexibleBorder: '#7C5CFF',
  },
  text: {
    primary: '#F2F0F5',
    secondary: '#8B8A96',
    disabled: '#4A4A57',
  },
  state: {
    danger: '#FF4D6D',     // único acento cálido — reservado para pánico/alertas
    success: '#00E5CC',
  },
} as const;

export const fonts = {
  display: 'SpaceGrotesk-Medium',   // títulos, Now Card
  body: 'Inter-Regular',            // texto de agenda/chat
  bodyMedium: 'Inter-Medium',
  mono: 'JetBrainsMono-Regular',    // temporizadores, duraciones
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

// Curva de "respiración" para el AINode: inhalar más lento que exhalar.
// Usada directamente por Reanimated (withTiming / withRepeat).
export const breathingCurve = {
  inhaleMs: 2600,
  exhaleMs: 1400,
} as const;
