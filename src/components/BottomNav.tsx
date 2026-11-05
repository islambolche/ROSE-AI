import React from 'react';
import {
  Home,
  MessageSquare,
  ClipboardList,
  Truck,
  TrendingUp,
  Globe,
} from 'lucide-react';

interface BottomNavProps {
  activeNav: string;
  onNavClick: (navId: string, label: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeNav,
  onNavClick,
}) => {
  const primaryItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'delivery', label: 'Delivery', icon: <Truck className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <footer className="h-16 bg-gradient-to-r from-[#030717] via-[#07112c] to-[#030717] border-t border-sky-500/35 px-6 flex items-center justify-center select-none relative z-30 shadow-[0_-4px_20px_rgba(0,10,30,0.8)]">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Main 5 Navigation Items */}
        {primaryItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id, item.label)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 border whitespace-nowrap shadow-md ${
                isActive
                  ? 'bg-gradient-to-r from-blue-700 via-sky-600 to-blue-600 border-sky-300 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)] scale-[1.02]'
                  : 'bg-[#081533]/80 hover:bg-[#0c204d] border-sky-900/60 text-slate-300 hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-white drop-shadow' : 'text-sky-300'}>
                {item.icon}
              </span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          );
        })}

        {/* Vertical Divider Line | */}
        <div className="w-[1.5px] h-7 bg-sky-500/40 mx-2 shrink-0" />

        {/* External / Service Links: Facebook, YouTube, Browser */}
        {/* Facebook */}
        <button
          onClick={() => onNavClick('facebook', 'Facebook')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 border whitespace-nowrap shadow-md ${
            activeNav === 'facebook'
              ? 'bg-blue-600 border-sky-300 text-white shadow-[0_0_18px_rgba(56,189,248,0.5)]'
              : 'bg-[#081533]/80 hover:bg-[#0c204d] border-sky-900/60 text-slate-300 hover:text-white'
          }`}
        >
          {/* Facebook 'f' Logo Badge */}
          <div className="w-4 h-4 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-extrabold text-[11px] leading-none">
            f
          </div>
          <span className="tracking-wide">Facebook</span>
        </button>

        {/* YouTube */}
        <button
          onClick={() => onNavClick('youtube', 'YouTube')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 border whitespace-nowrap shadow-md ${
            activeNav === 'youtube'
              ? 'bg-red-700 border-red-400 text-white shadow-[0_0_18px_rgba(239,68,68,0.5)]'
              : 'bg-[#081533]/80 hover:bg-[#0c204d] border-sky-900/60 text-slate-300 hover:text-white'
          }`}
        >
          {/* YouTube Play Icon Badge */}
          <div className="w-4 h-3.5 rounded-sm bg-[#ff0000] flex items-center justify-center text-white">
            <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-white ml-0.5" />
          </div>
          <span className="tracking-wide">YouTube</span>
        </button>

        {/* Browser */}
        <button
          onClick={() => onNavClick('browser', 'Browser')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 border whitespace-nowrap shadow-md ${
            activeNav === 'browser'
              ? 'bg-gradient-to-r from-sky-600 to-teal-600 border-sky-300 text-white shadow-[0_0_18px_rgba(56,189,248,0.5)]'
              : 'bg-[#081533]/80 hover:bg-[#0c204d] border-sky-900/60 text-slate-300 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-cyan-300" />
          <span className="tracking-wide">Browser</span>
        </button>
      </div>
    </footer>
  );
};
