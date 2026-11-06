import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Users,
  Key,
  Cpu,
  Globe,
  Briefcase,
  Volume2,
  Database,
  Smartphone,
  ShieldCheck,
  Monitor,
  Lock,
  BarChart3,
  Activity,
  Share2,
  CheckSquare,
  Code2,
  Check,
  Type,
  Video,
  Mic,
  Sun,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  User,
  Facebook,
  Youtube,
  Copy,
  ExternalLink,
  FolderOpen,
  Shield,
  FileText,
  Link,
  Info,
  Smile,
  Laugh,
  Heart,
  HeartHandshake,
  Moon,
  UserCheck,
  Flame,
  Compass,
  SmilePlus,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Cloud,
  CloudOff,
  Zap,
  GraduationCap,
} from 'lucide-react';
import {
  AppSettings,
  PersonalityType,
  LanguageType,
  ResponseStyleType,
  ChatFontSizeType,
  AgentId,
  SpecialistAgentId,
  SpecialistPersonalityType,
  UserAddressAsType,
  RoseEmotionalWarmth,
  RoseCharacterTraits,
  RoseModelChoiceType,
  RoseCharacterConfig,
  ChatMessage,
  PermissionRulesConfig,
  PendingApprovalAction,
} from '../types';
import { IDENTITY_AGENTS, IDENTITY_AGENTS_MAP } from '../config/identity';
import { voiceChat } from '../lib/voiceChat';
import { ttsService } from '../lib/tts';
import {
  getFileActionLogs,
  getPendingApprovals,
  subscribePendingApprovals,
  resolvePendingApproval,
} from '../lib/approvals';
import {
  settingsService,
  DEFAULT_APP_SETTINGS,
  DEFAULT_ROSE_CHARACTER_SETTINGS,
  DEFAULT_ROSE_TRAITS,
  sanitizeRoseCharacterConfig,
  VALID_ROSE_EMOTIONAL_WARMTHS,
  DEFAULT_PERMISSION_RULES,
} from '../services/settings';
import { ConnectionsSettings } from './ConnectionsSettings';
import { AiModelSettings } from './AiModelSettings';
import { DEVELOPER_PROFILE, isDeveloperFieldEmpty } from '../config/developer';
import { getTeamDelegationTasks } from '../lib/teamEngine';
import {
  generateAgentAnswer,
  buildAgentSystemPrompt,
  buildRoseSystemPrompt,
  ROSE_WARMTH_LEVELS,
  ROSE_TRAIT_CATEGORIES,
  ROSE_TRAIT_DEFINITIONS,
  resolveRosePersonalityCombination,
  ROSE_IMMUTABLE_RULES,
  resolveRoseModelChoice,
  getRoseTemperature,
  SPECIALIST_PERSONALITY_PRESETS,
  SPECIALIST_IMMUTABLE_RULES,
  SpecialistPersonalityMeta,
} from '../lib/agentEngine';
import { IntegrationsSettings } from './IntegrationsSettings';
import { supabaseService } from '../services/supabaseService';
import { deviceLinkService, DeviceCommandRecord } from '../lib/deviceLink';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRoseCharacterSaved?: (characterName: string) => void;
  onToast: (msg: string) => void;
  directoryHandle: FileSystemDirectoryHandle | null;
  onChooseFolder: () => void;
  onDisconnectFolder: () => void;
  onReconnectFolder: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SETTINGS_MENU_ITEMS: MenuItem[] = [
  {
    id: 'connections',
    title: 'Connections',
    desc: 'Gemini, Groq, ElevenLabs keys',
    icon: Key,
  },
  {
    id: 'ai-model',
    title: 'AI Model',
    desc: 'chat and live voice models',
    icon: Cpu,
  },
  {
    id: 'voice-language',
    title: 'Voice & Language',
    desc: 'Language, Personality, Response style, Voice',
    icon: Globe,
  },
  {
    id: 'agents',
    title: 'Agents',
    desc: 'Specialist agents (Mira, Arin, Zayan, Naira)',
    icon: Users,
  },
  {
    id: 'rose-character',
    title: 'Rose Character',
    desc: 'Dedicated Rose-only personality & traits',
    icon: Sparkles,
  },
  {
    id: 'business-profile',
    title: 'Business Profile',
    desc: 'Business info, brand assets & identity',
    icon: Briefcase,
  },
  {
    id: 'customization',
    title: 'Customization',
    desc: 'theme and layout',
    icon: Sliders,
  },
  {
    id: 'voice-settings',
    title: 'Voice Settings',
    desc: 'volume, speed, noise reduction',
    icon: Volume2,
  },
  {
    id: 'database-sync',
    title: 'Database & Sync',
    desc: 'Supabase',
    icon: Database,
  },
  {
    id: 'phone-link',
    title: 'Phone Link',
    desc: 'connect with mobile',
    icon: Smartphone,
  },
  {
    id: 'device-permissions',
    title: 'Device Permissions',
    desc: 'mic, camera, notifications',
    icon: ShieldCheck,
  },
  {
    id: 'pc-control',
    title: 'PC Control',
    desc: 'Automated system controls & OS integration',
    icon: Monitor,
  },
  {
    id: 'security-privacy',
    title: 'Security & Privacy',
    desc: 'Encryption, PIN lock & privacy protocols',
    icon: Lock,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    desc: 'Business KPIs, conversion & traffic metrics',
    icon: BarChart3,
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    desc: 'System health check & logs',
    icon: Activity,
  },
  {
    id: 'integrations',
    title: 'Integrations & Access',
    desc: 'Third-party services & access control',
    icon: Link,
  },
  {
    id: 'approvals',
    title: 'Approvals',
    desc: 'actions waiting for your OK',
    icon: CheckSquare,
  },
  {
    id: 'developer',
    title: `${DEVELOPER_PROFILE.name}, ${DEVELOPER_PROFILE.title}`,
    desc: DEVELOPER_PROFILE.title,
    icon: Code2,
  },
];

const ADDRESS_AS_OPTIONS: UserAddressAsType[] = [
  'শুধু নাম',
  'ভাই',
  'আপু',
  'স্যার',
  'ম্যাডাম',
];

const SPECIALIST_IDS: SpecialistAgentId[] = ['mira', 'arin', 'zayan', 'naira'];

const PRESET_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Smile,
  Briefcase,
  Laugh,
  Shield,
  Sparkles,
  Zap,
  GraduationCap,
  Heart,
  HeartHandshake,
  Sparkle: Sparkles,
  Moon,
  Sun,
  UserCheck,
  Users,
  Flame,
  Compass,
  SmilePlus,
  Sliders,
};

const PERSONALITY_OPTIONS: PersonalityType[] = [
  'Normal',
  'Friendly',
  'Professional',
  'Funny',
  'Teacher',
  'Developer',
  'Caring',
  'Custom',
];

const LANGUAGE_OPTIONS: LanguageType[] = [
  'বাংলা',
  'English',
  'বাংলিশ',
  'Hindi',
  'Arabic',
  'Spanish',
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRoseCharacterSaved,
  onToast,
  directoryHandle,
  onChooseFolder,
  onDisconnectFolder,
  onReconnectFolder,
}) => {
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [roseTestInput, setRoseTestInput] = useState<string>('আজকের কাজ কেমন চলছে?');
  const [roseTestLoading, setRoseTestLoading] = useState<boolean>(false);
  const [showActivePrompt, setShowActivePrompt] = useState<boolean>(false);
  const [fileLogs, setFileLogs] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalAction[]>(() =>
    getPendingApprovals()
  );
  const [roseTestOutput, setRoseTestOutput] = useState<{
    text: string;
    emotion?: string;
    isError?: boolean;
    subtext?: string;
    model?: string;
    provider?: 'groq' | 'gemini';
    character?: string;
  } | null>(null);

  // Specialist Agents UI state (Accordion, Test, Prompt viewer)
  const [openAccordionAgentId, setOpenAccordionAgentId] = useState<SpecialistAgentId | null>('mira');
  const [showActivePromptAgent, setShowActivePromptAgent] = useState<SpecialistAgentId | null>(null);
  const [specialistTestInputs, setSpecialistTestInputs] = useState<Record<SpecialistAgentId, string>>({
    mira: 'কাস্টমার মেসেজগুলোর কী অবস্থা?',
    arin: 'আজকের সেলস ও অর্ডারের আপডেট কী?',
    zayan: 'পার্সেল ডেলিভারির স্ট্যাটাস বলো।',
    naira: 'আজকের ব্যালেন্স ও খরচের হিসাব কত?',
  });
  const [specialistTestLoading, setSpecialistTestLoading] = useState<SpecialistAgentId | null>(null);
  const [specialistTestOutputs, setSpecialistTestOutputs] = useState<
    Record<SpecialistAgentId, { text: string; emotion?: string; isError?: boolean } | null>
  >({
    mira: null,
    arin: null,
    zayan: null,
    naira: null,
  });
  const [previewVoiceAgent, setPreviewVoiceAgent] = useState<string | null>(null);
  const [showCharacterDropdownAgent, setShowCharacterDropdownAgent] = useState<SpecialistAgentId | null>(null);
  const [showMoreAgents, setShowMoreAgents] = useState<Record<SpecialistAgentId, boolean>>({
    mira: false,
    arin: false,
    zayan: false,
    naira: false,
  });
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityModalAgentId, setSecurityModalAgentId] = useState<SpecialistAgentId | null>(null);

  // Supabase Database & Sync state
  const [isSupabaseLoggedIn, setIsSupabaseLoggedIn] = useState<boolean>(false);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => supabaseService.getSupabaseConfig().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(() => supabaseService.getSupabaseConfig().anonKey);
  const [supabaseTesting, setSupabaseTesting] = useState<boolean>(false);
  const [supabaseSyncing, setSupabaseSyncing] = useState<boolean>(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Phone Link state
  const [phoneLinkStatus, setPhoneLinkStatus] = useState<'Listening' | 'Paused' | 'Error'>('Paused');
  const [phoneLinkError, setPhoneLinkError] = useState<string | null>(null);
  const [isPhoneLinkPaused, setIsPhoneLinkPaused] = useState<boolean>(() => deviceLinkService.getPaused());
  const [phoneLinkRequests, setPhoneLinkRequests] = useState<DeviceCommandRecord[]>(() => deviceLinkService.getRecentRequests());

  useEffect(() => {
    if (activeScreen === 'phone-link') {
      setPhoneLinkRequests(deviceLinkService.getRecentRequests());
      setIsPhoneLinkPaused(deviceLinkService.getPaused());
      const unsubStatus = deviceLinkService.subscribeStatus((st, err) => {
        setPhoneLinkStatus(st);
        setPhoneLinkError(err || null);
      });
      const unsubCmd = deviceLinkService.subscribeCommands(() => {
        setPhoneLinkRequests(deviceLinkService.getRecentRequests());
      });
      return () => {
        unsubStatus();
        unsubCmd();
      };
    }
  }, [activeScreen]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setLocalSettings(settingsService.getSettings());
      setShowSavedFeedback(false);

      // Check current Supabase session
      supabaseService.getCurrentUser().then((u) => {
        setIsSupabaseLoggedIn(Boolean(u));
        setSupabaseUserEmail(u?.email || null);
      });

      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setActiveScreen(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  useEffect(() => {
    if (activeScreen === 'approvals') {
      getFileActionLogs().then(setFileLogs);
      setPendingApprovals(getPendingApprovals());
      return subscribePendingApprovals((items) => {
        setPendingApprovals(items);
        getFileActionLogs().then(setFileLogs);
      });
    }
  }, [activeScreen]);

  if (!isOpen && !isClosing) return null;

  const getIsolatedRoseConfig = (state: AppSettings): RoseCharacterConfig => {
    return sanitizeRoseCharacterConfig(
      state.characterSettings?.rose || state.roseCharacter || DEFAULT_ROSE_CHARACTER_SETTINGS
    );
  };

  const applyIsolatedRoseConfig = (
    nextRose: RoseCharacterConfig,
    persistImmediately: boolean = false
  ) => {
    const cleanRose = sanitizeRoseCharacterConfig(nextRose);
    setLocalSettings((prev) => {
      const updated: AppSettings = {
        ...prev,
        characterSettings: {
          rose: cleanRose,
        },
        roseCharacter: cleanRose,
      };
      if (persistImmediately) {
        settingsService.saveRoseCharacterSettings(cleanRose);
        settingsService.saveSettings(updated);
        onUpdateSettings(updated);
      }
      return updated;
    });
  };

  const hasUnsavedChanges = (() => {
    try {
      const currentAgents = JSON.stringify(localSettings.agents);
      const savedAgents = JSON.stringify(settings.agents);
      const currentRose = JSON.stringify(
        localSettings.characterSettings?.rose || localSettings.roseCharacter || {}
      );
      const savedRose = JSON.stringify(
        settings.characterSettings?.rose || settings.roseCharacter || {}
      );
      return currentAgents !== savedAgents || currentRose !== savedRose;
    } catch {
      return false;
    }
  })();

  const handleSave = async () => {
    const cleanRose = getIsolatedRoseConfig(localSettings);
    const syncedSettings: AppSettings = {
      ...localSettings,
      characterSettings: {
        rose: cleanRose,
      },
      roseCharacter: cleanRose,
    };
    settingsService.saveRoseCharacterSettings(cleanRose);
    settingsService.saveSettings(syncedSettings);
    setLocalSettings(syncedSettings);
    onUpdateSettings(syncedSettings);
    if (activeScreen === 'rose-character') {
      onRoseCharacterSaved?.(cleanRose.emotionalWarmth);
    }

    // Cloud sync to Supabase if configured
    if (supabaseService.isConfigured()) {
      try {
        const syncRes = await supabaseService.syncAllAgentsToCloud(syncedSettings);
        if (syncRes.ok) {
          onToast('Settings saved & synced to Supabase Cloud');
        } else {
          onToast('Settings saved locally');
        }
      } catch {
        onToast('Settings saved locally');
      }
    } else {
      onToast('Settings saved locally');
    }

    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 2400);
  };

  const handleAgentConfigChange = <K extends keyof AppSettings['agents'][SpecialistAgentId]>(
    agentId: SpecialistAgentId,
    field: K,
    val: AppSettings['agents'][SpecialistAgentId][K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      agents: {
        ...prev.agents,
        [agentId]: {
          ...prev.agents[agentId],
          [field]: val,
        },
      },
    }));
  };

  const handlePreviewSpecialistVoice = async (agentId: SpecialistAgentId) => {
    const ident = IDENTITY_AGENTS_MAP[agentId];
    const cfg = localSettings.agents[agentId] || DEFAULT_APP_SETTINGS.agents[agentId];
    setPreviewVoiceAgent(agentId);
    try {
      const sample =
        cfg.language === 'English'
          ? `Hello, I am ${ident.name}. This is my ElevenLabs voice.`
          : `হ্যালো, আমি ${ident.name}। এটি আমার ElevenLabs কণ্ঠস্বর।`;
      await voiceChat.speak(sample, agentId, {
        language: cfg.language,
        speed: localSettings.voiceSettings?.speed ?? 1.0,
        volume: localSettings.voiceSettings?.volume ?? 1.0,
        onMissingBengaliVoice: (note) => onToast(note),
      });
    } catch (e: any) {
      onToast(e?.message || 'ভয়েস প্রিভিউতে সমস্যা হয়েছে');
    } finally {
      setPreviewVoiceAgent(null);
    }
  };

  const handleTestSpecialistAgent = async (agentId: SpecialistAgentId) => {
    const input = specialistTestInputs[agentId]?.trim();
    if (!input || specialistTestLoading) return;
    setSpecialistTestLoading(agentId);
    setSpecialistTestOutputs((prev) => ({ ...prev, [agentId]: null }));
    try {
      const testMsg: ChatMessage = {
        id: `test_${agentId}_${Date.now()}`,
        sender: 'user',
        senderName: 'You',
        text: input,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const res = await generateAgentAnswer(agentId, [testMsg]);
      setSpecialistTestOutputs((prev) => ({
        ...prev,
        [agentId]: {
          text: res.text,
          emotion: res.emotion,
          isError: res.isError,
        },
      }));
    } catch {
      setSpecialistTestOutputs((prev) => ({
        ...prev,
        [agentId]: {
          text: 'টেস্ট উত্তর তৈরিতে ত্রুটি হয়েছে।',
          isError: true,
        },
      }));
    } finally {
      setSpecialistTestLoading(null);
    }
  };

  const handlePreviewRoseVoice = async () => {
    setPreviewVoiceAgent('rose');
    try {
      const sample = 'হ্যালো! আমি Rose। আপনার দিনটি সুন্দর ও প্রশান্তিময় কাটুক!';
      await voiceChat.speak(sample, 'rose', {
        language: 'বাংলা',
        speed: localSettings.voiceSettings?.speed ?? 1.0,
        volume: localSettings.voiceSettings?.volume ?? 1.0,
        onMissingBengaliVoice: (note) => onToast(note),
      });
    } catch (e: any) {
      onToast(e?.message || 'Rose-এর ভয়েস প্রিভিউতে সমস্যা হয়েছে');
    } finally {
      setPreviewVoiceAgent(null);
    }
  };

  const handleTestSupabaseConnection = async () => {
    setSupabaseTesting(true);
    setSupabaseStatusMsg(null);
    try {
      supabaseService.setSupabaseConfig(supabaseUrl, supabaseAnonKey);
      const res = await supabaseService.testConnection();
      setSupabaseStatusMsg({ ok: res.ok, text: res.message });
      setIsSupabaseLoggedIn(Boolean(res.user));
      setSupabaseUserEmail(res.user?.email || null);
      if (res.ok) {
        onToast('Supabase সংযোগ সফল');
      } else {
        onToast(res.message);
      }
    } catch (e: any) {
      setSupabaseStatusMsg({ ok: false, text: e?.message || 'সংযোগ ব্যর্থ হয়েছে' });
    } finally {
      setSupabaseTesting(false);
    }
  };

  const handleSyncSupabaseNow = async () => {
    setSupabaseSyncing(true);
    try {
      const res = await supabaseService.syncAllAgentsToCloud(localSettings);
      if (res.ok) {
        onToast(`ক্লাউডে ${res.syncedCount}টি এজেন্টের ডেটা সিঙ্ক সম্পন্ন হয়েছে`);
      } else {
        onToast(res.error || 'সিঙ্ক ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      onToast(e?.message || 'সিঙ্ক ত্রুটি');
    } finally {
      setSupabaseSyncing(false);
    }
  };

  const handleRoseCharacterChange = <K extends keyof RoseCharacterConfig>(
    field: K,
    val: RoseCharacterConfig[K]
  ) => {
    const current = getIsolatedRoseConfig(localSettings);
    const updated: RoseCharacterConfig = {
      ...current,
      [field]: val,
    };
    applyIsolatedRoseConfig(updated, false);
  };

  const handleSelectRoseEmotionalWarmth = (warmth: RoseEmotionalWarmth) => {
    const current = getIsolatedRoseConfig(localSettings);
    const nextRose: RoseCharacterConfig = {
      ...current,
      emotionalWarmth: warmth,
    };
    applyIsolatedRoseConfig(nextRose, true);
  };

  const handleToggleRoseTrait = (traitKey: keyof RoseCharacterTraits) => {
    const current = getIsolatedRoseConfig(localSettings);
    const currentTraits = current.traits || { ...DEFAULT_ROSE_TRAITS };
    const nextVal = !currentTraits[traitKey];
    const nextTraits: RoseCharacterTraits = {
      ...currentTraits,
      [traitKey]: nextVal,
    };

    const nextRose: RoseCharacterConfig = {
      ...current,
      traits: nextTraits,
    };

    applyIsolatedRoseConfig(nextRose, true);
  };

  const handleResetRoseCharacter = () => {
    const resetRose: RoseCharacterConfig = {
      ...DEFAULT_ROSE_CHARACTER_SETTINGS,
      traits: { ...DEFAULT_ROSE_TRAITS },
    };
    const resetSettings: AppSettings = {
      ...localSettings,
      characterSettings: {
        rose: resetRose,
      },
      roseCharacter: resetRose,
    };
    setLocalSettings(resetSettings);
    settingsService.saveRoseCharacterSettings(resetRose);
    settingsService.saveSettings(resetSettings);
    onUpdateSettings(resetSettings);
    onRoseCharacterSaved?.(resetRose.emotionalWarmth);
    setRoseTestOutput(null);
    onToast('Rose Character ডিফল্টে রিসেট হয়েছে');
  };

  const handleTestRoseCharacter = async () => {
    if (!roseTestInput.trim() || roseTestLoading) return;
    setRoseTestLoading(true);
    setRoseTestOutput(null);
    try {
      const testMsg: ChatMessage = {
        id: `test_${Date.now()}`,
        sender: 'user',
        senderName: 'You',
        text: roseTestInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const currentRoseChar = getIsolatedRoseConfig(localSettings);
      const res = await generateAgentAnswer('rose', [testMsg], {
        roseCharacterOverride: currentRoseChar,
      });
      setRoseTestOutput({
        text: res.text,
        emotion: res.emotion,
        isError: res.isError,
        subtext: res.errorMeta?.subtext,
        model: res.model,
        provider: res.provider,
        character: `Rose (${currentRoseChar.emotionalWarmth})`,
      });
    } catch {
      setRoseTestOutput({
        text: 'টেস্ট উত্তর তৈরিতে ত্রুটি হয়েছে।',
        isError: true,
      });
    } finally {
      setRoseTestLoading(false);
    }
  };

  const renderAgentCard = (agentId: SpecialistAgentId) => {
    const ident = IDENTITY_AGENTS_MAP[agentId];
    const cfg = localSettings.agents[agentId] || DEFAULT_APP_SETTINGS.agents[agentId];
    const isOpenCard = openAccordionAgentId === agentId;
    const activePreset =
      SPECIALIST_PERSONALITY_PRESETS.find((p) => p.id === cfg.personality) ||
      SPECIALIST_PERSONALITY_PRESETS[0];

    const isFemale = agentId === 'mira' || agentId === 'naira';
    const commonPresets = SPECIALIST_PERSONALITY_PRESETS.filter((p) => p.applicableTo === 'all');
    const extraPresets = SPECIALIST_PERSONALITY_PRESETS.filter((p) =>
      isFemale ? p.applicableTo === 'female' : p.applicableTo === 'male'
    );

    const isDropdownOpen = showCharacterDropdownAgent === agentId;
    const isMoreOpen = showMoreAgents[agentId];
    const showPrompt = showActivePromptAgent === agentId;
    const testOutput = specialistTestOutputs[agentId];
    const isTesting = specialistTestLoading === agentId;
    const isVoicePreviewing = previewVoiceAgent === agentId;

    return (
      <div
        key={agentId}
        className="rounded-2xl bg-[#081533] border transition-all overflow-hidden"
        style={{
          borderColor: isOpenCard
            ? `${ident.color}70`
            : cfg.enabled
            ? `${ident.color}35`
            : 'rgba(56,189,248,0.15)',
          boxShadow: isOpenCard
            ? `0 0 20px ${ident.color}25`
            : cfg.enabled
            ? `0 0 10px ${ident.color}10`
            : undefined,
        }}
      >
        {/* Closed Card / Accordion Header */}
        <div
          onClick={() => setOpenAccordionAgentId(isOpenCard ? null : agentId)}
          className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-sky-950/20 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 bg-[#071126] flex items-center justify-center"
              style={{
                borderColor: ident.color,
                boxShadow: `0 0 10px ${ident.color}40`,
              }}
            >
              <img src={ident.avatar} alt={ident.name} className="w-full h-full object-cover" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-extrabold text-white font-display">{ident.name}</h4>
                <span
                  title="লক করা পরিচয়"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-800/80 text-[9px] font-bold text-slate-300 border border-slate-700/60"
                >
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>{ident.role}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border truncate max-w-[180px]"
                  style={{
                    backgroundColor: `${ident.color}18`,
                    borderColor: `${ident.color}45`,
                    color: ident.color,
                  }}
                >
                  {activePreset.bengaliName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">• {cfg.language}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => handleAgentConfigChange(agentId, 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
              </label>
            </div>

            <div className="w-6 h-6 rounded-lg bg-sky-950/40 border border-sky-800/40 flex items-center justify-center text-slate-300">
              {isOpenCard ? <ChevronUp className="w-3.5 h-3.5 text-sky-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </div>
        </div>

        {/* Open Card (Compact Rows) */}
        {isOpenCard && (
          <div className="p-3.5 pt-1 border-t border-sky-950/80 space-y-3 animate-in fade-in duration-200">
            {/* 1. Character Dropdown Row */}
            <div className="relative space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>চরিত্র (Character)</span>
                </label>
                <span
                  onClick={() => setSecurityModalAgentId(agentId)}
                  className="text-[10px] font-extrabold text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-800/60"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>🔒 নিরাপত্তা নিয়ম</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowCharacterDropdownAgent(isDropdownOpen ? null : agentId)}
                className="w-full px-3 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs font-bold flex items-center justify-between hover:border-sky-400 transition-all"
                style={{ borderColor: `${ident.color}60` }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ident.color }}></span>
                  <span className="truncate">{activePreset.bengaliName} ({activePreset.name})</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown List */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#060e22] border border-sky-500/50 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {/* সাধারণ (Common) */}
                  <div>
                    <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      সাধারণ (Common)
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {commonPresets.map((preset) => {
                        const isSelected = cfg.personality === preset.id;
                        const IconComponent = PRESET_ICON_MAP[preset.icon] || Sparkles;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              handleAgentConfigChange(agentId, 'personality', preset.id);
                              setShowCharacterDropdownAgent(null);
                            }}
                            className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-all ${
                              isSelected ? 'bg-sky-500/25 text-white font-bold border border-sky-400/50' : 'hover:bg-sky-950/40 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <IconComponent className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span className="truncate">{preset.bengaliName}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* আবেগী / বন্ধুসুলভ (Emotional / Friendly) */}
                  <div>
                    <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {isFemale ? 'আবেগী বিকল্প (Emotional)' : 'বন্ধুসুলভ বিকল্প (Friendly/Bro)'}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {extraPresets.map((preset) => {
                        const isSelected = cfg.personality === preset.id;
                        const IconComponent = PRESET_ICON_MAP[preset.icon] || Sparkles;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              handleAgentConfigChange(agentId, 'personality', preset.id);
                              setShowCharacterDropdownAgent(null);
                            }}
                            className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-all ${
                              isSelected ? 'bg-sky-500/25 text-white font-bold border border-sky-400/50' : 'hover:bg-sky-950/40 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <IconComponent className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                              <span className="truncate">{preset.bengaliName}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAgentConfigChange(agentId, 'personality', 'Custom');
                        setShowCharacterDropdownAgent(null);
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-all ${
                        cfg.personality === 'Custom' ? 'bg-sky-500/25 text-white font-bold border border-sky-400/50' : 'hover:bg-sky-950/40 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>কাস্টম চরিত্র (Custom Character)</span>
                      </div>
                      {cfg.personality === 'Custom' && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Language Row (3 buttons: বাংলা / English / বাংলিশ) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3 text-sky-400" />
                <span>ভাষা (Language)</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#050c20] p-1 rounded-xl border border-sky-500/25">
                {(['বাংলা', 'English', 'বাংলিশ'] as const).map((lang) => {
                  const isCur = cfg.language === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleAgentConfigChange(agentId, 'language', lang)}
                      className={`py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                        isCur ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Response Style Row (সংক্ষিপ্ত / বিস্তারিত) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-sky-400" />
                <span>ধরন (Response Style)</span>
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#050c20] p-1 rounded-xl border border-sky-500/25">
                <button
                  type="button"
                  onClick={() => handleAgentConfigChange(agentId, 'responseStyle', 'brief')}
                  className={`py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                    cfg.responseStyle === 'brief' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  সংক্ষিপ্ত (Brief)
                </button>
                <button
                  type="button"
                  onClick={() => handleAgentConfigChange(agentId, 'responseStyle', 'detailed')}
                  className={`py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                    cfg.responseStyle === 'detailed' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  বিস্তারিত (Detailed)
                </button>
              </div>
            </div>

            {/* 4. Voice Row (Voice ID Input & Preview in one row) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Mic className="w-3 h-3 text-sky-400" />
                <span>কণ্ঠ (Voice ID & Preview)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cfg.elevenLabsVoiceId || ''}
                  onChange={(e) => handleAgentConfigChange(agentId, 'elevenLabsVoiceId', e.target.value)}
                  placeholder="Voice ID (e.g. 21m00...)"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#050c20] border border-sky-500/25 text-white text-xs font-mono focus:outline-none focus:border-sky-400 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => handlePreviewSpecialistVoice(agentId)}
                  disabled={isVoicePreviewing}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-extrabold flex items-center gap-1 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isVoicePreviewing ? 'Playing...' : 'Preview'}</span>
                </button>
              </div>
            </div>

            {/* 5. "আরও" (More) Collapsible Section */}
            <div className="pt-1 border-t border-sky-950/80 space-y-2">
              <button
                type="button"
                onClick={() =>
                  setShowMoreAgents((prev) => ({
                    ...prev,
                    [agentId]: !prev[agentId],
                  }))
                }
                className="w-full py-1.5 px-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 text-sky-300 text-[11px] font-extrabold flex items-center justify-between transition-colors"
              >
                <span>আরও অপশন (Custom instructions, prompt, test)</span>
                {isMoreOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isMoreOpen && (
                <div className="space-y-3 p-3 rounded-xl bg-[#050c20] border border-sky-950 animate-in fade-in duration-150">
                  {/* Custom Instructions */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-white">কাস্টম নির্দেশনা (Custom Instructions)</label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={cfg.customInstructions || ''}
                      onChange={(e) => handleAgentConfigChange(agentId, 'customInstructions', e.target.value)}
                      placeholder="এই এজেন্টের জন্য অতিরিক্ত নির্দেশ দিন..."
                      className="w-full px-3 py-1.5 rounded-xl bg-[#081533] border border-sky-500/25 text-white text-xs focus:outline-none focus:border-sky-400 resize-none"
                    />
                  </div>

                  {/* Active Prompt */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowActivePromptAgent(showPrompt ? null : agentId)}
                        className="text-[10px] font-extrabold text-sky-300 hover:text-sky-200 flex items-center gap-1"
                      >
                        <Code2 className="w-3 h-3 text-sky-400" />
                        <span>{showPrompt ? 'সক্রিয় প্রম্পট লুকান' : 'Show active prompt'}</span>
                      </button>
                      {showPrompt && (
                        <button
                          type="button"
                          onClick={() => {
                            const prompt = buildAgentSystemPrompt(agentId, undefined, undefined, localSettings);
                            navigator.clipboard.writeText(prompt);
                            onToast('প্রম্পট কপি করা হয়েছে');
                          }}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      )}
                    </div>
                    {showPrompt && (
                      <div className="p-2 rounded-lg bg-[#030712] border border-sky-900 font-mono text-[9px] text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                        {buildAgentSystemPrompt(agentId, undefined, undefined, localSettings)}
                      </div>
                    )}
                  </div>

                  {/* Test Box & Output */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-white">টেস্ট এজেন্ট (Test Agent)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={specialistTestInputs[agentId] || ''}
                        onChange={(e) =>
                          setSpecialistTestInputs((prev) => ({
                            ...prev,
                            [agentId]: e.target.value,
                          }))
                        }
                        placeholder={`Test message for ${ident.name}...`}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#081533] border border-sky-500/25 text-white text-xs focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestSpecialistAgent(agentId)}
                        disabled={isTesting || !specialistTestInputs[agentId]?.trim()}
                        className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xs transition-all shrink-0 disabled:opacity-50"
                        style={{ backgroundColor: ident.color }}
                      >
                        {isTesting ? '...' : 'Test'}
                      </button>
                    </div>

                    {testOutput && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                          testOutput.isError
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                            : 'bg-[#081533] border-sky-500/30 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span style={{ color: ident.color }} className="font-bold">
                            {ident.name} ({activePreset.bengaliName})
                          </span>
                          {testOutput.emotion && <span>[{testOutput.emotion}]</span>}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{testOutput.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentRoseMenuSummary = (() => {
    const rc = getIsolatedRoseConfig(localSettings);
    const combo = resolveRosePersonalityCombination(rc);
    return `${combo.warmthMeta.label} (${combo.warmthMeta.bengaliLabel}) • ${combo.enabledTraitsCount} Traits ON`;
  })();

  const activeMenuItem = SETTINGS_MENU_ITEMS.find((item) => item.id === activeScreen);

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out cursor-pointer ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Slide-over Left Panel (50% screen width, min 360px, max 620px) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '50vw', minWidth: '360px', maxWidth: '620px' }}
        className={`h-full bg-[#060e22] border-r border-sky-500/40 shadow-[16px_0_50px_rgba(0,10,30,0.85)] flex flex-col overflow-hidden transition-transform duration-300 ease-out select-none text-slate-100 cursor-default ${
          isVisible && !isClosing ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel Top Bar */}
        <div className="h-16 px-5 border-b border-sky-900/60 bg-[#07132f] flex items-center justify-between shrink-0">
          {activeScreen ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveScreen(null)}
                className="p-1.5 rounded-xl bg-sky-950/60 border border-sky-500/30 text-sky-300 hover:text-white hover:bg-sky-900/60 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h3 className="text-sm font-extrabold text-white font-display tracking-wide truncate">
                {activeMenuItem?.title}
              </h3>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white font-display tracking-wide">
                  Settings
                </h3>
                <p className="text-[10px] text-sky-300/80">
                  Control center & preferences
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {showSavedFeedback && (
              <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </div>
            )}
            <button
              onClick={handleClose}
              title="Close"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 no-scrollbar text-xs">
          {/* ========================================================= */}
          {/* 1. MAIN VERTICAL MENU (17 ITEMS)                          */}
          {/* ========================================================= */}
          {!activeScreen && (
            <div className="space-y-2">
              {SETTINGS_MENU_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isSpecial = item.id === 'developer';

                return (
                  <button
                    key={item.id}
                    id={item.id === 'developer' ? 'dev-btn' : undefined}
                    onClick={() => setActiveScreen(item.id)}
                    className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 group ${
                      isSpecial
                        ? 'bg-gradient-to-r from-[#0d1f4d] via-[#09173b] to-[#07112d] border-indigo-500/50 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                        : 'bg-[#081533]/90 hover:bg-[#0c204c] border-sky-900/60 hover:border-sky-400/60 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSpecial
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                            : 'bg-sky-500/15 text-sky-400 border-sky-500/30 group-hover:bg-sky-500/25 group-hover:text-sky-300'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-white tracking-wide truncate group-hover:text-sky-200">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {item.id === 'ai-model'
                            ? localSettings.aiModel?.customChatModelId?.trim() ||
                              localSettings.aiModel?.selectedChatModelId ||
                              'openai/gpt-oss-120b'
                            : item.id === 'rose-character'
                            ? currentRoseMenuSummary
                            : item.desc}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* CONNECTIONS SUB-SCREEN (GEMINI, GROQ, ELEVENLABS)         */}
          {/* ========================================================= */}
          {activeScreen === 'connections' && (
            <ConnectionsSettings
              connections={localSettings.connections}
              onSaveConnections={(newConns) => {
                const updated: AppSettings = {
                  ...localSettings,
                  connections: newConns,
                };
                setLocalSettings(updated);
                settingsService.saveSettings(updated);
                onUpdateSettings(updated);
              }}
              onToast={onToast}
            />
          )}

          {/* ========================================================= */}
          {/* AI MODEL SUB-SCREEN (REASONING, LIVE VOICE, STT, PRIORITY)*/}
          {/* ========================================================= */}
          {activeScreen === 'ai-model' && (
            <AiModelSettings
              aiModel={localSettings.aiModel}
              connections={localSettings.connections}
              onSaveAiModel={(newAiModel) => {
                const updated: AppSettings = {
                  ...localSettings,
                  aiModel: newAiModel,
                };
                setLocalSettings(updated);
                settingsService.saveSettings(updated);
                onUpdateSettings(updated);
              }}
              onToast={onToast}
            />
          )}

          {/* ========================================================= */}
          {/* 2. CUSTOMIZATION SUB-SCREEN                               */}
          {/* ========================================================= */}
          {activeScreen === 'customization' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                Adjust visual theme glow, chat typography size, and header toggles.
              </div>

              {/* 1) Theme Glow Slider (50% to 150%) */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-sky-400" />
                    <span>Theme Glow Intensity</span>
                  </label>
                  <span className="font-mono text-sky-300 font-extrabold text-xs">
                    {localSettings.glowIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={localSettings.glowIntensity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalSettings((prev) => ({ ...prev, glowIntensity: val }));
                    settingsService.applyGlowIntensity(val);
                  }}
                  className="w-full h-2 bg-[#050c20] rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>50% (Soft)</span>
                  <span>100% (Default)</span>
                  <span>150% (Ultra Neon)</span>
                </div>
              </div>

              {/* 2) Chat Font Size */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-2.5">
                <label className="text-xs font-extrabold text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-sky-400" />
                  <span>Chat Font Size</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as ChatFontSizeType[]).map((size) => {
                    const isCur = localSettings.chatFontSize === size;
                    const labels: Record<ChatFontSizeType, string> = {
                      small: 'Small (ছোট)',
                      medium: 'Medium (মাঝারি)',
                      large: 'Large (বড়)',
                    };
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setLocalSettings((prev) => ({ ...prev, chatFontSize: size }))
                        }
                        className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                          isCur
                            ? 'bg-sky-500/25 text-sky-300 border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                            : 'bg-[#050c20] text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {labels[size]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3) Show Camera & Mic Buttons Switch */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-extrabold text-white text-xs">
                    <div className="flex items-center gap-1 text-sky-400">
                      <Video className="w-4 h-4" />
                      <Mic className="w-4 h-4" />
                    </div>
                    <span>Show Camera & Mic Buttons</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Display or hide Camera ON/OFF and Mic ON/OFF in header
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.showCameraMic}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        showCameraMic: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 shadow-inner"></div>
                </label>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ========================================================= */}
          {/* 3. AGENTS SUB-SCREEN (SPECIALIST AGENTS ONLY: 4 AGENTS)    */}
          {/* ========================================================= */}
          {activeScreen === 'agents' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Banner */}
              <div className="p-3.5 rounded-2xl bg-[#081533] border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.12)] space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 font-display">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Specialist agents</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/30 text-sky-300">
                    4 Agents
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  চারজন স্পেশালিস্ট এজেন্টের ব্যক্তিত্ব ও কাজের সুর ঠিক করুন। Rose-এর নিয়ন্ত্রণ আলাদা <strong className="text-rose-300">&apos;Rose Character&apos;</strong>-এ।
                </p>
              </div>

              {/* Box 1: মেয়েরা (Mira & Naira) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                  <h4 className="text-xs font-extrabold text-pink-300 uppercase tracking-wider">মেয়েরা</h4>
                </div>
                <div className="space-y-3">
                  {(['mira', 'naira'] as SpecialistAgentId[]).map((agentId) => renderAgentCard(agentId))}
                </div>
              </div>

              {/* Box 2: ছেলেরা (Arin & Zayan) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <h4 className="text-xs font-extrabold text-sky-300 uppercase tracking-wider">ছেলেরা</h4>
                </div>
                <div className="space-y-3">
                  {(['arin', 'zayan'] as SpecialistAgentId[]).map((agentId) => renderAgentCard(agentId))}
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Settings</span>
                  {hasUnsavedChanges && (
                    <span
                      title="অসংরক্ষিত পরিবর্তন রয়েছে"
                      className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ml-1 ring-2 ring-amber-300/40"
                    />
                  )}
                </button>

                {!isSupabaseLoggedIn && (
                  <p className="text-center text-[11px] text-slate-400">
                    সিঙ্কের জন্য <span className="text-sky-300 font-bold underline cursor-pointer" onClick={() => setActiveScreen('database-sync')}>Database & Sync</span>-এ লগইন করুন
                  </p>
                )}
              </div>

              {/* Security Rules Modal */}
              {securityModalAgentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-[#07132f] border border-sky-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-100">
                    <div className="flex items-center justify-between border-b border-sky-900/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-sky-400" />
                        <h4 className="text-sm font-extrabold text-white">
                          {IDENTITY_AGENTS_MAP[securityModalAgentId].name} — নিরাপত্তা ও সততা নিয়ম (Immutable Rules)
                        </h4>
                      </div>
                      <button
                        onClick={() => setSecurityModalAgentId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 text-xs leading-relaxed text-slate-300">
                      {SPECIALIST_IMMUTABLE_RULES.map((rule, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-[#050c20] border border-sky-950 flex items-start gap-2">
                          <span className="font-mono text-sky-400 font-bold shrink-0">{idx + 1}.</span>
                          <span>{rule.replace(/^\d+\)\s*/, '')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setSecurityModalAgentId(null)}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-md"
                      >
                        বুঝেছি (Close)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ROSE CHARACTER SUB-SCREEN (ISOLATED: ONLY FOR ROSE)       */}
          {/* ========================================================= */}
          {activeScreen === 'rose-character' &&
            (() => {
              const rc = getIsolatedRoseConfig(localSettings);
              const roseIdent = IDENTITY_AGENTS_MAP.rose;
              const charLen = (rc.customCharacter || '').length;
              const resolvedModel = resolveRoseModelChoice(localSettings, rc);
              const activePromptText = buildRoseSystemPrompt(rc, undefined, localSettings);
              const resolvedCombo = resolveRosePersonalityCombination(rc);
              const warmthMeta = resolvedCombo.warmthMeta;
              const roseTemp = getRoseTemperature(rc);

              const modelChoices: Array<{
                id: RoseModelChoiceType;
                label: string;
                sub: string;
              }> = [
                {
                  id: 'auto',
                  label: 'Auto (ডিফল্ট)',
                  sub: resolveRoseModelChoice(localSettings, {
                    ...rc,
                    modelChoice: 'auto',
                  }).model,
                },
                {
                  id: 'groq',
                  label: 'AI Model-এর Groq মডেল',
                  sub: resolveRoseModelChoice(localSettings, {
                    ...rc,
                    modelChoice: 'groq',
                  }).model,
                },
                {
                  id: 'gemini',
                  label: 'AI Model-এর Gemini মডেল',
                  sub: resolveRoseModelChoice(localSettings, {
                    ...rc,
                    modelChoice: 'gemini',
                  }).model,
                },
              ];

              return (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 1. Rose Identity & Strict Isolation Banner */}
                  <div className="p-3.5 rounded-2xl bg-[#081533] border border-rose-500/40 flex items-center gap-3 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden border-2 shrink-0 bg-[#071126]"
                      style={{
                        borderColor: roseIdent.color,
                        boxShadow: `0 0 12px ${roseIdent.color}65`,
                      }}
                    >
                      <img
                        src={roseIdent.avatar}
                        alt={roseIdent.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white font-display">
                          Rose Character
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-[10px] font-bold text-rose-300">
                          {warmthMeta.label} ({warmthMeta.bengaliLabel})
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono text-emerald-300">
                          characterSettings.rose
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/30 text-[10px] font-mono text-sky-300">
                          Temp: {roseTemp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Dedicated Rose-only configuration — strictly isolated from all other characters.
                      </p>
                    </div>
                  </div>

                  {/* 2. Emotional Warmth Control (Single-select) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-extrabold text-white block">
                          1) Emotional Warmth Control (সামগ্রিক আবেগী উষ্ণতা)
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Single-select control for Rose&apos;s overall emotional warmth level.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-[10px] font-extrabold text-rose-300 shrink-0">
                        {warmthMeta.label} Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(['gentle', 'warm', 'deep'] as const).map((warmthKey) => {
                        const meta = ROSE_WARMTH_LEVELS[warmthKey];
                        const isSelected = rc.emotionalWarmth === warmthKey;
                        return (
                          <button
                            key={warmthKey}
                            type="button"
                            onClick={() => handleSelectRoseEmotionalWarmth(warmthKey)}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'bg-rose-500/20 border-rose-400 text-white shadow-[0_0_14px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/50'
                                : 'bg-[#050c20] border-slate-800 text-slate-300 hover:border-sky-500/40 hover:text-white'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-white">
                                  {meta.label}
                                </span>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] font-semibold text-rose-300">
                                {meta.bengaliLabel}
                              </p>
                              <p className="text-[10px] text-slate-400 leading-snug pt-0.5">
                                {meta.desc}
                              </p>
                            </div>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-md w-fit ${
                                isSelected
                                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                                  : 'bg-slate-800/80 text-slate-400'
                              }`}
                            >
                              {warmthKey === 'warm' ? 'Default' : warmthKey}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Personality Traits (12 On/Off Switches Grouped Into 3 Categories) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-extrabold text-white block">
                          2) Personality Traits (ব্যক্তিত্বের অন/অফ ট্রেইটসমূহ)
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Individual On/Off controls grouped into 3 distinct categories.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono font-bold text-sky-300 shrink-0">
                        {resolvedCombo.enabledTraitsCount} / {resolvedCombo.allTraitsCount} ON
                      </span>
                    </div>

                    {ROSE_TRAIT_CATEGORIES.map((cat) => {
                      const categoryTraits = ROSE_TRAIT_DEFINITIONS.filter(
                        (t) => t.category === cat.id
                      );
                      const enabledInCat = categoryTraits.filter((t) =>
                        Boolean(rc.traits?.[t.key])
                      ).length;

                      return (
                        <div
                          key={cat.id}
                          className="p-3 rounded-xl bg-[#050c20]/90 border border-sky-950 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-sky-950/80 pb-1.5">
                            <div>
                              <span className="text-[11px] font-extrabold text-sky-300 tracking-wide">
                                {cat.title} ({cat.bengaliTitle})
                              </span>
                              <p className="text-[10px] text-slate-400">{cat.desc}</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-900/40 text-sky-300 border border-sky-700/40 shrink-0">
                              {enabledInCat} / {categoryTraits.length}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {categoryTraits.map((trait) => {
                              const isEnabled = Boolean(rc.traits?.[trait.key]);
                              return (
                                <div
                                  key={trait.key}
                                  onClick={() => handleToggleRoseTrait(trait.key)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                    isEnabled
                                      ? 'bg-rose-950/30 border-rose-500/50 text-white shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                                      : 'bg-[#030816] border-slate-800/90 text-slate-400 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[11px] font-extrabold text-white truncate">
                                        {trait.label}
                                      </span>
                                      <span className="text-[10px] font-semibold text-rose-300/90 truncate">
                                        ({trait.bengaliLabel})
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                      {trait.desc}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                                        isEnabled
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {isEnabled ? 'ON' : 'OFF'}
                                    </span>
                                    <div
                                      className={`w-9 h-5 rounded-full relative transition-colors ${
                                        isEnabled ? 'bg-rose-500' : 'bg-slate-800'
                                      }`}
                                    >
                                      <div
                                        className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                                          isEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Active Configuration Summary */}
                    <div className="p-3 rounded-xl bg-[#050c20] border border-rose-500/30 space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between text-rose-300 font-bold">
                        <span>Active Personality Configuration</span>
                        <span className="font-mono">
                          Warmth: {warmthMeta.label} • {resolvedCombo.enabledTraitsCount} Traits Enabled
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        <strong>Emotional Warmth:</strong> {warmthMeta.label} ({warmthMeta.bengaliLabel}) — {warmthMeta.desc}
                      </p>
                      <p className="text-slate-300 leading-relaxed">
                        <strong>Active Traits:</strong>{' '}
                        {resolvedCombo.enabledTraitLabels.length > 0
                          ? resolvedCombo.enabledTraitLabels.join(', ')
                          : 'None (Base gentle warmth only)'}
                      </p>
                    </div>
                  </div>

                  {/* 4. Custom Character Instructions (Optional, max 1500 chars) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-white">
                        3) Custom Character Instructions (কাস্টম চরিত্র / অতিরিক্ত নির্দেশ)
                      </label>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          charLen >= 1500 ? 'text-rose-400' : 'text-sky-400'
                        }`}
                      >
                        {charLen} / 1500
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Optional: Add any specific conversational guidance or personal touches for Rose.
                    </p>
                    <textarea
                      rows={3}
                      maxLength={1500}
                      value={rc.customCharacter || ''}
                      onChange={(e) =>
                        handleRoseCharacterChange(
                          'customCharacter',
                          e.target.value.slice(0, 1500)
                        )
                      }
                      placeholder="যেমন: কথা বলার সময় কোমল থাকবে, কাজের মাঝে বিশ্রামের কথা মনে করিয়ে দেবে..."
                      className="w-full px-3 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs focus:outline-none focus:border-rose-400 transition-all resize-none leading-relaxed placeholder:text-slate-500"
                    />
                  </div>

                  {/* 5. ডাকনাম (Rose Addressing Preference) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2">
                    <label className="text-xs font-extrabold text-white block">
                      4) ডাকনাম (Rose আপনাকে কী নামে সম্বোধন করবে)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      খালি থাকলে Voice & Language-এর নাম ({localSettings.userName || 'খালি'}) ব্যবহার করবে।
                    </p>
                    <input
                      type="text"
                      value={rc.nickname || ''}
                      onChange={(e) => handleRoseCharacterChange('nickname', e.target.value)}
                      placeholder="ডাকনাম লিখুন (ঐচ্ছিক)..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs focus:outline-none focus:border-sky-400 transition-all placeholder:text-slate-500"
                    />
                  </div>

                  {/* 6. Rose AI Model Selection */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-white">
                        5) Rose-এর জন্য মডেল বাছাই
                      </label>
                      <span className="text-[10px] text-sky-300 font-bold">
                        শুধু Rose-এর উত্তরে প্রযোজ্য
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {modelChoices.map((item) => {
                        const active = (rc.modelChoice || 'auto') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleRoseCharacterChange('modelChoice', item.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              active
                                ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                                : 'bg-[#050c20] border-slate-800 text-slate-300 hover:border-sky-500/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-extrabold truncate">
                                {item.label}
                              </span>
                              {active && <Check className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                              {item.sub}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7. Show active Rose system prompt */}
                  <div className="rounded-2xl bg-[#081533] border border-sky-900/70 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowActivePrompt((prev) => !prev)}
                      className="w-full p-3.5 flex items-center justify-between gap-2 text-left hover:bg-[#0b1c42] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {showActivePrompt ? (
                          <ChevronDown className="w-4 h-4 text-sky-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <span className="text-xs font-extrabold text-white">
                          Show active Rose dynamic system prompt
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-400/30 px-2.5 py-1 rounded-lg truncate">
                        {warmthMeta.label} • {resolvedModel.model}
                      </span>
                    </button>

                    {showActivePrompt && (
                      <div className="p-3.5 pt-0 border-t border-sky-900/50 space-y-2">
                        <p className="text-[10px] text-slate-400 pt-2">
                          এই মুহূর্তে <span className="font-mono text-rose-300">characterSettings.rose</span> থেকে Rose-কে যে সম্পূর্ণ ডায়নামিক system prompt যাচ্ছে:
                        </p>
                        <textarea
                          readOnly
                          rows={12}
                          value={activePromptText}
                          className="w-full p-3 rounded-xl bg-[#040a1a] border border-slate-800 text-[11px] text-slate-200 font-mono leading-relaxed focus:outline-none resize-y select-text"
                        />
                      </div>
                    )}
                  </div>

                  {/* 7b. Rose-এর কণ্ঠস্বর (Voice & ElevenLabs) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-rose-500/35 space-y-2.5 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <label className="text-xs font-extrabold text-white">
                          Rose-এর কণ্ঠস্বর (ElevenLabs Voice)
                        </label>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {rc.elevenLabsVoiceId ? 'কাস্টম Voice ID সক্রিয়' : 'ডিফল্ট কণ্ঠ'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Rose-এর ElevenLabs Voice ID এখানে সেট করুন এবং প্রিভিউ শুনুন। এটি Agents স্ক্রিন থেকে আলাদা এবং শুধুই Rose-এর জন্য সংরক্ষিত।
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={rc.elevenLabsVoiceId || ''}
                        onChange={(e) => handleRoseCharacterChange('elevenLabsVoiceId', e.target.value)}
                        placeholder="e.g. pMs23urrqp9VG88KwyXl"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#050c20] border border-rose-500/30 text-white text-xs font-mono focus:outline-none focus:border-rose-400 placeholder:text-slate-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handlePreviewRoseVoice}
                        disabled={previewVoiceAgent === 'rose'}
                        className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-sm disabled:opacity-50"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>{previewVoiceAgent === 'rose' ? 'শুনছেন...' : 'Preview Voice'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 8. Interactive Test Box */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-white">
                        6) টেস্ট বাক্স (সেভ করার আগে Rose-এর সাথে পরীক্ষা করুন)
                      </label>
                      <span className="text-[10px] text-slate-400">চ্যাটে সেভ হবে না</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={roseTestInput}
                        onChange={(e) => setRoseTestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleTestRoseCharacter();
                          }
                        }}
                        placeholder="পরীক্ষা করার জন্য একটি বাক্য লিখুন (যেমন: 'আজ মনটা একটু খারাপ')..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={handleTestRoseCharacter}
                        disabled={roseTestLoading || !roseTestInput.trim()}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                      >
                        {roseTestLoading ? 'Testing...' : 'Test'}
                      </button>
                    </div>

                    {roseTestOutput && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          roseTestOutput.isError
                            ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                            : 'bg-[#050c20] border-rose-500/40 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-[11px] font-extrabold text-rose-300">
                            চরিত্র: {roseTestOutput.character || `Rose (${rc.emotionalWarmth})`} • মডেল:{' '}
                            {roseTestOutput.model || resolvedModel.model}
                          </span>
                          {roseTestOutput.emotion && !roseTestOutput.isError && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              [{roseTestOutput.emotion}]
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {roseTestOutput.text}
                        </p>
                        {roseTestOutput.subtext && (
                          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                            {roseTestOutput.subtext}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 9. Action Buttons: Reset to Default and Save */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleResetRoseCharacter}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                    >
                      Reset to Default
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-sky-500 hover:from-rose-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-sky-400/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Rose Settings</span>
                    </button>
                  </div>

                  {/* 10. Immutable Rules Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 space-y-2 text-slate-300 select-text">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>সবসময় প্রযোজ্য নিয়ম (Safety & System Rules)</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                      {ROSE_IMMUTABLE_RULES.map((rule, idx) => (
                        <li key={idx}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}

          {/* VOICE & LANGUAGE SUB-SCREEN (YOUR NAME & ADDRESS AS)      */}
          {/* ========================================================= */}
          {activeScreen === 'voice-language' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                আপনার নাম ও সম্বোধন নির্ধারণ করুন। এটি শুধুমাত্র আপনার ব্রাউজারে (localStorage) সংরক্ষিত থাকবে।
              </div>

              {/* Row 1: Your name */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-2.5">
                <label className="text-xs font-extrabold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-400" />
                  <span>Your name</span>
                </label>
                <input
                  type="text"
                  value={localSettings.userName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated: AppSettings = {
                      ...localSettings,
                      userName: val,
                      hasCompletedWelcome: true,
                    };
                    setLocalSettings(updated);
                    settingsService.saveSettings(updated);
                    onUpdateSettings(updated);
                  }}
                  placeholder="আপনার নাম লিখুন (যেমন: রহিম)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050c20] border border-sky-500/40 text-white text-xs focus:outline-none focus:border-sky-400 transition-all placeholder:text-slate-500"
                />
                <p className="text-[10px] text-slate-400">
                  নাম খালি রাখলে এজেন্টরা কোনো নাম ছাড়া ভদ্রভাবে কথা বলবে।
                </p>
              </div>

              {/* Row 2: Address as */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-2.5">
                <label className="text-xs font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>Address as</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ADDRESS_AS_OPTIONS.map((opt) => {
                    const isSelected = (localSettings.userAddressAs || 'শুধু নাম') === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const updated: AppSettings = {
                            ...localSettings,
                            userAddressAs: opt,
                            hasCompletedWelcome: true,
                          };
                          setLocalSettings(updated);
                          settingsService.saveSettings(updated);
                          onUpdateSettings(updated);
                        }}
                        className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border ${
                          isSelected
                            ? 'bg-sky-500/25 text-sky-300 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                            : 'bg-[#050c20] text-slate-400 hover:text-white border-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 text-[11px] text-sky-300/90">
                  {localSettings.userName?.trim() ? (
                    <span>
                      এজেন্টরা ডাকবে:{' '}
                      <strong className="text-white">
                        {localSettings.userAddressAs === 'শুধু নাম'
                          ? localSettings.userName.trim()
                          : `${localSettings.userName.trim()} ${localSettings.userAddressAs}`}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      এজেন্টরা নাম ছাড়া ভদ্রভাবে সম্বোধন করবে।
                    </span>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. DEVELOPER SUB-SCREEN (READ-ONLY FROM developer.ts)     */}
          {/* ========================================================= */}
          {activeScreen === 'developer' && (
            <div className="space-y-4 animate-in fade-in duration-200 select-text">
              {/* Read-Only Profile Header Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0a183d] via-[#08122d] to-[#050b1d] border border-indigo-500/50 shadow-[0_0_35px_rgba(99,102,241,0.25)] flex flex-col items-center text-center space-y-3.5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-500 to-blue-600 p-[2px] shadow-[0_0_25px_rgba(99,102,241,0.5)]">
                  <div className="w-full h-full bg-[#050b1d] rounded-[14px] flex items-center justify-center">
                    <Code2 className="w-9 h-9 text-indigo-300" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-white font-display tracking-wide">
                    {DEVELOPER_PROFILE.name}
                  </h2>
                  <p className="text-xs font-bold text-indigo-300 mt-1 uppercase tracking-wider">
                    {DEVELOPER_PROFILE.title}
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/40 text-[11px] text-indigo-200 font-mono">
                  <Lock className="w-3 h-3 text-indigo-300" />
                  <span>Read-Only Developer Profile</span>
                </div>
              </div>

              {/* Contact & Location Details (Phone, Email, Website, Address) */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Contact & Identity</span>
                </h4>

                <div className="space-y-2.5">
                  {/* Phone with Copy button */}
                  <div className="p-3 rounded-xl bg-[#050e26] border border-sky-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                          Phone
                        </span>
                        <span className="text-xs font-bold text-white font-mono tracking-wide break-all">
                          {DEVELOPER_PROFILE.phone}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(DEVELOPER_PROFILE.phone);
                        onToast('ফোন নম্বর কপি করা হয়েছে');
                      }}
                      title="ফোন নম্বর কপি করুন"
                      className="px-2.5 py-1.5 rounded-lg bg-sky-900/40 hover:bg-sky-800/60 border border-sky-500/30 text-sky-200 hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-colors shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Email with Copy button */}
                  <div className="p-3 rounded-xl bg-[#050e26] border border-sky-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                          Email
                        </span>
                        <span className="text-xs font-bold text-white font-mono tracking-wide break-all">
                          {DEVELOPER_PROFILE.email}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(DEVELOPER_PROFILE.email);
                        onToast('ইমেইল কপি করা হয়েছে');
                      }}
                      title="ইমেইল কপি করুন"
                      className="px-2.5 py-1.5 rounded-lg bg-sky-900/40 hover:bg-sky-800/60 border border-sky-500/30 text-sky-200 hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-colors shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Website (Clickable Link) */}
                  <a
                    href={
                      isDeveloperFieldEmpty(DEVELOPER_PROFILE.website)
                        ? '#'
                        : DEVELOPER_PROFILE.website.startsWith('http')
                        ? DEVELOPER_PROFILE.website
                        : `https://${DEVELOPER_PROFILE.website}`
                    }
                    target={isDeveloperFieldEmpty(DEVELOPER_PROFILE.website) ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (isDeveloperFieldEmpty(DEVELOPER_PROFILE.website)) {
                        e.preventDefault();
                      }
                    }}
                    className="p-3 rounded-xl bg-[#050e26] border border-sky-500/30 hover:border-sky-400 flex items-center justify-between gap-2 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                          Website
                        </span>
                        <span className="text-xs font-bold text-sky-300 group-hover:underline font-mono tracking-wide break-all">
                          {DEVELOPER_PROFILE.website}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300 shrink-0" />
                  </a>

                  {/* Address (Read-only) */}
                  <div className="p-3 rounded-xl bg-[#050e26] border border-sky-500/30 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                        Address
                      </span>
                      <span className="text-xs font-bold text-white tracking-wide break-words">
                        {DEVELOPER_PROFILE.address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Profiles (Clickable) */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Social Links</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEVELOPER_PROFILE.social.map((item) => {
                    const isFb = item.label.toLowerCase().includes('facebook');
                    const isYt = item.label.toLowerCase().includes('youtube');
                    const isEmptyUrl = isDeveloperFieldEmpty(item.url);
                    const href = isEmptyUrl
                      ? '#'
                      : item.url.startsWith('http')
                      ? item.url
                      : `https://${item.url}`;

                    return (
                      <a
                        key={item.label}
                        href={href}
                        target={isEmptyUrl ? undefined : '_blank'}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (isEmptyUrl) {
                            e.preventDefault();
                          }
                        }}
                        className="p-3 rounded-xl bg-[#050e26] border border-sky-500/30 hover:border-sky-400 hover:bg-[#07153d] flex items-center justify-between gap-2 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isFb
                                ? 'bg-blue-500/20 text-blue-400'
                                : isYt
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-sky-500/20 text-sky-400'
                            }`}
                          >
                            {isFb ? (
                              <Facebook className="w-4 h-4 fill-current" />
                            ) : isYt ? (
                              <Youtube className="w-4 h-4" />
                            ) : (
                              <Globe className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white tracking-wide truncate">
                              {item.label}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono truncate">
                              {item.url}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-300 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ANALYTICS SUB-SCREEN (LAST 20 TEAM DELEGATION TASKS)       */}
          {/* ========================================================= */}
          {activeScreen === 'analytics' && (
            <div className="space-y-4 animate-in fade-in duration-150 select-text">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200 flex items-center justify-between">
                <span>দলগত কাজের তালিকা (সর্বশেষ ২০টি কাজ — শুধুমাত্র পড়ার জন্য)</span>
                <span className="font-mono text-[10px] text-sky-300">localStorage</span>
              </div>

              {(() => {
                const tasks = getTeamDelegationTasks();
                if (tasks.length === 0) {
                  return (
                    <div className="p-8 rounded-2xl bg-[#081533] border border-sky-900/70 text-center space-y-2 text-slate-400">
                      <BarChart3 className="w-8 h-8 text-sky-400/60 mx-auto" />
                      <p className="text-xs font-bold text-white">এখনও কোনো দলগত কাজ নেই</p>
                      <p className="text-[11px] text-slate-400">
                        Rose যখন Mira, Arin, Zayan বা Naira-কে কোনো কাজ দেবে, তখন সেটি এখানে দেখা যাবে।
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {tasks.map((t) => {
                      const fromAgent = IDENTITY_AGENTS_MAP[t.from] || IDENTITY_AGENTS_MAP.rose;
                      const toAgent = IDENTITY_AGENTS_MAP[t.to] || IDENTITY_AGENTS_MAP.mira;
                      const statusBadge =
                        t.status === 'done'
                          ? { label: 'done', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
                          : t.status === 'failed'
                          ? { label: 'failed', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
                          : t.status === 'doing'
                          ? { label: 'doing', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' }
                          : { label: 'pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };

                      return (
                        <div
                          key={t.id}
                          style={{ borderLeftColor: toAgent.color }}
                          className="p-3.5 rounded-xl bg-[#081533] border border-sky-900/60 border-l-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold">
                              <span style={{ color: fromAgent.color }}>{fromAgent.name}</span>
                              <span className="text-slate-400">→</span>
                              <span style={{ color: toAgent.color }}>{toAgent.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${statusBadge.cls}`}
                              >
                                {statusBadge.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{t.time}</span>
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-white">
                            কাজ: <span className="font-normal text-slate-200">{t.task}</span>
                          </p>

                          {t.result && (
                            <p className="text-[11px] text-slate-300 bg-[#050c20] p-2 rounded-lg border border-sky-950">
                              ফলাফল: {t.result}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================= */}
          {/* 4D. SUB-SCREEN: VOICE SETTINGS                            */}
          {/* ========================================================= */}
          {activeScreen === 'voice-settings' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-[#081533]/90 border border-sky-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-sky-400" />
                      <span>Voice Reply</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      মাইক চালু থাকলে এজেন্টের উত্তর উচ্চস্বরে পড়ে শোনাবে
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        voiceSettings: {
                          ...prev.voiceSettings,
                          voiceReply: !(prev.voiceSettings?.voiceReply !== false),
                        },
                      }))
                    }
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                      localSettings.voiceSettings?.voiceReply !== false
                        ? 'bg-emerald-500 justify-end shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                  </button>
                </div>

                {/* Voice Engine Selector */}
                <div className="space-y-2 pt-3 border-t border-sky-900/50">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Voice Engine</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Auto', 'ElevenLabs', 'Browser'].map((eng) => {
                      const isAct = localSettings.voiceSettings.engine === eng;
                      return (
                        <button
                          key={eng}
                          type="button"
                          onClick={() => setLocalSettings(prev => ({
                            ...prev,
                            voiceSettings: { ...prev.voiceSettings, engine: eng as any }
                          }))}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                            isAct ? 'bg-sky-500/25 border-sky-400 text-sky-200' : 'bg-[#050c20] border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {eng}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ElevenLabs Specifics */}
                {(localSettings.voiceSettings.engine === 'Auto' || localSettings.voiceSettings.engine === 'ElevenLabs') && (
                  <div className="space-y-3 pt-3 border-t border-sky-900/50 animate-in slide-in-from-top-2 duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Model ID</label>
                        <input
                          type="text"
                          value={localSettings.voiceSettings.elevenLabsModelId}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            voiceSettings: { ...prev.voiceSettings, elevenLabsModelId: e.target.value }
                          }))}
                          placeholder="eleven_v3"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#050c20] border border-sky-500/30 text-white text-[11px] focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Char Limit</label>
                        <input
                          type="number"
                          value={localSettings.voiceSettings.elevenLabsCharLimit}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            voiceSettings: { ...prev.voiceSettings, elevenLabsCharLimit: Number(e.target.value) }
                          }))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#050c20] border border-sky-500/30 text-white text-[11px] focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                      <span className="text-[10px] text-sky-300 font-medium">
                        এই সেশনে ElevenLabs-এ ~{ttsService.getCharactersSent()} অক্ষর পাঠানো হয়েছে
                      </span>
                    </div>
                  </div>
                )}

                {/* Speech Speed Slider */}
                <div className="space-y-1.5 pt-3 border-t border-sky-900/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">কণ্ঠের গতি (Speech Speed)</span>
                    <span className="text-sky-400 font-extrabold">
                      {(localSettings.voiceSettings?.speed ?? 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.1}
                    value={localSettings.voiceSettings?.speed ?? 1.0}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        voiceSettings: {
                          ...prev.voiceSettings,
                          speed: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Speech Volume Slider */}
                <div className="space-y-1.5 pt-2 border-t border-sky-900/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">শব্দের মাত্রা (Volume)</span>
                    <span className="text-sky-400 font-extrabold">
                      {Math.round((localSettings.voiceSettings?.volume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={localSettings.voiceSettings?.volume ?? 1.0}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        voiceSettings: {
                          ...prev.voiceSettings,
                          volume: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Test Voice Button */}
                <div className="pt-2 border-t border-sky-900/50 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400">
                    নমুনা বাক্য শুনে কণ্ঠ ও গতি পরীক্ষা করুন
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleText = 'হ্যালো! আমি রোজ। আপনার ব্যবসার সব কাজ আমি যত্নসহকারে দেখছি।';
                      voiceChat.speak(sampleText, 'rose', {
                        language: 'বাংলা',
                        speed: localSettings.voiceSettings?.speed ?? 1.0,
                        volume: localSettings.voiceSettings?.volume ?? 1.0,
                        onMissingBengaliVoice: (note) => {
                          onToast(note);
                        },
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 font-extrabold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Test voice</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Voice Settings</span>
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* PC CONTROL SUB-SCREEN (DESKTOP STATUS, PERMISSIONS & FILES) */}
          {/* ========================================================= */}
          {activeScreen === 'pc-control' &&
            (() => {
              const isDesktopConnected =
                typeof window !== 'undefined' &&
                Boolean((window as any).roseDesktop?.isConnected?.());

              const pcPerms = [
                {
                  key: 'openAppsAndWebsites' as const,
                  label: 'Open apps and websites',
                  sub: 'পিসিতে অ্যাপ এবং ওয়েবসাইট খোলার অনুমতি',
                },
                {
                  key: 'typeTextAndPressKeys' as const,
                  label: 'Type text and press keys',
                  sub: 'পিসিতে টেক্সট টাইপ এবং কী প্রেসের অনুমতি',
                },
                {
                  key: 'readOrOpenFiles' as const,
                  label: 'Read or open files',
                  sub: 'পিসিতে ফাইল পড়া বা খোলার অনুমতি',
                },
                {
                  key: 'cameraAndMic' as const,
                  label: 'Camera and mic',
                  sub: 'ক্যামেরা এবং মাইক্রোফোন ব্যবহারের অনুমতি',
                },
              ];

              const handleTogglePcPerm = (
                key:
                  | 'openAppsAndWebsites'
                  | 'typeTextAndPressKeys'
                  | 'readOrOpenFiles'
                  | 'cameraAndMic'
              ) => {
                const currentVal = localSettings.pcControl[key] ?? true;
                const updated: AppSettings = {
                  ...localSettings,
                  pcControl: {
                    ...localSettings.pcControl,
                    [key]: !currentVal,
                  },
                };
                setLocalSettings(updated);
                settingsService.saveSettings(updated);
                onUpdateSettings(updated);
              };

              return (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Desktop App Connection Status + 4 Permission Toggles */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-sky-900/50">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-sky-400" />
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Desktop App & PC Permissions
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isDesktopConnected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isDesktopConnected
                          ? 'Desktop app connected'
                          : 'Desktop app not connected'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {pcPerms.map((perm) => {
                        const enabled = localSettings.pcControl[perm.key] ?? true;
                        return (
                          <div
                            key={perm.key}
                            className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white">{perm.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{perm.sub}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTogglePcPerm(perm.key)}
                              className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                                enabled
                                  ? 'bg-emerald-500 justify-end shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                  : 'bg-slate-700 justify-start'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-relaxed">
                      প্রতিটি PC অ্যাকশন প্রথমে Approvals নিয়মের মধ্য দিয়ে যাবে। লক করা কাজগুলো (Delete files, Payments, Passwords, Install/uninstall) কখনোই এক্সপোজ করা হয় না।
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-sky-400" />
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Files & Folder
                        </h4>
                      </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        pcControl: {
                          ...prev.pcControl,
                          allowFileSave: !prev.pcControl.allowFileSave,
                        },
                      }))
                    }
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                      localSettings.pcControl.allowFileSave
                        ? 'bg-emerald-500 justify-end shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-sky-900/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-300">Allow Rose to save files</p>
                      <p className="text-[10px] text-slate-400">এজেন্টকে সরাসরি পিসিতে ফাইল সেভ করতে দিন</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Work Folder:</span>
                      <span className="text-sky-300 font-mono font-bold truncate max-w-[150px]">
                        {localSettings.pcControl.workFolderName || 'No folder selected'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {!directoryHandle ? (
                        <button
                          onClick={onChooseFolder}
                          className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 text-[10px] font-bold transition-all flex items-center gap-1.5"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Choose work folder
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={onReconnectFolder}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold transition-all flex items-center gap-1.5"
                          >
                            <Link className="w-3.5 h-3.5" />
                            Reconnect
                          </button>
                          <button
                            onClick={onDisconnectFolder}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold transition-all flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {typeof (window as any).showDirectoryPicker === 'undefined' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="text-[10px] leading-relaxed">
                        আপনার ব্রাউজার সরাসরি ফোল্ডার সেভ সমর্থন করে না। অ্যাপ আলাদা ট্যাবে খুললে সরাসরি ফোল্ডারে সেভ হবে, অন্যথায় ডাউনলোড (Blob) হবে।
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save PC Control Settings</span>
              </button>
            </div>
              );
            })()}

          {/* ========================================================= */}
          {/* SECURITY & PRIVACY SUB-SCREEN                              */}
          {/* ========================================================= */}
          {activeScreen === 'security-privacy' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-sky-900/50">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Security & Privacy
                  </h4>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-white">ফাইল সুরক্ষা নোট:</p>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">
                        আপনার আপলোড করা ফাইলের লেখা এআই সেবায় (Groq/Gemini) পাঠানো হয়। সংবেদনশীল তথ্য থাকলে তা যাচাই করে আপলোড করুন।
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">External Services</p>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                      ROSE AI আপনার কোনো পার্সোনাল ফাইল আমাদের সার্ভারে জমা রাখে না। সব ফাইল প্রসেসিং আপনার ব্রাউজারে লোকালভাবে সম্পন্ন হয়।
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* APPROVALS SUB-SCREEN (PERMISSION RULES & WAITING QUEUE)    */}
          {/* ========================================================= */}
          {activeScreen === 'approvals' &&
            (() => {
              const rules: PermissionRulesConfig = {
                ...DEFAULT_PERMISSION_RULES,
                ...(localSettings.permissionRules || {}),
                deleteFiles: true,
                paymentsOrTransfer: true,
                passwordsOrPrivateData: true,
                installOrUninstallSoftware: true,
              };

              const toggleableRows: Array<{
                key: keyof PermissionRulesConfig;
                label: string;
              }> = [
                { key: 'sendWhatsappMessenger', label: 'Send WhatsApp / Messenger message' },
                { key: 'postReplyFbYoutube', label: 'Post or reply on Facebook / YouTube' },
                { key: 'sendEmailApplyJob', label: 'Send email / apply for a job' },
                { key: 'saveOrSendBill', label: 'Save or send a bill' },
                { key: 'openWebsiteOrAppPc', label: 'Open website or app on PC' },
                { key: 'typeTextOrKeysPc', label: 'Type text or press keys on PC' },
                { key: 'readOrOpenFilesPc', label: 'Read or open files on PC' },
                { key: 'playMusicVideo', label: 'Play music / video' },
              ];

              const lockedRows: Array<{
                key: keyof PermissionRulesConfig;
                label: string;
              }> = [
                { key: 'deleteFiles', label: 'Delete files' },
                { key: 'paymentsOrTransfer', label: 'Payments or money transfer' },
                { key: 'passwordsOrPrivateData', label: 'Passwords or private data' },
                { key: 'installOrUninstallSoftware', label: 'Install or uninstall software' },
              ];

              const handleToggleRule = (key: keyof PermissionRulesConfig) => {
                const nextRules: PermissionRulesConfig = {
                  ...rules,
                  [key]: !rules[key],
                  deleteFiles: true,
                  paymentsOrTransfer: true,
                  passwordsOrPrivateData: true,
                  installOrUninstallSoftware: true,
                };
                const updated: AppSettings = {
                  ...localSettings,
                  permissionRules: nextRules,
                };
                setLocalSettings(updated);
                settingsService.saveSettings(updated);
                onUpdateSettings(updated);
                onToast(
                  nextRules[key]
                    ? 'Rule set to: Ask me first'
                    : 'Rule set to: Allow automatically'
                );
              };

              return (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* 1. Permission rules list */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-sky-900/50">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-sky-400" />
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Permission rules
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: AppSettings = {
                            ...localSettings,
                            permissionRules: rules,
                          };
                          setLocalSettings(updated);
                          settingsService.saveSettings(updated);
                          onUpdateSettings(updated);
                          onToast('Permission rules saved');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 text-[10px] font-extrabold transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {toggleableRows.map((row) => {
                        const isAskFirst = Boolean(rules[row.key]);
                        return (
                          <div
                            key={row.key}
                            className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white">{row.label}</p>
                              <p
                                className={`text-[10px] font-semibold mt-0.5 ${
                                  isAskFirst ? 'text-amber-300' : 'text-emerald-400'
                                }`}
                              >
                                {isAskFirst ? 'Ask me first' : 'Allow automatically'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleRule(row.key)}
                              className={`relative w-12 h-6 rounded-full transition-colors duration-200 border shrink-0 ${
                                isAskFirst
                                  ? 'bg-sky-500/30 border-sky-400'
                                  : 'bg-slate-800 border-slate-700'
                              }`}
                              title={isAskFirst ? 'Ask me first (ON)' : 'Allow automatically (OFF)'}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${
                                  isAskFirst
                                    ? 'translate-x-6 bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                                    : 'translate-x-0 bg-slate-400'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}

                      {/* 2. Locked rows ("Ask me first" permanently) */}
                      {lockedRows.map((row) => (
                        <div
                          key={row.key}
                          className="p-3 rounded-xl bg-slate-950/40 border border-amber-500/20 flex items-center justify-between gap-3 opacity-90"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <p className="text-xs font-bold text-white">{row.label}</p>
                            </div>
                            <p className="text-[10px] font-semibold text-amber-300 mt-0.5">
                              Ask me first (Locked)
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled
                            className="relative w-12 h-6 rounded-full bg-amber-500/25 border border-amber-400/50 cursor-not-allowed shrink-0"
                            title="Locked to Ask me first"
                          >
                            <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full translate-x-6 bg-amber-300" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Actions waiting for your OK */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-sky-900/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Actions waiting for your OK
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-extrabold text-amber-300">
                        {pendingApprovals.length}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
                      {pendingApprovals.length === 0 ? (
                        <div className="py-6 text-center space-y-1.5">
                          <p className="text-xs text-slate-400">No actions waiting for your OK.</p>
                        </div>
                      ) : (
                        pendingApprovals.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/30 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                <p className="text-[11px] text-slate-300 break-words mt-0.5">
                                  {item.detail}
                                </p>
                                <p className="text-[9px] text-slate-500 mt-1">
                                  {new Date(item.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              {item.payload?.url ? (
                                <a
                                  href={item.payload.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    resolvePendingApproval(item.id, true);
                                    onToast('Action approved');
                                  }}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    resolvePendingApproval(item.id, true);
                                    onToast('Action approved');
                                  }}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  resolvePendingApproval(item.id, false);
                                  onToast('Action rejected');
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Existing File Approvals Log */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-sky-900/50">
                      <CheckSquare className="w-5 h-5 text-sky-400" />
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        File Approvals Log
                      </h4>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                      {fileLogs.length === 0 ? (
                        <div className="py-8 text-center space-y-2">
                          <Clock className="w-8 h-8 text-slate-700 mx-auto" />
                          <p className="text-xs text-slate-500">কোনো কাজের ইতিহাস নেই।</p>
                        </div>
                      ) : (
                        fileLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3 animate-in slide-in-from-left-2 duration-150"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-white truncate">
                                  {log.name}
                                </span>
                                <span className="text-[8px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                                  {(log.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div
                              className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${
                                log.status === 'Saved' || log.status === 'Approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {log.status === 'Saved'
                                ? 'সেভ হয়েছে'
                                : log.status === 'Approved'
                                ? 'অনুমোদিত'
                                : 'বাতিল'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 italic text-center">
                      শেষ ৫০টি কাজের তালিকা দেখানো হচ্ছে।
                    </p>
                  </div>
                </div>
              );
            })()}

          {/* ========================================================= */}
          {/* INTEGRATIONS & ACCESS SUB-SCREEN                          */}
          {/* ========================================================= */}
          {activeScreen === 'integrations' && (
            <IntegrationsSettings
              integrations={localSettings.integrations}
              geminiKey={localSettings.connections.geminiKey}
              onSaveIntegrations={(newIntegrations) => {
                const updated: AppSettings = {
                  ...localSettings,
                  integrations: newIntegrations,
                };
                setLocalSettings(updated);
                settingsService.saveSettings(updated);
                onUpdateSettings(updated);
              }}
              onToast={onToast}
            />
          )}

          {/* ========================================================= */}
          {/* DATABASE & SYNC SUB-SCREEN (SUPABASE INTEGRATION)         */}
          {/* ========================================================= */}
          {activeScreen === 'database-sync' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Card */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/30 space-y-1 shadow-[0_0_15px_rgba(56,189,248,0.12)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-sky-400" />
                    <h3 className="text-sm font-extrabold text-white font-display">
                      Database & Supabase Sync
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isSupabaseLoggedIn
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : supabaseUrl && supabaseAnonKey
                        ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isSupabaseLoggedIn
                      ? 'লগইন সক্রিয় (Auto Sync)'
                      : supabaseUrl && supabaseAnonKey
                      ? 'কনফিগার করা আছে'
                      : 'সংযোগ বিচ্ছিন্ন'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Supabase ক্লাউড ডেটাবেসের মাধ্যমে আপনার Rose এবং ৪ জন স্পেশালিস্ট এজেন্টের সমস্ত কনফিগারেশন রিয়েলটাইমে সিঙ্ক রাখুন।
                </p>
              </div>

              {/* Credentials Configuration Card */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3.5">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-sky-400" />
                  <span>Supabase API Credentials</span>
                </h4>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs font-mono focus:outline-none focus:border-sky-400 placeholder:text-slate-600 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Supabase Anon API Key
                    </label>
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs font-mono focus:outline-none focus:border-sky-400 placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                {/* Status Message */}
                {supabaseStatusMsg && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      supabaseStatusMsg.ok
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {supabaseStatusMsg.ok ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{supabaseStatusMsg.text}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestSupabaseConnection}
                    disabled={supabaseTesting || !supabaseUrl || !supabaseAnonKey}
                    className="py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${supabaseTesting ? 'animate-spin' : ''}`} />
                    <span>{supabaseTesting ? 'পরীক্ষা করা হচ্ছে...' : 'Test & Save Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncSupabaseNow}
                    disabled={supabaseSyncing || !supabaseUrl || !supabaseAnonKey}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-sky-400/50 shadow-md transition-all disabled:opacity-50"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${supabaseSyncing ? 'animate-pulse' : ''}`} />
                    <span>{supabaseSyncing ? 'সিঙ্ক হচ্ছে...' : 'Sync All Agents Now'}</span>
                  </button>
                </div>
              </div>

              {/* Table Schema & Security Rules Info */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>নিরাপত্তা ও সংরক্ষিত ডেটা নীতি</span>
                  </h4>
                  <span className="text-[10px] text-emerald-300 font-mono">5 Rows Only</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <p>
                    • টেবিলে মোট ৫টি রো থাকবে (user_id দিয়ে ফিল্টার করা): <span className="font-mono text-rose-300">&apos;rose&apos;</span>, <span className="font-mono text-emerald-300">&apos;mira&apos;</span>, <span className="font-mono text-sky-300">&apos;arin&apos;</span>, <span className="font-mono text-amber-300">&apos;zayan&apos;</span>, <span className="font-mono text-purple-300">&apos;naira&apos;</span>।
                  </p>
                  <p className="text-slate-400">
                    • <strong>কঠোর নিরাপত্তা:</strong> নাম, অবতার, রোল, বা এপিআই কি কখনো ক্লাউডে যায় না। ক্লাউড শুধুমাত্র ব্যবহারকারীর নিজস্ব পার্সোনালিটি ও নির্দেশনা সংরক্ষণ করে।
                  </p>
                </div>
              </div>

              {/* Standalone SQL Script Card */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-400" />
                    <span>Supabase SQL Script (Migration)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const sql = `create table if not exists public.agent_settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null check (agent_id in ('rose','mira','arin','zayan','naira')),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);
alter table public.agent_settings enable row level security;
create policy "own agent settings" on public.agent_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter publication supabase_realtime add table public.agent_settings;`;
                      navigator.clipboard.writeText(sql);
                      onToast('SQL স্ক্রিপ্ট কপি করা হয়েছে');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-[10px] text-sky-300 font-bold flex items-center gap-1 transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy SQL</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-400">
                  Supabase ড্যাশবোর্ডের SQL Editor-এ এই কোডটি চালিয়ে <span className="font-mono text-sky-300">public.agent_settings</span> টেবিল ও Realtime চালু করুন:
                </p>

                <div className="p-3 rounded-xl bg-[#04091a] border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-pre overflow-x-auto leading-relaxed custom-scrollbar">
{`create table if not exists public.agent_settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null check (agent_id in ('rose','mira','arin','zayan','naira')),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);
alter table public.agent_settings enable row level security;
create policy "own agent settings" on public.agent_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter publication supabase_realtime add table public.agent_settings;`}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHONE LINK SUB-SCREEN                                     */}
          {/* ========================================================= */}
          {activeScreen === 'phone-link' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Card */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/30 space-y-2 shadow-[0_0_15px_rgba(56,189,248,0.12)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-sky-400" />
                    <h3 className="text-sm font-extrabold text-white font-display">
                      Phone Link (মোবাইল সংযোগ)
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      phoneLinkStatus === 'Listening'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : phoneLinkStatus === 'Paused'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                        : 'bg-rose-500/20 text-rose-300 border-rose-400/50'
                    }`}
                  >
                    {phoneLinkStatus} {phoneLinkError ? `(${phoneLinkError})` : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  মোবাইল অ্যাপ থেকে প্রেরিত প্রশ্ন ও নোট পিসির Rose-এর কাছে রিয়েলটাইমে সিঙ্ক ও প্রক্রিয়া করুন।
                </p>
              </div>

              {/* Login Status & Pause Switch Card */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">লগইন ও সংযোগের অবস্থা</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isSupabaseLoggedIn && supabaseUserEmail ? (
                        <span className="text-emerald-300 font-mono font-bold">{supabaseUserEmail}</span>
                      ) : (
                        <span
                          onClick={() => setActiveScreen('database-sync')}
                          className="text-sky-300 font-bold underline cursor-pointer"
                        >
                          Database & Sync-এ লগইন করুন
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300">Pause linking</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPhoneLinkPaused}
                        onChange={(e) => {
                          const paused = e.target.checked;
                          setIsPhoneLinkPaused(paused);
                          deviceLinkService.setPaused(paused);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                    </label>
                  </div>
                </div>

                {/* Self Test Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await deviceLinkService.selfTest();
                      onToast(res.message);
                      setPhoneLinkRequests(deviceLinkService.getRecentRequests());
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all"
                  >
                    <Play className="w-4 h-4" />
                    <span>Self test (সেলফ-টেস্ট পাঠান)</span>
                  </button>
                </div>
              </div>

              {/* Recent 10 Requests List */}
              <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>শেষ ১০টি অনুরোধের তালিকা (Recent Requests)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPhoneLinkRequests(deviceLinkService.getRecentRequests())}
                    className="text-[10px] text-sky-300 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {phoneLinkRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    কোনো অনুরোধ পাওয়া যায়নি।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {phoneLinkRequests.map((req) => {
                      const snippet = (req.payload?.text || '').slice(0, 60);
                      const timeStr = new Date(req.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      const statusColor =
                        req.status === 'done'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : req.status === 'processing'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 animate-pulse'
                          : req.status === 'failed' || req.status === 'denied'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/40';

                      return (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl bg-[#050c20] border border-sky-950 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-400">{timeStr}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-mono">
                                {req.from_device} → {req.to_device}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold border ${statusColor}`}>
                                {req.status}
                              </span>
                            </div>
                          </div>

                          <p className="text-white font-medium truncate">
                            &ldquo;{snippet}&rdquo;
                          </p>

                          {req.result && (
                            <p className="text-[11px] text-slate-300 bg-[#081533] p-2 rounded-lg border border-sky-950/60 font-mono">
                               ফল: {req.result.text || req.result.error || JSON.stringify(req.result)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. ALL OTHER SUB-SCREENS: "শীঘ্রই আসছে" (Coming Soon)        */}
          {/* ========================================================= */}
          {activeScreen &&
            activeScreen !== 'connections' &&
            activeScreen !== 'ai-model' &&
            activeScreen !== 'voice-language' &&
            activeScreen !== 'voice-settings' &&
            activeScreen !== 'customization' &&
            activeScreen !== 'agents' &&
            activeScreen !== 'rose-character' &&
            activeScreen !== 'database-sync' &&
            activeScreen !== 'phone-link' &&
            activeScreen !== 'analytics' &&
            activeScreen !== 'pc-control' &&
            activeScreen !== 'security-privacy' &&
            activeScreen !== 'approvals' &&
            activeScreen !== 'integrations' &&
            activeScreen !== 'developer' && (
              <div className="py-14 px-6 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl bg-[#081533]/60 border border-sky-900/60 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                  <Clock className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-white font-display">
                    {activeMenuItem?.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeMenuItem?.desc}
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-300 font-extrabold text-sm shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                  শীঘ্রই আসছে
                </div>

                <p className="text-[11px] text-slate-400 max-w-xs">
                  এই ফিচারটির কনফিগারেশন মডিউল পরবর্তী আপডেটে সক্রিয় করা হবে।
                </p>
              </div>
            )}
        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-sky-950 bg-[#050b1a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Preferences saved in local storage</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
