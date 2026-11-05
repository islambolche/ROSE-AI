import React from 'react';
import { Agent } from '../types';
import { AgentCharacter } from './AgentCharacter';
import { Cpu, ShieldCheck } from 'lucide-react';

interface OfficeHubProps {
  agents: Agent[];
  selectedAgent: Agent;
  onSelectAgent: (agent: Agent) => void;
  onSendToChat?: (prompt: string, targetAgent: Agent) => void;
}

export const OfficeHub: React.FC<OfficeHubProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
}) => {
  const rose = agents.find((a) => a.id === 'rose')!;
  const mira = agents.find((a) => a.id === 'mira')!;
  const arin = agents.find((a) => a.id === 'arin')!;
  const zayan = agents.find((a) => a.id === 'zayan')!;
  const naira = agents.find((a) => a.id === 'naira')!;

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#060c1d] via-[#050914] to-[#040710] p-3 sm:p-4 lg:p-5 relative select-none justify-between">
      {/* Background Ambient Lighting & Neon Perspective Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 40%, rgba(56, 189, 248, 0.25) 0%, transparent 65%),
                              linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          }}
        />
      </div>

      {/* Office Hub Header Strip */}
      <div className="relative z-10 flex items-center justify-between pb-2.5 mb-2 border-b border-sky-900/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-extrabold tracking-wide text-white font-display">
                CENTRAL VIRTUAL AI OFFICE
              </h2>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                5 AGENTS SYNCHRONIZED
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Balanced command layout · All five AI agents visible · Click any workstation to select
            </p>
          </div>
        </div>

        {/* Selected Focus Tag */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-xl border border-sky-900/60 text-xs shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400 text-[11px]">Command Focus:</span>
          <span className="text-white font-bold text-[11px]" style={{ color: selectedAgent.accentHex }}>
            {selectedAgent.name} ({selectedAgent.role})
          </span>
        </div>
      </div>

      {/* BALANCED COMPACT HORIZONTAL LAYOUT (Rose in Center, Mira & Arin Left, Zayan & Naira Right) */}
      <div className="flex-1 relative z-10 flex items-center justify-center w-full px-1 py-1 overflow-hidden">
        {/* Subtle command dais floor line behind center */}
        <div className="absolute inset-x-8 bottom-6 h-12 bg-gradient-to-t from-sky-500/5 to-transparent pointer-events-none rounded-3xl border-b border-sky-500/15" />

        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3 xl:gap-4 w-full max-w-7xl items-center">
          {/* 1. MIRA (Left 1: Customer Communication - Green) */}
          <div className="flex flex-col items-center">
            <AgentCharacter
              agent={mira}
              isSelected={selectedAgent.id === 'mira'}
              onSelect={onSelectAgent}
            />
          </div>

          {/* 2. ARIN (Left 2: Sales & Orders - Blue) */}
          <div className="flex flex-col items-center">
            <AgentCharacter
              agent={arin}
              isSelected={selectedAgent.id === 'arin'}
              onSelect={onSelectAgent}
            />
          </div>

          {/* 3. ROSE (Center: Chief Business Manager - Prominent Dais) */}
          <div className="flex flex-col items-center relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[9px] font-mono uppercase tracking-widest text-rose-300 font-extrabold bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40 shadow-md">
                ★ Chief Manager ★
              </span>
            </div>
            <AgentCharacter
              agent={rose}
              isSelected={selectedAgent.id === 'rose'}
              onSelect={onSelectAgent}
              isCenter={true}
            />
          </div>

          {/* 4. ZAYAN (Right 1: Parcel & Delivery - Orange) */}
          <div className="flex flex-col items-center">
            <AgentCharacter
              agent={zayan}
              isSelected={selectedAgent.id === 'zayan'}
              onSelect={onSelectAgent}
            />
          </div>

          {/* 5. NAIRA (Right 2: Business Audit & Analytics - Purple) */}
          <div className="flex flex-col items-center">
            <AgentCharacter
              agent={naira}
              isSelected={selectedAgent.id === 'naira'}
              onSelect={onSelectAgent}
            />
          </div>
        </div>
      </div>

      {/* Clean Unobstructed Base Strip (No Floating Overlays) */}
      <div className="relative z-10 pt-2 border-t border-sky-950/40 flex items-center justify-between text-[10px] text-slate-500 shrink-0 px-2">
        <span className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Virtual AI Office 16:9 Panoramic View
        </span>
        <span className="text-slate-400">
          Selected: <strong className="text-white">{selectedAgent.name}</strong> — {selectedAgent.currentTask}
        </span>
      </div>
    </main>
  );
};
