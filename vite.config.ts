import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { WebSocketServer } from 'ws';

function haylooWebSocketPlugin(): Plugin {
  return {
    name: 'hayloo-websocket-server',
    apply: 'serve',
    configureServer(server) {
      if (!server.httpServer) return;

      // API Middleware for Vite dev mode
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/ai-practice/reply') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { partnerId, profession, interests, messages } = JSON.parse(body);
              const { generateAIPracticeReply } = await import('./server/geminiService.ts');
              const reply = await generateAIPracticeReply({ partnerId, profession, interests, messages });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'AI practice reply error' }));
            }
          });
          return;
        }

        if (req.method === 'POST' && req.url === '/api/transcribe-audio') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { audioBase64, mimeType, targetLanguage } = JSON.parse(body);
              const { transcribeAudioWithGemini } = await import('./server/geminiService.ts');
              const result = await transcribeAudioWithGemini(audioBase64, mimeType, targetLanguage);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Transcription error' }));
            }
          });
          return;
        }

        if (req.method === 'POST' && req.url === '/api/translate') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { text, sourceLanguage, targetLanguage } = JSON.parse(body);
              const { translateTextWithGemini } = await import('./server/geminiService.ts');
              const translatedText = await translateTextWithGemini(text, sourceLanguage || 'auto', targetLanguage || 'en');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ translatedText }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Translation error' }));
            }
          });
          return;
        }

        if (req.method === 'POST' && req.url === '/api/translate-autodetect') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { text, targetLanguage } = JSON.parse(body);
              const { autoDetectAndTranslateWithGemini } = await import('./server/geminiService.ts');
              const result = await autoDetectAndTranslateWithGemini(text, targetLanguage || 'en');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Auto-detect translation error' }));
            }
          });
          return;
        }

        if (req.method === 'POST' && req.url === '/api/suggest-icebreaker') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { interests, professionA, professionB } = JSON.parse(body || '{}');
              const { generateIcebreakerWithGemini } = await import('./server/geminiService.ts');
              const result = await generateIcebreakerWithGemini(interests || [], professionA, professionB);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Icebreaker suggestion error' }));
            }
          });
          return;
        }

        next();
      });

      const wss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', async (request, socket, head) => {
        if (request.url === '/ws' || request.url?.startsWith('/ws?')) {
          const { haylooEngine } = await import('./server/serverCore.ts');
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', async (ws) => {
        const { haylooEngine } = await import('./server/serverCore.ts');
        const session = haylooEngine.registerSession(ws as any);

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
    },
  };
}

export default defineConfig(() => {
  return {
    root: path.resolve(__dirname, 'client'),
    envDir: __dirname,
    plugins: [react(), tailwindcss(), haylooWebSocketPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob: ws: wss:; object-src 'none'; base-uri 'self';",
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob: ws: wss:; object-src 'none'; base-uri 'self';",
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      target: 'esnext',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('node_modules/@firebase/firestore') ||
              id.includes('node_modules/firebase/firestore')
            ) {
              return 'vendor-firebase-firestore';
            }
            if (
              id.includes('node_modules/@firebase/auth') ||
              id.includes('node_modules/firebase/auth')
            ) {
              return 'vendor-firebase-auth';
            }
            if (
              id.includes('node_modules/firebase') ||
              id.includes('node_modules/@firebase')
            ) {
              return 'vendor-firebase-core';
            }
            if (
              id.includes('node_modules/motion') ||
              id.includes('node_modules/framer-motion')
            ) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
          },
        },
      },
    },
  };
});
