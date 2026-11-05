import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import {
  AppSettings,
  PersonalityType,
  LanguageType,
  ChatFontSizeType,
  AgentId,
  UserAddressAsType,
  RoseCharacterPresetType,
  RoseLanguageStyleType,
  RosePronounType,
  RoseReplyLengthType,
  RoseCharacterConfig,
  ChatMessage,
} from '../types';
import { IDENTITY_AGENTS, IDENTITY_AGENTS_MAP } from '../config/identity';
import { voiceChat } from '../lib/voiceChat';
import {
  settingsService,
  DEFAULT_APP_SETTINGS,
  DEFAULT_ROSE_CHARACTER_SETTINGS,
} from '../services/settings';
import { ConnectionsSettings } from './ConnectionsSettings';
import { AiModelSettings } from './AiModelSettings';
import { DEVELOPER_PROFILE, isDeveloperFieldEmpty } from '../config/developer';
import { getTeamDelegationTasks } from '../lib/teamEngine';
import { generateAgentAnswer, ROSE_IMMUTABLE_RULES } from '../lib/agentEngine';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onToast: (msg: string) => void;
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
    desc: 'Personality, language, voice, instructions',
    icon: Users,
  },
  {
    id: 'rose-character',
    title: 'Rose Character',
    desc: 'Soul Bond',
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
    title: 'Integrations',
    desc: 'Facebook, YouTube, Browser',
    icon: Share2,
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
  'Hindi',
  'Arabic',
  'Spanish',
];

const ROSE_CHARACTER_PRESET_CARDS: Array<{
  id: RoseCharacterPresetType;
  label: string;
  subtitle: string;
}> = [
  { id: 'Soul Bond', label: 'Soul Bond', subtitle: 'আত্মার সঙ্গী (ডিফল্ট)' },
  { id: 'Best Friend', label: 'Best Friend', subtitle: 'ঘনিষ্ঠ বেস্ট ফ্রেন্ড' },
  { id: 'Friendly', label: 'Friendly', subtitle: 'উষ্ণ ও স্বাগতপূর্ণ' },
  { id: 'Professional', label: 'Professional', subtitle: 'স্পষ্ট ও ব্যবসামুখী' },
  { id: 'Funny', label: 'Funny', subtitle: 'রসিক ও হালকা মজার' },
  { id: 'Teacher', label: 'Teacher', subtitle: 'ধৈর্যশীল ও ধাপে ধাপে' },
  { id: 'GF Mode', label: 'GF Mode', subtitle: 'উষ্ণ, মিষ্টি ও সহায়ক' },
  { id: 'Custom', label: 'Custom', subtitle: 'নিজের লেখা চরিত্র' },
];

const ROSE_LANGUAGE_STYLES: RoseLanguageStyleType[] = [
  'শুদ্ধ বাংলা',
  'কথ্য বাংলা',
  'বাংলা-ইংরেজি মিশ্র',
];

const ROSE_PRONOUNS: RosePronounType[] = ['তুমি', 'আপনি', 'তুই'];

const ROSE_REPLY_LENGTHS: RoseReplyLengthType[] = ['ছোট', 'মাঝারি'];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onToast,
}) => {
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [roseTestInput, setRoseTestInput] = useState<string>('আজকের কাজ কেমন চলছে?');
  const [roseTestLoading, setRoseTestLoading] = useState<boolean>(false);
  const [roseTestOutput, setRoseTestOutput] = useState<{
    text: string;
    emotion?: string;
    isError?: boolean;
    subtext?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setLocalSettings(settingsService.getSettings());
      setShowSavedFeedback(false);
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

  if (!isOpen && !isClosing) return null;

  const handleSave = () => {
    settingsService.saveSettings(localSettings);
    onUpdateSettings(localSettings);
    setShowSavedFeedback(true);
    onToast('Settings saved');
    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 2400);
  };

  const handleAgentConfigChange = <K extends keyof AppSettings['agents'][AgentId]>(
    agentId: AgentId,
    field: K,
    val: AppSettings['agents'][AgentId][K]
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

  const handleRoseCharacterChange = <K extends keyof RoseCharacterConfig>(
    field: K,
    val: RoseCharacterConfig[K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      roseCharacter: {
        ...(prev.roseCharacter || DEFAULT_ROSE_CHARACTER_SETTINGS),
        [field]: val,
      },
    }));
  };

  const handleResetRoseCharacter = () => {
    const resetSettings: AppSettings = {
      ...localSettings,
      roseCharacter: { ...DEFAULT_ROSE_CHARACTER_SETTINGS },
    };
    setLocalSettings(resetSettings);
    settingsService.saveSettings(resetSettings);
    onUpdateSettings(resetSettings);
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
      const currentRoseChar =
        localSettings.roseCharacter || DEFAULT_ROSE_CHARACTER_SETTINGS;
      const res = await generateAgentAnswer('rose', [testMsg], {
        roseCharacterOverride: currentRoseChar,
      });
      setRoseTestOutput({
        text: res.text,
        emotion: res.emotion,
        isError: res.isError,
        subtext: res.errorMeta?.subtext,
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
                              'llama-3.3-70b-versatile'
                            : item.id === 'rose-character'
                            ? localSettings.roseCharacter?.preset || 'Soul Bond'
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
          {/* 3. AGENTS SUB-SCREEN (READ-ONLY ID, EDITABLE CONFIG)      */}
          {/* ========================================================= */}
          {activeScreen === 'agents' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                Agent identities, names, roles and photos are permanently locked. You can configure behavior, personality, language, and custom instructions below.
              </div>

              <div className="space-y-4">
                {IDENTITY_AGENTS.map((ident) => {
                  const cfg =
                    localSettings.agents[ident.id] || DEFAULT_APP_SETTINGS.agents[ident.id];

                  return (
                    <div
                      key={ident.id}
                      className="p-4 rounded-2xl bg-[#081533] border shadow-md space-y-3 transition-all"
                      style={{
                        borderColor: cfg.enabled ? `${ident.color}50` : 'rgba(56,189,248,0.2)',
                        boxShadow: cfg.enabled ? `0 0 18px ${ident.color}15` : undefined,
                      }}
                    >
                      {/* Read-Only Identity Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-sky-950/80">
                        <div className="flex items-center gap-3">
                          {/* 48px Circular Locked Avatar */}
                          <div
                            className="relative w-12 h-12 rounded-full overflow-hidden border-2 shrink-0 bg-[#071126] flex items-center justify-center"
                            style={{
                              borderColor: ident.color,
                              boxShadow: `0 0 12px ${ident.color}60`,
                            }}
                          >
                            <img
                              src={ident.avatar}
                              alt={ident.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-white font-display">
                                {ident.name}
                              </h4>
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: ident.color }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-300 font-medium">
                              {ident.role}
                            </p>
                          </div>
                        </div>

                        {/* Enabled Toggle Switch */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-300">
                            {cfg.enabled ? 'Active' : 'Disabled'}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={(e) =>
                                handleAgentConfigChange(ident.id, 'enabled', e.target.checked)
                              }
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </div>
                      </div>

                      {/* Modifiable: Personality & Language Dropdowns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            Personality
                          </label>
                          <select
                            value={cfg.personality}
                            onChange={(e) =>
                              handleAgentConfigChange(
                                ident.id,
                                'personality',
                                e.target.value as PersonalityType
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs font-semibold focus:outline-none focus:border-sky-400"
                          >
                            {PERSONALITY_OPTIONS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            Language
                          </label>
                          <select
                            value={cfg.language}
                            onChange={(e) =>
                              handleAgentConfigChange(
                                ident.id,
                                'language',
                                e.target.value as LanguageType
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs font-semibold focus:outline-none focus:border-sky-400"
                          >
                            {LANGUAGE_OPTIONS.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Modifiable: Response Style Segment */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          Response Style
                        </label>
                        <div className="flex items-center gap-1 bg-[#050c20] p-1 rounded-xl border border-sky-500/30 max-w-xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleAgentConfigChange(ident.id, 'responseStyle', 'brief')
                            }
                            className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              cfg.responseStyle === 'brief'
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            সংক্ষিপ্ত (Brief)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAgentConfigChange(ident.id, 'responseStyle', 'detailed')
                            }
                            className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                              cfg.responseStyle === 'detailed'
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            বিস্তারিত (Detailed)
                          </button>
                        </div>
                      </div>

                      {/* Modifiable: Custom Instructions */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          Custom Instructions (কাস্টম নির্দেশনা)
                        </label>
                        <textarea
                          rows={2}
                          value={cfg.customInstructions}
                          onChange={(e) =>
                            handleAgentConfigChange(ident.id, 'customInstructions', e.target.value)
                          }
                          placeholder={`Instructions for ${ident.name}...`}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs focus:outline-none focus:border-sky-400 transition-all resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
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
          {/* ROSE CHARACTER SUB-SCREEN (ONLY FOR ROSE)                 */}
          {/* ========================================================= */}
          {activeScreen === 'rose-character' &&
            (() => {
              const rc =
                localSettings.roseCharacter || DEFAULT_ROSE_CHARACTER_SETTINGS;
              const roseIdent = IDENTITY_AGENTS_MAP.rose;
              const charLen = (rc.customCharacter || '').length;

              return (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Top Rose Banner */}
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
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-white font-display">
                          Rose Character
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-[10px] font-bold text-rose-300">
                          {rc.preset}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        শুধু Rose-এর চরিত্র ও কথা বলার ধরন (বাকি ৪ এজেন্ট অপরিবর্তিত থাকবে)
                      </p>
                    </div>
                  </div>

                  {/* ক) চরিত্র বাছাই (একটা নির্বাচিত, টিক চিহ্নসহ কার্ড) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2.5">
                    <label className="text-xs font-extrabold text-white block">
                      ক) চরিত্র বাছাই (Character Preset)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {ROSE_CHARACTER_PRESET_CARDS.map((card) => {
                        const isSelected = rc.preset === card.id;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => handleRoseCharacterChange('preset', card.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                              isSelected
                                ? 'bg-rose-500/20 border-rose-400 text-white shadow-[0_0_14px_rgba(244,63,94,0.3)]'
                                : 'bg-[#050c20] border-slate-800 text-slate-300 hover:border-sky-500/40 hover:text-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold truncate">{card.label}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {card.subtitle}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* খ) Custom character (বড় টেক্সট বাক্স, সর্বোচ্চ ১৫০০ অক্ষর, গণনা দেখাও) */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-white">
                        খ) Custom Character (কাস্টম চরিত্র / অতিরিক্ত নির্দেশ)
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
                      {rc.preset === 'Custom'
                        ? 'Custom বাছা আছে: এই লেখাই Rose-এর মূল চরিত্র হিসেবে কাজ করবে।'
                        : `${rc.preset} বাছা আছে: এই লেখা অতিরিক্ত নির্দেশ হিসেবে প্রিসেটের সাথে যোগ হবে (খালি রাখা যাবে)।`}
                    </p>
                    <textarea
                      rows={4}
                      maxLength={1500}
                      value={rc.customCharacter}
                      onChange={(e) =>
                        handleRoseCharacterChange(
                          'customCharacter',
                          e.target.value.slice(0, 1500)
                        )
                      }
                      placeholder="ছোটবেলার বন্ধুর মতো, মজা করে, কথ্য বাংলায়, আমাকে নাম ধরে ডাকবে।"
                      className="w-full px-3 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs focus:outline-none focus:border-rose-400 transition-all resize-none leading-relaxed placeholder:text-slate-500"
                    />
                  </div>

                  {/* গ) কথার ধরন */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-4">
                    <label className="text-xs font-extrabold text-white block">
                      গ) কথার ধরন (Speech & Tone)
                    </label>

                    {/* ভাষার রূপ */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        ভাষার রূপ
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {ROSE_LANGUAGE_STYLES.map((style) => {
                          const active = rc.languageStyle === style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => handleRoseCharacterChange('languageStyle', style)}
                              className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                                active
                                  ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                                  : 'bg-[#050c20] border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {style}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* সম্বোধন */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        সম্বোধন
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {ROSE_PRONOUNS.map((p) => {
                          const active = rc.pronoun === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleRoseCharacterChange('pronoun', p)}
                              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                                active
                                  ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                                  : 'bg-[#050c20] border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* আবেগ (০-১০ স্লাইডার) ও রসিকতা (০-১০ স্লাইডার) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-300">আবেগ</span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold">
                            {rc.emotionLevel} / 10
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={rc.emotionLevel}
                          onChange={(e) =>
                            handleRoseCharacterChange('emotionLevel', Number(e.target.value))
                          }
                          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-rose-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-300">রসিকতা</span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[11px] font-bold">
                            {rc.humorLevel} / 10
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={rc.humorLevel}
                          onChange={(e) =>
                            handleRoseCharacterChange('humorLevel', Number(e.target.value))
                          }
                          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                        />
                      </div>
                    </div>

                    {/* উত্তরের দৈর্ঘ্য ও ইমোজি চালু-বন্ধ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-300 block">
                          উত্তরের দৈর্ঘ্য
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {ROSE_REPLY_LENGTHS.map((len) => {
                            const active = rc.replyLength === len;
                            return (
                              <button
                                key={len}
                                type="button"
                                onClick={() => handleRoseCharacterChange('replyLength', len)}
                                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                                  active
                                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                                    : 'bg-[#050c20] border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {len}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#050c20] border border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-white block">ইমোজি</span>
                          <span className="text-[10px] text-slate-400">
                            {rc.useEmoji ? 'চালু (ON)' : 'বন্ধ (OFF)'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rc.useEmoji}
                            onChange={(e) =>
                              handleRoseCharacterChange('useEmoji', e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ঘ) ডাকনাম */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-2">
                    <label className="text-xs font-extrabold text-white block">
                      ঘ) ডাকনাম (Rose আপনাকে কী নামে ডাকবে)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      খালি থাকলে Voice & Language-এর নাম ({localSettings.userName || 'খালি'}) ব্যবহার করবে, তাও না থাকলে কোনো নাম বানাবে না।
                    </p>
                    <input
                      type="text"
                      value={rc.nickname}
                      onChange={(e) => handleRoseCharacterChange('nickname', e.target.value)}
                      placeholder="ডাকনাম লিখুন (ঐচ্ছিক)..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050c20] border border-sky-500/30 text-white text-xs focus:outline-none focus:border-sky-400 transition-all placeholder:text-slate-500"
                    />
                  </div>

                  {/* ঙ) টেস্ট বাক্স */}
                  <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-white">
                        ঙ) টেস্ট বাক্স (সেভ করার আগে পরীক্ষা করুন)
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
                        placeholder="পরীক্ষা করার জন্য একটি বাক্য লিখুন..."
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
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          roseTestOutput.isError
                            ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                            : 'bg-[#050c20] border-rose-500/40 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-rose-300">
                            Rose ({rc.preset}):
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

                  {/* চ) "Save" ও "Reset to default" বাটন */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleResetRoseCharacter}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                    >
                      Reset to default
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-sky-500 hover:from-rose-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-sky-400/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>

                  {/* ছ) নিচে ধূসর কার্ডে "সবসময় প্রযোজ্য নিয়ম (বদলানো যায় না)" তালিকা */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 space-y-2 text-slate-300 select-text">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>সবসময় প্রযোজ্য নিয়ম (বদলানো যায় না)</span>
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

          {/* ========================================================= */}
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
                          voiceReply: !(prev.voiceSettings?.voiceReply !== false),
                          speed: prev.voiceSettings?.speed ?? 1.0,
                          volume: prev.voiceSettings?.volume ?? 1.0,
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

                {/* Speech Speed Slider */}
                <div className="space-y-1.5 pt-2 border-t border-sky-900/50">
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
                          voiceReply: prev.voiceSettings?.voiceReply !== false,
                          speed: Number(e.target.value),
                          volume: prev.voiceSettings?.volume ?? 1.0,
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
                          voiceReply: prev.voiceSettings?.voiceReply !== false,
                          speed: prev.voiceSettings?.speed ?? 1.0,
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
                      const testLang = localSettings.agents?.rose?.language || 'বাংলা';
                      const sampleText =
                        testLang === 'English'
                          ? 'Hello! I am Rose. Your voice settings are working properly.'
                          : 'হ্যালো! আমি রোজ। আপনার ব্যবসার সব কাজ আমি যত্নসহকারে দেখছি।';
                      voiceChat.speak(sampleText, {
                        language: testLang,
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
            activeScreen !== 'analytics' &&
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
