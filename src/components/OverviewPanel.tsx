import React from 'react';
import { Agent, BusinessMetric, ActivityItem } from '../types';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle,
  Activity,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface OverviewPanelProps {
  metrics: BusinessMetric[];
  agents: Agent[];
  activities: ActivityItem[];
  selectedAgent: Agent;
  onSelectAgent: (agent: Agent) => void;
  onMetricClick: (label: string) => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  metrics,
  agents,
  activities,
  selectedAgent,
  onSelectAgent,
  onMetricClick,
}) => {
  const getMetricIcon = (label: string) => {
    switch (label) {
      case 'Total Orders':
        return <ShoppingBag className="w-4 h-4 text-sky-400" />;
      case 'Total Sales':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'Pending Orders':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'Delivered Orders':
        return <CheckCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <aside className="w-[300px] xl:w-[330px] 2xl:w-[360px] h-full flex flex-col bg-gradient-to-b from-[#080f24] via-[#060b19] to-[#040813] border-l border-sky-500/20 select-none relative z-20 shrink-0 overflow-y-auto">
      {/* Overview Header */}
      <div className="p-3.5 border-b border-sky-950/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide font-display">
              BUSINESS OVERVIEW
            </h2>
            <p className="text-[10px] text-slate-400">Live Enterprise Performance</p>
          </div>
        </div>

        {/* Clearly Marked Demo Data Tag */}
        <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
          DEMO DATA
        </span>
      </div>

      <div className="p-3 space-y-4">
        {/* KPI Metrics: Total Orders, Total Sales, Pending Orders, Delivered Orders */}
        <div className="grid grid-cols-2 gap-2.5">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              onClick={() => onMetricClick(metric.label)}
              className="group cursor-pointer p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-sky-950 hover:border-sky-700/50 transition-all shadow-md relative overflow-hidden"
            >
              {/* Subtle top indicator */}
              <div className="flex items-center justify-between mb-1">
                <span className="p-1 rounded-md bg-slate-800/80">
                  {getMetricIcon(metric.label)}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${
                    metric.trend === 'up'
                      ? 'text-emerald-400'
                      : metric.trend === 'down'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-2.5 h-2.5" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5" />
                  )}
                  {metric.change}
                </span>
              </div>

              {/* Value and Label */}
              <div className="mt-1">
                <div className="text-base font-extrabold font-mono text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  {metric.value}
                </div>
                <div className="text-[11px] font-medium text-slate-300 truncate">
                  {metric.label}
                </div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">
                  {metric.subtext}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TEAM STATUS SECTION */}
        <div className="pt-2 border-t border-sky-950/60">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-display">
              Team Status
            </span>
            <span className="text-[10px] text-slate-400 font-mono">5 Units Live</span>
          </div>

          <div className="space-y-1.5">
            {agents.map((agent) => {
              const isSelected = selectedAgent.id === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => onSelectAgent(agent)}
                  className={`cursor-pointer p-2 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-500/50 shadow-md'
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] border"
                        style={{
                          backgroundColor: agent.accentBg,
                          borderColor: agent.borderHex,
                          color: agent.accentHex,
                        }}
                      >
                        {agent.name.charAt(0)}
                      </div>
                      <span className="font-bold text-white text-[11px] tracking-wide">
                        {agent.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-mono font-semibold"
                        style={{ color: agent.accentHex }}
                      >
                        {agent.kpi}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: agent.accentHex }}
                      />
                    </div>
                  </div>

                  {/* Task line */}
                  <p className="text-[10px] text-slate-400 truncate pl-6.5">
                    {agent.currentTask}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT ACTIVITIES SECTION */}
        <div className="pt-2 border-t border-sky-950/60">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-display">
              Recent Activities
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Live Feed</span>
          </div>

          <div className="space-y-2">
            {activities.map((act) => {
              const agent = agents.find((a) => a.id === act.agentId);
              return (
                <div
                  key={act.id}
                  className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className="font-bold uppercase tracking-wider"
                      style={{ color: agent ? agent.accentHex : '#38bdf8' }}
                    >
                      {act.agentName}
                    </span>
                    <span className="text-slate-500 font-mono">{act.time}</span>
                  </div>
                  <p className="text-slate-200 font-medium text-[11px] leading-tight">
                    {act.action}
                  </p>
                  <div className="text-[10px] text-sky-400/90 font-mono truncate">
                    {act.target}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Notice Footer */}
        <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/30 text-[10px] text-slate-400 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            All data shown is simulated demo data prepared for Stage 1 enterprise integration.
          </p>
        </div>
      </div>
    </aside>
  );
};
