// tailwind.config.js
// Config de NativeWind. La paleta vive acá como fuente de verdad para las
// clases className — tokens.ts sigue existiendo para los pocos lugares
// (Reanimated, SVG) que necesitan el valor hex en JS puro.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './screens/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: '#0A0A0F',
        surface: '#16161D',
        'surface-raised': '#1E1E27',
        'ai-violet': '#7C5CFF',
        'ai-cyan': '#00E5CC',
        'task-fixed': '#4A4A57',
        'text-primary': '#F2F0F5',
        'text-secondary': '#8B8A96',
        danger: '#FF4D6D',
      },
      fontFamily: {
        display: ['SpaceGrotesk-Medium'],
        body: ['Inter-Regular'],
        'body-medium': ['Inter-Medium'],
        mono: ['JetBrainsMono-Regular'],
      },
    },
  },
  plugins: [],
};
