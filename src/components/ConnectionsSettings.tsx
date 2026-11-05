import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Volume2,
  ExternalLink,
  Play,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Clipboard,
  ShieldCheck,
} from 'lucide-react';
import {
  ApiConnections,
  ConnectionProvider,
  ConnectionStatus,
  ConnectionState,
} from '../types';
import {
  cleanApiKey,
  validateConnection,
  CONNECTION_DETAILS,
} from '../services/connections';

interface ConnectionsSettingsProps {
  connections: ApiConnections;
  onSaveConnections: (newConnections: ApiConnections) => void;
  onToast: (msg: string) => void;
}

const PROVIDER_CONFIGS: {
  provider: ConnectionProvider;
  keyField: keyof ApiConnections;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}[] = [
  {
    provider: 'gemini',
    keyField: 'geminiKey',
    icon: Sparkles,
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-300',
    borderColor: 'border-sky-500/40',
  },
  {
    provider: 'groq',
    keyField: 'groqKey',
    icon: Zap,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    borderColor: 'border-amber-500/40',
  },
  {
    provider: 'elevenLabs',
    keyField: 'elevenLabsKey',
    icon: Volume2,
    iconBg: 'bg-fuchsia-500/20',
    iconColor: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-500/40',
  },
];

export const ConnectionsSettings: React.FC<ConnectionsSettingsProps> = ({
  connections,
  onSaveConnections,
  onToast,
}) => {
  const [draftKeys, setDraftKeys] = useState<Record<ConnectionProvider, string>>({
    gemini: connections.geminiKey || '',
    groq: connections.groqKey || '',
    elevenLabs: connections.elevenLabsKey || '',
  });

  const [showKeys, setShowKeys] = useState<Record<ConnectionProvider, boolean>>({
    gemini: false,
    groq: false,
    elevenLabs: false,
  });

  const [connectionStates, setConnectionStates] = useState<
    Record<ConnectionProvider, ConnectionState>
  >({
    gemini: { status: 'not_set' },
    groq: { status: 'not_set' },
    elevenLabs: { status: 'not_set' },
  });

  const [isVerifying, setIsVerifying] = useState<
    Record<ConnectionProvider, boolean>
  >({
    gemini: false,
    groq: false,
    elevenLabs: false,
  });

  const hasAutoVerifiedRef = useRef(false);

  // Sync state if external connections prop updates
  useEffect(() => {
    setDraftKeys({
      gemini: connections.geminiKey || '',
      groq: connections.groqKey || '',
      elevenLabs: connections.elevenLabsKey || '',
    });
  }, [connections]);

  // Auto-verify on screen open if keys exist
  useEffect(() => {
    if (hasAutoVerifiedRef.current) return;
    hasAutoVerifiedRef.current = true;

    PROVIDER_CONFIGS.forEach(async ({ provider, keyField }) => {
      const existingKey = cleanApiKey(connections[keyField] || '');
      if (!existingKey) {
        setConnectionStates((prev) => ({
          ...prev,
          [provider]: { status: 'not_set' },
        }));
        return;
      }

      setConnectionStates((prev) => ({
        ...prev,
        [provider]: { status: 'checking', message: 'যাচাই করা হচ্ছে...' },
      }));
      setIsVerifying((prev) => ({ ...prev, [provider]: true }));

      const res = await validateConnection(provider, existingKey);
      setConnectionStates((prev) => ({
        ...prev,
        [provider]: res,
      }));
      setIsVerifying((prev) => ({ ...prev, [provider]: false }));
    });
  }, [connections]);

  const toggleShowKey = (provider: ConnectionProvider) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handlePaste = async (provider: ConnectionProvider) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const cleaned = cleanApiKey(text);
          setDraftKeys((prev) => ({ ...prev, [provider]: cleaned }));
          onToast('কী পেস্ট করা হয়েছে');
          return;
        }
      }
      onToast('ক্লিপবোর্ডে কোনো টেক্সট পাওয়া যায়নি');
    } catch {
      onToast('ক্লিপবোর্ড পড়ার অনুমতি নেই');
    }
  };

  const handleTest = async (provider: ConnectionProvider) => {
    const rawVal = draftKeys[provider];
    const cleaned = cleanApiKey(rawVal);

    if (!cleaned) {
      setConnectionStates((prev) => ({
        ...prev,
        [provider]: { status: 'not_set', message: 'প্রথমে কী লিখুন' },
      }));
      onToast('প্রথমে একটি কী লিখুন');
      return;
    }

    setConnectionStates((prev) => ({
      ...prev,
      [provider]: { status: 'checking', message: 'যাচাই করা হচ্ছে...' },
    }));
    setIsVerifying((prev) => ({ ...prev, [provider]: true }));

    const res = await validateConnection(provider, cleaned);

    setConnectionStates((prev) => ({
      ...prev,
      [provider]: res,
    }));
    setIsVerifying((prev) => ({ ...prev, [provider]: false }));

    if (res.status === 'ready') {
      onToast(`${CONNECTION_DETAILS[provider].name} সংযোগ সফল!`);
    } else {
      onToast(`${CONNECTION_DETAILS[provider].name}: ${res.message}`);
    }
  };

  const handleSave = async (provider: ConnectionProvider) => {
    const cleaned = cleanApiKey(draftKeys[provider]);
    const config = PROVIDER_CONFIGS.find((c) => c.provider === provider);
    if (!config) return;

    // Update draft with clean value
    setDraftKeys((prev) => ({ ...prev, [provider]: cleaned }));

    // Prepare updated connections object for central store
    const updatedConnections: ApiConnections = {
      ...connections,
      [config.keyField]: cleaned,
    };

    onSaveConnections(updatedConnections);
    onToast(`${CONNECTION_DETAILS[provider].name} কী সেভ করা হয়েছে`);

    if (!cleaned) {
      setConnectionStates((prev) => ({
        ...prev,
        [provider]: { status: 'not_set' },
      }));
      return;
    }

    // Immediately validate after saving
    setConnectionStates((prev) => ({
      ...prev,
      [provider]: { status: 'checking', message: 'যাচাই করা হচ্ছে...' },
    }));
    setIsVerifying((prev) => ({ ...prev, [provider]: true }));

    const res = await validateConnection(provider, cleaned);

    setConnectionStates((prev) => ({
      ...prev,
      [provider]: res,
    }));
    setIsVerifying((prev) => ({ ...prev, [provider]: false }));
  };

  // Connected count for summary bar
  const readyCount = PROVIDER_CONFIGS.filter(
    (c) => connectionStates[c.provider].status === 'ready'
  ).length;

  const renderStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'ready':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)] flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>READY</span>
          </span>
        );
      case 'checking':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>CHECKING</span>
          </span>
        );
      case 'error':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.35)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>ERROR</span>
          </span>
        );
      case 'not_set':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            NOT SET
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. TOP SUMMARY BAR: "N/3 সংযুক্ত" */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#091a3f] via-[#071333] to-[#091a3f] border border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.2)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wide uppercase">
              Connections Overview
            </h4>
            <p className="text-[10px] text-sky-200/80">
              কেন্দ্রীয় API কী ও সার্ভিস স্ট্যাটাস
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-[#050f28] border border-sky-400/50 text-xs font-black text-sky-200 shadow-sm flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                readyCount > 0
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-slate-500'
              }`}
            />
            <span>{readyCount}/৩ সংযুক্ত</span>
          </div>
        </div>
      </div>

      {/* 2. THREE CARDS (ONE BELOW ANOTHER): GEMINI, GROQ, ELEVENLABS */}
      <div className="space-y-3.5">
        {PROVIDER_CONFIGS.map(({ provider, icon: IconComponent, iconBg, iconColor, borderColor }) => {
          const details = CONNECTION_DETAILS[provider];
          const state = connectionStates[provider];
          const rawKey = draftKeys[provider];
          const isBusy = isVerifying[provider];

          return (
            <div
              key={provider}
              className={`p-4 rounded-2xl bg-[#081533] border ${borderColor} shadow-sm space-y-3 transition-all`}
            >
              {/* Card Header: Icon, Name, Subtitle & Right Status Chip */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 ${iconBg} ${iconColor}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white tracking-wider flex items-center gap-1.5 font-display">
                      <span>{details.name}</span>
                    </h4>
                    <p className="text-[10px] text-sky-200/80 truncate">
                      ({details.subtitle})
                    </p>
                  </div>
                </div>

                <div className="shrink-0">{renderStatusBadge(state.status)}</div>
              </div>

              {/* Password Input Field (••••) with Paste button & Eye toggle */}
              <div className="relative">
                <div className="flex items-center bg-[#050c20] border border-sky-900/80 focus-within:border-sky-400 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.25)] rounded-xl px-3 py-1.5 transition-all">
                  <input
                    type={showKeys[provider] ? 'text' : 'password'}
                    value={rawKey}
                    onChange={(e) =>
                      setDraftKeys((prev) => ({
                        ...prev,
                        [provider]: e.target.value,
                      }))
                    }
                    placeholder={details.keyPlaceholder}
                    autoComplete="off"
                    spellCheck="false"
                    className="flex-1 bg-transparent font-mono text-xs text-white placeholder-slate-600 focus:outline-none min-w-0 py-1"
                  />

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Paste Button */}
                    <button
                      type="button"
                      onClick={() => handlePaste(provider)}
                      className="px-2 py-1 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-500/30 text-[10px] font-bold text-sky-300 hover:text-white flex items-center gap-1 transition-all"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste</span>
                    </button>

                    {/* Eye toggle (Show/Hide) */}
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider)}
                      className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-950/60 transition-colors"
                      title={showKeys[provider] ? 'কী লুকান' : 'কী দেখুন'}
                    >
                      {showKeys[provider] ? (
                        <EyeOff className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Under input field: Key length & status message */}
                <div className="flex items-center justify-between text-[11px] mt-1.5 px-1">
                  <span className="font-mono text-slate-400">
                    Key length:{' '}
                    <span className="text-sky-300 font-bold">{rawKey.length}</span>
                  </span>

                  {state.message && (
                    <span
                      className={`text-[10px] font-semibold truncate ${
                        state.status === 'ready'
                          ? 'text-emerald-400'
                          : state.status === 'checking'
                          ? 'text-amber-300'
                          : state.status === 'error'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {state.message}
                    </span>
                  )}
                </div>

                {/* ElevenLabs specific reminder note */}
                {details.specialNote && (
                  <p className="text-[10px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2 mt-2 leading-relaxed">
                    💡 {details.specialNote}
                  </p>
                )}
              </div>

              {/* Action Buttons: Get Key, Test, Save */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-sky-950">
                {/* Get Key button opens official provider in new tab */}
                <a
                  href={details.getKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Get Key</span>
                </a>

                <div className="flex items-center gap-2">
                  {/* Test button */}
                  <button
                    type="button"
                    onClick={() => handleTest(provider)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-xl bg-[#071738] hover:bg-[#0b2150] border border-sky-500/40 text-sky-200 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-300" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current text-sky-400" />
                    )}
                    <span>Test</span>
                  </button>

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={() => handleSave(provider)}
                    disabled={isBusy}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Small instruction / guidance line */}
              <p className="text-[10px] text-slate-400/90 leading-tight">
                {details.guideline}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
