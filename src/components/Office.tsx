import React, { useState, useRef } from 'react';
import { AgentId, OfficeAgentPhase } from '../types';
import { IDENTITY_AGENTS_MAP, IdentityAgent } from '../config/identity';

interface OfficeProps {
  selectedAgentId: AgentId;
  onSelectAgentId: (agentId: AgentId) => void;
  isTyping?: boolean;
  isSpeaking?: boolean;
  officePhases?: Partial<Record<AgentId, OfficeAgentPhase>>;
}

export const Office: React.FC<OfficeProps> = ({
  selectedAgentId,
  onSelectAgentId,
  isTyping = false,
  isSpeaking = false,
  officePhases = {},
}) => {
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);
  const speakTimeoutRef = useRef<number | null>(null);

  const handleSelect = (agent: IdentityAgent) => {
    onSelectAgentId(agent.id);
    setSpeakingAgentId(agent.id);
    if (speakTimeoutRef.current) {
      window.clearTimeout(speakTimeoutRef.current);
    }
    speakTimeoutRef.current = window.setTimeout(() => {
      setSpeakingAgentId(null);
    }, 2000);
  };

  const hotspots = [
    {
      agent: IDENTITY_AGENTS_MAP.mira,
      zIndex: 20,
      color: IDENTITY_AGENTS_MAP.mira.color,
      rounded: 'rounded-[22px]',
      center: { x: 10.25, y: 63 },
      style: { left: '1%', top: '38%', width: '18.5%', height: '50%' },
    },
    {
      agent: IDENTITY_AGENTS_MAP.arin,
      zIndex: 10,
      color: IDENTITY_AGENTS_MAP.arin.color,
      rounded: 'rounded-[16px]',
      center: { x: 28.75, y: 46 },
      style: { left: '22%', top: '27%', width: '13.5%', height: '38%' },
    },
    {
      agent: IDENTITY_AGENTS_MAP.rose,
      zIndex: 25,
      color: IDENTITY_AGENTS_MAP.rose.color,
      rounded: 'rounded-[26px]',
      center: { x: 49.75, y: 59 },
      style: { left: '36.5%', top: '32%', width: '26.5%', height: '54%' },
    },
    {
      agent: IDENTITY_AGENTS_MAP.zayan,
      zIndex: 10,
      color: IDENTITY_AGENTS_MAP.zayan.color,
      rounded: 'rounded-[16px]',
      center: { x: 70.75, y: 47 },
      style: { left: '64%', top: '28%', width: '13.5%', height: '38%' },
    },
    {
      agent: IDENTITY_AGENTS_MAP.naira,
      zIndex: 20,
      color: IDENTITY_AGENTS_MAP.naira.color,
      rounded: 'rounded-[22px]',
      center: { x: 89, y: 63 },
      style: { left: '79.5%', top: '38%', width: '19%', height: '50%' },
    },
  ];

  const roseCenter = { x: 49.75, y: 59 };
  const roseColor = IDENTITY_AGENTS_MAP.rose.color;

  const activeSpecialistLines = hotspots.filter((h) => {
    if (h.agent.id === 'rose') return false;
    const phase = officePhases[h.agent.id];
    return (
      phase === 'delegating' ||
      phase === 'working' ||
      phase === 'reporting' ||
      phase === 'handoff_to'
    );
  });

  const isAnyHandoffSpeaking = Object.values(officePhases).some(
    (p) => p === 'handoff_speaking'
  );

  return (
    <main
      className="flex-1 h-full overflow-hidden relative select-none bg-[#030612] border-l border-sky-500/25"
      style={{ containerType: 'size' }}
    >
      {/* Wrapper filling full panel without letterboxing gaps, centered with translate(-50%, -47%) */}
      <div
        className="absolute left-1/2 top-1/2 select-none"
        style={{
          aspectRatio: '1222 / 735',
          width: 'max(100cqw, calc(100cqh * 1222 / 735))',
          transform: 'translate(-50%, -47%)',
        }}
      >
        {/* Office Background Image: width 100%, height 100% */}
        <img
          src="/office.png"
          alt="Rose AI Office"
          className="w-full h-full object-fill block animate-slow-zoom pointer-events-none select-none"
        />

        {/* Shimmer sweep over neon signage & desks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-[35%] h-full bg-gradient-to-r from-transparent via-sky-300/15 to-transparent animate-neon-shimmer" />
        </div>

        {/* SVG Team Delegation & Reporting Lines over Office (inside click-area wrapper, in %) */}
        {activeSpecialistLines.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible"
          >
            <defs>
              <filter id="team-line-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {activeSpecialistLines.map((spec) => {
              const phase = officePhases[spec.agent.id];
              const isReporting = phase === 'reporting';
              const strokeColor = isReporting ? spec.color : roseColor;
              const startX = isReporting ? spec.center.x : roseCenter.x;
              const startY = isReporting ? spec.center.y : roseCenter.y;
              const endX = isReporting ? roseCenter.x : spec.center.x;
              const endY = isReporting ? roseCenter.y : spec.center.y;
              const motionPath = `M ${startX} ${startY} L ${endX} ${endY}`;

              return (
                <g key={spec.agent.id} filter="url(#team-line-glow)">
                  {/* Soft glowing dotted line between Rose and specialist center */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={strokeColor}
                    strokeWidth="0.45"
                    strokeDasharray="1.2 1.2"
                    strokeOpacity="0.85"
                  />

                  {/* Traveling light dot */}
                  <circle r="0.95" fill="#ffffff" stroke={strokeColor} strokeWidth="0.4">
                    <animateMotion
                      dur={isReporting ? '0.65s' : '0.55s'}
                      repeatCount="indefinite"
                      path={motionPath}
                    />
                  </circle>

                  {/* Target / Return flash ring */}
                  {isReporting && (
                    <circle
                      cx={roseCenter.x}
                      cy={roseCenter.y}
                      r="2.2"
                      fill="none"
                      stroke={spec.color}
                      strokeWidth="0.4"
                      opacity="0.85"
                    >
                      <animate
                        attributeName="r"
                        values="1.2;3.2;1.2"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.95;0.2;0.95"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* 5 Clickable Areas over the characters */}
        <div className="absolute inset-0 pointer-events-none">
          {hotspots.map(({ agent, style, zIndex, color, rounded }) => {
            const isSelected = selectedAgentId === agent.id;
            const teamPhase = officePhases[agent.id] || 'idle';
            const isHandoffSpeaking = teamPhase === 'handoff_speaking';
            const isTeamWorking =
              teamPhase === 'delegating' ||
              teamPhase === 'working' ||
              teamPhase === 'reporting' ||
              teamPhase === 'handoff_to' ||
              isHandoffSpeaking;

            // During HANDOFF speaking, only that specialist's glow pulses (Rose stays calm)
            const isAgentSpeaking =
              (isSelected && isSpeaking && !(agent.id === 'rose' && isAnyHandoffSpeaking)) ||
              speakingAgentId === agent.id ||
              isHandoffSpeaking;
            const isAgentTyping =
              isSelected &&
              isTyping &&
              !(agent.id === 'rose' && isAnyHandoffSpeaking);

            const isAgentActive = isAgentSpeaking || isAgentTyping || isTeamWorking;

            return (
              <div
                key={agent.id}
                onClick={() => handleSelect(agent)}
                style={{
                  ...style,
                  zIndex: isAgentActive ? 30 : zIndex,
                  boxShadow: isAgentSpeaking
                    ? `0 0 18px ${color}, 0 0 35px ${color}90, inset 0 0 16px ${color}60`
                    : isAgentTyping || isTeamWorking
                    ? `0 0 16px ${color}, 0 0 32px ${color}90, inset 0 0 15px ${color}55`
                    : isSelected
                    ? `0 0 10px ${color}, 0 0 18px ${color}70, inset 0 0 10px ${color}30`
                    : undefined,
                  borderColor: isAgentActive ? color : isSelected ? color : 'transparent',
                }}
                className={`absolute cursor-pointer pointer-events-auto transition-all duration-200 border-2 ${rounded} group ${
                  isAgentSpeaking
                    ? 'border-opacity-100 bg-sky-400/[0.12] animate-pulse'
                    : isAgentTyping || isTeamWorking
                    ? 'border-opacity-100 bg-sky-400/[0.09] animate-pulse'
                    : isSelected
                    ? 'border-opacity-100 bg-sky-400/[0.03]'
                    : 'hover:border-sky-400/40 hover:bg-sky-400/5'
                }`}
                title={`${agent.name} - ${agent.role}`}
              >
                {/* Typing / Speaking / Team Working wave indicator */}
                {(isAgentSpeaking || isAgentTyping || (isTeamWorking && agent.id !== 'rose')) && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#071126]/95 border shadow-lg backdrop-blur-md pointer-events-none z-30 animate-in fade-in zoom-in duration-150"
                    style={{
                      borderColor: color,
                      boxShadow: `0 0 14px ${color}90`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex items-center gap-0.5 h-2.5">
                      <span className="w-0.5 bg-white rounded-full soundwave-1" />
                      <span className="w-0.5 bg-white rounded-full soundwave-2" />
                      <span className="w-0.5 bg-white rounded-full soundwave-3" />
                    </div>
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider pl-0.5 whitespace-nowrap">
                      {isHandoffSpeaking
                        ? 'উত্তর দিচ্ছে...'
                        : isAgentSpeaking
                        ? 'বলছে...'
                        : teamPhase === 'reporting'
                        ? 'রিপোর্ট...'
                        : isTeamWorking
                        ? 'খুঁজছে...'
                        : 'Thinking'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
