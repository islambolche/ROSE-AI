import {
  AppSettings,
  AgentSettingsConfig,
  AgentId,
  SpecialistAgentId,
  ApiConnections,
  AiModelConfig,
  UserAddressAsType,
  RoseCharacterConfig,
  RoseEmotionalWarmth,
  RoseCharacterTraits,
  VoiceSettingsConfig,
  IntegrationsConfig,
  PermissionRulesConfig,
} from '../types';
import { dbService } from './db';

const STORAGE_KEY = 'rose_ai_user_preferences_v2';
const ROSE_ISOLATED_STORAGE_KEY = 'rose_isolated_character_settings_v1';

const VALID_ADDRESS_AS: UserAddressAsType[] = ['শুধু নাম', 'ভাই', 'আপু', 'স্যার', 'ম্যাডাম'];

export const VALID_ROSE_EMOTIONAL_WARMTHS: RoseEmotionalWarmth[] = ['gentle', 'warm', 'deep'];

export const DEFAULT_ROSE_TRAITS: RoseCharacterTraits = {
  sweetGentle: true,
  emotionallyAware: true,
  caringSupportive: true,
  attentiveListener: true,
  calmReassuring: true,
  deepThoughtful: false,
  cheerfulPositive: false,
  motivational: true,
  friendlyNatural: true,
  quietSoftSpoken: false,
  empathetic: true,
  thoughtfulQuestions: true,
};

export const DEFAULT_ROSE_CHARACTER_SETTINGS: RoseCharacterConfig = {
  characterId: 'rose',
  emotionalWarmth: 'warm',
  traits: { ...DEFAULT_ROSE_TRAITS },
  nickname: '',
  customCharacter: '',
  modelChoice: 'auto',
  elevenLabsVoiceId: '',
};

export function sanitizeRoseCharacterConfig(rawRC: any): RoseCharacterConfig {
  const src = rawRC && typeof rawRC === 'object' ? rawRC : {};

  const validWarmth: RoseEmotionalWarmth =
    src.emotionalWarmth === 'gentle' || src.emotionalWarmth === 'warm' || src.emotionalWarmth === 'deep'
      ? src.emotionalWarmth
      : 'warm';

  const validModelChoice =
    src.modelChoice === 'groq' || src.modelChoice === 'gemini' ? src.modelChoice : 'auto';

  const rawTraits = src.traits && typeof src.traits === 'object' ? src.traits : null;
  const traits: RoseCharacterTraits = {
    sweetGentle:
      rawTraits && typeof rawTraits.sweetGentle === 'boolean'
        ? rawTraits.sweetGentle
        : DEFAULT_ROSE_TRAITS.sweetGentle,
    emotionallyAware:
      rawTraits && typeof rawTraits.emotionallyAware === 'boolean'
        ? rawTraits.emotionallyAware
        : DEFAULT_ROSE_TRAITS.emotionallyAware,
    caringSupportive:
      rawTraits && typeof rawTraits.caringSupportive === 'boolean'
        ? rawTraits.caringSupportive
        : DEFAULT_ROSE_TRAITS.caringSupportive,
    attentiveListener:
      rawTraits && typeof rawTraits.attentiveListener === 'boolean'
        ? rawTraits.attentiveListener
        : DEFAULT_ROSE_TRAITS.attentiveListener,
    calmReassuring:
      rawTraits && typeof rawTraits.calmReassuring === 'boolean'
        ? rawTraits.calmReassuring
        : DEFAULT_ROSE_TRAITS.calmReassuring,
    deepThoughtful:
      rawTraits && typeof rawTraits.deepThoughtful === 'boolean'
        ? rawTraits.deepThoughtful
        : DEFAULT_ROSE_TRAITS.deepThoughtful,
    cheerfulPositive:
      rawTraits && typeof rawTraits.cheerfulPositive === 'boolean'
        ? rawTraits.cheerfulPositive
        : DEFAULT_ROSE_TRAITS.cheerfulPositive,
    motivational:
      rawTraits && typeof rawTraits.motivational === 'boolean'
        ? rawTraits.motivational
        : DEFAULT_ROSE_TRAITS.motivational,
    friendlyNatural:
      rawTraits && typeof rawTraits.friendlyNatural === 'boolean'
        ? rawTraits.friendlyNatural
        : DEFAULT_ROSE_TRAITS.friendlyNatural,
    quietSoftSpoken:
      rawTraits && typeof rawTraits.quietSoftSpoken === 'boolean'
        ? rawTraits.quietSoftSpoken
        : DEFAULT_ROSE_TRAITS.quietSoftSpoken,
    empathetic:
      rawTraits && typeof rawTraits.empathetic === 'boolean'
        ? rawTraits.empathetic
        : DEFAULT_ROSE_TRAITS.empathetic,
    thoughtfulQuestions:
      rawTraits && typeof rawTraits.thoughtfulQuestions === 'boolean'
        ? rawTraits.thoughtfulQuestions
        : DEFAULT_ROSE_TRAITS.thoughtfulQuestions,
  };

  // Migrate legacy saved voice ID if user had one saved on rose agent
  let legacyVoiceId = '';
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.agents?.rose?.elevenLabsVoiceId) {
          legacyVoiceId = String(parsed.agents.rose.elevenLabsVoiceId).trim();
        }
      }
    }
  } catch {}

  const voiceId =
    typeof src.elevenLabsVoiceId === 'string'
      ? src.elevenLabsVoiceId.trim()
      : legacyVoiceId;

  return {
    characterId: 'rose',
    emotionalWarmth: validWarmth,
    traits,
    nickname: typeof src.nickname === 'string' ? src.nickname : '',
    customCharacter:
      typeof src.customCharacter === 'string' ? src.customCharacter.slice(0, 1500) : '',
    modelChoice: validModelChoice,
    elevenLabsVoiceId: voiceId,
  };
}

// 4 Specialist agents only (Mira, Arin, Zayan, Naira). Defaults: Mira = Friendly, others = Professional.
export const DEFAULT_AGENTS_SETTINGS: Record<SpecialistAgentId, AgentSettingsConfig> = {
  mira: {
    personality: 'Friendly',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  arin: {
    personality: 'Professional',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  zayan: {
    personality: 'Professional',
    language: 'বাংলা',
    responseStyle: 'brief',
    customInstructions: '',
    enabled: true,
    elevenLabsVoiceId: '',
  },
  naira: {
    personality: 'Professional',
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
      dbService.upsertAgentSettings('rose', sanitized);
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

      const mergedAgents: Record<SpecialistAgentId, AgentSettingsConfig> = {
        ...DEFAULT_AGENTS_SETTINGS,
      };

      if (parsed.agents) {
        (['mira', 'arin', 'zayan', 'naira'] as const).forEach((aid) => {
          if (parsed.agents[aid]) {
            mergedAgents[aid] = {
              ...DEFAULT_AGENTS_SETTINGS[aid],
              ...parsed.agents[aid],
            };
          }
        });
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
      if ((normalizedSettings.agents as any)?.rose) {
        delete (normalizedSettings.agents as any).rose;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));
      
      // Sync specialist agents to public.agent_settings in dbService
      const specialistAgents: SpecialistAgentId[] = ['mira', 'arin', 'zayan', 'naira'];
      for (const aid of specialistAgents) {
        const cfg = (normalizedSettings.agents as Record<SpecialistAgentId, any>)?.[aid];
        if (cfg) {
          dbService.upsertAgentSettings(aid, cfg);
        }
      }

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
