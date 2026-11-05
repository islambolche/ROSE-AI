import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

/**
 * Cleans an API key string by removing hidden/zero-width characters,
 * accidental .env prefixes (e.g. GEMINI_API_KEY=), Bearer prefixes, quotes, and whitespace.
 * Never logs or exposes the key.
 */
function cleanServerApiKey(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  // Strip common accidental prefixes like "GEMINI_API_KEY=", "GOOGLE_API_KEY=", "API_KEY=", "Bearer "
  cleaned = cleaned
    .replace(/^(?:export\s+)?(?:VITE_)?(?:GEMINI_API_KEY|GOOGLE_API_KEY|API_KEY)\s*=\s*/i, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '');

  // If already starts with AIza, preserve the entire key without truncating
  if (cleaned.startsWith('AIza')) {
    return cleaned;
  }
  const aizaMatch = cleaned.match(/(AIza[0-9A-Za-z_-]{30,80})/);
  if (aizaMatch) {
    return aizaMatch[1];
  }

  return cleaned;
}

/**
 * Redacts any potential API key patterns from error messages so keys are never leaked in logs or responses.
 */
function sanitizeErrorMessage(rawMsg: string): string {
  if (!rawMsg) return '';
  return rawMsg
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/sk_[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/key=[0-9A-Za-z_-]{10,}/gi, 'key=[REDACTED_KEY]');
}

// Helper to obtain a GoogleGenAI instance with 'aistudio-build' telemetry header.
// Called at request time to ensure the user's latest key is used.
function getGeminiClient(customApiKey?: string): {
  client: GoogleGenAI | null;
  keyUsed: boolean;
  cleanedLength: number;
  wrongProviderHint?: string;
} {
  const key = cleanServerApiKey(customApiKey) || cleanServerApiKey(process.env.GEMINI_API_KEY);
  if (!key) {
    return { client: null, keyUsed: false, cleanedLength: 0 };
  }

  if (key.startsWith('gsk_')) {
    return {
      client: null,
      keyUsed: true,
      cleanedLength: key.length,
      wrongProviderHint:
        'এটি Groq API কী (gsk_...)। অনুগ্রহ করে Gemini ঘরে সঠিক Google AI Studio (AIza...) কী দিন।',
    };
  }

  if (key.startsWith('sk_') || key.startsWith('sk-')) {
    return {
      client: null,
      keyUsed: true,
      cleanedLength: key.length,
      wrongProviderHint:
        'এটি ElevenLabs বা OpenAI কী (sk_...)। অনুগ্রহ করে Gemini ঘরে সঠিক Google AI Studio (AIza...) কী দিন।',
    };
  }

  const client = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 15000,
    },
  });
  return { client, keyUsed: true, cleanedLength: key.length };
}

// -------------------------------------------------------------
// 1. Validate / Check Gemini Connection
// -------------------------------------------------------------
app.post('/api/gemini/validate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { apiKey } = req.body || {};
  const cleanedKey = cleanServerApiKey(apiKey);

  console.log(`[Gemini Validate] Request started (cleanedKeyLength=${cleanedKey.length})`);

  if (!cleanedKey) {
    console.warn('[Gemini Validate] Request failed: No API key provided');
    return res.status(400).json({
      ok: false,
      status: 400,
      errorType: 'missing_key',
      message: 'কী দিন (No API key provided)',
    });
  }

  if (cleanedKey.startsWith('gsk_')) {
    return res.status(400).json({
      ok: false,
      status: 400,
      errorType: 'invalid_key',
      message: 'এটি Groq API কী (gsk_...)। Gemini ঘরে Google AI Studio (AIza...) কী দিন।',
    });
  }

  if (cleanedKey.startsWith('sk_') || cleanedKey.startsWith('sk-')) {
    return res.status(400).json({
      ok: false,
      status: 400,
      errorType: 'invalid_key',
      message: 'এটি ElevenLabs বা OpenAI কী (sk_...)। Gemini ঘরে Google AI Studio (AIza...) কী দিন।',
    });
  }

  let client: GoogleGenAI;
  try {
    client = new GoogleGenAI({
      apiKey: cleanedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 12000,
      },
    });
  } catch (initErr: any) {
    return res.status(400).json({
      ok: false,
      status: 400,
      errorType: 'invalid_key',
      message: 'কী ভুল ফরম্যাটে আছে (Invalid key format)',
    });
  }

  // Candidate models to try for fast validation:
  // 1. gemini-2.5-flash (ultra-fast, ~300ms, widely available)
  // 2. gemini-3.8-flash (with ThinkingLevel.LOW)
  // 3. gemini-flash-latest
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;
  let verifiedModel = '';

  for (const model of candidateModels) {
    try {
      const config: Record<string, any> = {};
      if (model === 'gemini-3.8-flash') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else {
        config.maxOutputTokens = 5;
      }

      const response = await client.models.generateContent({
        model,
        contents: 'Hi',
        config,
      });

      if (response) {
        verifiedModel = model;
        break;
      }
    } catch (err: any) {
      lastError = err;
      const status = Number(err?.status || err?.statusCode) || 500;
      const rawMsg = String(err?.message || '');

      const isModelNotFound =
        status === 404 ||
        rawMsg.includes('NOT_FOUND') ||
        rawMsg.includes('not found') ||
        rawMsg.includes('is not supported');

      if (isModelNotFound && model !== candidateModels[candidateModels.length - 1]) {
        console.log(`[Gemini Validate] Model ${model} returned 404/NOT_FOUND, trying fallback...`);
        continue;
      }

      // For auth errors, quota errors, or other errors, stop immediately
      break;
    }
  }

  if (verifiedModel) {
    const elapsedMs = Date.now() - startTime;
    console.log(`[Gemini Validate] Success! (model=${verifiedModel}, elapsed=${elapsedMs}ms)`);
    return res.status(200).json({
      ok: true,
      status: 200,
      model: verifiedModel,
      message: 'সফলভাবে সংযুক্ত (Connected)',
    });
  }

  const elapsedMs = Date.now() - startTime;
  const rawStatus = Number(lastError?.status || lastError?.statusCode) || 500;
  const msg = sanitizeErrorMessage(String(lastError?.message || ''));

  console.warn(
    `[Gemini Validate] Request failed (status=${rawStatus}, elapsed=${elapsedMs}ms, reason=${msg.slice(0, 160)})`
  );

  // 1. Invalid API key (Google Gemini returns 400 with API_KEY_INVALID or 401/403)
  if (
    rawStatus === 400 ||
    rawStatus === 401 ||
    rawStatus === 403 ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('INVALID_ARGUMENT') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('UNAUTHENTICATED')
  ) {
    return res.status(401).json({
      ok: false,
      status: 401,
      errorType: 'invalid_key',
      message: 'কী ভুল বা বাতিল (Invalid Gemini API key — Google AI Studio থেকে সঠিক কী দিন)',
    });
  }

  // 2. Quota or Rate Limit exceeded
  if (rawStatus === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
    return res.status(429).json({
      ok: false,
      status: 429,
      errorType: 'quota_exceeded',
      message: 'লিমিট শেষ (Quota or rate limit exceeded)',
    });
  }

  // 3. Timeout
  if (
    rawStatus === 408 ||
    rawStatus === 504 ||
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('timed out') ||
    msg.toLowerCase().includes('aborted')
  ) {
    return res.status(504).json({
      ok: false,
      status: 504,
      errorType: 'timeout',
      message: 'সংযোগ সময়সীমা শেষ হয়েছে (Connection timed out. Please try again.)',
    });
  }

  // 4. Other Server / API errors
  const httpStatus = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  return res.status(httpStatus).json({
    ok: false,
    status: httpStatus,
    errorType: 'api_error',
    message: msg ? `Gemini API ত্রুটি: ${msg.slice(0, 120)}` : 'সার্ভার বা সংযোগ সমস্যা',
  });
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

  const { client, keyUsed, wrongProviderHint } = getGeminiClient(apiKey);

  if (!keyUsed || !client) {
    return res.status(401).json({
      error:
        wrongProviderHint ||
        'API key missing or invalid. Please connect your Gemini key in Connections settings.',
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

    let targetModel = model || 'gemini-3.8-flash';
    if (targetModel.includes('3.5') || !targetModel.startsWith('gemini-')) {
      targetModel = 'gemini-3.8-flash';
    }

    const buildConfigForModel = (modelName: string) => {
      const cfg: any = {};
      if (systemPrompt) {
        cfg.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }
      const isGemini38Or4 =
        modelName.includes('gemini-3.8') || modelName.includes('gemini-4');

      if (isGemini38Or4) {
        cfg.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else {
        if (generationConfig?.maxOutputTokens) {
          cfg.maxOutputTokens = generationConfig.maxOutputTokens;
        }
        if (typeof generationConfig?.temperature === 'number') {
          cfg.temperature = generationConfig.temperature;
        }
      }
      return cfg;
    };

    const modelsToTry =
      targetModel === 'gemini-3.8-flash'
        ? ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash']
        : [targetModel, 'gemini-flash-latest'];

    let response: any;
    let lastErr: any;

    for (const candidateModel of modelsToTry) {
      let tryNextModel = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await client.models.generateContent({
            model: candidateModel,
            contents: formattedContents,
            config: buildConfigForModel(candidateModel),
          });
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          const status = err?.status || err?.statusCode || 500;
          const msg = sanitizeErrorMessage(String(err?.message || ''));
          if (
            status === 404 ||
            msg.includes('NOT_FOUND') ||
            msg.includes('not found') ||
            msg.includes('is not supported')
          ) {
            tryNextModel = true;
            break;
          }
          if ((status === 503 || msg.includes('high demand') || msg.includes('UNAVAILABLE')) && attempt === 0) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          throw err;
        }
      }
      if (!lastErr && response) {
        break;
      }
      if (!tryNextModel) {
        break;
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
    const rawStatus = Number(err?.status || err?.statusCode) || 500;
    const message = sanitizeErrorMessage(String(err?.message || 'Gemini generation error'));
    const status =
      rawStatus === 400 && (message.includes('API_KEY_INVALID') || message.includes('API key not valid'))
        ? 401
        : rawStatus >= 400 && rawStatus < 600
        ? rawStatus
        : 500;
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
