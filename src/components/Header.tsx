import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Mic,
  Users,
  ChevronDown,
  Settings,
  Minus,
  X,
} from 'lucide-react';
import { APP_NAME, MAIN_AVATAR, IDENTITY_AGENTS, IDENTITY_AGENTS_MAP, IdentityAgent } from '../config/identity';
import { AgentId } from '../types';

interface HeaderProps {
  selectedAgentId: AgentId;
  onSelectAgentId: (agentId: AgentId) => void;
  isCameraOn: boolean;
  onToggleCamera: () => void;
  onOpenSettings: () => void;
  showCameraMic?: boolean;
  voiceLevel?: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedAgentId,
  onSelectAgentId,
  isCameraOn,
  onToggleCamera,
  onOpenSettings,
  showCameraMic = true,
  voiceLevel = 0,
}) => {
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAgent = IDENTITY_AGENTS_MAP[selectedAgentId] || IDENTITY_AGENTS_MAP.rose;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-[68px] bg-gradient-to-r from-[#030717] via-[#07102e] to-[#030717] border-b border-sky-500/40 px-5 flex items-center justify-between select-none relative z-50 shadow-[0_4px_25px_rgba(0,12,35,0.8)]">
      {/* 1. LEFT: Locked 52px Circular Rose Avatar with pink glow + word "ROSE" + Selected Agent Chip */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Fixed ROSE branding */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-[52px] h-[52px] rounded-full overflow-hidden border-2 border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.65)] flex items-center justify-center bg-[#071126] animate-breathing-rose">
              <img
                src={MAIN_AVATAR}
                alt={APP_NAME}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <span className="text-2xl sm:text-[26px] font-black tracking-wider text-white font-display drop-shadow-[0_2px_12px_rgba(244,63,94,0.4)] uppercase">
            {APP_NAME}
          </span>
        </div>

        {/* Small separator */}
        <div className="h-6 w-px bg-sky-500/30" />

        {/* Selected Agent Chip (36px circular avatar with agent glow + name + green online indicator) */}
        <div
          key={activeAgent.id}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#08183a]/90 border border-sky-400/30 shadow-[0_0_14px_rgba(56,189,248,0.2)] animate-in fade-in duration-200 transition-all"
        >
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full overflow-hidden border-2 flex items-center justify-center bg-[#071126] transition-all duration-300"
              style={{
                borderColor: activeAgent.color,
                boxShadow: `0 0 10px ${activeAgent.color}80, inset 0 0 4px ${activeAgent.color}40`,
              }}
            >
              <img
                src={activeAgent.avatar}
                alt={activeAgent.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Online green indicator in corner */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#071126] shadow-[0_0_6px_#34d399] animate-pulse" />
          </div>

          <span className="text-xs font-bold text-white tracking-wide pr-1 font-display">
            {activeAgent.name}
          </span>
        </div>
      </div>

      {/* 2. CENTER: Camera ON, Mic ON, Team Members Dropdown */}
      <div className="flex items-center gap-3">
        {/* Camera & Mic ON/OFF Buttons (toggleable via settings) */}
        {showCameraMic && (
          <>
            <button
              onClick={onToggleCamera}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all duration-200 border shadow-lg ${
                isCameraOn
                  ? 'bg-[#081b38] border-sky-400 text-white shadow-[0_0_18px_rgba(56,189,248,0.4)]'
                  : 'bg-[#060e22] border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-sky-500/25 border border-sky-400/60 flex items-center justify-center text-sky-300">
                <Camera className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <span className="block text-[11px] text-slate-300">Camera</span>
                <span className="flex items-center gap-1 text-xs font-extrabold text-white">
                  {isCameraOn ? 'ON' : 'OFF'}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCameraOn ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'
                    }`}
                  />
                </span>
              </div>
            </button>
          </>
        )}

        {/* Team Members Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition-all duration-200 border shadow-lg ${
              isTeamDropdownOpen
                ? 'bg-gradient-to-r from-blue-700 to-sky-600 border-sky-300 text-white shadow-[0_0_22px_rgba(56,189,248,0.6)]'
                : 'bg-gradient-to-r from-[#0a1c3d] to-[#0c2452] hover:from-[#0e2759] hover:to-[#0f2e6b] border-sky-500/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]'
            }`}
          >
            <Users className="w-4 h-4 text-sky-300" />
            <span className="tracking-wide">Team Members</span>
            <ChevronDown
              className={`w-4 h-4 text-sky-300 transition-transform duration-200 ${
                isTeamDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu (Locked to IDENTITY_AGENTS) */}
          {isTeamDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-80 rounded-2xl bg-[#091533]/98 border border-sky-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-2.5 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-sky-900/60 flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-display">
                  Active Team Members
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  All Online
                </span>
              </div>

              <div className="space-y-1.5">
                {IDENTITY_AGENTS.map((agent: IdentityAgent) => {
                  const isCur = selectedAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        onSelectAgentId(agent.id);
                        setIsTeamDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-3 ${
                        isCur
                          ? 'bg-sky-500/20 border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                          : 'hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* 36px Round Face Avatar from identity.ts with glowing border */}
                        <div
                          className="relative w-9 h-9 rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center bg-[#071126]"
                          style={{
                            borderColor: agent.color,
                            boxShadow: `0 0 10px ${agent.color}60`,
                          }}
                        >
                          <img
                            src={agent.avatar}
                            alt={agent.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white tracking-wide">
                            {agent.name}
                          </p>
                          <p className="text-[10px] text-slate-300 truncate">
                            {agent.role}
                          </p>
                        </div>
                      </div>

                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: agent.color }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT: Gear (Settings), Minimize, Close icons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="w-9 h-9 rounded-xl bg-[#091838] hover:bg-[#0e2456] border border-sky-500/40 flex items-center justify-center text-slate-200 hover:text-white transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)]"
        >
          <Settings className="w-4 h-4 text-sky-300 hover:rotate-90 transition-transform duration-300" />
        </button>

        <button
          title="Minimize"
          className="w-9 h-9 rounded-xl bg-[#091838] hover:bg-[#0e2456] border border-sky-500/40 flex items-center justify-center text-slate-200 hover:text-white transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)]"
        >
          <Minus className="w-4 h-4 text-sky-300" />
        </button>

        <button
          title="Close"
          className="w-9 h-9 rounded-xl bg-[#091838] hover:bg-rose-950/50 border border-sky-500/40 hover:border-rose-500/60 flex items-center justify-center text-slate-200 hover:text-rose-400 transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)]"
        >
          <X className="w-4 h-4 text-sky-300 hover:text-rose-400" />
        </button>
      </div>
    </header>
  );
};
