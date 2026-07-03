// routes/voiceRoutes.ts
import { Router } from 'express';
import { handleVoiceTranscript } from '../controllers/voiceController';

export const voiceRouter = Router();

// POST /api/voice/process
// Body: { transcript: string, nowISO?: string, timezone?: string, todaysTasks?: TaskContext[] }
voiceRouter.post('/process', handleVoiceTranscript);
