import { cleanApiKey } from '../services/connections';
import { settingsService } from '../services/settings';
import { AgentId } from '../types';
import { cleanTextForSpeech } from './voiceChat';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export interface TtsOptions {
  agentId: AgentId;
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
  onEngineChange?: (note: string) => void;
}

let sessionCharactersSent = 0;
let currentAudio: HTMLAudioElement | null = null;

export const ttsService = {
  getCharactersSent() {
    return sessionCharactersSent;
  },

  stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  },

  async speak(options: TtsOptions): Promise<void> {
    const settings = settingsService.getSettings();
    const voiceSettings = settings.voiceSettings;
    const engine = voiceSettings.engine;
    const apiKey = cleanApiKey(settings.connections.elevenLabsKey);
    const voiceId = options.agentId === 'rose'
      ? (settings.characterSettings?.rose?.elevenLabsVoiceId || settings.roseCharacter?.elevenLabsVoiceId)?.trim()
      : (settings.agents as any)?.[options.agentId]?.elevenLabsVoiceId?.trim();

    const shouldUseElevenLabs = 
      (engine === 'ElevenLabs' || (engine === 'Auto' && apiKey && voiceId)) && 
      apiKey && 
      voiceId;

    if (!shouldUseElevenLabs) {
      // Fallback or explicit Browser enginehandled by caller (voiceChat.ts)
      throw new Error('BROWSER_FALLBACK');
    }

    this.stop();

    // Clean text and handle character limit
    let textToSpeak = cleanTextForSpeech(options.text);
    const charLimit = voiceSettings.elevenLabsCharLimit || 300;

    if (textToSpeak.length > charLimit) {
      // Try to find the last sentence end within limit
      const truncated = textToSpeak.slice(0, charLimit);
      const lastPunc = Math.max(
        truncated.lastIndexOf('।'),
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('?'),
        truncated.lastIndexOf('!')
      );
      if (lastPunc > charLimit * 0.5) {
        textToSpeak = textToSpeak.slice(0, lastPunc + 1);
      } else {
        textToSpeak = truncated;
      }
    }

    if (!textToSpeak.trim()) {
      options.onEnd?.();
      return;
    }

    options.onStart?.();

    try {
      const response = await fetch(`${ELEVENLABS_BASE_URL}/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: textToSpeak,
          model_id: voiceSettings.elevenLabsModelId || 'eleven_v3',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          options.onEngineChange?.('ElevenLabs কী ভুল, ব্রাউজার কণ্ঠে বলছি।');
          throw new Error('BROWSER_FALLBACK');
        }
        if (status === 402 || status === 429) {
          options.onEngineChange?.('ElevenLabs ক্রেডিট বা সীমা শেষ, ব্রাউজার কণ্ঠে বলছি।');
          throw new Error('BROWSER_FALLBACK');
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail?.message || `ElevenLabs Error ${status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      
      sessionCharactersSent += textToSpeak.length;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        options.onEnd?.();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        options.onError?.('অডিও প্লেব্যাক ত্রুটি।');
      };

      await audio.play();
    } catch (err: any) {
      if (err.message === 'BROWSER_FALLBACK') {
        throw err;
      }
      options.onError?.(err.message || 'ElevenLabs সংযোগ ব্যর্থ।');
      throw new Error('BROWSER_FALLBACK');
    }
  }
};
