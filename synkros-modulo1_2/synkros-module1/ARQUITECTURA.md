# SYNKROS — Módulo 1: Interfaz de Enfoque Líquido

## 1. Dirección visual (tokens de diseño)

El brief ya fija el eje principal: negro mate + nodo de IA morado/cyan latiendo. En vez de un dark-mode
genérico, lo llevamos a un concepto concreto: **"tinta digital que respira"** — la app nunca grita, solo pulsa,
como técnica de regulación de ansiedad (inhalar más lento que exhalar).

**Color**
| Token | Hex | Uso |
|---|---|---|
| `bg.base` | `#0A0A0F` | Fondo matte (no negro puro — evita fatiga visual en pantallas OLED) |
| `bg.surface` | `#16161D` | Tarjetas, inputs, elementos elevados |
| `ai.violet` | `#7C5CFF` | Extremo "inhalación" del nodo IA |
| `ai.cyan` | `#00E5CC` | Extremo "exhalación" del nodo IA |
| `task.fixed` | `#4A4A57` | Bloques fijos (candado) |
| `text.primary` | `#F2F0F5` | Texto principal |
| `text.secondary` | `#8B8A96` | Texto secundario / metadata |
| `state.danger` | `#FF4D6D` | Botón de pánico — único acento "caliente" de toda la UI |

**Tipografía**
- Display: `Space Grotesk` (títulos, "The Now Card") — geométrica pero cálida, no fría como Inter solo.
- Body: `Inter` — texto de agenda, chat.
- Mono/Data: `JetBrains Mono` — temporizadores y duraciones (un reloj digital no debería usar una tipografía humanista).

**Layout**
- Now Card: composición centrada, una sola tarea, mucho espacio negativo.
- Flujo Líquido: línea de tiempo vertical, candado = sólido, flexible = borde degradado punteado.
- Centro de Comando: chat clásico + waveform de voz + botones de pánico anclados abajo.

**Elemento firma:** `AINode` — el orbe que pulsa en las 3 pantallas con una curva de easing asimétrica
(inhalación lenta, exhalación rápida) via Reanimated. Es el único elemento animado de forma continua;
todo lo demás es estático o reacciona a interacción, para no generar ruido visual ansiogénico.

---

## 2. Mapa de componentes

```
App
├── ThemeProvider (tokens.ts)
├── AppNavigator (Bottom Tabs + Stack)
│   ├── Tab: NowCardScreen (Home)
│   │   └── AINode (pulsante, tamaño grande)
│   │   └── CurrentTaskCard
│   │   └── TimerDisplay (mono font)
│   ├── Tab: FlujoLiquidoScreen (Agenda)
│   │   └── TimelineList
│   │       └── TimelineItem (variant: fixed | flexible)
│   │           ├── LockIcon (si fixed)
│   │           └── FlexibleBorder (gradiente punteado, si flexible)
│   └── Tab: CentroComandoScreen (Chat)
│       ├── AINode (pequeño, en header)
│       ├── ChatMessageList
│       │   └── ChatBubble (variant: user | ai)
│       ├── VoiceInputBar (WebSocket streaming)
│       └── PanicButton (flotante, fijo abajo)
└── GlobalToast (feedback de reprogramación)
```

## 3. Árbol de estado global (Zustand)

```
useAppStore
├── session
│   ├── userId
│   └── isVoiceStreaming: boolean
├── tasks
│   ├── currentTask: Task | null        → alimenta NowCardScreen
│   ├── timeline: Task[]                → alimenta FlujoLiquidoScreen
│   └── actions: setCurrentTask, updateTask, reorderFlexible
├── chat
│   ├── messages: ChatMessage[]
│   ├── connectionStatus: 'idle' | 'connecting' | 'streaming' | 'error'
│   └── actions: pushMessage, setConnectionStatus, clearChat
└── ui
    ├── aiNodeState: 'idle' | 'listening' | 'thinking' | 'alert'  → controla color/velocidad del AINode
    └── actions: setAiNodeState
```

Justificación de Zustand sobre Redux: la app es reactiva a eventos de voz/IA de baja frecuencia
pero alta prioridad visual (cambios de `aiNodeState`); Zustand evita el boilerplate de actions/reducers
para algo que en la práctica son 3 slices pequeños.

## 4. Flujo de navegación

```
AppNavigator (NavigationContainer)
└── RootStack
    ├── MainTabs (Bottom Tab Navigator)
    │   ├── "Ahora"      → NowCardScreen
    │   ├── "Agenda"     → FlujoLiquidoScreen
    │   └── "Comando"    → CentroComandoScreen
    └── (modal) TaskDetailModal   ← se abre desde TimelineItem
```

Regla de navegación: `NowCardScreen` es siempre la pantalla de entrada (cold start), sin importar
la última pestaña usada — coherente con el principio "una sola tarea a la vez".

---

## 5. Archivos generados
- `theme/tokens.ts` — tokens de color/tipografía/spacing
- `store/useAppStore.ts` — store de Zustand con los 3 slices
- `navigation/AppNavigator.tsx` — bottom tabs + stack
- `components/AINode.tsx` — el orbe pulsante (elemento firma)
- `components/PanicButton.tsx` — botón de pánico reutilizable
- `screens/NowCardScreen.tsx`
- `screens/FlujoLiquidoScreen.tsx`
- `screens/CentroComandoScreen.tsx`
