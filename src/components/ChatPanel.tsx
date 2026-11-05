import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage } from '../types';
import {
  Send,
  Mic,
  Paperclip,
  CheckCheck,
  Bot,
  User,
  Sparkles,
  FileText,
  X,
  MessageSquare,
} from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  agents: Agent[];
  selectedAgent: Agent;
  onSendMessage: (text: string, attachment?: string) => void;
  onSelectAgent: (agent: Agent) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  agents,
  selectedAgent,
  onSendMessage,
  onSelectAgent,
}) => {
  const [inputText, setInputText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [mockAttachment, setMockAttachment] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() && !mockAttachment) return;
    onSendMessage(inputText.trim(), mockAttachment || undefined);
    setInputText('');
    setMockAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSimulateAttachment = () => {
    const sampleFiles = [
      'Daily_Sales_Report.xlsx',
      'Pending_Invoices_Batch.pdf',
      'Courier_Dispatch_Manifest.csv',
      'Customer_CSAT_Audit.docx',
    ];
    const randomFile = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    setMockAttachment(randomFile);
  };

  const handleToggleVoiceDictation = () => {
    if (isDictating) {
      setIsDictating(false);
    } else {
      setIsDictating(true);
      setTimeout(() => {
        setInputText((prev) =>
          prev ? `${prev} [Voice Note: Status check on pending operations]` : "Give me a complete update on today's orders and team status."
        );
        setIsDictating(false);
        inputRef.current?.focus();
      }, 1200);
    }
  };

  const quickPrompts = [
    { label: 'Sales Status', query: 'Show me total sales and revenue today' },
    { label: 'Dispatch Queue', query: 'Zayan, how many parcels are pending delivery?' },
    { label: 'Audit Check', query: 'Naira, run an audit on today’s margins' },
    { label: 'Support Queue', query: 'Mira, any unresolved customer issues?' },
  ];

  const getAgentById = (id: string): Agent | undefined => {
    return agents.find((a) => a.id === id);
  };

  // Render cartoon mini avatar icon for each agent
  const renderAgentAvatar = (agentId: string) => {
    switch (agentId) {
      case 'rose':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="19" fill="#240e16" stroke="#f43f5e" strokeWidth="2" />
            <ellipse cx="20" cy="18" rx="8" ry="9" fill="#fad4c0" />
            <circle cx="17.5" cy="17" r="1.5" fill="#1e293b" />
            <circle cx="22.5" cy="17" r="1.5" fill="#1e293b" />
            <path d="M 18.5 21 Q 20 23 21.5 21" stroke="#be123c" strokeWidth="1.2" fill="none" />
            {/* Hair Bob */}
            <path d="M 12 17 Q 20 8 28 17 Q 26 12 20 12 Q 14 12 12 17 Z" fill="#4a1525" />
            {/* Headset */}
            <path d="M 14 18 Q 20 10 26 18" stroke="#0ea5e9" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="18" r="2" fill="#0f172a" />
            <circle cx="26" cy="18" r="2" fill="#0f172a" />
            <circle cx="17" cy="21" r="1" fill="#f43f5e" />
          </svg>
        );
      case 'mira':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="19" fill="#052e16" stroke="#22c55e" strokeWidth="2" />
            <ellipse cx="20" cy="18" rx="8" ry="9" fill="#fed7aa" />
            <circle cx="17.5" cy="17" r="1.5" fill="#14532d" />
            <circle cx="22.5" cy="17" r="1.5" fill="#14532d" />
            <path d="M 18.5 21 Q 20 23 21.5 21" stroke="#b91c1c" strokeWidth="1.2" fill="none" />
            {/* Ponytail */}
            <ellipse cx="28" cy="14" rx="3.5" ry="6" fill="#92400e" transform="rotate(20 28 14)" />
            <path d="M 13 17 Q 20 8 27 17 Q 25 12 20 12 Q 15 12 13 17 Z" fill="#92400e" />
            {/* Green Headset */}
            <path d="M 14 18 Q 20 10 26 18" stroke="#22c55e" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="18" r="2" fill="#0f172a" />
            <circle cx="26" cy="18" r="2" fill="#0f172a" />
            <circle cx="17" cy="21" r="1" fill="#22c55e" />
          </svg>
        );
      case 'arin':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="19" fill="#082f49" stroke="#38bdf8" strokeWidth="2" />
            <ellipse cx="20" cy="18" rx="8" ry="9" fill="#fcdbbd" />
            <circle cx="17.5" cy="17" r="1.5" fill="#0369a1" />
            <circle cx="22.5" cy="17" r="1.5" fill="#0369a1" />
            <path d="M 18.5 21 Q 20 23 21.5 21" stroke="#be123c" strokeWidth="1.2" fill="none" />
            {/* Hair */}
            <path d="M 13 16 Q 20 8 27 15 Q 24 11 20 11 Q 15 11 13 16 Z" fill="#1e293b" />
            {/* Blue Headset */}
            <path d="M 14 18 Q 20 10 26 18" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="18" r="2" fill="#0f172a" />
            <circle cx="26" cy="18" r="2" fill="#0f172a" />
            <circle cx="17" cy="21" r="1" fill="#38bdf8" />
          </svg>
        );
      case 'zayan':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="19" fill="#431407" stroke="#f97316" strokeWidth="2" />
            <ellipse cx="20" cy="18" rx="8" ry="9" fill="#f5cfaf" />
            <circle cx="17.5" cy="17" r="1.5" fill="#431407" />
            <circle cx="22.5" cy="17" r="1.5" fill="#431407" />
            <path d="M 18.5 21 Q 20 23 21.5 21" stroke="#c2410c" strokeWidth="1.2" fill="none" />
            {/* Spiky Hair */}
            <polygon points="18,10 20,7 22,10" fill="#292524" />
            <path d="M 13 16 Q 20 9 27 16 Q 24 11 20 11 Q 15 11 13 16 Z" fill="#292524" />
            {/* Orange Headset */}
            <path d="M 14 18 Q 20 10 26 18" stroke="#f97316" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="18" r="2" fill="#0f172a" />
            <circle cx="26" cy="18" r="2" fill="#0f172a" />
            <circle cx="17" cy="21" r="1" fill="#f97316" />
          </svg>
        );
      case 'naira':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="19" fill="#2e1065" stroke="#a855f7" strokeWidth="2" />
            {/* Bun */}
            <circle cx="20" cy="9" r="4" fill="#2e1065" stroke="#c084fc" strokeWidth="1" />
            <ellipse cx="20" cy="19" rx="8" ry="9" fill="#f5d0c5" />
            {/* Glasses */}
            <rect x="15.5" y="15.5" width="4" height="3" rx="1" fill="none" stroke="#c084fc" strokeWidth="1" />
            <rect x="20.5" y="15.5" width="4" height="3" rx="1" fill="none" stroke="#c084fc" strokeWidth="1" />
            <circle cx="17.5" cy="17" r="1" fill="#3b0764" />
            <circle cx="22.5" cy="17" r="1" fill="#3b0764" />
            <path d="M 18.5 22 Q 20 24 21.5 22" stroke="#9333ea" strokeWidth="1.2" fill="none" />
            {/* Hair */}
            <path d="M 13 17 Q 20 10 27 17 Q 24 12 20 12 Q 15 12 13 17 Z" fill="#2e1065" />
            {/* Purple Headset */}
            <path d="M 14 18 Q 20 10 26 18" stroke="#a855f7" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="18" r="2" fill="#0f172a" />
            <circle cx="26" cy="18" r="2" fill="#0f172a" />
            <circle cx="17" cy="21" r="1" fill="#a855f7" />
          </svg>
        );
      default:
        return <Bot className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <aside className="w-[27%] min-w-[310px] max-w-[420px] h-full flex flex-col bg-gradient-to-b from-[#080f24] via-[#060b19] to-[#040813] border-r border-sky-500/25 select-none relative z-20 shrink-0">
      {/* Top Chat Bar */}
      <div className="p-3 border-b border-sky-950/90 bg-slate-900/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border shadow-sm shrink-0"
            style={{
              backgroundColor: selectedAgent.accentBg,
              borderColor: selectedAgent.borderHex,
              color: selectedAgent.accentHex,
            }}
          >
            {selectedAgent.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Chat with {selectedAgent.name}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: selectedAgent.accentHex }}
              />
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {selectedAgent.role}
            </p>
          </div>
        </div>

        {/* Quick Agent Switcher Pills */}
        <div className="flex items-center gap-1">
          {agents.map((ag) => (
            <button
              key={ag.id}
              onClick={() => onSelectAgent(ag)}
              title={`Switch conversation to ${ag.name} (${ag.role})`}
              className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all border ${
                selectedAgent.id === ag.id
                  ? 'ring-1 ring-sky-400 border-white text-white scale-110 shadow-md'
                  : 'opacity-65 hover:opacity-100 border-slate-700 text-slate-300'
              }`}
              style={{
                backgroundColor: ag.accentBg,
                color: selectedAgent.id === ag.id ? '#ffffff' : ag.accentHex,
              }}
            >
              {ag.name.charAt(0)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Suggestion Pills */}
      <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800/40 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.query)}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[10px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const agent = !isUser ? getAgentById(msg.sender) : null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              {/* Sender Name & Timestamp Header */}
              <div
                className={`flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1 ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {!isUser && (
                  <span
                    className="font-extrabold text-[10px] uppercase tracking-wider"
                    style={{ color: agent ? agent.accentHex : '#38bdf8' }}
                  >
                    {msg.senderName}
                  </span>
                )}
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Row with Cartoon Avatar and Bubble */}
              <div
                className={`flex gap-2 max-w-[92%] ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar Icon */}
                <div className="shrink-0 mt-0.5 w-7 h-7">
                  {isUser ? (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl overflow-hidden shadow-md">
                      {renderAgentAvatar(msg.sender)}
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-tr-sm border border-sky-400/40'
                      : 'bg-[#0f1b36] text-slate-100 rounded-tl-sm border border-sky-900/60 shadow-lg'
                  }`}
                  style={{
                    boxShadow: !isUser && agent ? `0 4px 16px -2px ${agent.accentHex}18` : undefined,
                  }}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Optional Attachment Card */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                      {msg.attachments.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/25 text-[10px] text-slate-200"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional Interactive Action Buttons on AI Responses */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-sky-950/80 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSendMessage(act)}
                          className="px-2 py-1 rounded-md bg-slate-900/90 hover:bg-sky-950/80 border border-sky-700/50 text-[10px] font-semibold text-sky-300 hover:text-white transition-colors"
                        >
                          {act} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview (if staged) */}
      {mockAttachment && (
        <div className="px-3 py-1.5 bg-slate-900/90 border-t border-sky-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-sky-300 text-[11px] truncate">
            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{mockAttachment}</span>
          </div>
          <button
            onClick={() => setMockAttachment(null)}
            className="p-1 text-slate-400 hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Dictating Indicator */}
      {isDictating && (
        <div className="px-3 py-1.5 bg-sky-950/90 border-t border-sky-500/40 flex items-center justify-between text-[11px] text-sky-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Listening to voice query...</span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="w-0.5 h-3 bg-sky-400 rounded-full soundwave-bar" />
            <span className="w-0.5 h-4 bg-sky-400 rounded-full soundwave-bar" style={{ animationDelay: '0.2s' }} />
            <span className="w-0.5 h-2 bg-sky-400 rounded-full soundwave-bar" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      )}

      {/* Message Input Bottom Form */}
      <div className="p-3 border-t border-sky-950/80 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 bg-[#091124] border border-sky-700/40 focus-within:border-sky-400 rounded-xl px-2.5 py-1.5 transition-colors shadow-inner">
          {/* Attachment Button */}
          <button
            type="button"
            onClick={handleSimulateAttachment}
            title="Attach business document or manifest"
            className="p-1.5 text-slate-400 hover:text-sky-300 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Instruct ${selectedAgent.name} or type a command...`}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none min-w-0"
          />

          {/* Microphone Dictation Button */}
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            title={isDictating ? 'Stop listening' : 'Voice command dictation'}
            className={`p-1.5 rounded-lg transition-colors ${
              isDictating
                ? 'bg-red-500/20 text-red-400'
                : 'text-slate-400 hover:text-sky-300'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() && !mockAttachment}
            title="Send Message (Enter)"
            className={`p-1.5 rounded-lg transition-all ${
              inputText.trim() || mockAttachment
                ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-950 glow-blue'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-1">
          <span>Press Enter to send message</span>
          <span className="font-mono text-[9px] text-sky-400/80">Permanent Chat Box</span>
        </div>
      </div>
    </aside>
  );
};
