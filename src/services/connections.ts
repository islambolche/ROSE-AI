import { ConnectionProvider, ConnectionStatus } from '../types';

/**
 * Sanitizes an API key from input or clipboard:
 * - Removes zero-width/invisible characters, line breaks, quotes, and extra spaces
 * - Strips accidental .env or header prefixes (e.g., GEMINI_API_KEY=, Bearer )
 * - Extracts embedded Google AI Studio key (AIza...) if surrounding text was pasted
 * Never logs or exposes the key.
 */
export const cleanApiKey = (raw: string, provider?: ConnectionProvider): string => {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  // Strip accidental key=value or Bearer prefixes
  cleaned = cleaned
    .replace(
      /^(?:export\s+)?(?:VITE_)?(?:GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|ELEVENLABS_API_KEY|XI_API_KEY|API_KEY)\s*=\s*/i,
      ''
    )
    .replace(/^Bearer\s+/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '');

  // If a Google AI Studio key starts with AIza, preserve it completely without truncating
  if (!provider || provider === 'gemini') {
    if (cleaned.startsWith('AIza')) {
      return cleaned;
    }
    const aizaMatch = cleaned.match(/(AIza[0-9A-Za-z_-]{30,80})/);
    if (aizaMatch) {
      return aizaMatch[1];
    }
  }

  return cleaned;
};

/**
 * Redacts any API key pattern from error strings so full keys are never exposed in logs or UI.
 */
function sanitizeKeyFromMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/sk_[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]');
}

export const CONNECTION_DETAILS: Record<
  ConnectionProvider,
  {
    name: string;
    subtitle: string;
    getKeyUrl: string;
    guideline: string;
    keyPlaceholder: string;
    specialNote?: string;
  }
> = {
  gemini: {
    name: 'GEMINI',
    subtitle: 'Voice & reasoning',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    guideline: 'Google AI Studio থেকে আপনার Gemini API কী তৈরি করে পেস্ট করুন।',
    keyPlaceholder: 'আপনার কী এখানে দিন...',
  },
  groq: {
    name: 'GROQ',
    subtitle: 'Chat, ultra fast',
    getKeyUrl: 'https://console.groq.com/keys',
    guideline: 'Groq Console থেকে অতি দ্রুত Llama ও অন্যান্য মডেলের জন্য API কী নিন।',
    keyPlaceholder: 'gsk_...',
  },
  elevenLabs: {
    name: 'ELEVENLABS',
    subtitle: 'Voice studio',
    getKeyUrl: 'https://elevenlabs.io/app/api-keys',
    guideline: 'ElevenLabs ড্যাশবোর্ড থেকে হাইপার-রিয়েলিস্টিক ভয়েস সিন্থেসিস কী সংগ্রহ করুন।',
    keyPlaceholder: 'sk_...',
    specialNote: 'সাধারণত ৫০-৬০ অক্ষরের হয়। এর চেয়ে অনেক লম্বা হলে হয়তো দুইবার পেস্ট হয়েছে।',
  },
};

// Track in-flight AbortControllers per provider so requests don't collide
const activeControllers: Partial<Record<ConnectionProvider, AbortController>> = {};

const VALIDATION_TIMEOUT_MS = 15000; // 15 seconds for responsive API validation

export interface ValidateConnectionResult {
  status: ConnectionStatus;
  message: string;
  success: boolean;
  aborted?: boolean;
}

/**
 * Validates the API key with a 15s timeout, per-provider AbortController management,
 * and safe diagnostic lifecycle logging (never logging the API key itself).
 */
export async function validateConnection(
  provider: ConnectionProvider,
  rawKey: string,
  options?: { source?: 'manual_test' | 'save' | 'auto_verify' }
): Promise<ValidateConnectionResult> {
  const source = options?.source || 'manual_test';
  const cleanKey = cleanApiKey(rawKey, provider);

  if (!cleanKey) {
    return { status: 'not_set', message: '', success: false };
  }

  // Client-side format sanity check for misplaced provider keys
  if (provider === 'gemini') {
    if (cleanKey.startsWith('gsk_')) {
      console.warn(
        `[Connections][${provider}] Request failed before send: Groq key (gsk_...) detected in Gemini field (length=${cleanKey.length})`
      );
      return {
        status: 'error',
        message: 'এটি Groq কী (gsk_...)। Gemini ঘরে Google AI Studio (AIza...) কী দিন।',
        success: false,
      };
    }
    if (cleanKey.startsWith('sk_') || cleanKey.startsWith('sk-')) {
      console.warn(
        `[Connections][${provider}] Request failed before send: ElevenLabs/OpenAI key (sk_...) detected in Gemini field (length=${cleanKey.length})`
      );
      return {
        status: 'error',
        message: 'এটি ElevenLabs/OpenAI কী (sk_...)। Gemini ঘরে সঠিক Google AI Studio (AIza...) কী দিন।',
        success: false,
      };
    }
  }

  // If a background auto_verify runs while a manual test is already in flight for this provider, skip auto_verify
  const existingController = activeControllers[provider];
  if (existingController && !existingController.signal.aborted) {
    if (source === 'auto_verify') {
      console.info(
        `[Connections][${provider}] Skipping auto_verify because a validation request is already in flight.`
      );
      return {
        status: 'checking',
        message: 'যাচাই করা হচ্ছে...',
        success: false,
        aborted: true,
      };
    }
    // A new manual test or save supersedes the previous in-flight request for this provider
    console.info(
      `[Connections][${provider}] Cancelling previous in-flight request before starting new ${source} request.`
    );
    try {
      existingController.abort('SUPERSEDED_BY_NEW_REQUEST');
    } catch {
      // ignore
    }
  }

  const controller = new AbortController();
  activeControllers[provider] = controller;
  let didTimeout = false;

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    console.warn(
      `[Connections][${provider}] Timeout triggered after ${VALIDATION_TIMEOUT_MS}ms (source=${source})`
    );
    try {
      controller.abort('REQUEST_TIMEOUT');
    } catch {
      // ignore
    }
  }, VALIDATION_TIMEOUT_MS);

  const startTime = performance.now();
  console.info(
    `[Connections][${provider}] Request started (source=${source}, keyLength=${cleanKey.length})`
  );

  try {
    let response: Response;

    if (provider === 'gemini') {
      // Server-side Gemini validation proxy
      response = await fetch('/api/gemini/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: cleanKey }),
        signal: controller.signal,
      });
    } else if (provider === 'groq') {
      // GET https://api.groq.com/openai/v1/models with Authorization: Bearer <key>
      response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
        },
        signal: controller.signal,
      });
    } else {
      // GET https://api.elevenlabs.io/v1/user with xi-api-key: <key>
      response = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': cleanKey,
        },
        signal: controller.signal,
      });
    }

    const rawText = await response.text();
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {};
    }

    const elapsedMs = Math.round(performance.now() - startTime);
    console.info(
      `[Connections][${provider}] API response received (status=${response.status}, elapsed=${elapsedMs}ms)`
    );

    if (response.ok && (provider !== 'gemini' || data.ok !== false)) {
      return { status: 'ready', message: 'সফলভাবে সংযুক্ত (Connected)', success: true };
    }

    const rawServerMsg =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
        ? data.error
        : typeof data?.error?.message === 'string'
        ? data.error.message
        : '';
    const serverMsg = sanitizeKeyFromMessage(rawServerMsg);

    console.warn(
      `[Connections][${provider}] Request failed (status=${response.status}, elapsed=${elapsedMs}ms, message=${
        serverMsg || 'HTTP ' + response.status
      })`
    );

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return {
        status: 'error',
        message: serverMsg || 'কী ভুল বা বাতিল (Invalid API key)',
        success: false,
      };
    }

    if (response.status === 429) {
      return {
        status: 'error',
        message: serverMsg || 'লিমিট শেষ (Quota or rate limit exceeded)',
        success: false,
      };
    }

    if (response.status === 408 || response.status === 504) {
      return {
        status: 'error',
        message: 'সংযোগ সময়সীমা শেষ হয়েছে (Connection timed out)',
        success: false,
      };
    }

    return {
      status: 'error',
      message: serverMsg || `সার্ভার বা API ত্রুটি (HTTP ${response.status})`,
      success: false,
    };
  } catch (err: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    const abortReason = controller.signal.aborted ? String(controller.signal.reason || '') : '';
    const errName = String(err?.name || '');
    const errMsg = sanitizeKeyFromMessage(String(err?.message || ''));

    // 1. Superseded by a newer request from the user
    if (abortReason === 'SUPERSEDED_BY_NEW_REQUEST' || errMsg === 'SUPERSEDED_BY_NEW_REQUEST') {
      console.info(
        `[Connections][${provider}] Request aborted: superseded by a newer request (${elapsedMs}ms)`
      );
      return {
        status: 'error',
        message: 'নতুন টেস্ট শুরু হয়েছে...',
        success: false,
        aborted: true,
      };
    }

    // 2. Timeout triggered
    if (
      didTimeout ||
      abortReason === 'REQUEST_TIMEOUT' ||
      errMsg === 'REQUEST_TIMEOUT' ||
      errMsg.toLowerCase().includes('timeout') ||
      errMsg.toLowerCase().includes('timed out')
    ) {
      console.warn(
        `[Connections][${provider}] Request aborted due to timeout (${elapsedMs}ms)`
      );
      return {
        status: 'error',
        message: 'সংযোগ সময়সীমা শেষ হয়েছে (Connection timed out)',
        success: false,
      };
    }

    // 3. Other AbortError
    if (
      errName === 'AbortError' ||
      controller.signal.aborted ||
      errMsg.toLowerCase().includes('signal is aborted') ||
      errMsg.toLowerCase().includes('aborted')
    ) {
      console.warn(
        `[Connections][${provider}] Request aborted (${elapsedMs}ms, reason=${abortReason || 'AbortError'})`
      );
      return {
        status: 'error',
        message: 'অনুরোধটি বাতিল বা সময়সীমা শেষ হয়েছে। অনুগ্রহ করে আবার Test চাপুন।',
        success: false,
        aborted: true,
      };
    }

    // 4. Network / Offline error
    if (
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      errName === 'TypeError' ||
      errMsg.includes('Failed to fetch') ||
      errMsg.includes('NetworkError')
    ) {
      console.warn(`[Connections][${provider}] Network failure (${elapsedMs}ms): ${errMsg}`);
      return {
        status: 'error',
        message: 'নেটওয়ার্ক বা সংযোগ সমস্যা। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
        success: false,
      };
    }

    console.warn(`[Connections][${provider}] Request failed (${elapsedMs}ms): ${errMsg}`);
    return {
      status: 'error',
      message: errMsg || 'ইন্টারনেট বা সংযোগ সমস্যা',
      success: false,
    };
  } finally {
    clearTimeout(timeoutId);
    if (activeControllers[provider] === controller) {
      delete activeControllers[provider];
    }
  }
}
