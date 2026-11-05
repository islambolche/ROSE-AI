import React, { useRef, useEffect, useState } from 'react';
import { QuickActionType, Agent, BusinessMetric, ActivityItem } from '../types';
import { DeviceStatus } from '../hooks/useMediaDevices';
import {
  X,
  Camera,
  Mic,
  Sliders,
  Shield,
  Monitor,
  ExternalLink,
  ShoppingBag,
  Truck,
  BarChart3,
  Share2,
  Tv,
  Globe,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ModalsProps {
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  activeActionView: QuickActionType | null;
  onCloseActionView: () => void;
  cameraStatus: DeviceStatus;
  videoStream: MediaStream | null;
  cameraError: string | null;
  onToggleCamera: () => void;
  micStatus: DeviceStatus;
  audioLevel: number;
  micError: string | null;
  onToggleMic: () => void;
  agents: Agent[];
  metrics: BusinessMetric[];
  activities: ActivityItem[];
}

export const Modals: React.FC<ModalsProps> = ({
  isSettingsOpen,
  onCloseSettings,
  activeActionView,
  onCloseActionView,
  cameraStatus,
  videoStream,
  cameraError,
  onToggleCamera,
  micStatus,
  audioLevel,
  micError,
  onToggleMic,
  agents,
  metrics,
  activities,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [settingsTab, setSettingsTab] = useState<'overview' | 'activities' | 'devices' | 'system'>('overview');

  // Attach real MediaStream to video element when connected
  useEffect(() => {
    if (videoRef.current) {
      if (videoStream) {
        videoRef.current.srcObject = videoStream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [videoStream, cameraStatus]);

  const getMetricIcon = (label: string) => {
    switch (label) {
      case 'Total Orders':
        return <ShoppingBag className="w-4 h-4 text-sky-400" />;
      case 'Total Sales':
        return <BarChart3 className="w-4 h-4 text-emerald-400" />;
      case 'Pending Orders':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'Delivered Orders':
        return <CheckCircle2 className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <>
      {/* 1. Real Camera Feed HUD Window (when camera is toggled or requesting) */}
      {(cameraStatus === 'connected' || cameraStatus === 'denied' || cameraStatus === 'unavailable') && (
        <div className="fixed bottom-16 right-6 z-50 w-76 rounded-2xl bg-[#091226]/95 border border-sky-500/40 shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-2.5 bg-slate-900/90 border-b border-sky-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraStatus === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold text-white font-display">
                {cameraStatus === 'connected'
                  ? 'Real Webcam Stream Active'
                  : 'Camera Access Notification'}
              </span>
            </div>
            <button
              onClick={onToggleCamera}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 relative flex flex-col items-center justify-center bg-black min-h-[160px]">
            {cameraStatus === 'connected' ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-emerald-500/40">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* HUD Overlay graphics */}
                <div className="absolute inset-2 border border-emerald-500/30 rounded-lg pointer-events-none flex flex-col justify-between p-1.5">
                  <div className="flex justify-between text-[9px] font-mono text-emerald-400">
                    <span>LIVE FEED</span>
                    <span>1080P HD</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-emerald-400">
                    <span>MIC SYNC: {micStatus === 'connected' ? `${audioLevel}%` : 'OFF'}</span>
                    <span>ENCRYPTED</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-2 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-white font-semibold">
                  {cameraStatus === 'denied'
                    ? 'Camera Permission Denied'
                    : 'No Camera Detected'}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {cameraError || 'The browser blocked access or hardware was not found.'}
                </p>
                <button
                  onClick={onToggleCamera}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 rounded-lg border border-slate-700"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Settings Modal with Secondary Business Data, Metrics & Activities */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-[#091228] border border-sky-500/40 shadow-2xl p-5 relative overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sky-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    Settings & Business Command Center
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Secondary metrics, activity audit, hardware diagnostics & preferences
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-sky-950/80 pt-3 pb-2 shrink-0">
              {[
                { id: 'overview', label: 'Business Overview' },
                { id: 'activities', label: 'Recent Activities' },
                { id: 'devices', label: 'Hardware & Audio/Video' },
                { id: 'system', label: 'App Preferences' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as typeof settingsTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    settingsTab === tab.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Tab Content */}
            <div className="py-4 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Tab 1: Business Overview & Metrics */}
              {settingsTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                      Enterprise Performance (Demo Data)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DEMO DATA
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          {getMetricIcon(m.label)}
                          <span
                            className={`text-[10px] font-mono font-semibold flex items-center ${
                              m.trend === 'up' ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {m.change}
                          </span>
                        </div>
                        <div className="text-base font-extrabold font-mono text-white">
                          {m.value}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-300 truncate">
                          {m.label}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">
                          {m.subtext}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Team Performance Summary */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-display">
                      Team Status & KPI Summary
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {agents.map((ag) => (
                        <div
                          key={ag.id}
                          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border"
                              style={{
                                backgroundColor: ag.accentBg,
                                borderColor: ag.borderHex,
                                color: ag.accentHex,
                              }}
                            >
                              {ag.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{ag.name}</p>
                              <p className="text-[10px] text-slate-400">{ag.role}</p>
                            </div>
                          </div>
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: ag.accentHex }}
                          >
                            {ag.kpi}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Recent Activities */}
              {settingsTab === 'activities' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                      Executive Audit & Activity Log
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">5 Operations Live</span>
                  </div>

                  <div className="space-y-2">
                    {activities.map((act) => {
                      const agent = agents.find((a) => a.id === act.agentId);
                      return (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-xs uppercase tracking-wider"
                                style={{ color: agent ? agent.accentHex : '#38bdf8' }}
                              >
                                {act.agentName}
                              </span>
                              <span className="text-slate-500 text-[10px]">·</span>
                              <span className="text-white font-medium text-xs">
                                {act.action}
                              </span>
                            </div>
                            <p className="text-[10px] text-sky-400 font-mono mt-0.5">
                              {act.target}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {act.time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Hardware Diagnostics */}
              {settingsTab === 'devices' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white">Browser Video Camera</span>
                      </div>
                      <span className="text-xs font-mono font-bold capitalize text-slate-300">
                        Status: {cameraStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Requests browser permission to stream real HD video. Toggle via the top header button.
                    </p>
                    <button
                      onClick={onToggleCamera}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold"
                    >
                      {cameraStatus === 'connected' ? 'Turn Camera OFF' : 'Test Camera Connection'}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-sky-400" />
                        <span className="font-semibold text-white">Browser Microphone</span>
                      </div>
                      <span className="text-xs font-mono font-bold capitalize text-slate-300">
                        Status: {micStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Live volume input analyzer: <span className="font-mono text-sky-400">{audioLevel}%</span>
                    </p>
                    <button
                      onClick={onToggleMic}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/40 text-xs font-semibold"
                    >
                      {micStatus === 'connected' ? 'Turn Mic OFF' : 'Test Microphone Audio'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: App Preferences */}
              {settingsTab === 'system' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Desktop Theme Lighting
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl border border-sky-400 bg-sky-500/10 text-white font-medium flex items-center justify-between">
                        <span>Electric Blue & Dark Navy (Active)</span>
                        <CheckCircle2 className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400">
                        <span>High Contrast Cyber Matrix</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Primary AI Voice Synthesizer
                    </label>
                    <select className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none">
                      <option>Rose — Executive Voice (English US)</option>
                      <option>Mira — Customer Care (English UK)</option>
                      <option>Arin — Sales Energy (English US)</option>
                      <option>Zayan — Logistics Dispatch (English AU)</option>
                      <option>Naira — Financial Auditor (English CA)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-sky-950 flex justify-end shrink-0">
              <button
                onClick={onCloseSettings}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Action Workspace Views (Orders, Delivery, Analytics, Facebook, YouTube, Browser) */}
      {activeActionView && activeActionView !== 'dashboard' && activeActionView !== 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-[#091228] border border-sky-500/40 shadow-2xl p-5 relative overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-sky-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  {activeActionView === 'orders' && <ShoppingBag className="w-4 h-4" />}
                  {activeActionView === 'delivery' && <Truck className="w-4 h-4" />}
                  {activeActionView === 'analytics' && <BarChart3 className="w-4 h-4" />}
                  {activeActionView === 'facebook' && <Share2 className="w-4 h-4" />}
                  {activeActionView === 'youtube' && <Tv className="w-4 h-4" />}
                  {activeActionView === 'browser' && <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white capitalize font-display">
                    {activeActionView} Workspace
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Accessible via bottom quick navigation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  EXPANDABLE VIEW
                </span>
                <button
                  onClick={onCloseActionView}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 text-xs flex-1">
              {activeActionView === 'orders' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Arin's Live Sales & Order Ledger</span>
                    <span className="text-white font-mono font-bold">42 Orders in Verification</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: '#ORD-8821', customer: 'Global Tech Corp', amount: '$4,250.00', status: 'Payment Verified', time: '10m ago' },
                      { id: '#ORD-8820', customer: 'Apex Logistics LLC', amount: '$1,890.00', status: 'In Processing', time: '22m ago' },
                      { id: '#ORD-8819', customer: 'Nordic Design Studio', amount: '$740.00', status: 'Ready for Dispatch', time: '35m ago' },
                      { id: '#ORD-8818', customer: 'Horizon Retail', amount: '$3,120.00', status: 'Fraud Screen Passed', time: '50m ago' },
                    ].map((ord, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sky-400">{ord.id}</span>
                            <span className="text-white font-medium">{ord.customer}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Verified by Arin · {ord.time}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-white text-sm">{ord.amount}</span>
                          <span className="block text-[10px] text-emerald-400 font-semibold">{ord.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeActionView === 'delivery' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Zayan's Courier Dispatch Network</span>
                    <span className="text-emerald-400 font-mono">1,386 Delivered This Month</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { tracking: 'FX-9921-3904', courier: 'FedEx Express', dest: 'Chicago, IL', eta: 'Today 2:30 PM', status: 'Out for Delivery' },
                      { tracking: 'DHL-8419-5510', courier: 'DHL Global', dest: 'Frankfurt, DE', eta: 'Tomorrow 10:00 AM', status: 'In Transit' },
                      { tracking: 'UPS-3301-4412', courier: 'UPS Priority', dest: 'Austin, TX', eta: 'Delivered 9:15 AM', status: 'Signed & Confirmed' },
                    ].map((del, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-amber-400 font-bold">{del.tracking}</span>
                          <p className="text-white font-medium mt-0.5">{del.courier} · {del.dest}</p>
                          <p className="text-[10px] text-slate-400">ETA: {del.eta}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          {del.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeActionView === 'analytics' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200">
                    <p className="font-semibold text-white">Naira's Executive Financial Audit</p>
                    <p className="text-[11px] text-purple-300 mt-1">
                      Gross margin: 31.4% (+$18.2k ahead of baseline projection). Reconciled with Stripe, PayPal, and domestic banking gateways.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase">Gross Revenue MTD</p>
                      <p className="text-lg font-mono font-extrabold text-white mt-1">$128,450.00</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase">Audit Integrity Score</p>
                      <p className="text-lg font-mono font-extrabold text-emerald-400 mt-1">99.8%</p>
                    </div>
                  </div>
                </div>
              )}

              {activeActionView === 'facebook' && (
                <div className="space-y-3 text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
                    <Share2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Facebook Business Suite Integration Hub
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Social ad campaigns, Messenger bot automation, and catalog synchronization prepared for Stage 2.
                  </p>
                </div>
              )}

              {activeActionView === 'youtube' && (
                <div className="space-y-3 text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
                    <Tv className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    YouTube Marketing & Media Console
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Product walkthrough video management and video ad metrics ready for Stage 2 pipeline link.
                  </p>
                </div>
              )}

              {activeActionView === 'browser' && (
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <input
                      type="text"
                      readOnly
                      value="https://internal.business-hub.local/research"
                      className="bg-transparent text-slate-300 flex-1 focus:outline-none font-mono text-[11px]"
                    />
                    <span className="text-[10px] text-emerald-400 font-mono">SSL SECURE</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                    <p className="text-slate-300 font-medium">
                      Embedded Workspace Research Engine
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Allows Rose and Mira to pull live supplier pricing, market trends, and courier tracking without leaving the desktop app.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-sky-950 flex justify-end shrink-0">
              <button
                onClick={onCloseActionView}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
