import {
  AppSettings,
  AgentSettingsConfig,
  AgentId,
  ApiConnections,
  AiModelConfig,
  UserAddressAsType,
  RoseCharacterConfig,
  RoseCharacterPresetType,
  RoseLanguageStyleType,
  RosePronounType,
  RoseReplyLengthType,
  VoiceSettingsConfig,
} from '../types';

const STORAGE_KEY = 'rose_ai_user_preferences_v2';

const VALID_ADDRESS_AS: UserAddressAsType[] = ['শুধু নাম', 'ভাই', 'আপু', 'স্যার', 'ম্যাডাম'];

const VALID_ROSE_PRESETS: RoseCharacterPresetType[] = [
  'Soul Bond',
  'Best Friend',
  'Friendly',
  'Professional',
  'Funny',
  'Teacher',
  'GF Mode',
  'Custom',
];

const VALID_ROSE_LANG_STYLES: RoseLanguageStyleType[] = [
  'শুদ্ধ বাংলা',
  'কথ্য বাংলা',
  'বাংলা-ইংরেজি মিশ্র',
];

const VALID_ROSE_PRONOUNS: RosePronounType[] = ['তুমি', 'আপনি', 'তুই'];

const VALID_ROSE_REPLY_LENGTHS: RoseReplyLengthType[] = ['ছোট', 'মাঝারি'];

export const DEFAULT_ROSE_CHARACTER_SETTINGS: RoseCharacterConfig = {
  preset: 'Soul Bond',
  customCharacter: '',
  languageStyle: 'কথ্য বাংলা',
  pronoun: 'তুমি',
  emotionLevel: 8,
  humorLevel: 4,
  replyLength: 'ছোট',
  useEmoji: false,
  nickname: '',
};

export const DEFAULT_AGENTS_SETTINGS: Record<AgentId, AgentSettingsConfig> = {
  rose: {
    personality: 'Friendly',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  mira: {
    personality: 'Friendly',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  arin: {
    personality: 'Friendly',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  zayan: {
    personality: 'Friendly',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  naira: {
    personality: 'Friendly',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
};

export const DEFAULT_CONNECTIONS: ApiConnections = {
  geminiKey: '',
  groqKey: '',
  elevenLabsKey: '',
};

export const DEFAULT_AI_MODEL_SETTINGS: AiModelConfig = {
  selectedChatModelId: 'openai/gpt-oss-120b',
  customChatModelId: '',
  customChatProvider: 'groq',
  liveVoiceModelId: 'gemini-3.8-live',
  customLiveVoiceModelId: '',
  sttModelId: 'whisper-large-v3-turbo',
  fallbackToGemini: true,
  autoSwitchOnQuotaError: true,
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettingsConfig = {
  voiceReply: true,
  speed: 1.0,
  volume: 1.0,
  engine: 'Auto',
  elevenLabsModelId: 'eleven_v3',
  elevenLabsCharLimit: 300,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  userName: '',
  userAddressAs: 'শুধু নাম',
  hasCompletedWelcome: false,
  glowIntensity: 100, // 50% to 150%
  chatFontSize: 'medium',
  showCameraMic: true,
  agents: DEFAULT_AGENTS_SETTINGS,
  roseCharacter: DEFAULT_ROSE_CHARACTER_SETTINGS,
  connections: DEFAULT_CONNECTIONS,
  aiModel: DEFAULT_AI_MODEL_SETTINGS,
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  pcControl: {
    allowFileSave: false,
  },
  voiceCaptions: false,
};

type SettingsListener = (settings: AppSettings) => void;
const listeners = new Set<SettingsListener>();

const OLD_MODELS = [
  'gemini-1.5-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

export const settingsService = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...DEFAULT_APP_SETTINGS };
      const parsed = JSON.parse(stored);

      const mergedAgents: Record<AgentId, AgentSettingsConfig> = {
        ...DEFAULT_AGENTS_SETTINGS,
      };

      if (parsed.agents) {
        Object.keys(parsed.agents).forEach((key) => {
          const aid = key as AgentId;
          mergedAgents[aid] = {
            ...DEFAULT_AGENTS_SETTINGS[aid],
            ...parsed.agents[aid],
          };
        });
      }

      // Clean legacy hardcoded profile.json instruction if present in stored rose config
      if (
        mergedAgents.rose?.customInstructions &&
        mergedAgents.rose.customInstructions.includes('profile.json')
      ) {
        mergedAgents.rose = {
          ...mergedAgents.rose,
          customInstructions: '',
        };
      }

      const rawAddressAs = parsed.userAddressAs as UserAddressAsType;
      const validAddressAs: UserAddressAsType = VALID_ADDRESS_AS.includes(rawAddressAs)
        ? rawAddressAs
        : 'শুধু নাম';

      const rawRC = parsed.roseCharacter || {};
      const validPreset: RoseCharacterPresetType = VALID_ROSE_PRESETS.includes(rawRC.preset)
        ? rawRC.preset
        : DEFAULT_ROSE_CHARACTER_SETTINGS.preset;
      const validLangStyle: RoseLanguageStyleType = VALID_ROSE_LANG_STYLES.includes(
        rawRC.languageStyle
      )
        ? rawRC.languageStyle
        : DEFAULT_ROSE_CHARACTER_SETTINGS.languageStyle;
      const validPronoun: RosePronounType = VALID_ROSE_PRONOUNS.includes(rawRC.pronoun)
        ? rawRC.pronoun
        : DEFAULT_ROSE_CHARACTER_SETTINGS.pronoun;
      const validReplyLen: RoseReplyLengthType = VALID_ROSE_REPLY_LENGTHS.includes(
        rawRC.replyLength
      )
        ? rawRC.replyLength
        : DEFAULT_ROSE_CHARACTER_SETTINGS.replyLength;

      const roseCharacter: RoseCharacterConfig = {
        preset: validPreset,
        customCharacter:
          typeof rawRC.customCharacter === 'string'
            ? rawRC.customCharacter.slice(0, 1500)
            : '',
        languageStyle: validLangStyle,
        pronoun: validPronoun,
        emotionLevel:
          typeof rawRC.emotionLevel === 'number'
            ? Math.max(0, Math.min(10, rawRC.emotionLevel))
            : DEFAULT_ROSE_CHARACTER_SETTINGS.emotionLevel,
        humorLevel:
          typeof rawRC.humorLevel === 'number'
            ? Math.max(0, Math.min(10, rawRC.humorLevel))
            : DEFAULT_ROSE_CHARACTER_SETTINGS.humorLevel,
        replyLength: validReplyLen,
        useEmoji: Boolean(rawRC.useEmoji),
        nickname: typeof rawRC.nickname === 'string' ? rawRC.nickname : '',
      };

      // Migration for old hardcoded models
      let selectedChatModelId =
        parsed.aiModel?.selectedChatModelId || DEFAULT_AI_MODEL_SETTINGS.selectedChatModelId;
      if (OLD_MODELS.includes(selectedChatModelId)) {
        selectedChatModelId = DEFAULT_AI_MODEL_SETTINGS.selectedChatModelId;
      }

      let liveVoiceModelId =
        parsed.aiModel?.liveVoiceModelId || DEFAULT_AI_MODEL_SETTINGS.liveVoiceModelId;
      if (OLD_MODELS.includes(liveVoiceModelId)) {
        liveVoiceModelId = DEFAULT_AI_MODEL_SETTINGS.liveVoiceModelId;
      }

      return {
        userName: typeof parsed.userName === 'string' ? parsed.userName : '',
        userAddressAs: validAddressAs,
        hasCompletedWelcome: Boolean(parsed.hasCompletedWelcome),
        glowIntensity: typeof parsed.glowIntensity === 'number' ? parsed.glowIntensity : 100,
        chatFontSize: parsed.chatFontSize || DEFAULT_APP_SETTINGS.chatFontSize,
        showCameraMic: parsed.showCameraMic !== undefined ? parsed.showCameraMic : true,
        agents: mergedAgents,
        roseCharacter,
        connections: {
          geminiKey:
            typeof parsed.connections?.geminiKey === 'string'
              ? parsed.connections.geminiKey
              : '',
          groqKey:
            typeof parsed.connections?.groqKey === 'string' ? parsed.connections.groqKey : '',
          elevenLabsKey:
            typeof parsed.connections?.elevenLabsKey === 'string'
              ? parsed.connections.elevenLabsKey
              : '',
        },
        aiModel: {
          selectedChatModelId,
          customChatModelId:
            typeof parsed.aiModel?.customChatModelId === 'string'
              ? parsed.aiModel.customChatModelId
              : '',
          customChatProvider: parsed.aiModel?.customChatProvider === 'gemini' ? 'gemini' : 'groq',
          liveVoiceModelId,
          customLiveVoiceModelId:
            typeof parsed.aiModel?.customLiveVoiceModelId === 'string'
              ? parsed.aiModel.customLiveVoiceModelId
              : '',
          sttModelId: parsed.aiModel?.sttModelId || DEFAULT_AI_MODEL_SETTINGS.sttModelId,
          fallbackToGemini:
            parsed.aiModel?.fallbackToGemini !== undefined
              ? Boolean(parsed.aiModel.fallbackToGemini)
              : true,
          autoSwitchOnQuotaError:
            parsed.aiModel?.autoSwitchOnQuotaError !== undefined
              ? Boolean(parsed.aiModel.autoSwitchOnQuotaError)
              : true,
        },
        voiceSettings: {
          voiceReply:
            parsed.voiceSettings?.voiceReply !== undefined
              ? Boolean(parsed.voiceSettings.voiceReply)
              : DEFAULT_VOICE_SETTINGS.voiceReply,
          speed:
            typeof parsed.voiceSettings?.speed === 'number'
              ? Math.max(0.6, Math.min(1.8, parsed.voiceSettings.speed))
              : DEFAULT_VOICE_SETTINGS.speed,
          volume:
            typeof parsed.voiceSettings?.volume === 'number'
              ? Math.max(0.1, Math.min(1.0, parsed.voiceSettings.volume))
              : DEFAULT_VOICE_SETTINGS.volume,
          engine: parsed.voiceSettings?.engine || DEFAULT_VOICE_SETTINGS.engine,
          elevenLabsModelId: parsed.voiceSettings?.elevenLabsModelId || DEFAULT_VOICE_SETTINGS.elevenLabsModelId,
          elevenLabsCharLimit: typeof parsed.voiceSettings?.elevenLabsCharLimit === 'number' 
            ? parsed.voiceSettings.elevenLabsCharLimit 
            : DEFAULT_VOICE_SETTINGS.elevenLabsCharLimit,
        },
        pcControl: {
          allowFileSave: Boolean(parsed.pcControl?.allowFileSave),
          workFolderName: parsed.pcControl?.workFolderName || '',
        },
        voiceCaptions: parsed.voiceCaptions !== undefined ? Boolean(parsed.voiceCaptions) : false,
      };
    } catch {
      return { ...DEFAULT_APP_SETTINGS };
    }
  },

  saveSettings(newSettings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      this.applyGlowIntensity(newSettings.glowIntensity);
      listeners.forEach((fn) => fn(newSettings));
    } catch {
      // Never log sensitive keys or payloads to console
    }
  },

  subscribe(listener: SettingsListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  applyGlowIntensity(intensity: number) {
    if (typeof document !== 'undefined') {
      const factor = Math.max(0.5, Math.min(1.5, intensity / 100));
      document.documentElement.style.setProperty('--neon-glow-scale', factor.toString());
    }
  },
};
