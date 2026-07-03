# SYNKROS — Módulo 2: Motor Conversacional y Extracción

## 1. Decisión de stack

**Node.js + TypeScript + OpenAI GPT-4o-mini (Structured Outputs nativo).**

Alternativas consideradas:
- **Python + Pydantic**: igual de válido; se descartó solo por consistencia con el
  Módulo 1 (mismo lenguaje en todo el repo facilita que un dev haga el mismo día
  frontend y middleware).
- **Gemini Flash**: más barato, pero su cumplimiento de JSON Schema estricto en
  objetos anidados es menos maduro que el modo `strict: true` de OpenAI a la fecha.
  El servicio está diseñado para que cambiar de proveedor sea aislado a
  `services/conversationEngine.ts` — el schema, el prompt y el controller no
  dependen del proveedor.

## 2. Flujo de datos

```
Voz del usuario (Módulo 1)
      │  transcript: string
      ▼
POST /api/voice/process  (controllers/voiceController.ts)
      │  valida forma del request (Zod)
      ▼
processVoiceTranscript()  (services/conversationEngine.ts)
      │  construye systemPrompt con contexto temporal + tareas del día
      │  llama a GPT-4o-mini con response_format = ExtractionSchema (strict)
      │  valida la respuesta OTRA VEZ con Zod (no confía ciegamente en el SDK)
      │  aplica reglas de negocio (assertBusinessRules)
      ▼
ExtractionResult (JSON tipado)
      │
      ▼
Core Engine (Módulo 3) — decide cómo reorganizar el calendario
```

## 3. Por qué dos capas de validación (SDK + Zod manual)

El SDK de OpenAI con `zodResponseFormat` ya fuerza el shape a nivel de API.
Se vuelve a validar con `ExtractionSchema.parse()` inmediatamente después por
dos razones concretas:
1. Defensa ante cambios de comportamiento del SDK en futuras versiones.
2. Es el mismo punto donde se pueden agregar validaciones que Zod no expresa
   solo (dependencias entre campos) — eso es `assertBusinessRules`.

## 4. Reintentos

Solo se reintenta (máximo 1 vez) cuando el fallo es de validación de schema o
de regla de negocio — un fallo así puede deberse a una respuesta truncada o
inconsistente puntual del modelo. **No se reintenta** en timeout ni en error
de red: reintentar inmediatamente un timeout casi nunca lo resuelve y solo
duplica la latencia percibida por un usuario que ya está esperando.

## 5. Manejo de errores hacia el usuario

`SynkrosExtractionError` tiene un `code` explícito (`EMPTY_TRANSCRIPT`,
`MODEL_TIMEOUT`, `MODEL_REFUSED`, `SCHEMA_VALIDATION_FAILED`,
`BUSINESS_RULE_VIOLATION`, `UPSTREAM_ERROR`). El controller HTTP nunca reenvía
el `cause` interno (podría contener detalles del proveedor) — solo el
`code` y un mensaje seguro. Esto le permite al Módulo 1 decidir, por ejemplo,
mostrar "SYNKROS no te escuchó bien, ¿puedes repetirlo?" en `MODEL_REFUSED`
sin acoplarse a los detalles internos del motor.

## 6. `protected_tasks` — campo agregado sobre lo pedido

El brief pedía `intent`, `delay_minutes`, `target_task`, `flexibility_level`
y `system_response`. Se agregó `protected_tasks` porque el ejemplo de uso del
propio brief ("no toques mi junta con el cliente") es justo el caso que ese
campo existe para resolver: sin él, esa restricción solo viviría dentro del
texto libre de `system_response`, y el Core Engine (Módulo 3) no tendría un
campo estructurado y confiable en el que apoyarse para *garantizar* que esa
tarea no se mueva.

## 7. Cómo correr esto

```bash
npm install
cp .env.example .env   # agregar tu OPENAI_API_KEY
npm run dev            # levanta el servidor en :3001
npm run example        # corre el caso del brief directo, sin HTTP
npm test               # corre los tests de schema y reglas de negocio (sin red)
```
