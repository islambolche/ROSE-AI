import React, { useState } from 'react';
import {
  Cpu,
  Check,
  Play,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  Mic,
  Sliders,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { AiModelConfig, ApiConnections } from '../types';
import { cleanApiKey } from '../services/connections';

interface AiModelSettingsProps {
  aiModel: AiModelConfig;
  connections: ApiConnections;
  onSaveAiModel: (newConfig: AiModelConfig) => void;
  onToast: (msg: string) => void;
}

interface ChatModelOption {
  id: string;
  name: string;
  provider: 'groq' | 'gemini';
  desc: string;
  badge: string;
  isDefault?: boolean;
}

const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'openai/gpt-oss-120b',
    provider: 'groq',
    desc: 'Reasoning model, smart and logical',
    badge: 'Groq',
    isDefault: true,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'openai/gpt-oss-20b',
    provider: 'groq',
    desc: 'Reasoning model, fast and efficient',
    badge: 'Groq',
  },
  {
    id: 'qwen/qwen3.6-27b',
    name: 'qwen/qwen3.6-27b',
    provider: 'groq',
    desc: 'High quality multi-purpose model',
    badge: 'Groq',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'gemini-3.5-flash',
    provider: 'gemini',
    desc: 'Gemini, ultra-fast and reliable',
    badge: 'Gemini',
  },
];

interface TestResult {
  success: boolean;
  model: string;
  provider: 'groq' | 'gemini';
  responseSnippet?: string;
  elapsedMs?: number;
  errorMessage?: string;
}

export const AiModelSettings: React.FC<AiModelSettingsProps> = ({
  aiModel,
  connections,
  onSaveAiModel,
  onToast,
}) => {
  const [config, setConfig] = useState<AiModelConfig>({ ...aiModel });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Determine current active chat model & provider
  const isCustomChat = Boolean(config.customChatModelId.trim());
  const activeChatModelId = isCustomChat
    ? config.customChatModelId.trim()
    : config.selectedChatModelId;
  const activeChatProvider = isCustomChat
    ? config.customChatProvider
    : (CHAT_MODELS.find((m) => m.id === config.selectedChatModelId)?.provider || 'groq');

  const updateConfig = (patch: Partial<AiModelConfig>) => {
    const updated = { ...config, ...patch };
    setConfig(updated);
    onSaveAiModel(updated);
  };

  const handleTestChatModel = async () => {
    setIsTesting(true);
    setTestResult(null);

    const modelToTest = activeChatModelId;
    const providerToTest = activeChatProvider;

    const apiKey =
      providerToTest === 'groq'
        ? cleanApiKey(connections.groqKey, 'groq')
        : cleanApiKey(connections.geminiKey, 'gemini');

    if (providerToTest === 'groq' && !apiKey) {
      setIsTesting(false);
      const res: TestResult = {
        success: false,
        model: modelToTest,
        provider: providerToTest,
        errorMessage: 'Connections-এ Groq কী বসান',
      };
      setTestResult(res);
      onToast('Connections-এ Groq API কী সেট করুন');
      return;
    }

    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      try {
        controller.abort('REQUEST_TIMEOUT');
      } catch {
        // ignore
      }
    }, 25000);

    const startTime = performance.now();

    try {
      let responseText = '';
      if (providerToTest === 'groq') {
        // POST https://api.groq.com/openai/v1/chat/completions
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelToTest,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 200,
            ...(modelToTest.includes('gpt-oss') ? {
              reasoning_effort: "low",
              max_completion_tokens: 1024
            } : {})
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));
        const elapsed = Math.round(performance.now() - startTime);

        if (res.status === 200) {
          responseText =
            data?.choices?.[0]?.message?.content?.trim() || 'No text response';
          setTestResult({
            success: true,
            model: modelToTest,
            provider: providerToTest,
            responseSnippet: responseText,
            elapsedMs: elapsed,
          });
          onToast('✓ মডেল টেস্ট সফল!');
        } else if (res.status === 401 || res.status === 403) {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: 'কী ভুল বা বাতিল',
          });
          onToast('কী ভুল');
        } else if (res.status === 404) {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: 'মডেলের নাম ভুল বা বন্ধ হয়েছে',
          });
          onToast('মডেলের নাম ভুল বা বন্ধ হয়েছে');
        } else if (res.status === 429) {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: 'লিমিট শেষ',
          });
          onToast('লিমিট শেষ');
        } else {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: 'অনুরোধ ব্যর্থ হয়েছে (ত্রুটি কোড: ' + res.status + ')',
          });
          onToast('টেস্ট ব্যর্থ হয়েছে');
        }
      } else {
        // Server-side Gemini generate proxy
        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelToTest,
            prompt: 'hi',
            apiKey: apiKey || undefined,
            generationConfig: {
              maxOutputTokens: 200,
            },
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));
        const elapsed = Math.round(performance.now() - startTime);

        if (res.status === 200) {
          responseText = (data?.text || '').trim() || 'No text';
          setTestResult({
            success: true,
            model: modelToTest,
            provider: providerToTest,
            responseSnippet: responseText,
            elapsedMs: elapsed,
          });
          onToast('✓ মডেল টেস্ট সফল!');
        } else if (res.status === 401 || res.status === 403) {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: data?.error || 'কী ভুল বা বাতিল',
          });
          onToast('কী ভুল');
        } else if (res.status === 404) {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: 'মডেলের নাম ভুল বা বন্ধ হয়েছে',
          });
          onToast('মডেলের নাম ভুল বা বন্ধ হয়েছে');
        } else if (res.status === 429) {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: 'লিমিট শেষ',
          });
          onToast('লিমিট শেষ');
        } else {
          setTestResult({
            success: false,
            model: modelToTest,
            provider: providerToTest,
            elapsedMs: elapsed,
            errorMessage: data?.error || 'অনুরোধ ব্যর্থ হয়েছে',
          });
          onToast('টেস্ট ব্যর্থ হয়েছে');
        }
      }
    } catch {
      const msg = didTimeout
        ? 'Connection timed out. Please try again. (সংযোগ সময়সীমা শেষ হয়েছে)'
        : 'ইন্টারনেট সমস্যা বা সংযোগ সময়সীমা শেষ';
      setTestResult({
        success: false,
        model: modelToTest,
        provider: providerToTest,
        errorMessage: msg,
      });
      onToast(didTimeout ? 'সময়সীমা শেষ' : 'ইন্টারনেট সমস্যা');
    } finally {
      clearTimeout(timeoutId);
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ============================================================= */}
      {/* অংশ ১: REASONING (CHAT)                                       */}
      {/* ============================================================= */}
      <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white tracking-wide uppercase font-display">
                অংশ ১: Reasoning (Chat)
              </h4>
              <p className="text-[10px] text-sky-200/80">
                চ্যাট ও ব্যবসায়িক যুক্তির জন্য মূল মডেল নির্বাচন
              </p>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-950 border border-sky-500/30 text-sky-300">
            {activeChatModelId}
          </span>
        </div>

        {/* রেডিও-কার্ড তালিকা (৩টি অপশন) */}
        <div className="space-y-2 pt-1">
          {CHAT_MODELS.map((opt) => {
            const isSelected =
              !isCustomChat && config.selectedChatModelId === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  updateConfig({
                    selectedChatModelId: opt.id,
                    customChatModelId: '',
                  });
                  onToast(`${opt.name} নির্বাচিত`);
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0d2252] to-[#0a1a3f] border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-white'
                    : 'bg-[#050c20] hover:bg-[#081738] border-sky-900/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500 text-white shadow-[0_0_8px_#38bdf8]'
                        : 'border-slate-600 bg-slate-900/60'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-wide font-mono truncate">
                        {opt.name}
                      </span>
                      {opt.isDefault && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/40 uppercase font-mono">
                          ডিফল্ট
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    opt.provider === 'groq'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  }`}
                >
                  {opt.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom model ID টেক্সট ঘর + প্রোভাইডার ড্রপডাউন/বাছাই */}
        <div className="p-3 rounded-xl bg-[#050d24] border border-sky-900/60 space-y-2">
          <label className="block text-[11px] font-bold text-slate-300">
            Custom model ID (ঐচ্ছিক — অন্য যেকোনো মডেল নাম বসালে সেটি ব্যবহৃত হবে):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={config.customChatModelId}
              onChange={(e) =>
                updateConfig({ customChatModelId: e.target.value })
              }
              placeholder="e.g. llama-3.2-90b-vision-preview or gemini-2.0-flash"
              className="flex-1 bg-[#030817] border border-sky-500/30 focus:border-sky-400 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
            />

            {/* Provider selection */}
            <select
              value={config.customChatProvider}
              onChange={(e) =>
                updateConfig({
                  customChatProvider: e.target.value as 'groq' | 'gemini',
                })
              }
              className="bg-[#030817] border border-sky-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-sky-200 focus:outline-none"
            >
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          {isCustomChat && (
            <p className="text-[10px] text-emerald-400 font-semibold">
              ✓ কাস্টম চ্যাট মডেল সক্রিয়: {config.customChatModelId} ({config.customChatProvider.toUpperCase()})
            </p>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* অংশ ২: LIVE VOICE                                            */}
      {/* ============================================================= */}
      <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wide uppercase font-display">
              অংশ ২: Live Voice
            </h4>
            <p className="text-[10px] text-sky-200/80">
              রিয়েল-টাইম অডিও স্ট্রিম ও ইন্টারঅ্যাকশন
            </p>
          </div>
        </div>

        {/* একক কার্ড: gemini-3.8-live (Recommended) */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-[#0d2252] to-[#0a1a3f] border border-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.2)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border border-sky-400 bg-sky-500 text-white flex items-center justify-center shadow-[0_0_8px_#38bdf8]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-black text-white font-mono tracking-wide">
                gemini-3.8-live
              </span>
              <p className="text-[10px] text-sky-300/90">
                Optimized for real-time voice
              </p>
            </div>
          </div>

          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400">
            Recommended
          </span>
        </div>

        {/* Custom model ID ঘর + ছোট নোট */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-bold text-slate-300">
            Custom live voice model ID (ঐচ্ছিক):
          </label>
          <input
            type="text"
            value={config.customLiveVoiceModelId}
            onChange={(e) =>
              updateConfig({ customLiveVoiceModelId: e.target.value })
            }
            placeholder="e.g. gemini-2.0-flash-exp"
            className="w-full bg-[#030817] border border-sky-500/30 focus:border-sky-400 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
          />
          <p className="text-[10px] text-amber-300/80 leading-relaxed">
            💡 শুধু Gemini Live মোডে প্রযোজ্য। ফ্রি টিয়ারে সীমিত।
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* অংশ ৩: SPEECH-TO-TEXT (Groq Whisper)                         */}
      {/* ============================================================= */}
      <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wide uppercase font-display">
              অংশ ৩: Speech-to-Text (Groq Whisper)
            </h4>
            <p className="text-[10px] text-sky-200/80">
              মাইক্রোফোন অডিও থেকে টেক্সট রূপান্তর মডেল
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-300">
            Whisper Model:
          </label>
          <input
            type="text"
            value={config.sttModelId}
            onChange={(e) => updateConfig({ sttModelId: e.target.value })}
            placeholder="whisper-large-v3-turbo"
            className="w-full bg-[#030817] border border-sky-500/30 focus:border-sky-400 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
          />
          <p className="text-[10px] text-slate-400">
            ডিফল্ট: <span className="text-sky-300 font-mono">whisper-large-v3-turbo</span> (প্রয়োজনে পরিবর্তনযোগ্য)
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* অংশ ৪: PRIORITY                                              */}
      {/* ============================================================= */}
      <div className="p-4 rounded-2xl bg-[#081533] border border-sky-900/70 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wide uppercase font-display">
              অংশ ৪: Priority & Fallback
            </h4>
            <p className="text-[10px] text-sky-200/80">
              মডেল ফেইলওভার ও অগ্রাধিকার নিয়ম
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          {/* সুইচ ১: প্রথমে Groq, ব্যর্থ হলে Gemini */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#050c20] border border-sky-900/60">
            <div>
              <span className="text-xs font-bold text-white block">
                প্রথমে Groq, ব্যর্থ হলে Gemini
              </span>
              <span className="text-[10px] text-slate-400">
                দ্রুত রেসপন্সের জন্য Groq অগ্রাধিকার পাবে, ব্যর্থ হলে Gemini
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                updateConfig({ fallbackToGemini: !config.fallbackToGemini })
              }
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                config.fallbackToGemini ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  config.fallbackToGemini ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* সুইচ ২: কোটা ত্রুটিতে স্বয়ংক্রিয়ভাবে অন্য প্রোভাইডারে যাও */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#050c20] border border-sky-900/60">
            <div>
              <span className="text-xs font-bold text-white block">
                কোটা ত্রুটিতে স্বয়ংক্রিয়ভাবে অন্য প্রোভাইডারে যাও
              </span>
              <span className="text-[10px] text-slate-400">
                ৪২৯ বা কোটা সীমাবদ্ধতায় পৌঁছালে লাইভ ব্যাকআপে সুইচ করবে
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                updateConfig({
                  autoSwitchOnQuotaError: !config.autoSwitchOnQuotaError,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                config.autoSwitchOnQuotaError ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  config.autoSwitchOnQuotaError ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[10px] text-slate-400 pt-0.5">
            💡 দুটো প্রোভাইডারই ব্যর্থ হলে সিস্টেমে পরিষ্কার বাংলা বার্তা প্রদর্শন করা হবে।
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* TEST MODEL বাটন ও রেজাল্ট ডিসপ্লে                             */}
      {/* ============================================================= */}
      <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wide">
              Test Active Model
            </h4>
            <p className="text-[10px] text-sky-200/80">
              নির্বাচিত চ্যাট মডেল: <span className="font-mono text-sky-300 font-bold">{activeChatModelId}</span> ({activeChatProvider.toUpperCase()})
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestChatModel}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isTesting ? 'টেস্ট চলছে...' : 'TEST MODEL'}</span>
          </button>
        </div>

        {/* রেজাল্ট কার্ড */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">✓ কাজ করছে</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-300">✕ টেস্ট ব্যর্থ</span>
                  </>
                )}
              </span>

              {testResult.elapsedMs !== undefined && (
                <span className="font-mono text-[11px] text-slate-300">
                  {testResult.elapsedMs} ms
                </span>
              )}
            </div>

            <div className="text-[11px] space-y-1 text-slate-300 font-mono">
              <div>
                প্রোভাইডার: <span className="text-sky-300 uppercase">{testResult.provider}</span> | মডেল: <span className="text-white">{testResult.model}</span>
              </div>
              {testResult.responseSnippet && (
                <div className="p-2 rounded bg-black/40 border border-white/10 text-white font-sans text-xs">
                  উত্তরের নমুনা: &ldquo;{testResult.responseSnippet}&rdquo;
                </div>
              )}
              {testResult.errorMessage && (
                <div className="text-rose-300 font-sans font-semibold text-xs">
                  কারণ: {testResult.errorMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
