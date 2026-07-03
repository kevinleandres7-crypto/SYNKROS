# SYNKROS — Módulo 3: Algoritmo de Reorganización Dinámica

## 1. Naturaleza del algoritmo

Barrido (sweep) de una sola pasada, greedy y determinístico — **no** es
Programación Lineal ni usa OR-Tools. Fue una decisión deliberada: el caso de
uso es reaccionar en tiempo real a un solo evento de voz, no recalcular el
día óptimo desde cero. Un ILP resolvería mejor un reacomodo global, pero
introduce latencia y no determinismo (el "óptimo" puede variar entre
corridas). El brief pide explícitamente velocidad; O(n log n) — dominado por
el sort inicial — cumple eso con un comportamiento 100% predecible, algo
importante para un usuario ansioso que necesita confiar en que la app no le
va a "reinventar" el día entero por un mensaje de voz.

## 2. Por qué el buffer puede fallar en insertarse (y eso es correcto)

La regla más estricta del brief es "bajo ninguna circunstancia... pisar un
FIXED". Esa regla tiene prioridad sobre "siempre insertar el buffer de 15
min". Cuando dos tareas de alta carga quedan pegadas justo antes de una
FIXED sin margen —ni comprimiendo la tarea flexible anterior a su mínimo—
el motor **no inventa espacio de la nada**: omite el buffer y devuelve una
advertencia explícita para que un humano lo revise. Esto se probó
directamente: ver `__tests__/coreEngine.test.ts`, caso *"nunca genera un
buffer que se solape con la tarea FIXED siguiente"*.

Un bug real de la primera versión de este algoritmo generaba exactamente esa
violación (un buffer quedaba encimado con una junta FIXED) — se detectó
corriendo la demo, no solo leyendo el código, y se corrigió antes de esta
entrega. El fix: antes de insertar el buffer, el motor intenta comprimir la
tarea FLEXIBLE inmediatamente anterior hasta su duración mínima para abrirle
espacio; solo si eso no alcanza, se descarta el buffer con una advertencia.

## 3. Invariantes garantizadas (y probadas con tests, no solo documentadas)

1. Ninguna tarea `FIXED` cambia de `start` ni de `durationMinutes` en ningún escenario.
2. La línea de tiempo final nunca tiene dos tareas solapadas.
3. Un retraso reportado directamente sobre una tarea `FIXED` es rechazado —
   se registra como advertencia, el horario no se toca.
4. Cualquier conflicto irresoluble (no se pudo liberar espacio suficiente
   sin violar el punto 1) se reporta explícitamente en `conflicts`, nunca se
   resuelve "silenciosamente" rompiendo una garantía.

## 4. Complejidad y rendimiento real

- `separateEvents`: O(n)
- `resolveTimeline`: O(n log n) por el sort + O(n) el barrido (la compresión
  hacia atrás en el peor caso recorre el tramo flexible actual, acotado por n)
- `insertCognitiveBuffers`: O(n log n)
- Total por llamada de `runReorganization`: O(n log n)

Con el mock de 10 tareas (día completo realista), el tiempo medido en esta
máquina fue de **0.6–0.8 ms** por reorganización completa (incluye separar,
aplicar el retraso, insertar buffers y resolver conflictos). El test
`ejecuta la reorganización completa en menos de 20ms` deja margen de sobra
incluso en hardware más lento o con calendarios de cientos de tareas.

## 5. Cómo correr esto

```bash
npm install
npm run demo   # corre el caso del día caótico completo, con tiempos reales
npm test       # corre las 7 pruebas de invariantes (sin red, deterministas)
```

## 6. Integración con el Módulo 2

`runReorganization(timeline, delayInstruction)` espera `delayInstruction` ya
resuelto a un `targetTaskId` real del calendario — el matching entre el
`target_task` (string libre que devuelve el Módulo 2, ej. "el gimnasio") y el
`id` real de la tarea en la base de datos es responsabilidad de la capa que
conecta ambos módulos (fuzzy match o lookup exacto por título), no de este
Core Engine. Se decidió así para mantener el motor matemático 100% aislado
de cualquier ambigüedad de lenguaje natural.
