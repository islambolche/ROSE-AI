import React, { useState, useEffect } from 'react';
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

export type VerificationStatusState = 'idle' | 'checking' | 'verified' | 'error' | 'saved';

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

const VERIFIED_STORAGE_KEY = 'connection_verified_keys_v1';

function getVerifiedKeysFromStorage(): Record<ConnectionProvider, string> {
  try {
    const raw = localStorage.getItem(VERIFIED_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return { gemini: '', groq: '', elevenLabs: '' };
}

function saveVerifiedKeyToStorage(provider: ConnectionProvider, key: string) {
  try {
    const current = getVerifiedKeysFromStorage();
    current[provider] = key;
    localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

function removeVerifiedKeyFromStorage(provider: ConnectionProvider) {
  try {
    const current = getVerifiedKeysFromStorage();
    current[provider] = '';
    localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export const ConnectionsSettings: React.FC<ConnectionsSettingsProps> = ({
  connections,
  onSaveConnections,
  onToast,
}) => {
  // 1. apiKey state
  const [apiKeys, setApiKeys] = useState<Record<ConnectionProvider, string>>({
    gemini: cleanApiKey(connections.geminiKey || '', 'gemini'),
    groq: cleanApiKey(connections.groqKey || '', 'groq'),
    elevenLabs: cleanApiKey(connections.elevenLabsKey || '', 'elevenLabs'),
  });

  // 2. isTesting state (loading indicator per provider)
  const [isTesting, setIsTesting] = useState<Record<ConnectionProvider, boolean>>({
    gemini: false,
    groq: false,
    elevenLabs: false,
  });

  // 3. Stored verified keys for reload persistence
  const [lastVerifiedKeys, setLastVerifiedKeys] = useState<Record<ConnectionProvider, string>>(() =>
    getVerifiedKeysFromStorage()
  );

  // 4. isVerified state
  const [isVerified, setIsVerified] = useState<Record<ConnectionProvider, boolean>>(() => {
    const stored = getVerifiedKeysFromStorage();
    const gKey = cleanApiKey(connections.geminiKey || '', 'gemini');
    const qKey = cleanApiKey(connections.groqKey || '', 'groq');
    const eKey = cleanApiKey(connections.elevenLabsKey || '', 'elevenLabs');
    return {
      gemini: Boolean(gKey && gKey === stored.gemini),
      groq: Boolean(qKey && qKey === stored.groq),
      elevenLabs: Boolean(eKey && eKey === stored.elevenLabs),
    };
  });

  // 5. Verification status state: 'idle' | 'checking' | 'verified' | 'error' | 'saved'
  const [verificationStatus, setVerificationStatus] = useState<
    Record<ConnectionProvider, VerificationStatusState>
  >(() => {
    const stored = getVerifiedKeysFromStorage();
    const gKey = cleanApiKey(connections.geminiKey || '', 'gemini');
    const qKey = cleanApiKey(connections.groqKey || '', 'groq');
    const eKey = cleanApiKey(connections.elevenLabsKey || '', 'elevenLabs');
    return {
      gemini: gKey && gKey === stored.gemini ? 'saved' : 'idle',
      groq: qKey && qKey === stored.groq ? 'saved' : 'idle',
      elevenLabs: eKey && eKey === stored.elevenLabs ? 'saved' : 'idle',
    };
  });

  // 6. errorMessage state
  const [errorMessages, setErrorMessages] = useState<Record<ConnectionProvider, string>>({
    gemini: '',
    groq: '',
    elevenLabs: '',
  });

  // 7. show/hide password toggle
  const [showKeys, setShowKeys] = useState<Record<ConnectionProvider, boolean>>({
    gemini: false,
    groq: false,
    elevenLabs: false,
  });

  // Sync state if external connections prop updates
  useEffect(() => {
    const cleanGemini = cleanApiKey(connections.geminiKey || '', 'gemini');
    const cleanGroq = cleanApiKey(connections.groqKey || '', 'groq');
    const cleanEleven = cleanApiKey(connections.elevenLabsKey || '', 'elevenLabs');
    const stored = getVerifiedKeysFromStorage();

    setApiKeys({
      gemini: cleanGemini,
      groq: cleanGroq,
      elevenLabs: cleanEleven,
    });

    const isGeminiVerified = Boolean(cleanGemini && cleanGemini === stored.gemini);
    const isGroqVerified = Boolean(cleanGroq && cleanGroq === stored.groq);
    const isElevenVerified = Boolean(cleanEleven && cleanEleven === stored.elevenLabs);

    setIsVerified({
      gemini: isGeminiVerified,
      groq: isGroqVerified,
      elevenLabs: isElevenVerified,
    });

    setVerificationStatus((prev) => ({
      gemini: isGeminiVerified
        ? 'saved'
        : prev.gemini === 'checking'
        ? 'checking'
        : 'idle',
      groq: isGroqVerified
        ? 'saved'
        : prev.groq === 'checking'
        ? 'checking'
        : 'idle',
      elevenLabs: isElevenVerified
        ? 'saved'
        : prev.elevenLabs === 'checking'
        ? 'checking'
        : 'idle',
    }));
  }, [connections]);

  const toggleShowKey = (provider: ConnectionProvider) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  // Change key handler: removes checkmark if key changed
  const handleKeyChange = (provider: ConnectionProvider, newVal: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: newVal }));
    const cleaned = cleanApiKey(newVal, provider);
    const verifiedKey = lastVerifiedKeys[provider] || '';

    // 7. Change the key after verification → Previous verification checkmark is removed until the new key is verified
    if (cleaned !== verifiedKey) {
      setIsVerified((prev) => ({ ...prev, [provider]: false }));
      setVerificationStatus((prev) => ({
        ...prev,
        [provider]: 'idle',
      }));
      setErrorMessages((prev) => ({ ...prev, [provider]: '' }));
    } else if (cleaned && cleaned === verifiedKey) {
      setIsVerified((prev) => ({ ...prev, [provider]: true }));
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'verified' }));
    }
  };

  const handlePaste = async (provider: ConnectionProvider) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleKeyChange(provider, text);
          onToast('কী পেস্ট করা হয়েছে');
          return;
        }
      }
      onToast('ক্লিপবোর্ডে কোনো টেক্সট পাওয়া যায়নি');
    } catch {
      onToast('ক্লিপবোর্ড পড়ার অনুমতি নেই');
    }
  };

  // Real Test action
  const handleTest = async (provider: ConnectionProvider) => {
    // Disable repeated clicks temporarily; do not allow multiple verification requests to run simultaneously
    if (isTesting[provider]) return;

    const rawVal = apiKeys[provider];
    const cleaned = cleanApiKey(rawVal, provider);

    if (!cleaned) {
      setIsVerified((prev) => ({ ...prev, [provider]: false }));
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      setErrorMessages((prev) => ({ ...prev, [provider]: 'প্রথমে একটি API কী লিখুন' }));
      onToast('প্রথমে একটি API কী লিখুন');
      return;
    }

    setIsTesting((prev) => ({ ...prev, [provider]: true }));
    setVerificationStatus((prev) => ({ ...prev, [provider]: 'checking' }));
    setErrorMessages((prev) => ({ ...prev, [provider]: '' }));

    try {
      const result = await validateConnection(provider, cleaned, {
        source: 'manual_test',
      });

      if (result.success) {
        // 4. Stop loading, show green checkmark, status to VERIFIED, enable Save, store verified state
        setIsVerified((prev) => ({ ...prev, [provider]: true }));
        setVerificationStatus((prev) => ({ ...prev, [provider]: 'verified' }));
        setLastVerifiedKeys((prev) => ({ ...prev, [provider]: cleaned }));
        setErrorMessages((prev) => ({ ...prev, [provider]: '' }));
        onToast(`${CONNECTION_DETAILS[provider].name} সফলভাবে যাচাই সম্পন্ন হয়েছে (Verified) ✓`);
      } else {
        setIsVerified((prev) => ({ ...prev, [provider]: false }));
        setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
        setErrorMessages((prev) => ({
          ...prev,
          [provider]: result.message || 'কী ভুল বা যাচাই ব্যর্থ হয়েছে',
        }));
        onToast(`${CONNECTION_DETAILS[provider].name}: ${result.message}`);
      }
    } catch (error: any) {
      setIsVerified((prev) => ({ ...prev, [provider]: false }));
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      const msg = error?.message || 'যাচাইয়ের সময় অপ্রত্যাশিত ত্রুটি হয়েছে';
      setErrorMessages((prev) => ({ ...prev, [provider]: msg }));
      onToast(`${CONNECTION_DETAILS[provider].name}: ${msg}`);
    } finally {
      // Loading state is ALWAYS cleared in finally block regardless of success, failure, timeout, or abort
      setIsTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Save button action
  const handleSave = async (provider: ConnectionProvider) => {
    if (isTesting[provider]) return;

    const rawVal = apiKeys[provider];
    const cleaned = cleanApiKey(rawVal, provider);
    const config = PROVIDER_CONFIGS.find((c) => c.provider === provider);
    if (!config) return;

    // Case 1: Empty key -> clear and save
    if (!cleaned) {
      const updated: ApiConnections = {
        ...connections,
        [config.keyField]: '',
      };
      onSaveConnections(updated);
      setIsVerified((prev) => ({ ...prev, [provider]: false }));
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'idle' }));
      setLastVerifiedKeys((prev) => ({ ...prev, [provider]: '' }));
      removeVerifiedKeyFromStorage(provider);
      setErrorMessages((prev) => ({ ...prev, [provider]: '' }));
      onToast(`${CONNECTION_DETAILS[provider].name} কী মুছে সেভ করা হয়েছে`);
      return;
    }

    // Case 2: Key has already been successfully verified and has not changed -> Save immediately without re-testing!
    const verifiedKey = lastVerifiedKeys[provider] || '';
    const alreadyVerified = isVerified[provider] && cleaned === verifiedKey;

    if (alreadyVerified) {
      const updated: ApiConnections = {
        ...connections,
        [config.keyField]: cleaned,
      };
      onSaveConnections(updated);
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'saved' }));
      saveVerifiedKeyToStorage(provider, cleaned);
      setErrorMessages((prev) => ({ ...prev, [provider]: '' }));
      onToast(`${CONNECTION_DETAILS[provider].name} সফলভাবে সেভ করা হয়েছে ✓`);
      return;
    }

    // Case 3: Key has changed and is not yet verified -> verify it first!
    setIsTesting((prev) => ({ ...prev, [provider]: true }));
    setVerificationStatus((prev) => ({ ...prev, [provider]: 'checking' }));
    setErrorMessages((prev) => ({ ...prev, [provider]: '' }));

    try {
      const result = await validateConnection(provider, cleaned, {
        source: 'save',
      });

      if (result.success) {
        // Only save after successful verification
        const updated: ApiConnections = {
          ...connections,
          [config.keyField]: cleaned,
        };
        onSaveConnections(updated);

        setIsVerified((prev) => ({ ...prev, [provider]: true }));
        setLastVerifiedKeys((prev) => ({ ...prev, [provider]: cleaned }));
        setVerificationStatus((prev) => ({ ...prev, [provider]: 'saved' }));
        saveVerifiedKeyToStorage(provider, cleaned);
        setErrorMessages((prev) => ({ ...prev, [provider]: '' }));
        onToast(`${CONNECTION_DETAILS[provider].name} যাচাই ও সেভ সম্পন্ন হয়েছে ✓`);
      } else {
        setIsVerified((prev) => ({ ...prev, [provider]: false }));
        setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
        setErrorMessages((prev) => ({
          ...prev,
          [provider]: result.message || 'কী যাচাই ব্যর্থ হয়েছে',
        }));
        onToast(`${CONNECTION_DETAILS[provider].name} সেভ করা যায়নি: ${result.message}`);
      }
    } catch (error: any) {
      setIsVerified((prev) => ({ ...prev, [provider]: false }));
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      const msg = error?.message || 'যাচাই ও সেভ করার সময় ত্রুটি হয়েছে';
      setErrorMessages((prev) => ({ ...prev, [provider]: msg }));
      onToast(`${CONNECTION_DETAILS[provider].name}: ${msg}`);
    } finally {
      // Loading state is always cleared in finally block
      setIsTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Connected count for summary bar
  const verifiedCount = PROVIDER_CONFIGS.filter(
    (c) =>
      isVerified[c.provider] ||
      verificationStatus[c.provider] === 'verified' ||
      verificationStatus[c.provider] === 'saved'
  ).length;

  const renderStatusBadge = (provider: ConnectionProvider) => {
    const status = verificationStatus[provider];
    const verified = isVerified[provider];

    if (status === 'checking') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1.5 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>CHECKING</span>
        </span>
      );
    }

    if (status === 'verified' || status === 'saved' || verified) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)] flex items-center gap-1">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>VERIFIED</span>
        </span>
      );
    }

    if (status === 'error') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.35)] flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>ERROR</span>
        </span>
      );
    }

    const key = cleanApiKey(apiKeys[provider], provider);
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
        {key ? 'UNVERIFIED' : 'NOT SET'}
      </span>
    );
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
                verifiedCount > 0
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-slate-500'
              }`}
            />
            <span>{verifiedCount}/৩ সংযুক্ত</span>
          </div>
        </div>
      </div>

      {/* 2. THREE CARDS (ONE BELOW ANOTHER): GEMINI, GROQ, ELEVENLABS */}
      <div className="space-y-3.5">
        {PROVIDER_CONFIGS.map(({ provider, icon: IconComponent, iconBg, iconColor, borderColor }) => {
          const details = CONNECTION_DETAILS[provider];
          const rawKey = apiKeys[provider];
          const isBusy = isTesting[provider];
          const errorMsg = errorMessages[provider];
          const verified = isVerified[provider];
          const status = verificationStatus[provider];

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

                <div className="shrink-0">{renderStatusBadge(provider)}</div>
              </div>

              {/* Password Input Field with Paste button & Eye toggle */}
              <div className="relative">
                <div className="flex items-center bg-[#050c20] border border-sky-900/80 focus-within:border-sky-400 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.25)] rounded-xl px-3 py-1.5 transition-all">
                  <input
                    type={showKeys[provider] ? 'text' : 'password'}
                    value={rawKey}
                    onChange={(e) => handleKeyChange(provider, e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData?.getData('text');
                      if (pasted) {
                        e.preventDefault();
                        handleKeyChange(provider, pasted);
                      }
                    }}
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
                <div className="flex items-center justify-between gap-2 text-[11px] mt-1.5 px-1">
                  <span className="font-mono text-slate-400 shrink-0">
                    Key length:{' '}
                    <span className="text-sky-300 font-bold">
                      {cleanApiKey(rawKey, provider).length}
                    </span>
                  </span>

                  {/* Status/Error note */}
                  {status === 'checking' && (
                    <span className="text-[10px] font-semibold text-amber-300 flex items-center gap-1 truncate">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>যাচাই করা হচ্ছে...</span>
                    </span>
                  )}

                  {status === 'error' && errorMsg && (
                    <span title={errorMsg} className="text-[10px] font-semibold text-rose-400 truncate">
                      {errorMsg}
                    </span>
                  )}

                  {(status === 'verified' || status === 'saved' || verified) && (
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 truncate">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>সফলভাবে যাচাইকৃত (Verified)</span>
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
