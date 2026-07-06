# SYNKROS - Asistencia Ejecutiva Premium con IA

App móvil de asistencia ejecutiva premium con inteligencia artificial, construida con React Native y Expo.

## Características

- **Chat con IA**: Interacción conversacional con GPT-4o-mini
- **Gestión de Agenda**: Creación, actualización y eliminación de eventos
- **Notificaciones Automáticas**: Recordatorios 15 minutos antes de cada evento
- **Interfaz Premium**: Diseño dark mode con acentos en Cian Eléctrico y Sapphire
- **Control por Voz**: Interacción por voz con feedback visual

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno en `app.json`:
- `openaiApiKey`: Tu API key de OpenAI
- `supabaseUrl`: URL de tu proyecto Supabase
- `supabaseAnonKey`: Anon key de tu proyecto Supabase

3. Configurar base de datos en Supabase:
```sql
CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Realtime para notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
```

## Desarrollo

Iniciar el servidor de desarrollo:
```bash
npm start
```

## Build APK

Para generar el APK de producción:
```bash
eas build --platform android --profile production
```

## Estructura del Proyecto

```
synkros/
├── app/                    # Rutas de Expo Router
│   ├── (tabs)/            # Navegación por tabs
│   ├── index.tsx          # Pantalla de autenticación
│   └── _layout.tsx        # Layout principal
├── src/
│   ├── screens/           # Pantallas de la app
│   ├── services/          # Servicios (OpenAI, Supabase, Notificaciones)
│   ├── components/        # Componentes reutilizables
│   ├── types/             # Definiciones de TypeScript
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utilidades
├── assets/                # Imágenes y recursos
├── app.json              # Configuración de Expo
├── eas.json              # Configuración de EAS Build
└── package.json          # Dependencias
```

## Tecnologías

- React Native
- Expo SDK 51
- Expo Router
- OpenAI GPT-4o-mini
- Supabase
- Expo Notifications
- Expo AV (Audio)
- TypeScript
