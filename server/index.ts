import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { haylooEngine } from './serverCore.ts';
import {
  transcribeAudioWithGemini,
  translateTextWithGemini,
  autoDetectAndTranslateWithGemini,
  generateIcebreakerWithGemini,
} from './geminiService.ts';

const app = express();
const PORT = 3000;
const server = createServer(app);

// Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Enable JSON body parsing for payloads with safe size limit
app.use(express.json({ limit: '25mb' }));

// -------------------------------------------------------------
// IN-MEMORY RESPONSE CACHE (TTL LRU for Gemini endpoints)
// -------------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const apiCache = new Map<string, CacheEntry<any>>();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  if (apiCache.size >= CACHE_MAX_SIZE) {
    // Evict oldest item
    const firstKey = apiCache.keys().next().value;
    if (firstKey) apiCache.delete(firstKey);
  }
  apiCache.set(key, { data, expiry: Date.now() + ttlMs });
}

// -------------------------------------------------------------
// RATE LIMITER MIDDLEWARE (Sliding window per client IP)
// -------------------------------------------------------------
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;

app.use('/api', (req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = rateLimits.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimits.set(ip, bucket);
  } else {
    bucket.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - bucket.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000).toString());

  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before sending another request.',
    });
  }
  next();
});

// Helper for string sanitization
function sanitizeText(str: any, maxLen = 1000): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

// API: Icebreaker / Topic Suggestions with Caching
app.post('/api/suggest-icebreaker', async (req, res) => {
  try {
    const { interests, professionA, professionB } = req.body || {};
    const safeProfA = sanitizeText(professionA, 100);
    const safeProfB = sanitizeText(professionB, 100);
    const safeInterests = Array.isArray(interests) ? interests.map((i: any) => sanitizeText(i, 50)).slice(0, 10) : [];

    const cacheKey = `icebreaker:${safeProfA}:${safeProfB}:${safeInterests.sort().join(',')}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const result = await generateIcebreakerWithGemini(safeInterests, safeProfA, safeProfB);
    setCached(cacheKey, result);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to suggest conversation topic' });
  }
});

// API: Audio transcription with Gemini
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType, targetLanguage } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Valid audioBase64 string is required' });
    }
    const safeMime = sanitizeText(mimeType, 50) || 'audio/webm';
    const safeLang = sanitizeText(targetLanguage, 20) || 'en';

    const result = await transcribeAudioWithGemini(audioBase64, safeMime, safeLang);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// API: Real-time caption translation with Caching
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;
    const safeText = sanitizeText(text, 2000);
    if (!safeText) {
      return res.status(400).json({ error: 'Valid text is required' });
    }
    const safeSrc = sanitizeText(sourceLanguage, 20) || 'auto';
    const safeTgt = sanitizeText(targetLanguage, 20) || 'en';

    const cacheKey = `trans:${safeSrc}:${safeTgt}:${safeText}`;
    const cached = getCached<{ translatedText: string }>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const translatedText = await translateTextWithGemini(safeText, safeSrc, safeTgt);
    const result = { translatedText };
    setCached(cacheKey, result);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to translate caption' });
  }
});

// API: Auto-detect incoming message language and translate with Caching
app.post('/api/translate-autodetect', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    const safeText = sanitizeText(text, 2000);
    if (!safeText) {
      return res.status(400).json({ error: 'Valid text is required' });
    }
    const safeTgt = sanitizeText(targetLanguage, 20) || 'en';

    const cacheKey = `autodetect:${safeTgt}:${safeText}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const result = await autoDetectAndTranslateWithGemini(safeText, safeTgt);
    setCached(cacheKey, result);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to translate message' });
  }
});

// WebSocket Server on path /ws
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || '127.0.0.1';

  const session = haylooEngine.registerSession(ws as any, undefined, ip);

  ws.on('message', (data) => {
    haylooEngine.processMessage(session.sessionId, data.toString());
  });

  ws.on('close', () => {
    haylooEngine.handleDisconnect(session.sessionId);
  });

  ws.on('error', () => {
    haylooEngine.handleDisconnect(session.sessionId);
  });
});

const distPath = path.resolve(process.cwd(), 'dist');

// Serve compiled static files
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please terminate existing instances or check active processes: 'lsof -i :${PORT}' / 'kill -9 <PID>'`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hayloo production server running on http://0.0.0.0:${PORT}`);
});
