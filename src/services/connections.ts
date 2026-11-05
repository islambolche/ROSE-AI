import { ConnectionProvider, ConnectionStatus } from '../types';

export const cleanApiKey = (raw: string): string => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
};

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

/**
 * Validates the API key with a strict 10s timeout.
 * Never logs keys or payloads to the console.
 */
export async function validateConnection(
  provider: ConnectionProvider,
  rawKey: string
): Promise<{ status: ConnectionStatus; message: string }> {
  const cleanKey = cleanApiKey(rawKey);
  if (!cleanKey) {
    return { status: 'not_set', message: '' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  }, 10000);

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

    const data = await response.json().catch(() => ({}));
    const serverMsg = data.message || data.error || '';

    clearTimeout(timeoutId);

    if (response.status === 200) {
      return { status: 'ready', message: 'সফলভাবে সংযুক্ত' };
    } else {
      // Use descriptive message from server if available
      return { status: 'error', message: serverMsg || 'কী ভুল বা বাতিল' };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { status: 'error', message: err.message || 'ইন্টারনেট বা সংযোগ সমস্যা' };
  }
}
