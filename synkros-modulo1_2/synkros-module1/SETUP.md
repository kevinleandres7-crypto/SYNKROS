# Setup — Now Card (Módulo 1)

## Dependencias

```bash
npx expo install expo-linear-gradient react-native-reanimated react-native-svg
npm install nativewind zustand
npm install -D tailwindcss
```

## Configuración de NativeWind

1. `tailwind.config.js` ya está incluido en este entregable con la paleta de SYNKROS.
2. Agregar en `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel', 'react-native-reanimated/plugin'],
  };
};
```

3. Crear `global.css` en la raíz con:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Importar `global.css` en el `App.tsx` raíz.

## Fuentes

`SpaceGrotesk-Medium`, `Inter-Regular`, `Inter-Medium` y `JetBrainsMono-Regular`
deben cargarse con `expo-font` (o `useFonts` de `@expo-google-fonts/*`) antes
de renderizar `AppNavigator`. Si no se cargan, React Native cae a la fuente
del sistema — la pantalla sigue siendo funcional pero pierde la identidad tipográfica.

## Nota sobre `MicButton`

El ícono de micrófono está dibujado con `View`s planas a propósito (sin
librería de iconos) para no añadir una dependencia de ~500 componentes por
un solo glifo. Si el proyecto ya usa `lucide-react-native` en otro módulo,
se puede reemplazar por `<Mic />` sin tocar la lógica de animación.
