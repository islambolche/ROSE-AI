import React, { useState, useEffect } from 'react';
import {
  AgentId,
  ChatMessage,
  AgentMessageRecord,
  AppSettings,
  Agent,
  UserAddressAsType,
  OfficeAgentPhase,
  DelegationMode,
  FileAttachmentMeta,
} from './types';
import { IDENTITY_AGENTS_MAP } from './config/identity';
import { Header } from './components/Header';
import { ChatBox } from './components/ChatBox';
import { Office } from './components/Office';
import { BottomNav } from './components/BottomNav';
import { SettingsPanel } from './components/SettingsPanel';
import { dbService } from './services/db';
import { settingsService } from './services/settings';
import { Sparkles, Check, User } from 'lucide-react';
import { generateAgentAnswer } from './lib/agentEngine';
import { handleRoseTeamTurn, RoseTeamTurnResult } from './lib/teamEngine';
import { voiceChat } from './lib/voiceChat';
import { extractSaveFileSignal, readFileContent } from './lib/files';
import { 
  getDirectoryHandle, 
  storeDirectoryHandle, 
  removeDirectoryHandle,
  logFileAction,
  writeFileToFolder,
  downloadAsFile
} from './lib/approvals';

const WELCOME_ADDRESS_OPTIONS: UserAddressAsType[] = [
  'শুধু নাম',
  'ভাই',
  'আপু',
  'স্যার',
  'ম্যাডাম',
];

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.getSettings());
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    const initial = settingsService.getSettings();
    return !initial.userName.trim() && !initial.hasCompletedWelcome;
  });
  const [welcomeNameInput, setWelcomeNameInput] = useState<string>(
    () => settingsService.getSettings().userName || ''
  );
  const [welcomeAddressAs, setWelcomeAddressAs] = useState<UserAddressAsType>(
    () => settingsService.getSettings().userAddressAs || 'শুধু নাম'
  );
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('rose');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState<number>(0);
  const [voiceDotHeights, setVoiceDotHeights] = useState<number[]>([4, 4, 4, 4, 4]);
  const lastMicChatErrorRef = React.useRef<string | null>(null);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentUploadedFile, setCurrentUploadedFile] = useState<FileAttachmentMeta | null>(null);

  useEffect(() => {
    getDirectoryHandle().then((handle) => {
      if (handle) setDirectoryHandle(handle);
    });
  }, []);

  const selectedAgentIdentity = IDENTITY_AGENTS_MAP[selectedAgentId] || IDENTITY_AGENTS_MAP.rose;

  // Adapt identity agent to Agent type for ChatBox compatibility
  const selectedAgent: Agent = {
    id: selectedAgentIdentity.id,
    name: selectedAgentIdentity.name,
    role: selectedAgentIdentity.role,
    title: selectedAgentIdentity.title,
    themeColor: selectedAgentIdentity.id,
    accentHex: selectedAgentIdentity.color,
    accentBg: selectedAgentIdentity.accentBg,
    borderHex: selectedAgentIdentity.borderHex,
    status: 'Online',
    currentTask: 'Active',
    avatarSeed: selectedAgentIdentity.id,
    deskPosition: selectedAgentIdentity.id === 'rose' ? 'center' : 'left-top',
    specialty: selectedAgentIdentity.specialty,
    kpi: '98%',
    kpiLabel: 'Performance',
    voiceNote: '',
  };

  const [isTyping, setIsTyping] = useState(false);
  const [workingAgents, setWorkingAgents] = useState<AgentId[]>([]);
  const [workingMode, setWorkingMode] = useState<DelegationMode>('ask');
  const [officePhases, setOfficePhases] = useState<Partial<Record<AgentId, OfficeAgentPhase>>>({});

  const formatRecordToChatMessage = (rec: AgentMessageRecord): ChatMessage => {
    const isUser = rec.role === 'user';
    const effectiveAgentId: AgentId =
      !isUser && rec.team_meta?.kind === 'handoff_reply' && rec.team_meta.reportAgentId
        ? rec.team_meta.reportAgentId
        : rec.agent_id;
    const agent = IDENTITY_AGENTS_MAP[effectiveAgentId];
    return {
      id: rec.id,
      sender: isUser ? 'user' : effectiveAgentId,
      senderName: isUser ? 'You' : agent?.name || effectiveAgentId,
      senderRole: isUser ? undefined : agent?.role,
      text: rec.content,
      timestamp: new Date(rec.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isSystem: rec.is_system,
      errorMeta: rec.error_subtext ? { subtext: rec.error_subtext } : undefined,
      teamMeta: rec.team_meta,
    };
  };

  const loadMessagesForAgent = (agentId: AgentId): ChatMessage[] => {
    const records = dbService.getMessages(agentId);
    // Keep last 50 messages per agent
    return records.slice(-50).map(formatRecordToChatMessage);
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessagesForAgent(selectedAgentId)
  );

  useEffect(() => {
    // Apply theme glow intensity
    settingsService.applyGlowIntensity(settings.glowIntensity);
    const unsubscribe = settingsService.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return unsubscribe;
  }, [settings.glowIntensity]);

  // Load selected agent's history whenever active agent changes
  useEffect(() => {
    setMessages(loadMessagesForAgent(selectedAgentId));
  }, [selectedAgentId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      voiceChat.stopRecognition();
      voiceChat.stopSpeaking();
    };
  }, []);

  const handleSelectAgentId = (id: AgentId) => {
    if (isSpeaking) {
      voiceChat.stopSpeaking();
      setIsSpeaking(false);
    }
    setSelectedAgentId(id);
    const agent = IDENTITY_AGENTS_MAP[id];
    showToast(`${agent.name} (${agent.role}) selected`);
    const agentLang = settings.agents[id]?.language || 'বাংলা';
    voiceChat.setLanguage(agentLang);
  };

  const handleClearChat = () => {
    dbService.clearMessages(selectedAgentId);
    setMessages([]);
    showToast(`${selectedAgentIdentity.name}-এর চ্যাট ইতিহাস মোছা হয়েছে`);
  };

  const handleRemoveUploadedFile = () => {
    setCurrentUploadedFile(null);
  };

  const handleSaveFileApproval = async (msgId: string, allowed: boolean) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !msg.saveFileMeta) return;

    if (!allowed) {
      const updatedMsg: ChatMessage = {
        ...msg,
        saveFileMeta: { ...msg.saveFileMeta, status: 'denied' },
      };
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updatedMsg : m)));
      logFileAction({
        name: msg.saveFileMeta.name,
        size: msg.saveFileMeta.size,
        status: 'Denied',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      let finalName = msg.saveFileMeta.name;
      const canDirectSave =
        directoryHandle && settings.pcControl.allowFileSave && typeof (window as any).showDirectoryPicker !== 'undefined';

      if (canDirectSave) {
        finalName = await writeFileToFolder(
          directoryHandle!,
          msg.saveFileMeta.name,
          msg.saveFileMeta.content
        );
      } else {
        downloadAsFile(msg.saveFileMeta.name, msg.saveFileMeta.content);
      }

      const updatedMsg: ChatMessage = {
        ...msg,
        saveFileMeta: { ...msg.saveFileMeta, status: 'saved', name: finalName },
      };
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updatedMsg : m)));
      logFileAction({
        name: finalName,
        size: msg.saveFileMeta.size,
        status: 'Saved',
        timestamp: new Date().toISOString(),
      });
      showToast(canDirectSave ? `সেভ হয়েছে: ${finalName}` : `ডাউনলোড হচ্ছে: ${finalName}`);
    } catch (err: any) {
      console.error('[App] Save error:', err);
      showToast('সেভ করতে সমস্যা হয়েছে');
    }
  };

  const handleReconnectFolder = async () => {
    if (directoryHandle) {
      try {
        const status = await (directoryHandle as any).requestPermission({ mode: 'readwrite' });
        if (status === 'granted') {
          showToast('Folder reconnected');
        } else {
          showToast('Permission denied');
        }
      } catch (err) {
        showToast('Permission denied');
      }
    }
  };

  const handleChooseFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await storeDirectoryHandle(handle);
      setDirectoryHandle(handle);
      const updated = {
        ...settings,
        pcControl: { ...settings.pcControl, workFolderName: handle.name },
      };
      setSettings(updated);
      settingsService.saveSettings(updated);
      showToast(`ফোল্ডার যুক্ত হয়েছে: ${handle.name}`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast('ফোল্ডার বাছতে সমস্যা হয়েছে');
      }
    }
  };

  const handleDisconnectFolder = async () => {
    await removeDirectoryHandle();
    setDirectoryHandle(null);
    const updated = {
      ...settings,
      pcControl: { ...settings.pcControl, workFolderName: '' },
    };
    setSettings(updated);
    settingsService.saveSettings(updated);
    showToast('ফোল্ডার বিচ্ছিন্ন করা হয়েছে');
  };

  const handleStopSpeaking = () => {
    voiceChat.stopSpeaking();
    setIsSpeaking(false);
  };

  const handleSendMessageRef = React.useRef<
    (text: string, options?: { fromVoice?: boolean }) => Promise<void>
  >(async () => {});

  const handleToggleMic = async () => {
    if (isMicOn) {
      voiceChat.stopRecognition();
      voiceChat.stopSpeaking();
      setIsMicOn(false);
      setInterimSpeech('');
      setIsSpeaking(false);
      setVoiceLevel(0);
      setVoiceDotHeights([4, 4, 4, 4, 4]);
      showToast('মাইক বন্ধ');
    } else {
      const currentAgentLang = settings.agents[selectedAgentId]?.language || 'বাংলা';
      const started = await voiceChat.startRecognition(currentAgentLang, {
        onInterim: (text) => {
          setInterimSpeech(text);
        },
        onFinal: (text) => {
          setInterimSpeech('');
          if (text.trim()) {
            lastMicChatErrorRef.current = null;
            handleSendMessageRef.current(text.trim(), { fromVoice: true });
          }
        },
        onError: (bengaliMsg) => {
          showToast(bengaliMsg);
          setIsMicOn(false);
          setVoiceLevel(0);
          setVoiceDotHeights([4, 4, 4, 4, 4]);

          // একই ত্রুটি পরপর দুবার চ্যাটে দেখাবে না
          if (lastMicChatErrorRef.current !== bengaliMsg) {
            lastMicChatErrorRef.current = bengaliMsg;
            const errMsgRecord = dbService.addMessage({
              agent_id: selectedAgentId,
              role: 'agent',
              content: `⚠️ ${bengaliMsg}`,
              device: 'pc',
              is_system: true,
            });
            setMessages((prev) => [
              ...prev,
              {
                ...formatRecordToChatMessage(errMsgRecord),
                isSystem: true,
              },
            ]);
          }
        },
        onSpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
        },
        onListeningChange: (listening) => {
          if (!listening && !voiceChat.getIsSpeaking()) {
            setIsMicOn(false);
            setVoiceLevel(0);
            setVoiceDotHeights([4, 4, 4, 4, 4]);
          }
        },
        onAudioLevelChange: (rms, dotHeights) => {
          setVoiceLevel(rms);
          setVoiceDotHeights(dotHeights);
        },
      });

      if (started) {
        setIsMicOn(true);
        showToast('মাইক চালু (শুনছি...)');
      } else {
        setIsMicOn(false);
        setVoiceLevel(0);
        setVoiceDotHeights([4, 4, 4, 4, 4]);
      }
    }
  };

  const handleSendMessage = async (text: string, options?: { fromVoice?: boolean }) => {
    if (!text.trim() || isTyping) {
      if (options?.fromVoice && voiceChat.isMicActive()) {
        voiceChat.resumeRecognitionAfterSpeaking();
      }
      return;
    }

    // 1. Immediately store and display user message
    const userRecord = dbService.addMessage({
      agent_id: selectedAgentId,
      role: 'user',
      content: text,
      device: 'pc',
    });

    const userChatMessage: ChatMessage = {
      ...formatRecordToChatMessage(userRecord),
      fromVoice: options?.fromVoice,
    };
    const currentHistory = [...messages, userChatMessage];
    setMessages(currentHistory);

    // 1) "ইন্টারনেট নেই বা সময়সীমা শেষ" সাধারণ বার্তা শুধু navigator.onLine == false হলে দেখাও।
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.error('[Chat] ব্রাউজার অফলাইন (navigator.onLine = false)');
      const offlineRecord = dbService.addMessage({
        agent_id: selectedAgentId,
        role: 'agent',
        content: 'ইন্টারনেট নেই বা সময়সীমা শেষ',
        device: 'pc',
        is_system: true,
      });
      setMessages((prev) => [
        ...prev,
        {
          ...formatRecordToChatMessage(offlineRecord),
          isSystem: true,
        },
      ]);
      // ত্রুটি বার্তা কখনো উচ্চস্বরে পড়া হবে না; মাইক চালু থাকলে আবার শোনা শুরু করো
      if (voiceChat.isMicActive()) {
        voiceChat.resumeRecognitionAfterSpeaking();
      }
      return;
    }

    // 2. Start agent typing state (office desk glows & pulses, ChatBox shows typing wave)
    setIsTyping(true);
    let lastHandoffAgentId: AgentId | null = null;

    try {
      // 3. Generate real AI answer (with ASK / HANDOFF team delegation when talking to Rose)
      const result: RoseTeamTurnResult =
        selectedAgentId === 'rose'
          ? await handleRoseTeamTurn(
              currentHistory,
              {
                onRoseIntro: (introText, emotion) => {
                  const { cleanText, saveRequest } = extractSaveFileSignal(introText);
                  
                  const introRecord = dbService.addMessage({
                    agent_id: 'rose',
                    role: 'agent',
                    content: cleanText,
                    device: 'pc',
                    team_meta: saveRequest ? {
                      kind: 'save_file'
                    } : undefined
                  });
                  
                  const introMsg: ChatMessage = {
                    ...formatRecordToChatMessage(introRecord),
                    emotion,
                    fromVoice: options?.fromVoice,
                    saveFileMeta: saveRequest ? {
                      ...saveRequest,
                      size: new Blob([saveRequest.content]).size,
                      status: 'pending',
                      timestamp: new Date().toISOString()
                    } : undefined
                  };
                  setMessages((prev) => [...prev, introMsg]);
                },
                onWorkingAgentsChange: (agentIds, mode) => {
                  setWorkingAgents(agentIds);
                  if (mode) {
                    setWorkingMode(mode);
                  }
                },
                onOfficePhaseChange: (phases) => {
                  setOfficePhases((prev) => ({
                    ...prev,
                    ...phases,
                  }));
                },
                onAskReportFold: (rep) => {
                  // ASK: চ্যাটে শুধু একটা ধূসর ছোট লাইন "Rose → Mira থেকে তথ্য নিল" (চাপলে ভাঁজ খুলে এজেন্টের রিপোর্ট দেখা যাবে)
                  const foldRec = dbService.addMessage({
                    agent_id: 'rose',
                    role: 'agent',
                    content: `Rose → ${rep.agentName} থেকে তথ্য নিল`,
                    device: 'pc',
                    team_meta: {
                      kind: 'ask_fold',
                      mode: 'ask',
                      reportAgentId: rep.agentId,
                      taskText: rep.task,
                      reportText: rep.reportText,
                      isError: rep.isError,
                    },
                  });
                  const foldMsg = formatRecordToChatMessage(foldRec);
                  setMessages((prev) => [...prev, foldMsg]);

                  // Save internal task note in specialist's own chat history
                  dbService.addMessage({
                    agent_id: rep.agentId,
                    role: 'agent',
                    content: rep.reportText,
                    device: 'pc',
                    team_meta: {
                      kind: 'rose_task',
                      mode: 'ask',
                      taskText: rep.task,
                      reportText: rep.reportText,
                      isError: rep.isError,
                    },
                  });
                },
                onHandoffAgentReply: (rep) => {
                  lastHandoffAgentId = rep.agentId;
                  // HANDOFF: শুধু ওই এজেন্ট নিজের ছবি ও নামসহ ব্যবহারকারীকে চ্যাটে সরাসরি উত্তর দেবে
                  const handoffRec = dbService.addMessage({
                    agent_id: 'rose',
                    role: 'agent',
                    content: rep.reportText,
                    device: 'pc',
                    is_system: rep.isError,
                    error_subtext: rep.errorSubtext,
                    team_meta: {
                      kind: 'handoff_reply',
                      mode: 'handoff',
                      reportAgentId: rep.agentId,
                      taskText: rep.task,
                      isError: rep.isError,
                    },
                  });
                  const handoffMsg: ChatMessage = {
                    ...formatRecordToChatMessage(handoffRec),
                    emotion: rep.emotion,
                    isSystem: rep.isError,
                    fromVoice: options?.fromVoice,
                    errorMeta: rep.errorSubtext ? { subtext: rep.errorSubtext } : undefined,
                  };
                  setMessages((prev) => [...prev, handoffMsg]);

                  // উত্তরটা ওই এজেন্টের নিজস্ব ইতিহাসেও সেভ হবে
                  dbService.addMessage({
                    agent_id: rep.agentId,
                    role: 'user',
                    content: text,
                    device: 'pc',
                  });
                  dbService.addMessage({
                    agent_id: rep.agentId,
                    role: 'agent',
                    content: rep.reportText,
                    device: 'pc',
                    is_system: rep.isError,
                    error_subtext: rep.errorSubtext,
                  });
                },
              },
              { fromVoice: options?.fromVoice, uploadedFile: currentUploadedFile || undefined }
            )
          : await generateAgentAnswer(selectedAgentId, currentHistory, {
              fromVoice: options?.fromVoice,
              uploadedFile: currentUploadedFile || undefined
            });

      // Clear uploaded file after successful send
      setCurrentUploadedFile(null);

      // 4. Save final answer / summary to persistent db ONLY if Rose is the answering party (ASK or direct)
      if (!result.skipRoseFinalMessage) {
        const { cleanText, saveRequest } = extractSaveFileSignal(result.text);

        const agentRecord = dbService.addMessage({
          agent_id: selectedAgentId,
          role: 'agent',
          content: cleanText,
          device: 'pc',
          is_system: result.isError,
          error_subtext: result.errorMeta?.subtext,
          team_meta: saveRequest ? { kind: 'save_file' } : undefined
        });

        const agentChatMessage: ChatMessage = {
          ...formatRecordToChatMessage(agentRecord),
          emotion: result.emotion,
          isSystem: result.isError,
          fromVoice: options?.fromVoice,
          errorMeta: result.errorMeta,
          saveFileMeta: saveRequest ? {
            ...saveRequest,
            size: new Blob([saveRequest.content]).size,
            status: 'pending',
            timestamp: new Date().toISOString()
          } : undefined
        };

        setMessages((prev) => [...prev, agentChatMessage]);
      }

      // 5. Hands-free voice loop: speak answer aloud if Mic is ON, Voice reply is ON, and NOT an error
      const isTurnError = Boolean(result.isError || result.lastHandoffIsError);
      const spokenText = result.skipRoseFinalMessage ? result.lastHandoffText || '' : result.text;
      const speakingAgentId: AgentId =
        result.skipRoseFinalMessage && lastHandoffAgentId ? lastHandoffAgentId : selectedAgentId;
      const micActive = voiceChat.isMicActive() || isMicOn;
      const voiceReplyEnabled = settings.voiceSettings?.voiceReply !== false;

      if (micActive && !isTurnError && voiceReplyEnabled && spokenText.trim()) {
        const agentLang = settings.agents[speakingAgentId]?.language || 'বাংলা';
        voiceChat.speak(spokenText, speakingAgentId, {
          language: agentLang,
          speed: settings.voiceSettings?.speed ?? 1.0,
          volume: settings.voiceSettings?.volume ?? 1.0,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
          onMissingBengaliVoice: (note) => {
            showToast(note);
            const noteRecord = dbService.addMessage({
              agent_id: selectedAgentId,
              role: 'agent',
              content: `ℹ️ ${note}`,
              device: 'pc',
            });
            setMessages((prev) => [...prev, formatRecordToChatMessage(noteRecord)]);
          },
        });
      } else if (voiceChat.isMicActive()) {
        // যদি ত্রুটি হয় বা Voice reply বন্ধ থাকে, তাহলে কিছু না বলেই আবার শোনা চালু করো
        voiceChat.resumeRecognitionAfterSpeaking();
      }

      dbService.addTask({
        agent_id: selectedAgentId,
        title: `AI: ${text.slice(0, 30)}...`,
        detail: `Answered by ${selectedAgentIdentity.name} via ${result.provider} (${result.model})`,
        status: isTurnError ? 'failed' : 'done',
        device: 'pc',
      });
    } catch (err: any) {
      console.error('[Chat] Exception generating answer:', {
        agent: selectedAgentId,
        error: err?.message || String(err),
      });

      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const errorMsgText = isOffline
        ? 'ইন্টারনেট নেই বা সময়সীমা শেষ'
        : 'Groq: সংযোগ আটকে গেছে (Failed to fetch, সম্ভবত ব্রাউজার বা নেটওয়ার্ক ব্লক)';
      const errorSubtext = isOffline
        ? undefined
        : 'স্ট্যাটাস: 0 • সংযোগ ব্যর্থ';

      const agentRecord = dbService.addMessage({
        agent_id: selectedAgentId,
        role: 'agent',
        content: errorMsgText,
        device: 'pc',
        is_system: true,
        error_subtext: errorSubtext,
      });

      setMessages((prev) => [
        ...prev,
        {
          ...formatRecordToChatMessage(agentRecord),
          isSystem: true,
          errorMeta: errorSubtext ? { subtext: errorSubtext } : undefined,
        },
      ]);

      // লাল ত্রুটি বার্তা কখনো উচ্চস্বরে বলবে না; মাইক চালু থাকলে আবার শোনা চালু করো
      if (voiceChat.isMicActive()) {
        voiceChat.resumeRecognitionAfterSpeaking();
      }
    } finally {
      setIsTyping(false);
      setWorkingAgents([]);
      setOfficePhases({});
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleNavClick = (navId: string, label: string) => {
    setActiveNav(navId);
    if (navId === 'chat') {
      showToast('Chat active');
    } else {
      showToast(`${label} selected`);
    }
  };

  const handleSaveWelcome = () => {
    const trimmed = welcomeNameInput.trim();
    const updated: AppSettings = {
      ...settings,
      userName: trimmed,
      userAddressAs: welcomeAddressAs,
      hasCompletedWelcome: true,
    };
    settingsService.saveSettings(updated);
    setSettings(updated);
    setIsWelcomeOpen(false);
    if (trimmed) {
      const displaySalutation =
        welcomeAddressAs === 'শুধু নাম' ? trimmed : `${trimmed} ${welcomeAddressAs}`;
      showToast(`স্বাগতম, ${displaySalutation}!`);
    } else {
      showToast('সংরক্ষিত হয়েছে');
    }
  };

  const handleSkipWelcome = () => {
    const updated: AppSettings = {
      ...settings,
      userName: '',
      userAddressAs: welcomeAddressAs,
      hasCompletedWelcome: true,
    };
    settingsService.saveSettings(updated);
    setSettings(updated);
    setIsWelcomeOpen(false);
  };

  const handleToggleCaptions = () => {
    const updated = { ...settings, voiceCaptions: !settings.voiceCaptions };
    setSettings(updated);
    settingsService.saveSettings(updated);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#040814] text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 px-4 py-2 rounded-xl bg-[#091530]/95 border border-sky-400 text-sky-200 text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* First-Time Welcome Dialog (when userName is empty on first open) */}
      {isWelcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#07122b] border border-sky-500/40 shadow-[0_0_40px_rgba(0,15,45,0.9)] p-6 space-y-5 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white font-display">
                  আপনাকে কী নামে ডাকব?
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  পরে Settings → Voice & Language থেকেও এটি বদলানো যাবে
                </p>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                আপনার নাম
              </label>
              <input
                type="text"
                autoFocus
                value={welcomeNameInput}
                onChange={(e) => setWelcomeNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveWelcome();
                  }
                }}
                placeholder="এখানে আপনার নাম লিখুন..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#040a1a] border border-sky-500/40 text-white text-xs sm:text-sm focus:outline-none focus:border-sky-400 transition-all placeholder:text-slate-500"
              />
            </div>

            {/* Address As Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                সম্বোধন (Address as)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {WELCOME_ADDRESS_OPTIONS.map((opt) => {
                  const isSelected = welcomeAddressAs === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setWelcomeAddressAs(opt)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-sky-500/25 text-sky-300 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                          : 'bg-[#040a1a] text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save & Skip Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSkipWelcome}
                className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                Skip (এড়িয়ে যান)
              </button>
              <button
                type="button"
                onClick={handleSaveWelcome}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold flex items-center gap-1.5 border border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header: Locked ROSE brand, Camera/Mic Toggles, Locked Team Members Dropdown, Window controls */}
      <Header
        selectedAgentId={selectedAgentId}
        onSelectAgentId={handleSelectAgentId}
        isCameraOn={isCameraOn}
        onToggleCamera={() => setIsCameraOn(!isCameraOn)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showCameraMic={settings.showCameraMic}
        isMicOn={isMicOn}
        onToggleMic={handleToggleMic}
        voiceLevel={voiceLevel}
        voiceDotHeights={voiceDotHeights}
        isSpeaking={isSpeaking}
        isCaptionsOn={settings.voiceCaptions}
        onToggleCaptions={handleToggleCaptions}
      />

      {/* 2. Main Middle Area: Left ChatBox + Right 16:9 Office */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Chat Box */}
        <ChatBox
          selectedAgent={selectedAgent}
          messages={messages}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          isTyping={isTyping}
          fontSize={settings.chatFontSize}
          interimSpeech={interimSpeech}
          isSpeaking={isSpeaking}
          onStopSpeaking={handleStopSpeaking}
          isMicOn={isMicOn}
          isCaptionsOn={settings.voiceCaptions}
          workingAgents={workingAgents}
          workingMode={workingMode}
          uploadedFile={currentUploadedFile || undefined}
          onRemoveUploadedFile={handleRemoveUploadedFile}
          onSaveFileApproval={handleSaveFileApproval}
          onFileUpload={async (file) => {
            try {
              const meta = await readFileContent(file);
              setCurrentUploadedFile(meta);
            } catch (err: any) {
              showToast(err.message);
            }
          }}
        />

        {/* Right 16:9 Office (using office.png + 5 Transparent Clickable Hotspots) */}
        <Office
          selectedAgentId={selectedAgentId}
          onSelectAgentId={handleSelectAgentId}
          isTyping={isTyping}
          isSpeaking={isSpeaking}
          officePhases={officePhases}
        />
      </div>

      {/* 3. Bottom Navigation Bar */}
      <BottomNav
        activeNav={activeNav}
        onNavClick={handleNavClick}
      />

      {/* 4. Settings Panel Modal with 17 vertical bars */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onToast={showToast}
        directoryHandle={directoryHandle}
        onChooseFolder={handleChooseFolder}
        onDisconnectFolder={handleDisconnectFolder}
        onReconnectFolder={handleReconnectFolder}
      />
    </div>
  );
}
