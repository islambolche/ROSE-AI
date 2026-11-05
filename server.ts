import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Helper to obtain a GoogleGenAI instance with 'aistudio-build' telemetry header.
// This is called at request time to ensure the user's latest saved key is used.
// It no longer falls back to environment variables.
function getGeminiClient(customApiKey?: string): { client: GoogleGenAI; keyUsed: boolean } {
  const key = (customApiKey || '').trim();
  if (!key) {
    return { client: null as any, keyUsed: false };
  }
  const client = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return { client, keyUsed: true };
}

// -------------------------------------------------------------
// 1. Validate / Check Gemini Connection
// -------------------------------------------------------------
app.post('/api/gemini/validate', async (req: Request, res: Response) => {
  const { apiKey } = req.body || {};
  const { client, keyUsed } = getGeminiClient(apiKey);

  if (!keyUsed || !client) {
    return res.status(401).json({
      ok: false,
      status: 401,
      message: 'কী নেই (No API key provided)',
    });
  }

  try {
    // Correct method according to @google/genai SDK is generateContent
    await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });

    return res.json({
      ok: true,
      status: 200,
      message: 'সফলভাবে সংযুক্ত',
    });
  } catch (err: any) {
    const status = err?.status || err?.statusCode || 500;
    const msg = String(err?.message || '');
    
    if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
      return res.status(status).json({
        ok: false,
        status,
        message: `কী ভুল বা বাতিল: ${msg}`,
      });
    }
    if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return res.status(429).json({
        ok: false,
        status: 429,
        message: 'লিমিট শেষ',
      });
    }
    
    return res.status(status).json({
      ok: false,
      status,
      message: msg || 'সার্ভার বা সংযোগ সমস্যা',
    });
  }
});

// -------------------------------------------------------------
// 2. Generate Content (Chat & Reasoning)
// -------------------------------------------------------------
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  const {
    model = 'gemini-3.8-flash',
    systemPrompt,
    contents,
    prompt,
    apiKey,
    generationConfig,
  } = req.body || {};

  const { client, keyUsed } = getGeminiClient(apiKey);

  if (!keyUsed || !client) {
    return res.status(401).json({
      error: 'API key missing. Please connect your Gemini key in Connections settings.',
      status: 401,
    });
  }

  try {
    let formattedContents: any = contents;
    if (!formattedContents && prompt) {
      formattedContents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    if (Array.isArray(formattedContents)) {
      const sanitized: any[] = [];
      for (const item of formattedContents) {
        const text = (item.parts || []).map((p: any) => p?.text || '').join('\n').trim();
        if (!text) continue;
        if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === item.role) {
          sanitized[sanitized.length - 1].parts[0].text += '\n\n' + text;
        } else {
          sanitized.push({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text }],
          });
        }
      }
      if (sanitized.length === 0) {
        sanitized.push({ role: 'user', parts: [{ text: 'Hello' }] });
      } else if (sanitized[0].role !== 'user') {
        sanitized.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
      }
      formattedContents = sanitized;
    }

    const config: any = {};
    if (systemPrompt) {
      config.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }
    if (generationConfig?.maxOutputTokens) {
      config.maxOutputTokens = generationConfig.maxOutputTokens;
    }

    let targetModel = model || 'gemini-3.8-flash';
    if (targetModel.includes('3.5') || !targetModel.startsWith('gemini-')) {
      targetModel = 'gemini-3.8-flash';
    }

    let response: any;
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await client.models.generateContent({
          model: targetModel,
          contents: formattedContents,
          config,
        });
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        const status = err?.status || err?.statusCode || 500;
        const msg = String(err?.message || '');
        if (status === 503 || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    if (lastErr) {
      throw lastErr;
    }

    const text = response?.text || '';
    const finishReason = response?.candidates?.[0]?.finishReason || null;
    return res.json({
      text,
      finishReason,
      status: 200,
    });
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || 'Gemini generation error';
    return res.status(status).json({
      error: message,
      status,
    });
  }
});

// -------------------------------------------------------------
// 3. Generate Content Stream (SSE)
// -------------------------------------------------------------
app.post('/api/gemini/stream', async (req: Request, res: Response) => {
  const {
    model = 'gemini-3.8-flash',
    systemPrompt,
    contents,
    apiKey,
  } = req.body || {};

  const { client, keyUsed } = getGeminiClient(apiKey);

  if (!keyUsed || !client) {
    return res.status(401).json({ error: 'API key missing. Please connect your Gemini key in Connections settings.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const config: any = {};
    if (systemPrompt) {
      config.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const stream = await client.models.generateContentStream({
      model,
      contents,
      config,
    });

    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message || 'Streaming error' })}\n\n`);
    res.end();
  }
});

// -------------------------------------------------------------
// 4. WebSocket Live API Proxy for Real-Time Audio / Live Session
// -------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (clientWs: WebSocket, request: http.IncomingMessage) => {
  // Read key from query param: /api/gemini/live?key=...
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const apiKey = url.searchParams.get('key')?.trim() || '';

  if (!apiKey) {
    clientWs.send(JSON.stringify({ error: 'No Gemini API key provided. Please connect in Connections settings.' }));
    clientWs.close();
    return;
  }

  const liveHost = 'generativelanguage.googleapis.com';
  const liveUrl = `wss://${liveHost}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  const geminiWs = new WebSocket(liveUrl);

  geminiWs.on('open', () => {
    clientWs.send(JSON.stringify({ status: 'connected', message: 'Gemini Live session connected' }));
  });

  clientWs.on('message', (data) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(data);
    }
  });

  geminiWs.on('close', () => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });

  geminiWs.on('error', (err) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err.message }));
    }
  });
  
  geminiWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
  
  clientWs.on('close', () => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });
});

// Handle WebSocket upgrade for Live API
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/api/gemini/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// -------------------------------------------------------------
// 5. Mount Vite middleware in development or serve static in prod
// -------------------------------------------------------------
async function setupViteOrStatic() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
