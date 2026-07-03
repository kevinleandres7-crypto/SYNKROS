// server.ts
// Punto de entrada mínimo para levantar el Módulo 2 de forma aislada.
// En producción esto probablemente vive detrás de un API Gateway junto a
// los otros módulos, pero como servicio independiente ya es funcional.

import express from 'express';
import { voiceRouter } from './routes/voiceRoutes';

const app = express();
app.use(express.json({ limit: '100kb' })); // transcripts son cortos, no hay razón para permitir payloads grandes

app.use('/api/voice', voiceRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', module: 'synkros-motor-conversacional' });
});

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[SYNKROS Módulo 2] Motor conversacional escuchando en puerto ${PORT}`);
});
