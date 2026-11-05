import React from 'react';
import { Agent } from '../types';
import {
  Crown,
  Headphones,
  Laptop,
  MessageSquare,
  TrendingUp,
  Truck,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';

interface AgentCharacterProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: (agent: Agent) => void;
  isCenter?: boolean;
}

export const AgentCharacter: React.FC<AgentCharacterProps> = ({
  agent,
  isSelected,
  onSelect,
  isCenter = false,
}) => {
  const getTheme = () => {
    switch (agent.themeColor) {
      case 'rose':
        return {
          glow: 'rgba(244, 63, 94, 0.6)',
          border: 'border-rose-500',
          deskGradient: 'from-rose-950/50 via-[#10142b] to-[#070b18]',
          accent: '#f43f5e',
          accentText: 'text-rose-400',
          accentBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/60',
          plateBg: 'from-[#2b0c16] via-[#1a0a14] to-[#0f0710]',
          plateBorder: 'border-rose-500/80',
          breathingClass: 'animate-breathing-rose',
          icon: <Crown className="w-4 h-4 text-amber-300 fill-amber-300/40" />,
        };
      case 'green':
        return {
          glow: 'rgba(34, 197, 94, 0.55)',
          border: 'border-emerald-500',
          deskGradient: 'from-emerald-950/50 via-[#0b1b22] to-[#070b18]',
          accent: '#22c55e',
          accentText: 'text-emerald-400',
          accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60',
          plateBg: 'from-[#092b15] via-[#081f12] to-[#05140b]',
          plateBorder: 'border-emerald-500/80',
          breathingClass: 'animate-breathing-mira',
          icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
        };
      case 'blue':
        return {
          glow: 'rgba(56, 189, 248, 0.55)',
          border: 'border-sky-500',
          deskGradient: 'from-sky-950/50 via-[#0c182d] to-[#070b18]',
          accent: '#38bdf8',
          accentText: 'text-sky-400',
          accentBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/60',
          plateBg: 'from-[#0b263d] via-[#091c2e] to-[#06121f]',
          plateBorder: 'border-sky-500/80',
          breathingClass: 'animate-breathing-arin',
          icon: <TrendingUp className="w-4 h-4 text-sky-400" />,
        };
      case 'orange':
        return {
          glow: 'rgba(249, 115, 22, 0.55)',
          border: 'border-amber-500',
          deskGradient: 'from-amber-950/50 via-[#221510] to-[#070b18]',
          accent: '#f97316',
          accentText: 'text-amber-400',
          accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/60',
          plateBg: 'from-[#33180c] via-[#24130a] to-[#140a05]',
          plateBorder: 'border-amber-500/80',
          breathingClass: 'animate-breathing-zayan',
          icon: <Truck className="w-4 h-4 text-amber-400" />,
        };
      case 'purple':
        return {
          glow: 'rgba(168, 85, 247, 0.55)',
          border: 'border-purple-500',
          deskGradient: 'from-purple-950/50 via-[#1b0f2d] to-[#070b18]',
          accent: '#a855f7',
          accentText: 'text-purple-400',
          accentBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/60',
          plateBg: 'from-[#2b0f3e] via-[#1f0b2d] to-[#12061b]',
          plateBorder: 'border-purple-500/80',
          breathingClass: 'animate-breathing-naira',
          icon: <BarChart3 className="w-4 h-4 text-purple-400" />,
        };
      default:
        return {
          glow: 'rgba(56, 189, 248, 0.5)',
          border: 'border-sky-500',
          deskGradient: 'from-slate-900 to-slate-950',
          accent: '#38bdf8',
          accentText: 'text-sky-400',
          accentBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
          plateBg: 'from-slate-900 to-slate-950',
          plateBorder: 'border-sky-500/60',
          breathingClass: 'animate-breathing-rose',
          icon: <ShieldCheck className="w-4 h-4 text-sky-400" />,
        };
    }
  };

  const theme = getTheme();

  // High-Quality Cartoon SVG illustrations with visible face, head, hair, body, arms, hands, headset, and laptop
  const renderCartoonArtwork = () => {
    switch (agent.id) {
      case 'rose':
        return (
          <svg viewBox="0 0 340 280" className="w-full h-full drop-shadow-xl">
            <defs>
              <radialGradient id="roseSkin" cx="45%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#fff1ee" />
                <stop offset="65%" stopColor="#fad4c0" />
                <stop offset="100%" stopColor="#e8a892" />
              </radialGradient>
              <linearGradient id="roseHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4a1525" />
                <stop offset="60%" stopColor="#290b14" />
                <stop offset="100%" stopColor="#140409" />
              </linearGradient>
              <linearGradient id="roseJacket" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
              <linearGradient id="roseScreen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
            </defs>

            {/* Back Ambient Neon Halo */}
            <circle cx="170" cy="100" r="85" fill="none" stroke="rgba(244, 63, 94, 0.28)" strokeWidth="2.5" strokeDasharray="8 6" />
            <circle cx="170" cy="100" r="105" fill="none" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1.5" strokeDasharray="4 8" />

            {/* Hair Back */}
            <ellipse cx="170" cy="100" rx="52" ry="58" fill="url(#roseHair)" />

            {/* Neck */}
            <path d="M 160 125 L 160 148 Q 170 154 180 148 L 180 125 Z" fill="#e8a892" />

            {/* Business Body & Torso */}
            <path d="M 115 195 Q 132 150 170 150 Q 208 150 225 195 L 235 240 L 105 240 Z" fill="url(#roseJacket)" />
            {/* White Silk Blouse & Gold Brooch */}
            <polygon points="170,154 158,188 182,188" fill="#ffffff" />
            <polygon points="170,160 162,188 178,188" fill="#f1f5f9" />
            <circle cx="170" cy="180" r="4.5" fill="#fbbf24" stroke="#f43f5e" strokeWidth="1.5" />

            {/* Head / Face */}
            <ellipse cx="170" cy="98" rx="40" ry="46" fill="url(#roseSkin)" />

            {/* Cartoon Eyes */}
            <ellipse cx="155" cy="95" rx="7.5" ry="9" fill="#1e293b" />
            <ellipse cx="185" cy="95" rx="7.5" ry="9" fill="#1e293b" />
            <circle cx="152.5" cy="91.5" r="3" fill="#ffffff" />
            <circle cx="156.5" cy="97" r="1.5" fill="#ffffff" />
            <circle cx="182.5" cy="91.5" r="3" fill="#ffffff" />
            <circle cx="186.5" cy="97" r="1.5" fill="#ffffff" />

            {/* Eyelashes & Brows */}
            <path d="M 148 88 Q 155 84 162 88" fill="none" stroke="#290b14" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 178 88 Q 185 84 192 88" fill="none" stroke="#290b14" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 146 83 Q 155 79 164 83" fill="none" stroke="#4a1525" strokeWidth="3" strokeLinecap="round" />
            <path d="M 176 83 Q 185 79 194 83" fill="none" stroke="#4a1525" strokeWidth="3" strokeLinecap="round" />

            {/* Nose, Confident Smile & Blush */}
            <ellipse cx="170" cy="106" rx="2.5" ry="2" fill="#d97762" />
            <path d="M 163 115 Q 170 123 177 115" fill="none" stroke="#be123c" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="147" cy="107" rx="6" ry="3.5" fill="#f43f5e" opacity="0.4" />
            <ellipse cx="193" cy="107" rx="6" ry="3.5" fill="#f43f5e" opacity="0.4" />

            {/* Front Bob Hair */}
            <path d="M 128 92 Q 146 50 170 50 Q 200 50 212 92 Q 200 70 170 70 Q 140 70 128 92 Z" fill="url(#roseHair)" />
            <path d="M 128 92 Q 130 126 142 138 Q 134 116 133 94 Z" fill="#290b14" />
            <path d="M 212 92 Q 210 126 198 138 Q 206 116 207 94 Z" fill="#290b14" />

            {/* Tech Headset & Microphone */}
            <path d="M 132 96 Q 170 46 208 96" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
            <rect x="126" y="87" width="10" height="22" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <rect x="204" y="87" width="10" height="22" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <path d="M 134 104 Q 140 122 155 120" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="156" cy="120" r="3.5" fill="#f43f5e" />

            {/* TWO ARMS & TWO HANDS */}
            <path d="M 116 196 Q 105 230 136 242" fill="none" stroke="#1e293b" strokeWidth="18" strokeLinecap="round" />
            <path d="M 224 196 Q 235 230 204 242" fill="none" stroke="#1e293b" strokeWidth="18" strokeLinecap="round" />
            <ellipse cx="140" cy="242" rx="8" ry="6" fill="#fad4c0" stroke="#d97762" strokeWidth="1" />
            <ellipse cx="200" cy="242" rx="8" ry="6" fill="#fad4c0" stroke="#d97762" strokeWidth="1" />

            {/* Laptop Base & Glowing Screen */}
            <polygon points="115,248 225,248 238,266 102,266" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="135" y="252" width="70" height="8" rx="2" fill="#1e293b" />
            <polygon points="126,204 214,204 225,248 115,248" fill="url(#roseScreen)" stroke="#f43f5e" strokeWidth="2" />
            <line x1="136" y1="214" x2="204" y2="214" stroke="#f43f5e" strokeWidth="2.5" />
            <line x1="136" y1="222" x2="180" y2="222" stroke="#38bdf8" strokeWidth="2" />
            <line x1="136" y1="230" x2="195" y2="230" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="170" cy="236" r="4.5" fill="#f43f5e" />

            {/* Neon Glass Desk Edge */}
            <path d="M 20 262 L 320 262 L 305 280 L 35 280 Z" fill="#0b1329" stroke="rgba(244, 63, 94, 0.9)" strokeWidth="2" />
            <line x1="25" y1="263" x2="315" y2="263" stroke="#f43f5e" strokeWidth="3.5" />
          </svg>
        );

      case 'mira':
        return (
          <svg viewBox="0 0 300 250" className="w-full h-full drop-shadow-xl">
            <defs>
              <radialGradient id="miraSkin" cx="45%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#fff5f5" />
                <stop offset="65%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#fba474" />
              </radialGradient>
              <linearGradient id="miraHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <linearGradient id="miraSuit" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#15803d" />
                <stop offset="100%" stopColor="#052e16" />
              </linearGradient>
            </defs>

            {/* Ponytail Hair Behind */}
            <ellipse cx="185" cy="90" rx="18" ry="32" fill="url(#miraHair)" transform="rotate(28 185 90)" />

            {/* Neck */}
            <rect x="142" y="112" width="16" height="20" fill="#fed7aa" />

            {/* Green Tech Blazer */}
            <path d="M 105 175 Q 120 126 150 126 Q 180 126 195 175 L 206 215 L 94 215 Z" fill="url(#miraSuit)" />
            <polygon points="150,130 141,162 159,162" fill="#ffffff" />
            <path d="M 132 128 L 128 174 L 144 174 Z" fill="#22c55e" opacity="0.8" />
            <path d="M 168 128 L 172 174 L 156 174 Z" fill="#22c55e" opacity="0.8" />

            {/* Head */}
            <ellipse cx="150" cy="86" rx="34" ry="40" fill="url(#miraSkin)" />

            {/* Eyes */}
            <ellipse cx="138" cy="84" rx="6.5" ry="8" fill="#14532d" />
            <ellipse cx="162" cy="84" rx="6.5" ry="8" fill="#14532d" />
            <circle cx="136" cy="81" r="2.5" fill="#ffffff" />
            <circle cx="160" cy="81" r="2.5" fill="#ffffff" />

            {/* Brows & Smile */}
            <path d="M 130 73 Q 138 70 145 73" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 155 73 Q 162 70 170 73" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 141 101 Q 150 109 159 101" fill="none" stroke="#b91c1c" strokeWidth="2.6" strokeLinecap="round" />
            <ellipse cx="133" cy="94" rx="5" ry="3" fill="#22c55e" opacity="0.3" />
            <ellipse cx="167" cy="94" rx="5" ry="3" fill="#22c55e" opacity="0.3" />

            {/* Front Ponytail */}
            <path d="M 118 80 Q 134 46 150 46 Q 172 46 182 80 Q 170 62 150 62 Q 128 62 118 80 Z" fill="url(#miraHair)" />

            {/* Green Headset */}
            <path d="M 120 84 Q 150 44 180 84" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="114" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#22c55e" strokeWidth="1.8" />
            <rect x="177" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#22c55e" strokeWidth="1.8" />
            <path d="M 121 89 Q 125 106 138 104" fill="none" stroke="#94a3b8" strokeWidth="2.2" />
            <circle cx="139" cy="104" r="3" fill="#22c55e" />

            {/* TWO ARMS & TWO HANDS */}
            <path d="M 106 176 Q 98 206 126 216" fill="none" stroke="#15803d" strokeWidth="15" strokeLinecap="round" />
            <path d="M 194 176 Q 202 206 174 216" fill="none" stroke="#15803d" strokeWidth="15" strokeLinecap="round" />
            <ellipse cx="128" cy="216" rx="7" ry="5" fill="#fed7aa" />
            <ellipse cx="172" cy="216" rx="7" ry="5" fill="#fed7aa" />

            {/* Laptop Base & Screen */}
            <polygon points="105,222 195,222 206,238 94,238" fill="#1e293b" stroke="#22c55e" strokeWidth="1.2" />
            <polygon points="114,182 186,182 195,222 105,222" fill="#0f172a" stroke="#22c55e" strokeWidth="1.5" />
            <rect x="122" y="190" width="38" height="5" rx="2" fill="#22c55e" opacity="0.9" />
            <rect x="136" y="198" width="40" height="5" rx="2" fill="#4ade80" opacity="0.7" />
            <rect x="122" y="206" width="28" height="5" rx="2" fill="#86efac" opacity="0.6" />

            {/* Neon Desk Edge */}
            <line x1="25" y1="236" x2="275" y2="236" stroke="#22c55e" strokeWidth="3.5" />
          </svg>
        );

      case 'arin':
        return (
          <svg viewBox="0 0 300 250" className="w-full h-full drop-shadow-xl">
            <defs>
              <radialGradient id="arinSkin" cx="45%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#fff8ed" />
                <stop offset="65%" stopColor="#fcdbbd" />
                <stop offset="100%" stopColor="#e5a982" />
              </radialGradient>
              <linearGradient id="arinHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="arinSuit" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>

            {/* Neck & Tech Blazer */}
            <rect x="142" y="112" width="16" height="20" fill="#e5a982" />
            <path d="M 105 175 Q 120 126 150 126 Q 180 126 195 175 L 206 215 L 94 215 Z" fill="url(#arinSuit)" />
            <polygon points="150,130 140,166 160,166" fill="#ffffff" />
            <polygon points="150,136 145,164 155,164" fill="#38bdf8" />
            <line x1="150" y1="140" x2="150" y2="174" stroke="#0f172a" strokeWidth="2.5" />

            {/* Head */}
            <ellipse cx="150" cy="86" rx="33" ry="38" fill="url(#arinSkin)" />

            {/* Blue Eyes & Brows */}
            <ellipse cx="138" cy="84" rx="6" ry="7.5" fill="#0369a1" />
            <ellipse cx="162" cy="84" rx="6" ry="7.5" fill="#0369a1" />
            <circle cx="136" cy="81" r="2.2" fill="#ffffff" />
            <circle cx="160" cy="81" r="2.2" fill="#ffffff" />
            <path d="M 130 73 L 145 74" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            <path d="M 155 74 L 170 73" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            <path d="M 141 101 Q 150 110 159 101" fill="none" stroke="#be123c" strokeWidth="2.6" strokeLinecap="round" />

            {/* Hair */}
            <path d="M 118 78 Q 128 44 155 44 Q 180 44 182 72 Q 166 60 146 60 Q 128 60 118 78 Z" fill="url(#arinHair)" />
            <path d="M 118 78 L 122 95 L 116 97 Z" fill="url(#arinHair)" />

            {/* Blue Headset */}
            <path d="M 120 84 Q 150 42 180 84" fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="114" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
            <rect x="177" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
            <path d="M 121 89 Q 124 106 138 104" fill="none" stroke="#94a3b8" strokeWidth="2.2" />
            <circle cx="139" cy="104" r="3" fill="#38bdf8" />

            {/* TWO ARMS & TWO HANDS */}
            <path d="M 106 176 Q 98 206 126 216" fill="none" stroke="#0284c7" strokeWidth="15" strokeLinecap="round" />
            <path d="M 194 176 Q 202 206 174 216" fill="none" stroke="#0284c7" strokeWidth="15" strokeLinecap="round" />
            <ellipse cx="128" cy="216" rx="7" ry="5" fill="#fcdbbd" />
            <ellipse cx="172" cy="216" rx="7" ry="5" fill="#fcdbbd" />

            {/* Laptop Base & Sales Screen */}
            <polygon points="105,222 195,222 206,238 94,238" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
            <polygon points="114,182 186,182 195,222 105,222" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="122" y="206" width="6" height="10" fill="#38bdf8" />
            <rect x="132" y="200" width="6" height="16" fill="#38bdf8" />
            <rect x="142" y="195" width="6" height="21" fill="#60a5fa" />
            <rect x="152" y="190" width="6" height="26" fill="#93c5fd" />
            <rect x="162" y="186" width="6" height="30" fill="#38bdf8" />

            {/* Neon Desk Edge */}
            <line x1="25" y1="236" x2="275" y2="236" stroke="#38bdf8" strokeWidth="3.5" />
          </svg>
        );

      case 'zayan':
        return (
          <svg viewBox="0 0 300 250" className="w-full h-full drop-shadow-xl">
            <defs>
              <radialGradient id="zayanSkin" cx="45%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#fff8ed" />
                <stop offset="65%" stopColor="#f5cfaf" />
                <stop offset="100%" stopColor="#dba17a" />
              </radialGradient>
              <linearGradient id="zayanHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#292524" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>
              <linearGradient id="zayanSuit" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>
            </defs>

            {/* Neck & Logistics Jacket */}
            <rect x="142" y="112" width="16" height="20" fill="#dba17a" />
            <path d="M 105 175 Q 120 126 150 126 Q 180 126 195 175 L 206 215 L 94 215 Z" fill="url(#zayanSuit)" />
            <line x1="118" y1="150" x2="182" y2="150" stroke="#fef08a" strokeWidth="3.5" opacity="0.9" />
            <line x1="116" y1="168" x2="184" y2="168" stroke="#fef08a" strokeWidth="3" opacity="0.9" />
            <rect x="144" y="134" width="12" height="10" rx="2" fill="#ffffff" />
            <line x1="150" y1="134" x2="150" y2="144" stroke="#ea580c" strokeWidth="1.2" />

            {/* Head */}
            <ellipse cx="150" cy="86" rx="33" ry="38" fill="url(#zayanSkin)" />

            {/* Eyes & Brows */}
            <ellipse cx="138" cy="84" rx="6" ry="7.5" fill="#431407" />
            <ellipse cx="162" cy="84" rx="6" ry="7.5" fill="#431407" />
            <circle cx="136" cy="81" r="2.2" fill="#ffffff" />
            <circle cx="160" cy="81" r="2.2" fill="#ffffff" />
            <path d="M 130 73 Q 138 70 145 73" fill="none" stroke="#1c1917" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 155 73 Q 162 70 170 73" fill="none" stroke="#1c1917" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 140 101 Q 150 111 160 101" fill="none" stroke="#c2410c" strokeWidth="2.8" strokeLinecap="round" />

            {/* Hair */}
            <path d="M 118 78 Q 130 42 150 42 Q 172 42 182 78 Q 174 58 150 58 Q 126 58 118 78 Z" fill="url(#zayanHair)" />
            <polygon points="140,44 148,32 154,44" fill="url(#zayanHair)" />
            <polygon points="155,44 162,34 168,46" fill="url(#zayanHair)" />

            {/* Orange Headset */}
            <path d="M 120 84 Q 150 42 180 84" fill="none" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="114" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#f97316" strokeWidth="1.8" />
            <rect x="177" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#f97316" strokeWidth="1.8" />
            <path d="M 121 89 Q 124 106 138 104" fill="none" stroke="#cbd5e1" strokeWidth="2.2" />
            <circle cx="139" cy="104" r="3" fill="#f97316" />

            {/* TWO ARMS & TWO HANDS */}
            <path d="M 106 176 Q 98 206 126 216" fill="none" stroke="#ea580c" strokeWidth="15" strokeLinecap="round" />
            <path d="M 194 176 Q 202 206 174 216" fill="none" stroke="#ea580c" strokeWidth="15" strokeLinecap="round" />
            <ellipse cx="128" cy="216" rx="7" ry="5" fill="#dba17a" />
            <ellipse cx="172" cy="216" rx="7" ry="5" fill="#dba17a" />

            {/* Laptop Base & GPS Screen */}
            <polygon points="105,222 195,222 206,238 94,238" fill="#1e293b" stroke="#f97316" strokeWidth="1.2" />
            <polygon points="114,182 186,182 195,222 105,222" fill="#0f172a" stroke="#f97316" strokeWidth="1.5" />
            <circle cx="132" cy="202" r="3.5" fill="#f97316" />
            <circle cx="168" cy="195" r="3.5" fill="#22c55e" />
            <path d="M 132 202 Q 150 186 168 195" fill="none" stroke="#fdba74" strokeWidth="2" strokeDasharray="4 2" />

            {/* Neon Desk Edge */}
            <line x1="25" y1="236" x2="275" y2="236" stroke="#f97316" strokeWidth="3.5" />
          </svg>
        );

      case 'naira':
        return (
          <svg viewBox="0 0 300 250" className="w-full h-full drop-shadow-xl">
            <defs>
              <radialGradient id="nairaSkin" cx="45%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#fff8fc" />
                <stop offset="65%" stopColor="#f5d0c5" />
                <stop offset="100%" stopColor="#e2a89b" />
              </radialGradient>
              <linearGradient id="nairaHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2e1065" />
                <stop offset="100%" stopColor="#0f051d" />
              </linearGradient>
              <linearGradient id="nairaSuit" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
            </defs>

            {/* Hair Bun */}
            <circle cx="150" cy="44" r="17" fill="url(#nairaHair)" />
            <circle cx="150" cy="44" r="19" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeDasharray="5 3" />

            {/* Neck & Purple Blazer */}
            <rect x="142" y="112" width="16" height="20" fill="#e2a89b" />
            <path d="M 105 175 Q 120 126 150 126 Q 180 126 195 175 L 206 215 L 94 215 Z" fill="url(#nairaSuit)" />
            <polygon points="150,130 141,162 159,162" fill="#f8fafc" />
            <line x1="150" y1="140" x2="150" y2="174" stroke="#a855f7" strokeWidth="2.5" />

            {/* Head */}
            <ellipse cx="150" cy="86" rx="33" ry="38" fill="url(#nairaSkin)" />

            {/* Glasses & Focused Eyes */}
            <rect x="130" y="76" width="16" height="14" rx="4" fill="rgba(192, 132, 252, 0.15)" stroke="#c084fc" strokeWidth="1.8" />
            <rect x="154" y="76" width="16" height="14" rx="4" fill="rgba(192, 132, 252, 0.15)" stroke="#c084fc" strokeWidth="1.8" />
            <line x1="146" y1="82" x2="154" y2="82" stroke="#c084fc" strokeWidth="1.8" />
            <ellipse cx="138" cy="83" rx="5" ry="6.5" fill="#3b0764" />
            <ellipse cx="162" cy="83" rx="5" ry="6.5" fill="#3b0764" />
            <circle cx="136" cy="81" r="1.8" fill="#ffffff" />
            <circle cx="160" cy="81" r="1.8" fill="#ffffff" />

            {/* Brows & Smile */}
            <path d="M 130 71 L 144 72" stroke="#1e1035" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 156 72 L 170 71" stroke="#1e1035" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 141 101 Q 150 109 159 101" fill="none" stroke="#9333ea" strokeWidth="2.6" strokeLinecap="round" />

            {/* Hair Front */}
            <path d="M 118 78 Q 134 50 150 50 Q 166 50 182 78 Q 168 62 150 62 Q 132 62 118 78 Z" fill="url(#nairaHair)" />

            {/* Purple Headset */}
            <path d="M 120 84 Q 150 42 180 84" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="114" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.8" />
            <rect x="177" y="76" width="9" height="18" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.8" />
            <path d="M 121 89 Q 124 106 138 104" fill="none" stroke="#cbd5e1" strokeWidth="2.2" />
            <circle cx="139" cy="104" r="3" fill="#a855f7" />

            {/* TWO ARMS & TWO HANDS */}
            <path d="M 106 176 Q 98 206 126 216" fill="none" stroke="#7e22ce" strokeWidth="15" strokeLinecap="round" />
            <path d="M 194 176 Q 202 206 174 216" fill="none" stroke="#7e22ce" strokeWidth="15" strokeLinecap="round" />
            <ellipse cx="128" cy="216" rx="7" ry="5" fill="#e2a89b" />
            <ellipse cx="172" cy="216" rx="7" ry="5" fill="#e2a89b" />

            {/* Laptop Base & Analytics Screen */}
            <polygon points="105,222 195,222 206,238 94,238" fill="#1e293b" stroke="#a855f7" strokeWidth="1.2" />
            <polygon points="114,182 186,182 195,222 105,222" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
            <circle cx="138" cy="202" r="9" fill="none" stroke="#c084fc" strokeWidth="3.5" strokeDasharray="36 18" />
            <line x1="154" y1="194" x2="176" y2="194" stroke="#a855f7" strokeWidth="2.5" />
            <line x1="154" y1="202" x2="170" y2="202" stroke="#e9d5ff" strokeWidth="2" />
            <line x1="154" y1="210" x2="178" y2="210" stroke="#c084fc" strokeWidth="2" />

            {/* Neon Desk Edge */}
            <line x1="25" y1="236" x2="275" y2="236" stroke="#a855f7" strokeWidth="3.5" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => onSelect(agent)}
      className={`group relative cursor-pointer transition-all duration-300 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center select-none w-full ${
        isCenter
          ? 'scale-[1.04] z-20 -translate-y-2'
          : 'hover:scale-[1.02] z-10'
      } ${
        isSelected
          ? `ring-2 ring-offset-2 ring-offset-[#060b18] ${theme.border} bg-[#0b1428]/95 shadow-2xl animate-neon-pulse`
          : 'bg-[#091124]/85 hover:bg-[#0d1833] border border-slate-800/80 hover:border-slate-700'
      }`}
      style={{
        boxShadow: isSelected
          ? `0 0 30px 4px ${theme.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`
          : `0 8px 24px -6px rgba(0,0,0,0.6), 0 0 15px -4px ${theme.glow}`,
      }}
    >
      {/* 1. Top Card Bar: Name & Pulsing Status */}
      <div className="w-full flex items-center justify-between gap-1 mb-1.5 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Pulsing Status Dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: theme.accent }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: theme.accent }}
            />
          </span>

          <span className="text-sm font-extrabold tracking-wider text-white uppercase font-display truncate">
            {agent.name}
          </span>
        </div>

        {/* Status Chip */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.accentBadge} whitespace-nowrap shrink-0`}
        >
          {agent.status}
        </span>
      </div>

      {/* 2. 3D Neon Desk Surface with Subtle Character Breathing Animation */}
      <div
        className={`w-full relative flex items-center justify-center rounded-xl overflow-hidden bg-gradient-to-b ${theme.deskGradient} border ${theme.border} border-opacity-70 transition-transform duration-300 shadow-inner ${
          isCenter ? 'h-36 sm:h-40 xl:h-44' : 'h-32 sm:h-36 xl:h-40'
        }`}
      >
        {/* Subtle Cyber Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${theme.accent} 1.2px, transparent 1.2px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Ambient Backlight Glow */}
        <div
          className="absolute w-32 h-32 rounded-full blur-2xl opacity-40 pointer-events-none"
          style={{ backgroundColor: theme.accent }}
        />

        {/* Character Illustration with Breathing Float Animation */}
        <div className={`w-full h-full p-1 relative z-10 flex items-center justify-center ${theme.breathingClass}`}>
          {renderCartoonArtwork()}
        </div>

        {/* Active Audio Indicator */}
        <div className="absolute bottom-1.5 left-1.5 z-20 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-slate-800 text-[9px]">
          <Headphones className="w-2.5 h-2.5 text-slate-400" />
          <div className="flex items-center gap-0.5 h-2">
            <span
              className="w-0.5 rounded-full soundwave-bar"
              style={{ backgroundColor: theme.accent, animationDelay: '0.1s' }}
            />
            <span
              className="w-0.5 rounded-full soundwave-bar"
              style={{ backgroundColor: theme.accent, animationDelay: '0.3s' }}
            />
          </div>
          <Laptop className="w-2 h-2 text-slate-400 ml-0.5" />
        </div>
      </div>

      {/* 3. PROMINENT NEON NAMEPLATE (নামফলক) WITH FULL NAME & ROLE (NO TRUNCATION, FONT >= 14px) */}
      <div
        className={`w-full mt-2.5 px-3 py-2 rounded-xl bg-gradient-to-r ${theme.plateBg} border ${theme.plateBorder} shadow-lg flex items-center gap-2`}
      >
        <div className="shrink-0 p-1.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
          {theme.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-extrabold text-white tracking-wide font-display">
              {agent.name}
            </span>
            {isCenter && (
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40">
                CHIEF
              </span>
            )}
          </div>
          {/* Full Role Name - No Truncation, >= 13-14px font clarity */}
          <p className="text-[13px] font-semibold text-slate-200 leading-snug break-words">
            {agent.role}
          </p>
        </div>
      </div>
    </div>
  );
};
