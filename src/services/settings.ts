import {
  AppSettings,
  AgentSettingsConfig,
  AgentId,
  ApiConnections,
  AiModelConfig,
  UserAddressAsType,
  RoseCharacterConfig,
  RoseCharacterPresetType,
  RosePrimaryModeId,
  RoseCharacterTraits,
  RoseLanguageStyleType,
  RosePronounType,
  RoseReplyLengthType,
  VoiceSettingsConfig,
  IntegrationsConfig,
  PermissionRulesConfig,
} from '../types';

const STORAGE_KEY = 'rose_ai_user_preferences_v2';
const ROSE_ISOLATED_STORAGE_KEY = 'rose_isolated_character_settings_v1';

const VALID_ADDRESS_AS: UserAddressAsType[] = ['শুধু নাম', 'ভাই', 'আপু', 'স্যার', 'ম্যাডাম'];

export const VALID_ROSE_PRIMARY_MODES: RosePrimaryModeId[] = [
  'emotional_caring',
  'gentle_calm',
  'friendly_supportive',
  'cheerful_positive',
  'serious_thoughtful',
  'quiet_reserved',
  'motivational_encouraging',
  'playful_lighthearted',
  'professional_helpful',
  'deep_reflective',
  'custom',
];

export const VALID_ROSE_PRESETS: RoseCharacterPresetType[] = [
  'Emotional and caring',
  'Gentle and calm',
  'Friendly and supportive',
  'Cheerful and positive',
  'Serious and thoughtful',
  'Quiet and reserved',
  'Motivational and encouraging',
  'Playful and lighthearted',
  'Professional and helpful',
  'Deep and reflective',
  'Soul Bond',
  'ইমোশনাল প্রিয়তমা',
  'মিষ্টি ও যত্নশীল',
  'দুষ্টু-মিষ্টি',
  'গভীর আবেগী',
  'কাছের মানুষ',
  'Best Friend',
  'Friendly',
  'Professional',
  'Funny',
  'Teacher',
  'GF Mode',
  'Custom',
];

export const MODE_TO_PRESET_LABEL: Record<RosePrimaryModeId, RoseCharacterPresetType> = {
  emotional_caring: 'Emotional and caring',
  gentle_calm: 'Gentle and calm',
  friendly_supportive: 'Friendly and supportive',
  cheerful_positive: 'Cheerful and positive',
  serious_thoughtful: 'Serious and thoughtful',
  quiet_reserved: 'Quiet and reserved',
  motivational_encouraging: 'Motivational and encouraging',
  playful_lighthearted: 'Playful and lighthearted',
  professional_helpful: 'Professional and helpful',
  deep_reflective: 'Deep and reflective',
  custom: 'Custom',
};

export function mapPresetToPrimaryMode(preset?: string, activeMode?: string): RosePrimaryModeId {
  if (activeMode && VALID_ROSE_PRIMARY_MODES.includes(activeMode as RosePrimaryModeId)) {
    return activeMode as RosePrimaryModeId;
  }
  switch (preset) {
    case 'Emotional and caring':
    case 'Soul Bond':
    case 'ইমোশনাল প্রিয়তমা':
    case 'GF Mode':
      return 'emotional_caring';
    case 'Gentle and calm':
    case 'মিষ্টি ও যত্নশীল':
      return 'gentle_calm';
    case 'Friendly and supportive':
    case 'কাছের মানুষ':
    case 'Best Friend':
    case 'Friendly':
      return 'friendly_supportive';
    case 'Cheerful and positive':
      return 'cheerful_positive';
    case 'Serious and thoughtful':
      return 'serious_thoughtful';
    case 'Quiet and reserved':
      return 'quiet_reserved';
    case 'Motivational and encouraging':
    case 'Teacher':
      return 'motivational_encouraging';
    case 'Playful and lighthearted':
    case 'দুষ্টু-মিষ্টি':
    case 'Funny':
      return 'playful_lighthearted';
    case 'Professional and helpful':
    case 'Professional':
      return 'professional_helpful';
    case 'Deep and reflective':
    case 'গভীর আবেগী':
      return 'deep_reflective';
    case 'Custom':
      return 'custom';
    default:
      return 'emotional_caring';
  }
}

export const DEFAULT_ROSE_TRAITS: RoseCharacterTraits = {
  emotionalSensitivity: true,
  gentleTone: true,
  friendlyStyle: true,
  supportiveResponses: true,
  deepConversations: false,
  humor: false,
  motivationalStyle: false,
  conciseResponses: true,
  detailedResponses: false,
  formalLanguage: false,
  casualBengaliLanguage: true,
};

export const ROSE_MODE_DEFAULT_CONFIG: Record<
  RosePrimaryModeId,
  {
    traits: RoseCharacterTraits;
    emotionLevel: number;
    humorLevel: number;
    languageStyle: RoseLanguageStyleType;
    pronoun: RosePronounType;
    replyLength: RoseReplyLengthType;
    useEmoji: boolean;
  }
> = {
  emotional_caring: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: true,
      friendlyStyle: true,
      supportiveResponses: true,
      deepConversations: false,
      humor: false,
      motivationalStyle: false,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 9,
    humorLevel: 3,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: true,
  },
  gentle_calm: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: true,
      friendlyStyle: true,
      supportiveResponses: true,
      deepConversations: false,
      humor: false,
      motivationalStyle: false,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 7,
    humorLevel: 2,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: false,
  },
  friendly_supportive: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: true,
      friendlyStyle: true,
      supportiveResponses: true,
      deepConversations: false,
      humor: true,
      motivationalStyle: true,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 7,
    humorLevel: 5,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: true,
  },
  cheerful_positive: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: false,
      friendlyStyle: true,
      supportiveResponses: true,
      deepConversations: false,
      humor: true,
      motivationalStyle: true,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 8,
    humorLevel: 7,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: true,
  },
  serious_thoughtful: {
    traits: {
      emotionalSensitivity: false,
      gentleTone: false,
      friendlyStyle: false,
      supportiveResponses: true,
      deepConversations: true,
      humor: false,
      motivationalStyle: false,
      conciseResponses: false,
      detailedResponses: true,
      formalLanguage: true,
      casualBengaliLanguage: false,
    },
    emotionLevel: 3,
    humorLevel: 0,
    languageStyle: 'শুদ্ধ বাংলা',
    pronoun: 'আপনি',
    replyLength: 'মাঝারি',
    useEmoji: false,
  },
  quiet_reserved: {
    traits: {
      emotionalSensitivity: false,
      gentleTone: true,
      friendlyStyle: false,
      supportiveResponses: false,
      deepConversations: false,
      humor: false,
      motivationalStyle: false,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: true,
      casualBengaliLanguage: false,
    },
    emotionLevel: 2,
    humorLevel: 0,
    languageStyle: 'শুদ্ধ বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: false,
  },
  motivational_encouraging: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: false,
      friendlyStyle: true,
      supportiveResponses: true,
      deepConversations: false,
      humor: false,
      motivationalStyle: true,
      conciseResponses: false,
      detailedResponses: true,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 8,
    humorLevel: 3,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'মাঝারি',
    useEmoji: true,
  },
  playful_lighthearted: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: true,
      friendlyStyle: true,
      supportiveResponses: true,
      deepConversations: false,
      humor: true,
      motivationalStyle: false,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 8,
    humorLevel: 9,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: true,
  },
  professional_helpful: {
    traits: {
      emotionalSensitivity: false,
      gentleTone: false,
      friendlyStyle: false,
      supportiveResponses: true,
      deepConversations: false,
      humor: false,
      motivationalStyle: false,
      conciseResponses: true,
      detailedResponses: false,
      formalLanguage: true,
      casualBengaliLanguage: false,
    },
    emotionLevel: 2,
    humorLevel: 0,
    languageStyle: 'শুদ্ধ বাংলা',
    pronoun: 'আপনি',
    replyLength: 'ছোট',
    useEmoji: false,
  },
  deep_reflective: {
    traits: {
      emotionalSensitivity: true,
      gentleTone: true,
      friendlyStyle: false,
      supportiveResponses: true,
      deepConversations: true,
      humor: false,
      motivationalStyle: false,
      conciseResponses: false,
      detailedResponses: true,
      formalLanguage: false,
      casualBengaliLanguage: true,
    },
    emotionLevel: 9,
    humorLevel: 1,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'মাঝারি',
    useEmoji: false,
  },
  custom: {
    traits: { ...DEFAULT_ROSE_TRAITS },
    emotionLevel: 8,
    humorLevel: 4,
    languageStyle: 'কথ্য বাংলা',
    pronoun: 'তুমি',
    replyLength: 'ছোট',
    useEmoji: false,
  },
};

const VALID_ROSE_LANG_STYLES: RoseLanguageStyleType[] = [
  'শুদ্ধ বাংলা',
  'কথ্য বাংলা',
  'বাংলা-ইংরেজি মিশ্র',
];

const VALID_ROSE_PRONOUNS: RosePronounType[] = ['তুমি', 'আপনি', 'তুই'];

const VALID_ROSE_REPLY_LENGTHS: RoseReplyLengthType[] = ['ছোট', 'মাঝারি'];

export const DEFAULT_ROSE_CHARACTER_SETTINGS: RoseCharacterConfig = {
  activeMode: 'emotional_caring',
  traits: { ...DEFAULT_ROSE_TRAITS },
  preset: 'Emotional and caring',
  customCharacter: '',
  languageStyle: 'কথ্য বাংলা',
  pronoun: 'তুমি',
  emotionLevel: 9,
  humorLevel: 3,
  replyLength: 'ছোট',
  useEmoji: true,
  nickname: '',
  modelChoice: 'auto',
};

export function sanitizeRoseCharacterConfig(rawRC: any): RoseCharacterConfig {
  const src = rawRC && typeof rawRC === 'object' ? rawRC : {};
  const activeMode = mapPresetToPrimaryMode(src.preset, src.activeMode);
  const modeDefaults = ROSE_MODE_DEFAULT_CONFIG[activeMode] || ROSE_MODE_DEFAULT_CONFIG.emotional_caring;

  const validPreset: RoseCharacterPresetType =
    src.preset && VALID_ROSE_PRESETS.includes(src.preset)
      ? src.preset
      : MODE_TO_PRESET_LABEL[activeMode];

  const validLangStyle: RoseLanguageStyleType = VALID_ROSE_LANG_STYLES.includes(src.languageStyle)
    ? src.languageStyle
    : modeDefaults.languageStyle;

  const validPronoun: RosePronounType = VALID_ROSE_PRONOUNS.includes(src.pronoun)
    ? src.pronoun
    : modeDefaults.pronoun;

  const validReplyLen: RoseReplyLengthType = VALID_ROSE_REPLY_LENGTHS.includes(src.replyLength)
    ? src.replyLength
    : modeDefaults.replyLength;

  const validModelChoice =
    src.modelChoice === 'groq' || src.modelChoice === 'gemini' ? src.modelChoice : 'auto';

  const rawTraits = src.traits && typeof src.traits === 'object' ? src.traits : null;
  const traits: RoseCharacterTraits = {
    emotionalSensitivity:
      rawTraits && typeof rawTraits.emotionalSensitivity === 'boolean'
        ? rawTraits.emotionalSensitivity
        : modeDefaults.traits.emotionalSensitivity,
    gentleTone:
      rawTraits && typeof rawTraits.gentleTone === 'boolean'
        ? rawTraits.gentleTone
        : modeDefaults.traits.gentleTone,
    friendlyStyle:
      rawTraits && typeof rawTraits.friendlyStyle === 'boolean'
        ? rawTraits.friendlyStyle
        : modeDefaults.traits.friendlyStyle,
    supportiveResponses:
      rawTraits && typeof rawTraits.supportiveResponses === 'boolean'
        ? rawTraits.supportiveResponses
        : modeDefaults.traits.supportiveResponses,
    deepConversations:
      rawTraits && typeof rawTraits.deepConversations === 'boolean'
        ? rawTraits.deepConversations
        : modeDefaults.traits.deepConversations,
    humor:
      rawTraits && typeof rawTraits.humor === 'boolean'
        ? rawTraits.humor
        : modeDefaults.traits.humor,
    motivationalStyle:
      rawTraits && typeof rawTraits.motivationalStyle === 'boolean'
        ? rawTraits.motivationalStyle
        : modeDefaults.traits.motivationalStyle,
    conciseResponses:
      rawTraits && typeof rawTraits.conciseResponses === 'boolean'
        ? rawTraits.conciseResponses
        : modeDefaults.traits.conciseResponses,
    detailedResponses:
      rawTraits && typeof rawTraits.detailedResponses === 'boolean'
        ? rawTraits.detailedResponses
        : modeDefaults.traits.detailedResponses,
    formalLanguage:
      rawTraits && typeof rawTraits.formalLanguage === 'boolean'
        ? rawTraits.formalLanguage
        : modeDefaults.traits.formalLanguage,
    casualBengaliLanguage:
      rawTraits && typeof rawTraits.casualBengaliLanguage === 'boolean'
        ? rawTraits.casualBengaliLanguage
        : modeDefaults.traits.casualBengaliLanguage,
  };

  return {
    activeMode,
    traits,
    preset: validPreset,
    customCharacter:
      typeof src.customCharacter === 'string' ? src.customCharacter.slice(0, 1500) : '',
    languageStyle: validLangStyle,
    pronoun: validPronoun,
    emotionLevel:
      typeof src.emotionLevel === 'number'
        ? Math.max(0, Math.min(10, src.emotionLevel))
        : modeDefaults.emotionLevel,
    humorLevel:
      typeof src.humorLevel === 'number'
        ? Math.max(0, Math.min(10, src.humorLevel))
        : modeDefaults.humorLevel,
    replyLength: validReplyLen,
    useEmoji: typeof src.useEmoji === 'boolean' ? src.useEmoji : modeDefaults.useEmoji,
    nickname: typeof src.nickname === 'string' ? src.nickname : '',
    modelChoice: validModelChoice,
  };
}

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

export const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
  pcAccess: false,
  whatsapp: { accessToken: '', phoneNumberId: '' },
  youtube: { accessToken: '', refreshToken: '', expiryDate: 0, clientId: '' },
  facebookPage: { accessToken: '', pageId: '' },
  tiktok: '',
  gmail: { accessToken: '', refreshToken: '', expiryDate: 0, clientId: '' },
  askBeforeAction: true,
};

export const DEFAULT_PERMISSION_RULES: PermissionRulesConfig = {
  sendWhatsappMessenger: true,
  postReplyFbYoutube: true,
  sendEmailApplyJob: true,
  saveOrSendBill: true,
  openWebsiteOrAppPc: true,
  typeTextOrKeysPc: true,
  readOrOpenFilesPc: true,
  playMusicVideo: true,
  deleteFiles: true,
  paymentsOrTransfer: true,
  passwordsOrPrivateData: true,
  installOrUninstallSoftware: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  userName: '',
  userAddressAs: 'শুধু নাম',
  hasCompletedWelcome: false,
  glowIntensity: 100, // 50% to 150%
  chatFontSize: 'medium',
  showCameraMic: true,
  agents: DEFAULT_AGENTS_SETTINGS,
  characterSettings: {
    rose: { ...DEFAULT_ROSE_CHARACTER_SETTINGS },
  },
  roseCharacter: { ...DEFAULT_ROSE_CHARACTER_SETTINGS },
  connections: DEFAULT_CONNECTIONS,
  aiModel: DEFAULT_AI_MODEL_SETTINGS,
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  pcControl: {
    allowFileSave: false,
    openAppsAndWebsites: true,
    typeTextAndPressKeys: true,
    readOrOpenFiles: true,
    cameraAndMic: true,
  },
  voiceCaptions: false,
  integrations: DEFAULT_INTEGRATIONS,
  permissionRules: DEFAULT_PERMISSION_RULES,
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
  /**
   * Loads ONLY Rose's isolated character settings from its dedicated namespace.
   * Never reads or mixes configuration from any other character.
   */
  getRoseCharacterSettings(): RoseCharacterConfig {
    try {
      const isolatedRaw = localStorage.getItem(ROSE_ISOLATED_STORAGE_KEY);
      if (isolatedRaw) {
        const parsedIsolated = JSON.parse(isolatedRaw);
        if (parsedIsolated?.rose) {
          return sanitizeRoseCharacterConfig(parsedIsolated.rose);
        }
      }
      const mainRaw = localStorage.getItem(STORAGE_KEY);
      if (mainRaw) {
        const parsedMain = JSON.parse(mainRaw);
        const candidate = parsedMain?.characterSettings?.rose || parsedMain?.roseCharacter;
        if (candidate) {
          const sanitized = sanitizeRoseCharacterConfig(candidate);
          localStorage.setItem(
            ROSE_ISOLATED_STORAGE_KEY,
            JSON.stringify({ rose: sanitized })
          );
          return sanitized;
        }
      }
    } catch {
      // Fallback to default Rose settings
    }
    return {
      ...DEFAULT_ROSE_CHARACTER_SETTINGS,
      traits: { ...DEFAULT_ROSE_TRAITS },
    };
  },

  /**
   * Saves ONLY Rose's character settings into its isolated storage namespace:
   * { "rose": { "activeMode": "...", "traits": { ... }, ... } }
   */
  saveRoseCharacterSettings(roseConfig: RoseCharacterConfig): RoseCharacterConfig {
    const sanitized = sanitizeRoseCharacterConfig(roseConfig);
    try {
      localStorage.setItem(
        ROSE_ISOLATED_STORAGE_KEY,
        JSON.stringify({ rose: sanitized })
      );
    } catch {
      // ignore storage errors
    }
    return sanitized;
  },

  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const isolatedRose = this.getRoseCharacterSettings();
      if (!stored) {
        return {
          ...DEFAULT_APP_SETTINGS,
          characterSettings: { rose: isolatedRose },
          roseCharacter: isolatedRose,
        };
      }
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

      // Prefer isolated Rose storage, or migrate from parsed.characterSettings.rose / parsed.roseCharacter
      const hasIsolatedStorage = Boolean(localStorage.getItem(ROSE_ISOLATED_STORAGE_KEY));
      const roseCharacter: RoseCharacterConfig = hasIsolatedStorage
        ? isolatedRose
        : sanitizeRoseCharacterConfig(
            parsed.characterSettings?.rose || parsed.roseCharacter || isolatedRose
          );

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
        characterSettings: {
          rose: roseCharacter,
        },
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
          openAppsAndWebsites:
            parsed.pcControl?.openAppsAndWebsites !== undefined
              ? Boolean(parsed.pcControl.openAppsAndWebsites)
              : true,
          typeTextAndPressKeys:
            parsed.pcControl?.typeTextAndPressKeys !== undefined
              ? Boolean(parsed.pcControl.typeTextAndPressKeys)
              : true,
          readOrOpenFiles:
            parsed.pcControl?.readOrOpenFiles !== undefined
              ? Boolean(parsed.pcControl.readOrOpenFiles)
              : true,
          cameraAndMic:
            parsed.pcControl?.cameraAndMic !== undefined
              ? Boolean(parsed.pcControl.cameraAndMic)
              : true,
        },
        voiceCaptions: parsed.voiceCaptions !== undefined ? Boolean(parsed.voiceCaptions) : false,
        integrations: {
          ...DEFAULT_INTEGRATIONS,
          ...(parsed.integrations || {}),
          whatsapp: {
            ...DEFAULT_INTEGRATIONS.whatsapp,
            ...(parsed.integrations?.whatsapp || {}),
          },
          youtube: {
            ...DEFAULT_INTEGRATIONS.youtube,
            ...(parsed.integrations?.youtube || {}),
          },
          facebookPage: {
            ...DEFAULT_INTEGRATIONS.facebookPage,
            ...(typeof parsed.integrations?.facebookPage === 'string' 
              ? { accessToken: parsed.integrations.facebookPage, pageId: '' } 
              : (parsed.integrations?.facebookPage || {})),
          },
          gmail: {
            ...DEFAULT_INTEGRATIONS.gmail,
            ...(parsed.integrations?.gmail || {}),
          },
        },
        permissionRules: {
          sendWhatsappMessenger:
            parsed.permissionRules?.sendWhatsappMessenger !== undefined
              ? Boolean(parsed.permissionRules.sendWhatsappMessenger)
              : true,
          postReplyFbYoutube:
            parsed.permissionRules?.postReplyFbYoutube !== undefined
              ? Boolean(parsed.permissionRules.postReplyFbYoutube)
              : true,
          sendEmailApplyJob:
            parsed.permissionRules?.sendEmailApplyJob !== undefined
              ? Boolean(parsed.permissionRules.sendEmailApplyJob)
              : true,
          saveOrSendBill:
            parsed.permissionRules?.saveOrSendBill !== undefined
              ? Boolean(parsed.permissionRules.saveOrSendBill)
              : true,
          openWebsiteOrAppPc:
            parsed.permissionRules?.openWebsiteOrAppPc !== undefined
              ? Boolean(parsed.permissionRules.openWebsiteOrAppPc)
              : true,
          typeTextOrKeysPc:
            parsed.permissionRules?.typeTextOrKeysPc !== undefined
              ? Boolean(parsed.permissionRules.typeTextOrKeysPc)
              : true,
          readOrOpenFilesPc:
            parsed.permissionRules?.readOrOpenFilesPc !== undefined
              ? Boolean(parsed.permissionRules.readOrOpenFilesPc)
              : true,
          playMusicVideo:
            parsed.permissionRules?.playMusicVideo !== undefined
              ? Boolean(parsed.permissionRules.playMusicVideo)
              : true,
          // Locked rows: always "Ask me first" (true)
          deleteFiles: true,
          paymentsOrTransfer: true,
          passwordsOrPrivateData: true,
          installOrUninstallSoftware: true,
        },
      };
    } catch {
      return { ...DEFAULT_APP_SETTINGS };
    }
  },

  saveSettings(newSettings: AppSettings): void {
    try {
      const rawRose =
        newSettings.characterSettings?.rose ||
        newSettings.roseCharacter ||
        DEFAULT_ROSE_CHARACTER_SETTINGS;
      const sanitizedRose = this.saveRoseCharacterSettings(rawRose);
      const normalizedSettings: AppSettings = {
        ...newSettings,
        characterSettings: {
          rose: sanitizedRose,
        },
        roseCharacter: sanitizedRose,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));
      this.applyGlowIntensity(normalizedSettings.glowIntensity);
      listeners.forEach((fn) => fn(normalizedSettings));
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
