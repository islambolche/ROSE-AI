import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, ChatFontSizeType, AgentId, DelegationMode, FileAttachmentMeta } from '../types';
import {
  Paperclip,
  SendHorizontal,
  User,
  Trash2,
  Mic,
  Square,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Youtube,
  Facebook,
  MessageCircle,
  ExternalLink,
  Mail,
  Upload,
} from 'lucide-react';
import { IDENTITY_AGENTS_MAP } from '../config/identity';
import { setYouTubeUploadFile, setFacebookMediaFile } from '../lib/commands';

interface ChatBoxProps {
  selectedAgent: Agent;
  messages: ChatMessage[];
  onSendMessage: (text: string, options?: { fromVoice?: boolean }) => void;
  onClearChat?: () => void;
  isTyping?: boolean;
  fontSize?: ChatFontSizeType;
  interimSpeech?: string;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  isMicOn?: boolean;
  onToggleMic?: () => void;
  voiceLevel?: number;
  voiceDotHeights?: number[];
  workingAgents?: AgentId[];
  workingMode?: DelegationMode;
  uploadedFile?: FileAttachmentMeta | null;
  isCaptionsOn?: boolean;
  onRemoveUploadedFile?: () => void;
  onSaveFileApproval?: (msgId: string, allowed: boolean) => void;
  onFileUpload?: (file: File) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  selectedAgent,
  messages,
  onSendMessage,
  onClearChat,
  isTyping = false,
  fontSize = 'medium',
  interimSpeech = '',
  isSpeaking = false,
  onStopSpeaking,
  isMicOn = false,
  voiceLevel = 0,
  voiceDotHeights = [4, 4, 4, 4, 4],
  workingAgents = [],
  workingMode = 'ask',
  uploadedFile = null,
  isCaptionsOn = false,
  onRemoveUploadedFile,
  onSaveFileApproval,
  onFileUpload,
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedAskIds, setExpandedAskIds] = useState<Record<string, boolean>>({});
  const [ytReplyDrafts, setYtReplyDrafts] = useState<Record<string, string>>({});
  const [fbReplyDrafts, setFbReplyDrafts] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, interimSpeech, isSpeaking, workingAgents]);

  const handleSend = () => {
    if (!inputText.trim() || isTyping) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const getAgentAvatar = (id: string) => {
    return IDENTITY_AGENTS_MAP[id as AgentId]?.avatar || `/avatars/${id}.png`;
  };

  const getAgentColor = (id: string) => {
    return IDENTITY_AGENTS_MAP[id as AgentId]?.color || '#38bdf8';
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-[11px] sm:text-xs leading-normal';
      case 'large':
        return 'text-sm sm:text-base leading-relaxed';
      case 'medium':
      default:
        return 'text-xs sm:text-[13px] leading-relaxed';
    }
  };

  const currentIdent = IDENTITY_AGENTS_MAP[selectedAgent.id] || IDENTITY_AGENTS_MAP.rose;

  // Filter messages for voice mode (only if Mic is ON and Captions are OFF)
  // typed messages, system messages, and errors are ALWAYS shown.
  const filteredMessages = messages.filter(msg => {
    if (!isMicOn || isCaptionsOn) return true;
    if (msg.isSystem) return true;
    if (msg.errorMeta) return true;
    if (!msg.fromVoice) return true;
    return false;
  });

  return (
    <aside className="w-[27%] min-w-[320px] max-w-[420px] h-full flex flex-col bg-gradient-to-b from-[#060c1d] via-[#040814] to-[#030610] border-r border-sky-500/30 select-none relative z-20 shrink-0 shadow-[4px_0_20px_rgba(0,10,30,0.7)]">
      {/* Top subtle bar with Clear chat button for the selected agent */}
      <div className="h-8 px-4 border-b border-sky-950/60 bg-[#050b1a]/80 flex items-center justify-between shrink-0 text-[11px] text-slate-400">
        <span className="font-semibold text-[10px] text-sky-300/80 uppercase tracking-wider font-mono">
          {currentIdent.name} • Chat
        </span>

        {onClearChat && (
          <button
            type="button"
            onClick={onClearChat}
            title={`${currentIdent.name}-এর চ্যাট ইতিহাস মুছুন`}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/30 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear chat</span>
          </button>
        )}
      </div>

      {/* Messages List starts directly below header bar */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {filteredMessages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div
              className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-[#07122b]"
              style={{
                borderColor: currentIdent.color,
                boxShadow: `0 0 16px ${currentIdent.color}50`,
              }}
            >
              <img
                src={currentIdent.avatar}
                alt={currentIdent.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs font-bold text-white">
              {currentIdent.name} ({currentIdent.role})
            </p>
            <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
              যেকোনো প্রশ্ন লিখে পাঠান, {currentIdent.name} উত্তর দেবে।
            </p>
          </div>
        )}

        {filteredMessages.map((msg) => {
          // 0) Character change divider in Rose's chat: "চরিত্র বদলেছে: <নাম>"
          if (
            msg.teamMeta?.kind === 'character_divider' ||
            (typeof msg.text === 'string' && msg.text.startsWith('চরিত্র বদলেছে:'))
          ) {
            return (
              <div
                key={msg.id}
                className="flex items-center gap-3 my-2 px-2 animate-in fade-in duration-150 select-text"
              >
                <div className="flex-1 h-px bg-rose-500/30" />
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-300 tracking-wide">
                  {msg.text}
                </span>
                <div className="flex-1 h-px bg-rose-500/30" />
              </div>
            );
          }

          // 1) Delegation line in Rose's chat: "Rose → Mira: <কাজ>"
          if (msg.teamMeta?.kind === 'delegation') {
            return (
              <div
                key={msg.id}
                className="px-2 py-1 text-[11px] text-slate-400 flex items-center gap-1.5 animate-in fade-in duration-150 select-text"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                <span className="leading-snug">{msg.text}</span>
              </div>
            );
          }

          // 2) ASK collapsible gray line in Rose's chat: "Rose → Mira থেকে তথ্য নিল" (চাপলে ভাঁজ খুলে এজেন্টের রিপোর্ট দেখা যাবে)
          if (msg.teamMeta?.kind === 'ask_fold' || msg.teamMeta?.kind === 'report') {
            const repAgentId = (msg.teamMeta.reportAgentId || msg.sender) as AgentId;
            const repIdent = IDENTITY_AGENTS_MAP[repAgentId] || IDENTITY_AGENTS_MAP.mira;
            const isExpanded = Boolean(expandedAskIds[msg.id]);
            const reportContent = msg.teamMeta.reportText || msg.text;

            return (
              <div key={msg.id} className="px-1 animate-in fade-in duration-150 select-text">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedAskIds((prev) => ({
                      ...prev,
                      [msg.id]: !prev[msg.id],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  <span>Rose → {repIdent.name} থেকে তথ্য নিল</span>
                </button>

                {isExpanded && (
                  <div
                    style={{ borderLeftColor: repIdent.color }}
                    className="mt-1.5 ml-3 mr-2 rounded-xl bg-[#071229]/95 border border-sky-900/60 border-l-4 p-2.5 space-y-1 text-xs text-slate-200 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] font-extrabold"
                        style={{ color: repIdent.color }}
                      >
                        {repIdent.name}-এর রিপোর্ট:
                      </span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                      {reportContent}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          // 3) "Rose-এর কাজ" entry inside the specialist's individual chat
          if (msg.teamMeta?.kind === 'rose_task') {
            const specIdent = IDENTITY_AGENTS_MAP[msg.sender as AgentId] || currentIdent;
            return (
              <div
                key={msg.id}
                style={{ borderLeftColor: IDENTITY_AGENTS_MAP.rose.color }}
                className="rounded-xl bg-[#08132c]/90 border border-sky-900/50 border-l-4 p-2.5 space-y-1.5 animate-in fade-in duration-150 select-text"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-300">
                    Rose-এর কাজ
                  </span>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
                {msg.teamMeta.taskText && (
                  <p className="text-[11px] text-slate-400">
                    <span className="font-bold text-rose-300">Rose:</span> {msg.teamMeta.taskText}
                  </p>
                )}
                <p className="text-xs text-slate-200 whitespace-pre-wrap">
                  <span className="font-bold" style={{ color: specIdent.color }}>
                    {specIdent.name}:
                  </span>{' '}
                  {msg.teamMeta.reportText || msg.text}
                </p>
              </div>
            );
          }

          const isUser = msg.sender === 'user';
          const color = isUser ? '#38bdf8' : getAgentColor(msg.sender);
          const avatarUrl = isUser ? '' : getAgentAvatar(msg.sender);
          const senderDisplayName = isUser
            ? 'You'
            : IDENTITY_AGENTS_MAP[msg.sender as AgentId]?.name || msg.senderName;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              {/* Sender Name & Timestamp Header */}
              <div
                className={`flex items-center gap-2 text-[11px] mb-1 px-1 ${
                  isUser ? 'flex-row-reverse text-slate-300' : 'flex-row text-slate-300'
                }`}
              >
                {!isUser ? (
                  <>
                    <span
                      className="font-extrabold text-xs tracking-wide"
                      style={{ color }}
                    >
                      {senderDisplayName}
                    </span>
                    <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                    <span className="font-extrabold text-xs text-sky-200 flex items-center gap-1">
                      {msg.fromVoice && (
                        <span title="ভয়েস ইনপুট" className="flex items-center text-emerald-400">
                          <Mic className="w-3 h-3 shrink-0" />
                        </span>
                      )}
                      You
                    </span>
                  </>
                )}
              </div>

              {/* Message Bubble + 40px Round Avatar */}
              <div
                className={`flex items-start gap-2.5 max-w-[94%] ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* 40px Round Avatar */}
                <div className="shrink-0 mt-0.5">
                  {isUser ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 border border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.4)] flex items-center justify-center text-white">
                      <User className="w-5 h-5 drop-shadow" />
                    </div>
                  ) : (
                    <div
                      className="relative w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center bg-[#07122b]"
                      style={{
                        borderColor: color,
                        boxShadow: `0 0 12px ${color}60`,
                      }}
                    >
                      <img
                        src={avatarUrl}
                        alt={senderDisplayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Bubble Text */}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 ${getFontSizeClass()} shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-[#0062cc] via-[#0070f3] to-[#0080ff] text-white rounded-tr-none border border-sky-400/40 shadow-[0_4px_16px_rgba(0,112,243,0.35)]'
                      : msg.isSystem
                      ? 'bg-rose-950/60 text-rose-200 rounded-tl-none border border-rose-500/50 shadow-[0_4px_16px_rgba(244,63,94,0.3)]'
                      : 'bg-[#0a1633] text-slate-100 rounded-tl-none border border-sky-800/60 shadow-[0_4px_16px_rgba(0,15,40,0.6)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  {msg.saveFileMeta && (
                    <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{msg.saveFileMeta.name}</p>
                          <p className="text-[10px] text-slate-400">{(msg.saveFileMeta.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      
                      {msg.saveFileMeta.status === 'pending' ? (
                        <>
                          <div className="text-[10px] text-slate-300 italic line-clamp-2 opacity-70">
                            "{msg.saveFileMeta.content.slice(0, 200)}..."
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button 
                              onClick={() => onSaveFileApproval?.(msg.id, true)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Allow
                            </button>
                            <button 
                              onClick={() => onSaveFileApproval?.(msg.id, false)}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Deny
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold pt-1 ${msg.saveFileMeta.status === 'saved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {msg.saveFileMeta.status === 'saved' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>সেভ হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>বাতিল করা হয়েছে</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.bill && (
                    <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">WhatsApp Bill</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{msg.bill.customerName}</span>
                      </div>

                      <div className="space-y-1.5">
                        {msg.bill.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-slate-300">{item.name} <span className="text-slate-500">x{item.quantity}</span></span>
                            <span className="text-white font-mono">{item.price * item.quantity} ৳</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5 font-black">
                        <span className="text-[10px] text-slate-400 uppercase">Total Amount</span>
                        <span className="text-emerald-400 font-mono text-sm">{msg.bill.total} ৳</span>
                      </div>

                      <button
                        onClick={() => (window as any).onCommandAction?.(msg.id, 'whatsapp_bill')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-[11px] font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 group"
                      >
                        <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>OPEN WHATSAPP</span>
                      </button>
                    </div>
                  )}

                  {msg.emailDraft && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Gmail Draft
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300 truncate max-w-[160px]">
                          {msg.emailDraft.to}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold">To: </span>
                          <span className="text-white font-mono">{msg.emailDraft.to}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Subject: </span>
                          <span className="text-white font-semibold">{msg.emailDraft.subject}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-slate-200 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto">
                          {msg.emailDraft.body}
                        </div>
                      </div>

                      {msg.emailDraft.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            Approval required (Send email / apply for a job):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'gmail_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Send
                            </button>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'gmail_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : msg.emailDraft.status === 'sending' ? (
                        <div className="text-[10px] font-bold text-amber-300 pt-1">
                          Gmail API এর মাধ্যমে পাঠানো হচ্ছে...
                        </div>
                      ) : msg.emailDraft.status === 'sent' ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ইমেইল সফলভাবে পাঠানো হয়েছে</span>
                        </div>
                      ) : msg.emailDraft.status === 'error' ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-[10px] font-bold text-rose-400">
                            ত্রুটি: {msg.emailDraft.error || 'ইমেইল পাঠানো যায়নি'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (window as any).onCommandAction?.(msg.id, 'gmail_approve')}
                            className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold transition-all"
                          >
                            Retry Send via Gmail
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 pt-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.ytUpload && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-rose-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                            <Youtube className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            YouTube Video Upload
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold">Title: </span>
                          <span className="text-white font-semibold">{msg.ytUpload.title}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Description: </span>
                          <span className="text-slate-200 whitespace-pre-wrap">{msg.ytUpload.description || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Tags: </span>
                          <span className="text-sky-300 font-mono">
                            {msg.ytUpload.tags.length > 0 ? msg.ytUpload.tags.join(', ') : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Video File Selector */}
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-rose-400" />
                          <span>
                            {msg.ytUpload.fileName
                              ? `Selected: ${msg.ytUpload.fileName}`
                              : 'Select Video File to Upload'}
                          </span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                setYouTubeUploadFile(msg.id, f);
                                (window as any).onCommandAction?.(msg.id, 'yt_file_selected', {
                                  fileName: f.name,
                                });
                              }
                            }}
                          />
                        </label>
                      </div>

                      {msg.ytUpload.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            Approval required (Post or reply on Facebook / YouTube):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'yt_upload_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'yt_upload_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : msg.ytUpload.status === 'uploading' ? (
                        <div className="text-[10px] font-bold text-amber-300 pt-1">
                          YouTube Resumable API দিয়ে ভিডিও আপলোড হচ্ছে...
                        </div>
                      ) : msg.ytUpload.status === 'uploaded' ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ভিডিও সফলভাবে আপলোড হয়েছে!</span>
                          </div>
                          {msg.ytUpload.videoId && (
                            <a
                              href={`https://www.youtube.com/watch?v=${msg.ytUpload.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-300 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Watch on YouTube ({msg.ytUpload.videoId})
                            </a>
                          )}
                        </div>
                      ) : msg.ytUpload.status === 'error' ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-[10px] font-bold text-rose-400">
                            ত্রুটি: {msg.ytUpload.error || 'ভিডিও আপলোড ব্যর্থ হয়েছে'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (window as any).onCommandAction?.(msg.id, 'yt_upload_approve')}
                            className="w-full py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 text-[10px] font-extrabold transition-all"
                          >
                            Retry Upload
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 pt-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.ytComments && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-rose-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                            <Youtube className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            YouTube Comments ({msg.ytComments.videoId})
                          </span>
                        </div>
                      </div>

                      {msg.ytComments.status === 'loading' ? (
                        <div className="text-[10px] font-bold text-amber-300">
                          কমেন্ট লোড হচ্ছে...
                        </div>
                      ) : msg.ytComments.status === 'error' ? (
                        <div className="text-[10px] font-bold text-rose-400">
                          ত্রুটি: {msg.ytComments.error || 'কমেন্ট লোড করা যায়নি'}
                        </div>
                      ) : msg.ytComments.comments.length === 0 ? (
                        <div className="text-[11px] text-slate-400">কোনো কমেন্ট পাওয়া যায়নি।</div>
                      ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {msg.ytComments.comments.map((c) => {
                            const draftKey = `${msg.id}_${c.topLevelCommentId}`;
                            const draftVal = ytReplyDrafts[draftKey] || '';
                            return (
                              <div
                                key={c.topLevelCommentId}
                                className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-[11px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-rose-300">{c.author}</span>
                                  <span className="text-[9px] font-mono text-slate-500">
                                    ID: {c.topLevelCommentId}
                                  </span>
                                </div>
                                <p className="text-slate-200 whitespace-pre-wrap">{c.text}</p>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <input
                                    type="text"
                                    value={draftVal}
                                    onChange={(e) =>
                                      setYtReplyDrafts((prev) => ({
                                        ...prev,
                                        [draftKey]: e.target.value,
                                      }))
                                    }
                                    placeholder="রিপ্লাই লিখুন..."
                                    className="flex-1 px-2.5 py-1 rounded-lg bg-[#040a1a] border border-sky-500/30 text-white text-[10px] focus:outline-none focus:border-sky-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!draftVal.trim()) return;
                                      (window as any).onCommandAction?.(msg.id, 'yt_prepare_reply', {
                                        parentId: c.topLevelCommentId,
                                        text: draftVal.trim(),
                                      });
                                      setYtReplyDrafts((prev) => ({ ...prev, [draftKey]: '' }));
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-extrabold transition-colors shrink-0"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.ytReply && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-rose-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                            <Youtube className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            YouTube Comment Reply
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-rose-300 truncate max-w-[140px]">
                          {msg.ytReply.parentId}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold">Comment ID: </span>
                          <span className="text-white font-mono">{msg.ytReply.parentId}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-slate-200 whitespace-pre-wrap">
                          {msg.ytReply.text}
                        </div>
                      </div>

                      {msg.ytReply.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            Approval required (Post or reply on Facebook / YouTube):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'yt_reply_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'yt_reply_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : msg.ytReply.status === 'posting' ? (
                        <div className="text-[10px] font-bold text-amber-300 pt-1">
                          YouTube-এ রিপ্লাই পোস্ট করা হচ্ছে...
                        </div>
                      ) : msg.ytReply.status === 'posted' ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>রিপ্লাই সফলভাবে পোস্ট করা হয়েছে</span>
                        </div>
                      ) : msg.ytReply.status === 'error' ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-[10px] font-bold text-rose-400">
                            ত্রুটি: {msg.ytReply.error || 'রিপ্লাই পোস্ট করা যায়নি'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (window as any).onCommandAction?.(msg.id, 'yt_reply_approve')}
                            className="w-full py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 text-[10px] font-extrabold transition-all"
                          >
                            Retry Reply
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 pt-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.fbPost && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-blue-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Facebook className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Facebook Page Post ({msg.fbPost.mediaType.toUpperCase()})
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-slate-200 whitespace-pre-wrap">
                          {msg.fbPost.message || '—'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>
                            {msg.fbPost.fileName
                              ? `Selected: ${msg.fbPost.fileName}`
                              : msg.fbPost.mediaType === 'photo'
                              ? 'Select Photo File to Upload'
                              : msg.fbPost.mediaType === 'video'
                              ? 'Select Video File to Upload'
                              : 'Select Photo/Video (Optional)'}
                          </span>
                          <input
                            type="file"
                            accept={
                              msg.fbPost.mediaType === 'photo'
                                ? 'image/*'
                                : msg.fbPost.mediaType === 'video'
                                ? 'video/*'
                                : 'image/*,video/*'
                            }
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                setFacebookMediaFile(msg.id, f);
                                const detectedType = f.type.startsWith('video/')
                                  ? 'video'
                                  : f.type.startsWith('image/')
                                  ? 'photo'
                                  : msg.fbPost?.mediaType || 'photo';
                                (window as any).onCommandAction?.(msg.id, 'fb_file_selected', {
                                  fileName: f.name,
                                  mediaType: detectedType,
                                });
                              }
                            }}
                          />
                        </label>
                      </div>

                      {msg.fbPost.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            Approval required (Post or reply on Facebook / YouTube):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'fb_post_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Post
                            </button>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'fb_post_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : msg.fbPost.status === 'posting' ? (
                        <div className="text-[10px] font-bold text-amber-300 pt-1">
                          Facebook Page-এ পোস্ট করা হচ্ছে...
                        </div>
                      ) : msg.fbPost.status === 'posted' ? (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ফেসবুক পেজে সফলভাবে পোস্ট হয়েছে!</span>
                          </div>
                          {msg.fbPost.postId && (
                            <p className="text-[10px] font-mono text-sky-300">
                              Post ID: {msg.fbPost.postId}
                            </p>
                          )}
                        </div>
                      ) : msg.fbPost.status === 'error' ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-[10px] font-bold text-rose-400">
                            ত্রুটি: {msg.fbPost.error || 'ফেসবুক পোস্ট ব্যর্থ হয়েছে'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (window as any).onCommandAction?.(msg.id, 'fb_post_approve')}
                            className="w-full py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-300 text-[10px] font-extrabold transition-all"
                          >
                            Retry Post
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 pt-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.fbComments && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-blue-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Facebook className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Facebook Post Comments ({msg.fbComments.postId})
                          </span>
                        </div>
                      </div>

                      {msg.fbComments.status === 'loading' ? (
                        <div className="text-[10px] font-bold text-amber-300">
                          কমেন্ট লোড হচ্ছে...
                        </div>
                      ) : msg.fbComments.status === 'error' ? (
                        <div className="text-[10px] font-bold text-rose-400">
                          ত্রুটি: {msg.fbComments.error || 'কমেন্ট লোড করা যায়নি'}
                        </div>
                      ) : msg.fbComments.comments.length === 0 ? (
                        <div className="text-[11px] text-slate-400">কোনো কমেন্ট পাওয়া যায়নি।</div>
                      ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {msg.fbComments.comments.map((c) => {
                            const draftKey = `${msg.id}_${c.id}`;
                            const draftVal = fbReplyDrafts[draftKey] || '';
                            return (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-[11px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-blue-300">{c.author}</span>
                                  <span className="text-[9px] font-mono text-slate-500">
                                    ID: {c.id}
                                  </span>
                                </div>
                                <p className="text-slate-200 whitespace-pre-wrap">{c.text}</p>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <input
                                    type="text"
                                    value={draftVal}
                                    onChange={(e) =>
                                      setFbReplyDrafts((prev) => ({
                                        ...prev,
                                        [draftKey]: e.target.value,
                                      }))
                                    }
                                    placeholder="রিপ্লাই লিখুন..."
                                    className="flex-1 px-2.5 py-1 rounded-lg bg-[#040a1a] border border-sky-500/30 text-white text-[10px] focus:outline-none focus:border-sky-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!draftVal.trim()) return;
                                      (window as any).onCommandAction?.(msg.id, 'fb_prepare_reply', {
                                        commentId: c.id,
                                        text: draftVal.trim(),
                                      });
                                      setFbReplyDrafts((prev) => ({ ...prev, [draftKey]: '' }));
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold transition-colors shrink-0"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.fbReply && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-blue-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Facebook className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Facebook Comment Reply
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-blue-300 truncate max-w-[140px]">
                          {msg.fbReply.commentId}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold">Comment ID: </span>
                          <span className="text-white font-mono">{msg.fbReply.commentId}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-slate-200 whitespace-pre-wrap">
                          {msg.fbReply.text}
                        </div>
                      </div>

                      {msg.fbReply.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            Approval required (Post or reply on Facebook / YouTube):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'fb_reply_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve & Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'fb_reply_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : msg.fbReply.status === 'posting' ? (
                        <div className="text-[10px] font-bold text-amber-300 pt-1">
                          Facebook-এ রিপ্লাই পোস্ট করা হচ্ছে...
                        </div>
                      ) : msg.fbReply.status === 'posted' ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>রিপ্লাই সফলভাবে পোস্ট করা হয়েছে</span>
                        </div>
                      ) : msg.fbReply.status === 'error' ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-[10px] font-bold text-rose-400">
                            ত্রুটি: {msg.fbReply.error || 'রিপ্লাই পোস্ট করা যায়নি'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (window as any).onCommandAction?.(msg.id, 'fb_reply_approve')}
                            className="w-full py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-300 text-[10px] font-extrabold transition-all"
                          >
                            Retry Reply
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 pt-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.pcAction && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/40 border border-sky-500/30 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">
                          PC Action ({msg.pcAction.actionType.replace(/_/g, ' ')})
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-200 font-mono whitespace-pre-wrap break-all">
                        {msg.pcAction.target}
                        {msg.pcAction.text !== undefined && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/10 text-slate-100 font-sans">
                            {msg.pcAction.text}
                          </div>
                        )}
                      </div>

                      {msg.pcAction.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            Approval required (PC Control Rule):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'pc_action_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'pc_action_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : msg.pcAction.status === 'done' ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>সম্পন্ন হয়েছে</span>
                          </div>
                          {msg.pcAction.resultText && (
                            <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {msg.pcAction.resultText}
                            </div>
                          )}
                        </div>
                      ) : msg.pcAction.status === 'error' ? (
                        <div className="text-[10px] font-bold text-rose-400 pt-1">
                          ত্রুটি: {msg.pcAction.error || 'PC Action ব্যর্থ হয়েছে'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 pt-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করা হয়েছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.actionCommand && (
                    <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          msg.actionCommand.type.includes('youtube') ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {msg.actionCommand.type.includes('youtube') ? <Youtube className="w-5 h-5" /> : <Facebook className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate capitalize">
                            {msg.actionCommand.type.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">"{msg.actionCommand.query}"</p>
                        </div>
                      </div>

                      {msg.actionCommand.status === 'pending' ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] text-amber-300/90 font-semibold">
                            অনুমতি প্রয়োজন: নতুন ট্যাবে এই লিঙ্কটি খুলতে চান?
                          </p>
                          <div className="flex items-center gap-2">
                            <a
                              href={msg.actionCommand.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'action_command_approve')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Confirm & Open
                            </a>
                            <button
                              type="button"
                              onClick={() => (window as any).onCommandAction?.(msg.id, 'action_command_cancel')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : msg.actionCommand.status === 'cancelled' ? (
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>বাতিল করা হয়েছে</span>
                          </div>
                          <a
                            href={msg.actionCommand.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-extrabold transition-all flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Link
                          </a>
                        </div>
                      ) : (
                        <a
                          href={msg.actionCommand.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Link
                        </a>
                      )}
                    </div>
                  )}

                  {msg.errorMeta?.subtext && (
                    <div
                      className={`mt-2 pt-1.5 border-t text-[11px] text-slate-400 select-text ${
                        msg.isSystem
                          ? 'border-rose-500/30 font-mono tracking-tight'
                          : 'border-sky-800/40'
                      }`}
                    >
                      {msg.errorMeta.subtext}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Delegated Specialists Working ("খুঁজছে..." ঢেউ) */}
        {selectedAgent.id === 'rose' && workingAgents.length > 0 && (
          <div className="space-y-2 animate-in fade-in duration-150">
            {workingAgents.map((agId) => {
              const agIdent = IDENTITY_AGENTS_MAP[agId];
              if (!agIdent) return null;
              return (
                <div
                  key={agId}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#081533]/90 border border-sky-900/60 max-w-[85%]"
                  style={{ borderColor: `${agIdent.color}55` }}
                >
                  <div
                    className="w-7 h-7 rounded-full overflow-hidden border shrink-0 bg-[#050c1e]"
                    style={{
                      borderColor: agIdent.color,
                      boxShadow: `0 0 10px ${agIdent.color}60`,
                    }}
                  >
                    <img
                      src={agIdent.avatar}
                      alt={agIdent.name}
                      className="w-full h-full object-cover animate-pulse"
                    />
                  </div>
                  <span
                    className="text-xs font-extrabold tracking-wide"
                    style={{ color: agIdent.color }}
                  >
                    {agIdent.name}
                  </span>
                  <span className="text-[11px] text-slate-300 font-semibold">
                    {workingMode === 'handoff' ? 'উত্তর দিচ্ছে...' : 'খুঁজছে...'}
                  </span>
                  <div className="flex items-center gap-1 h-3 ml-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: agIdent.color, animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: agIdent.color, animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: agIdent.color, animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Agent Typing Wave */}
        {isTyping && workingAgents.length === 0 && (
          <div className="flex items-start gap-2.5 max-w-[94%] animate-in fade-in duration-200">
            <div
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center bg-[#07122b] shrink-0"
              style={{
                borderColor: currentIdent.color,
                boxShadow: `0 0 14px ${currentIdent.color}70`,
              }}
            >
              <img
                src={currentIdent.avatar}
                alt={currentIdent.name}
                className="w-full h-full object-cover animate-pulse"
              />
            </div>

            <div
              className="rounded-2xl rounded-tl-none px-4 py-3 bg-[#0a1633] border border-sky-800/60 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,15,40,0.6)]"
              style={{ borderColor: `${currentIdent.color}60` }}
            >
              <span className="text-xs font-semibold text-slate-300">
                {currentIdent.name} typing
              </span>
              <div className="flex items-center gap-1 h-3">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: currentIdent.color, animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: currentIdent.color, animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: currentIdent.color, animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* User Live Interim Voice Bubble ("শুনছি...") */}
        {interimSpeech && (!isMicOn || isCaptionsOn) && (
          <div className="flex flex-col items-end animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-[11px] mb-1 px-1 flex-row-reverse text-slate-300">
              <span className="font-extrabold text-xs text-sky-200 flex items-center gap-1">
                <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                You
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                শুনছি...
              </span>
            </div>

            <div className="flex items-start gap-2.5 max-w-[94%] flex-row-reverse">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 shadow-[0_0_12px_rgba(56,189,248,0.25)] flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>

              <div className="rounded-2xl rounded-tr-none px-3.5 py-2.5 bg-slate-800/95 text-slate-200 border border-slate-600 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                <p className="whitespace-pre-wrap text-xs sm:text-[13px]">{interimSpeech}</p>
              </div>
            </div>
          </div>
        )}

        {/* Agent Speaking Banner with "বলছে..." and Stop Button */}
        {isSpeaking && (
          <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-[#08183a]/90 border border-sky-400/50 shadow-[0_0_18px_rgba(56,189,248,0.35)] animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center bg-[#07122b]"
                style={{
                  borderColor: currentIdent.color,
                  boxShadow: `0 0 10px ${currentIdent.color}`,
                }}
              >
                <img
                  src={currentIdent.avatar}
                  alt={currentIdent.name}
                  className="w-full h-full object-cover animate-pulse"
                />
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-white tracking-wide truncate">
                  {currentIdent.name} বলছে...
                </span>
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-1 bg-sky-400 rounded-full soundwave-1" />
                  <span className="w-1 bg-sky-400 rounded-full soundwave-2" />
                  <span className="w-1 bg-sky-400 rounded-full soundwave-3" />
                  <span className="w-1 bg-sky-400 rounded-full soundwave-1" />
                </div>
              </div>
            </div>

            {onStopSpeaking && (
              <button
                type="button"
                onClick={onStopSpeaking}
                title="বলা থামান (Stop)"
                className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-all shadow-sm shrink-0"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Bottom Input Row: Paperclip, Textarea message, Send Button */}
      <div className="p-3 border-t border-sky-900/60 bg-[#060e22]/95 backdrop-blur-md shrink-0">
        <div className="flex items-end gap-2 bg-[#09142e] border border-sky-500/40 focus-within:border-sky-400 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.35)] rounded-2xl px-3 py-1.5 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileUpload) onFileUpload(file);
              e.target.value = '';
            }}
            accept=".pdf,.docx,.txt,.md,.csv,.json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file (PDF, DOCX, TXT, MD, CSV, JSON)"
            className="text-slate-400 hover:text-sky-300 transition-colors p-1.5 pb-2 shrink-0"
          >
            <Paperclip className="w-4 h-4 rotate-45" />
          </button>

          <div className="flex-1 flex flex-col min-w-0">
            {uploadedFile && (
              <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/30 w-fit max-w-full animate-in zoom-in-95 duration-200">
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-white truncate max-w-[120px]">
                    {uploadedFile.name}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {(uploadedFile.size / 1024).toFixed(1)} KB {uploadedFile.isTruncated && '• (আংশিক)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onRemoveUploadedFile}
                  className="p-1 hover:bg-sky-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentIdent.name}...`}
              disabled={isTyping}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none min-w-0 py-1.5 resize-none max-h-28 disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            title={isTyping ? 'Generating response...' : 'Send (Enter)'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 mb-0.5 ${
              inputText.trim() && !isTyping
                ? 'bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-[0_0_14px_rgba(56,189,248,0.7)] scale-105 active:scale-95'
                : 'bg-blue-600/40 text-white/40 cursor-not-allowed'
            }`}
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
