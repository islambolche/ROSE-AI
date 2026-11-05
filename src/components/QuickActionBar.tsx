import React from 'react';
import { QuickActionType } from '../types';
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Truck,
  BarChart3,
  Share2,
  Tv,
  Globe,
  Sparkles,
} from 'lucide-react';

interface QuickActionBarProps {
  activeAction: QuickActionType;
  onSelectAction: (action: QuickActionType) => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  activeAction,
  onSelectAction,
}) => {
  const actions: { id: QuickActionType; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: 'Live',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: '42 New',
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: <Share2 className="w-4 h-4" />,
      badge: 'Hub',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      icon: <Tv className="w-4 h-4" />,
      badge: 'Channels',
    },
    {
      id: 'browser',
      label: 'Browser',
      icon: <Globe className="w-4 h-4" />,
    },
  ];

  return (
    <footer className="h-14 bg-gradient-to-r from-[#060c1d] via-[#09132c] to-[#060c1d] border-t border-sky-500/20 px-4 flex items-center justify-between select-none relative z-30">
      {/* Quick Action Buttons Group */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 w-full justify-center">
        {actions.map((act) => {
          const isActive = activeAction === act.id;
          return (
            <button
              key={act.id}
              onClick={() => onSelectAction(act.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 border whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 glow-blue shadow-lg scale-105'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={isActive ? 'text-sky-300' : 'text-slate-400'}>
                {act.icon}
              </span>
              <span>{act.label}</span>
              {act.badge && (
                <span
                  className={`text-[9px] font-mono px-1 rounded ${
                    isActive
                      ? 'bg-sky-400/30 text-sky-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {act.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </footer>
  );
};
