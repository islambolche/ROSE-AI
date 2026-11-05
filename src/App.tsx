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
  downloadAsFile,
  addPendingApproval,
  removePendingApproval,
  registerPendingApprovalResolver,
} from './lib/approvals';
import {
  extractCommandSignal,
  getCommandUrl,
  extractBillSignal,
  detectUserCommand,
  getBengaliConfirmationText,
  extractEmailSignal,
  sendGmailMessage,
  extractYouTubeUploadSignal,
  extractYouTubeCommentsSignal,
  extractYouTubeReplySignal,
  uploadYouTubeVideoResumable,
  fetchYouTubeComments,
  postYouTubeCommentReply,
  getYouTubeUploadFile,
  extractFacebookPostSignal,
  extractFacebookCommentsSignal,
  extractFacebookReplySignal,
  publishFacebookPagePost,
  fetchFacebookPostComments,
  postFacebookCommentReply,
  getFacebookMediaFile,
  extractPcActionSignal,
  executePcAction,
} from './lib/commands';
import { saveAgentDataItem } from './lib/dataSources';

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
    removePendingApproval(msgId);
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

    // Direct voice/text commands for Rose (YouTube play/search & Facebook search — no paid API)
    if (selectedAgentId === 'rose') {
      const directCommand = detectUserCommand(text);
      if (directCommand) {
        const url = getCommandUrl(directCommand);
        const replyText = getBengaliConfirmationText(directCommand);
        const ruleKey =
          directCommand.type === 'youtube_play' ? 'playMusicVideo' : 'openWebsiteOrAppPc';
        const needsApproval = Boolean(settings.permissionRules?.[ruleKey] ?? true);

        const agentRecord = dbService.addMessage({
          agent_id: 'rose',
          role: 'agent',
          content: replyText,
          device: 'pc',
        });

        const agentChatMessage: ChatMessage = {
          ...formatRecordToChatMessage(agentRecord),
          emotion: 'warm',
          fromVoice: options?.fromVoice,
          actionCommand: {
            ...directCommand,
            url,
            status: needsApproval ? 'pending' : 'ready',
          },
        };

        setMessages((prev) => [...prev, agentChatMessage]);

        if (needsApproval) {
          addPendingApproval({
            id: agentRecord.id,
            ruleKey,
            title:
              directCommand.type === 'youtube_play'
                ? 'Play music / video'
                : 'Open website or app on PC',
            detail: `${directCommand.type.replace('_', ' ')}: "${directCommand.query}"`,
            timestamp: new Date().toISOString(),
            payload: {
              kind: 'action_command',
              msgId: agentRecord.id,
              url,
            },
          });
        } else {
          const win = window.open(url, '_blank', 'noopener,noreferrer');
          if (!win) {
            showToast('ব্রাউজার নতুন ট্যাব ব্লক করেছে — মেসেজের বাটনে ক্লিক করে খুলুন।');
          }
        }

        const micActive = voiceChat.isMicActive() || isMicOn;
        const voiceReplyEnabled = settings.voiceSettings?.voiceReply !== false;
        if (micActive && voiceReplyEnabled && replyText.trim()) {
          const agentLang = settings.agents.rose?.language || 'বাংলা';
          voiceChat.speak(replyText, 'rose', {
            language: agentLang,
            speed: settings.voiceSettings?.speed ?? 1.0,
            volume: settings.voiceSettings?.volume ?? 1.0,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          });
        } else if (voiceChat.isMicActive()) {
          voiceChat.resumeRecognitionAfterSpeaking();
        }
        return;
      }
    }

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
                  const { cleanText: textAfterSave, saveRequest } = extractSaveFileSignal(introText);
                  const { cleanText: textAfterBill, bill } = extractBillSignal(textAfterSave);
                  const { cleanText: textAfterCommand, command } = extractCommandSignal(textAfterBill);
                  const { cleanText: textAfterEmail, emailDraft: rawEmailDraft } =
                    extractEmailSignal(textAfterCommand);
                  const { cleanText: textAfterYtUpload, ytUpload: rawYtUpload } =
                    extractYouTubeUploadSignal(textAfterEmail);
                  const { cleanText: textAfterYtComments, ytComments: rawYtComments } =
                    extractYouTubeCommentsSignal(textAfterYtUpload);
                  const { cleanText: textAfterYtReply, ytReply: rawYtReply } =
                    extractYouTubeReplySignal(textAfterYtComments);
                  const { cleanText: textAfterFbPost, fbPost: rawFbPost } =
                    extractFacebookPostSignal(textAfterYtReply);
                  const { cleanText: textAfterFbComments, fbComments: rawFbComments } =
                    extractFacebookCommentsSignal(textAfterFbPost);
                  const { cleanText: textAfterFbReply, fbReply: rawFbReply } =
                    extractFacebookReplySignal(textAfterFbComments);
                  const { cleanText: textAfterPcAction, pcAction: rawPcAction } =
                    extractPcActionSignal(textAfterFbReply);
                  
                  const cmdRuleKey =
                    command?.type === 'youtube_play' ? 'playMusicVideo' : 'openWebsiteOrAppPc';
                  const needsApproval = Boolean(settings.permissionRules?.[cmdRuleKey] ?? true);
                  const actionCommand = command
                    ? {
                        ...command,
                        url: getCommandUrl(command),
                        status: needsApproval ? ('pending' as const) : ('ready' as const),
                      }
                    : undefined;

                  const askEmail = Boolean(settings.permissionRules?.sendEmailApplyJob ?? true);
                  const emailDraft = rawEmailDraft
                    ? {
                        ...rawEmailDraft,
                        status: askEmail ? ('pending' as const) : ('sending' as const),
                      }
                    : undefined;

                  const askYtPostReply = Boolean(settings.permissionRules?.postReplyFbYoutube ?? true);
                  const ytUpload = rawYtUpload
                    ? {
                        ...rawYtUpload,
                        status: 'pending' as const,
                      }
                    : undefined;
                  const ytComments = rawYtComments
                    ? {
                        videoId: rawYtComments.videoId,
                        status: 'loading' as const,
                        comments: [],
                      }
                    : undefined;
                  const ytReply = rawYtReply
                    ? {
                        ...rawYtReply,
                        status: askYtPostReply ? ('pending' as const) : ('posting' as const),
                      }
                    : undefined;
                  const fbPost = rawFbPost
                    ? {
                        ...rawFbPost,
                        status:
                          askYtPostReply || rawFbPost.mediaType !== 'text'
                            ? ('pending' as const)
                            : ('posting' as const),
                      }
                    : undefined;
                  const fbComments = rawFbComments
                    ? {
                        postId: rawFbComments.postId,
                        status: 'loading' as const,
                        comments: [],
                      }
                    : undefined;
                  const fbReply = rawFbReply
                    ? {
                        ...rawFbReply,
                        status: askYtPostReply ? ('pending' as const) : ('posting' as const),
                      }
                    : undefined;

                  const pcRuleKey =
                    rawPcAction?.actionType === 'send_whatsapp' ||
                    rawPcAction?.actionType === 'send_messenger'
                      ? ('sendWhatsappMessenger' as const)
                      : rawPcAction?.actionType === 'play_media'
                      ? ('playMusicVideo' as const)
                      : rawPcAction?.actionType === 'type_text'
                      ? ('typeTextOrKeysPc' as const)
                      : rawPcAction?.actionType === 'read_file'
                      ? ('readOrOpenFilesPc' as const)
                      : ('openWebsiteOrAppPc' as const);
                  const askPcRule = Boolean(settings.permissionRules?.[pcRuleKey] ?? true);
                  const pcAction = rawPcAction
                    ? {
                        ...rawPcAction,
                        status: askPcRule ? ('pending' as const) : ('done' as const),
                      }
                    : undefined;

                  if (actionCommand && !needsApproval) {
                    const win = window.open(actionCommand.url, '_blank', 'noopener,noreferrer');
                    if (!win) {
                      showToast('ব্রাউজার নতুন ট্যাব ব্লক করেছে — মেসেজের বাটনে ক্লিক করে খুলুন।');
                    }
                  }

                  const introRecord = dbService.addMessage({
                    agent_id: 'rose',
                    role: 'agent',
                    content: textAfterPcAction,
                    device: 'pc',
                    team_meta: saveRequest ? {
                      kind: 'save_file'
                    } : undefined
                  });

                  if (actionCommand && needsApproval) {
                    addPendingApproval({
                      id: introRecord.id,
                      ruleKey: cmdRuleKey,
                      title:
                        command?.type === 'youtube_play'
                          ? 'Play music / video'
                          : 'Open website or app on PC',
                      detail: `${actionCommand.type.replace('_', ' ')}: "${actionCommand.query}"`,
                      timestamp: new Date().toISOString(),
                      payload: {
                        kind: 'action_command',
                        msgId: introRecord.id,
                        url: actionCommand.url,
                      },
                    });
                  }

                  if (saveRequest && (settings.permissionRules?.readOrOpenFilesPc ?? true)) {
                    addPendingApproval({
                      id: introRecord.id,
                      ruleKey: 'readOrOpenFilesPc',
                      title: 'Read or open files on PC',
                      detail: `Save file: ${saveRequest.name}`,
                      timestamp: new Date().toISOString(),
                      payload: {
                        kind: 'save_file',
                        msgId: introRecord.id,
                        fileName: saveRequest.name,
                        fileContent: saveRequest.content,
                      },
                    });
                  }

                  if (bill && (settings.permissionRules?.saveOrSendBill ?? true)) {
                    addPendingApproval({
                      id: introRecord.id,
                      ruleKey: 'saveOrSendBill',
                      title: 'Save or send a bill',
                      detail: `Bill for ${bill.customerName} (${bill.total} ৳)`,
                      timestamp: new Date().toISOString(),
                      payload: {
                        kind: 'whatsapp_bill',
                        msgId: introRecord.id,
                        url: bill.waUrl,
                        bill,
                      },
                    });
                  }

                  if (emailDraft) {
                    if (askEmail) {
                      addPendingApproval({
                        id: introRecord.id,
                        ruleKey: 'sendEmailApplyJob',
                        title: 'Send email / apply for a job',
                        detail: `To: ${emailDraft.to} • Subject: "${emailDraft.subject}"`,
                        timestamp: new Date().toISOString(),
                        payload: {
                          kind: 'gmail_send',
                          msgId: introRecord.id,
                          emailDraft,
                        },
                      });
                    } else {
                      sendGmailMessage(
                        settings.integrations.gmail?.accessToken || '',
                        emailDraft.to,
                        emailDraft.subject,
                        emailDraft.body
                      ).then((res) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === introRecord.id && m.emailDraft
                              ? {
                                  ...m,
                                  emailDraft: {
                                    ...m.emailDraft,
                                    status: res.ok ? 'sent' : 'error',
                                    error: res.error,
                                  },
                                }
                              : m
                          )
                        );
                      });
                    }
                  }

                  if (ytUpload) {
                    addPendingApproval({
                      id: introRecord.id,
                      ruleKey: 'postReplyFbYoutube',
                      title: 'Post or reply on Facebook / YouTube',
                      detail: `YouTube Upload: "${ytUpload.title}"`,
                      timestamp: new Date().toISOString(),
                      payload: {
                        kind: 'yt_upload',
                        msgId: introRecord.id,
                        ytUpload,
                      },
                    });
                  }

                  if (ytComments) {
                    fetchYouTubeComments(
                      settings.integrations.youtube?.accessToken || '',
                      ytComments.videoId
                    ).then((res) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === introRecord.id && m.ytComments
                            ? {
                                ...m,
                                ytComments: {
                                  ...m.ytComments,
                                  status: res.ok ? 'loaded' : 'error',
                                  comments: res.comments || [],
                                  error: res.error,
                                },
                              }
                            : m
                        )
                      );
                    });
                  }

                  if (ytReply) {
                    if (askYtPostReply) {
                      addPendingApproval({
                        id: introRecord.id,
                        ruleKey: 'postReplyFbYoutube',
                        title: 'Post or reply on Facebook / YouTube',
                        detail: `YouTube Reply (${ytReply.parentId}): "${ytReply.text}"`,
                        timestamp: new Date().toISOString(),
                        payload: {
                          kind: 'yt_reply',
                          msgId: introRecord.id,
                          ytReply,
                        },
                      });
                    } else {
                      postYouTubeCommentReply(
                        settings.integrations.youtube?.accessToken || '',
                        ytReply.parentId,
                        ytReply.text
                      ).then((res) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === introRecord.id && m.ytReply
                              ? {
                                  ...m,
                                  ytReply: {
                                    ...m.ytReply,
                                    status: res.ok ? 'posted' : 'error',
                                    error: res.error,
                                  },
                                }
                              : m
                          )
                        );
                      });
                    }
                  }

                  if (fbPost) {
                    if (askYtPostReply || fbPost.mediaType !== 'text') {
                      addPendingApproval({
                        id: introRecord.id,
                        ruleKey: 'postReplyFbYoutube',
                        title: 'Post or reply on Facebook / YouTube',
                        detail: `Facebook Page Post (${fbPost.mediaType}): "${fbPost.message.slice(0, 60)}"`,
                        timestamp: new Date().toISOString(),
                        payload: {
                          kind: 'fb_post',
                          msgId: introRecord.id,
                          fbPost,
                        },
                      });
                    } else {
                      publishFacebookPagePost(
                        settings.integrations.facebookPage?.pageId || '',
                        settings.integrations.facebookPage?.accessToken || '',
                        fbPost.mediaType,
                        fbPost.message
                      ).then((res) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === introRecord.id && m.fbPost
                              ? {
                                  ...m,
                                  fbPost: {
                                    ...m.fbPost,
                                    status: res.ok ? 'posted' : 'error',
                                    postId: res.postId,
                                    error: res.error,
                                  },
                                }
                              : m
                          )
                        );
                      });
                    }
                  }

                  if (fbComments) {
                    fetchFacebookPostComments(
                      settings.integrations.facebookPage?.accessToken || '',
                      fbComments.postId
                    ).then((res) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === introRecord.id && m.fbComments
                            ? {
                                ...m,
                                fbComments: {
                                  ...m.fbComments,
                                  status: res.ok ? 'loaded' : 'error',
                                  comments: res.comments || [],
                                  error: res.error,
                                },
                              }
                            : m
                        )
                      );
                    });
                  }

                  if (fbReply) {
                    if (askYtPostReply) {
                      addPendingApproval({
                        id: introRecord.id,
                        ruleKey: 'postReplyFbYoutube',
                        title: 'Post or reply on Facebook / YouTube',
                        detail: `Facebook Reply (${fbReply.commentId}): "${fbReply.text}"`,
                        timestamp: new Date().toISOString(),
                        payload: {
                          kind: 'fb_reply',
                          msgId: introRecord.id,
                          fbReply,
                        },
                      });
                    } else {
                      postFacebookCommentReply(
                        settings.integrations.facebookPage?.accessToken || '',
                        fbReply.commentId,
                        fbReply.text
                      ).then((res) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === introRecord.id && m.fbReply
                              ? {
                                  ...m,
                                  fbReply: {
                                    ...m.fbReply,
                                    status: res.ok ? 'posted' : 'error',
                                    error: res.error,
                                  },
                                }
                              : m
                          )
                        );
                      });
                    }
                  }

                  if (pcAction) {
                    const ruleTitle =
                      pcAction.actionType === 'send_whatsapp' ||
                      pcAction.actionType === 'send_messenger'
                        ? 'Send WhatsApp / Messenger message'
                        : pcAction.actionType === 'play_media'
                        ? 'Play music / video'
                        : pcAction.actionType === 'type_text'
                        ? 'Type text or press keys on PC'
                        : pcAction.actionType === 'read_file'
                        ? 'Read or open files on PC'
                        : 'Open website or app on PC';
                    const detailStr =
                      pcAction.text !== undefined
                        ? `${pcAction.actionType} (${pcAction.target}): "${pcAction.text}"`
                        : `${pcAction.actionType}: "${pcAction.target}"`;
                    if (askPcRule) {
                      addPendingApproval({
                        id: introRecord.id,
                        ruleKey: pcRuleKey,
                        title: ruleTitle,
                        detail: detailStr,
                        timestamp: new Date().toISOString(),
                        payload: {
                          kind: 'pc_action',
                          msgId: introRecord.id,
                          pcAction,
                        },
                      });
                    } else {
                      executePcAction(pcAction.actionType, pcAction.target, pcAction.text).then((res) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === introRecord.id && m.pcAction
                              ? {
                                  ...m,
                                  pcAction: {
                                    ...m.pcAction,
                                    status: res.ok ? 'done' : 'error',
                                    resultText: res.resultText,
                                    error: res.error,
                                  },
                                }
                              : m
                          )
                        );
                      });
                    }
                  }
                  
                  const introMsg: ChatMessage = {
                    ...formatRecordToChatMessage(introRecord),
                    emotion,
                    fromVoice: options?.fromVoice,
                    saveFileMeta: saveRequest ? {
                      ...saveRequest,
                      size: new Blob([saveRequest.content]).size,
                      status: 'pending',
                      timestamp: new Date().toISOString()
                    } : undefined,
                    bill: bill || undefined,
                    emailDraft,
                    ytUpload,
                    ytComments,
                    ytReply,
                    fbPost,
                    fbComments,
                    fbReply,
                    pcAction,
                    actionCommand
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
        const { cleanText: textAfterSave, saveRequest } = extractSaveFileSignal(result.text);
        const { cleanText: textAfterBill, bill } = extractBillSignal(textAfterSave);
        const { cleanText: textAfterCommand, command } = extractCommandSignal(textAfterBill);
        const { cleanText: textAfterEmail, emailDraft: rawEmailDraft } =
          extractEmailSignal(textAfterCommand);
        const { cleanText: textAfterYtUpload, ytUpload: rawYtUpload } =
          extractYouTubeUploadSignal(textAfterEmail);
        const { cleanText: textAfterYtComments, ytComments: rawYtComments } =
          extractYouTubeCommentsSignal(textAfterYtUpload);
        const { cleanText: textAfterYtReply, ytReply: rawYtReply } =
          extractYouTubeReplySignal(textAfterYtComments);
        const { cleanText: textAfterFbPost, fbPost: rawFbPost } =
          extractFacebookPostSignal(textAfterYtReply);
        const { cleanText: textAfterFbComments, fbComments: rawFbComments } =
          extractFacebookCommentsSignal(textAfterFbPost);
        const { cleanText: textAfterFbReply, fbReply: rawFbReply } =
          extractFacebookReplySignal(textAfterFbComments);
        const { cleanText: textAfterPcAction, pcAction: rawPcAction } =
          extractPcActionSignal(textAfterFbReply);

        const cmdRuleKey =
          command?.type === 'youtube_play' ? 'playMusicVideo' : 'openWebsiteOrAppPc';
        const needsApproval = Boolean(settings.permissionRules?.[cmdRuleKey] ?? true);
        const actionCommand = command
          ? {
              ...command,
              url: getCommandUrl(command),
              status: needsApproval ? ('pending' as const) : ('ready' as const),
            }
          : undefined;

        const askEmail = Boolean(settings.permissionRules?.sendEmailApplyJob ?? true);
        const emailDraft = rawEmailDraft
          ? {
              ...rawEmailDraft,
              status: askEmail ? ('pending' as const) : ('sending' as const),
            }
          : undefined;

        const askYtPostReply = Boolean(settings.permissionRules?.postReplyFbYoutube ?? true);
        const ytUpload = rawYtUpload
          ? {
              ...rawYtUpload,
              status: 'pending' as const,
            }
          : undefined;
        const ytComments = rawYtComments
          ? {
              videoId: rawYtComments.videoId,
              status: 'loading' as const,
              comments: [],
            }
          : undefined;
        const ytReply = rawYtReply
          ? {
              ...rawYtReply,
              status: askYtPostReply ? ('pending' as const) : ('posting' as const),
            }
          : undefined;
        const fbPost = rawFbPost
          ? {
              ...rawFbPost,
              status:
                askYtPostReply || rawFbPost.mediaType !== 'text'
                  ? ('pending' as const)
                  : ('posting' as const),
            }
          : undefined;
        const fbComments = rawFbComments
          ? {
              postId: rawFbComments.postId,
              status: 'loading' as const,
              comments: [],
            }
          : undefined;
        const fbReply = rawFbReply
          ? {
              ...rawFbReply,
              status: askYtPostReply ? ('pending' as const) : ('posting' as const),
            }
          : undefined;

        const pcRuleKey =
          rawPcAction?.actionType === 'send_whatsapp' ||
          rawPcAction?.actionType === 'send_messenger'
            ? ('sendWhatsappMessenger' as const)
            : rawPcAction?.actionType === 'play_media'
            ? ('playMusicVideo' as const)
            : rawPcAction?.actionType === 'type_text'
            ? ('typeTextOrKeysPc' as const)
            : rawPcAction?.actionType === 'read_file'
            ? ('readOrOpenFilesPc' as const)
            : ('openWebsiteOrAppPc' as const);
        const askPcRule = Boolean(settings.permissionRules?.[pcRuleKey] ?? true);
        const pcAction = rawPcAction
          ? {
              ...rawPcAction,
              status: askPcRule ? ('pending' as const) : ('done' as const),
            }
          : undefined;

        if (actionCommand && !needsApproval) {
          const win = window.open(actionCommand.url, '_blank', 'noopener,noreferrer');
          if (!win) {
            showToast('ব্রাউজার নতুন ট্যাব ব্লক করেছে — মেসেজের বাটনে ক্লিক করে খুলুন।');
          }
        }

        const agentRecord = dbService.addMessage({
          agent_id: selectedAgentId,
          role: 'agent',
          content: textAfterPcAction,
          device: 'pc',
          is_system: result.isError,
          error_subtext: result.errorMeta?.subtext,
          team_meta: saveRequest ? { kind: 'save_file' } : undefined
        });

        if (actionCommand && needsApproval) {
          addPendingApproval({
            id: agentRecord.id,
            ruleKey: cmdRuleKey,
            title:
              command?.type === 'youtube_play'
                ? 'Play music / video'
                : 'Open website or app on PC',
            detail: `${actionCommand.type.replace('_', ' ')}: "${actionCommand.query}"`,
            timestamp: new Date().toISOString(),
            payload: {
              kind: 'action_command',
              msgId: agentRecord.id,
              url: actionCommand.url,
            },
          });
        }

        if (saveRequest && (settings.permissionRules?.readOrOpenFilesPc ?? true)) {
          addPendingApproval({
            id: agentRecord.id,
            ruleKey: 'readOrOpenFilesPc',
            title: 'Read or open files on PC',
            detail: `Save file: ${saveRequest.name}`,
            timestamp: new Date().toISOString(),
            payload: {
              kind: 'save_file',
              msgId: agentRecord.id,
              fileName: saveRequest.name,
              fileContent: saveRequest.content,
            },
          });
        }

        if (bill && (settings.permissionRules?.saveOrSendBill ?? true)) {
          addPendingApproval({
            id: agentRecord.id,
            ruleKey: 'saveOrSendBill',
            title: 'Save or send a bill',
            detail: `Bill for ${bill.customerName} (${bill.total} ৳)`,
            timestamp: new Date().toISOString(),
            payload: {
              kind: 'whatsapp_bill',
              msgId: agentRecord.id,
              url: bill.waUrl,
              bill,
            },
          });
        }

        if (emailDraft) {
          if (askEmail) {
            addPendingApproval({
              id: agentRecord.id,
              ruleKey: 'sendEmailApplyJob',
              title: 'Send email / apply for a job',
              detail: `To: ${emailDraft.to} • Subject: "${emailDraft.subject}"`,
              timestamp: new Date().toISOString(),
              payload: {
                kind: 'gmail_send',
                msgId: agentRecord.id,
                emailDraft,
              },
            });
          } else {
            sendGmailMessage(
              settings.integrations.gmail?.accessToken || '',
              emailDraft.to,
              emailDraft.subject,
              emailDraft.body
            ).then((res) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentRecord.id && m.emailDraft
                    ? {
                        ...m,
                        emailDraft: {
                          ...m.emailDraft,
                          status: res.ok ? 'sent' : 'error',
                          error: res.error,
                        },
                      }
                    : m
                )
              );
            });
          }
        }

        if (ytUpload) {
          addPendingApproval({
            id: agentRecord.id,
            ruleKey: 'postReplyFbYoutube',
            title: 'Post or reply on Facebook / YouTube',
            detail: `YouTube Upload: "${ytUpload.title}"`,
            timestamp: new Date().toISOString(),
            payload: {
              kind: 'yt_upload',
              msgId: agentRecord.id,
              ytUpload,
            },
          });
        }

        if (ytComments) {
          fetchYouTubeComments(
            settings.integrations.youtube?.accessToken || '',
            ytComments.videoId
          ).then((res) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentRecord.id && m.ytComments
                  ? {
                      ...m,
                      ytComments: {
                        ...m.ytComments,
                        status: res.ok ? 'loaded' : 'error',
                        comments: res.comments || [],
                        error: res.error,
                      },
                    }
                  : m
              )
            );
          });
        }

        if (ytReply) {
          if (askYtPostReply) {
            addPendingApproval({
              id: agentRecord.id,
              ruleKey: 'postReplyFbYoutube',
              title: 'Post or reply on Facebook / YouTube',
              detail: `YouTube Reply (${ytReply.parentId}): "${ytReply.text}"`,
              timestamp: new Date().toISOString(),
              payload: {
                kind: 'yt_reply',
                msgId: agentRecord.id,
                ytReply,
              },
            });
          } else {
            postYouTubeCommentReply(
              settings.integrations.youtube?.accessToken || '',
              ytReply.parentId,
              ytReply.text
            ).then((res) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentRecord.id && m.ytReply
                    ? {
                        ...m,
                        ytReply: {
                          ...m.ytReply,
                          status: res.ok ? 'posted' : 'error',
                          error: res.error,
                        },
                      }
                    : m
                )
              );
            });
          }
        }

        if (fbPost) {
          if (askYtPostReply || fbPost.mediaType !== 'text') {
            addPendingApproval({
              id: agentRecord.id,
              ruleKey: 'postReplyFbYoutube',
              title: 'Post or reply on Facebook / YouTube',
              detail: `Facebook Page Post (${fbPost.mediaType}): "${fbPost.message.slice(0, 60)}"`,
              timestamp: new Date().toISOString(),
              payload: {
                kind: 'fb_post',
                msgId: agentRecord.id,
                fbPost,
              },
            });
          } else {
            publishFacebookPagePost(
              settings.integrations.facebookPage?.pageId || '',
              settings.integrations.facebookPage?.accessToken || '',
              fbPost.mediaType,
              fbPost.message
            ).then((res) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentRecord.id && m.fbPost
                    ? {
                        ...m,
                        fbPost: {
                          ...m.fbPost,
                          status: res.ok ? 'posted' : 'error',
                          postId: res.postId,
                          error: res.error,
                        },
                      }
                    : m
                )
              );
            });
          }
        }

        if (fbComments) {
          fetchFacebookPostComments(
            settings.integrations.facebookPage?.accessToken || '',
            fbComments.postId
          ).then((res) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentRecord.id && m.fbComments
                  ? {
                      ...m,
                      fbComments: {
                        ...m.fbComments,
                        status: res.ok ? 'loaded' : 'error',
                        comments: res.comments || [],
                        error: res.error,
                      },
                    }
                  : m
              )
            );
          });
        }

        if (fbReply) {
          if (askYtPostReply) {
            addPendingApproval({
              id: agentRecord.id,
              ruleKey: 'postReplyFbYoutube',
              title: 'Post or reply on Facebook / YouTube',
              detail: `Facebook Reply (${fbReply.commentId}): "${fbReply.text}"`,
              timestamp: new Date().toISOString(),
              payload: {
                kind: 'fb_reply',
                msgId: agentRecord.id,
                fbReply,
              },
            });
          } else {
            postFacebookCommentReply(
              settings.integrations.facebookPage?.accessToken || '',
              fbReply.commentId,
              fbReply.text
            ).then((res) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentRecord.id && m.fbReply
                    ? {
                        ...m,
                        fbReply: {
                          ...m.fbReply,
                          status: res.ok ? 'posted' : 'error',
                          error: res.error,
                        },
                      }
                    : m
                )
              );
            });
          }
        }

        if (pcAction) {
          const ruleTitle =
            pcAction.actionType === 'send_whatsapp' ||
            pcAction.actionType === 'send_messenger'
              ? 'Send WhatsApp / Messenger message'
              : pcAction.actionType === 'play_media'
              ? 'Play music / video'
              : pcAction.actionType === 'type_text'
              ? 'Type text or press keys on PC'
              : pcAction.actionType === 'read_file'
              ? 'Read or open files on PC'
              : 'Open website or app on PC';
          const detailStr =
            pcAction.text !== undefined
              ? `${pcAction.actionType} (${pcAction.target}): "${pcAction.text}"`
              : `${pcAction.actionType}: "${pcAction.target}"`;
          if (askPcRule) {
            addPendingApproval({
              id: agentRecord.id,
              ruleKey: pcRuleKey,
              title: ruleTitle,
              detail: detailStr,
              timestamp: new Date().toISOString(),
              payload: {
                kind: 'pc_action',
                msgId: agentRecord.id,
                pcAction,
              },
            });
          } else {
            executePcAction(pcAction.actionType, pcAction.target, pcAction.text).then((res) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentRecord.id && m.pcAction
                    ? {
                        ...m,
                        pcAction: {
                          ...m.pcAction,
                          status: res.ok ? 'done' : 'error',
                          resultText: res.resultText,
                          error: res.error,
                        },
                      }
                    : m
                )
              );
            });
          }
        }

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
          } : undefined,
          bill: bill || undefined,
          emailDraft,
          ytUpload,
          ytComments,
          ytReply,
          fbPost,
          fbComments,
          fbReply,
          pcAction,
          actionCommand
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

  const handleCommandAction = async (msgId: string, type: string, extra?: any) => {
    if (
      type !== 'yt_file_selected' &&
      type !== 'yt_prepare_reply' &&
      type !== 'fb_file_selected' &&
      type !== 'fb_prepare_reply'
    ) {
      removePendingApproval(msgId);
    }
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    if (type === 'whatsapp_bill' && msg.bill) {
      const bill = msg.bill;
      const askSaveBill = settings.permissionRules?.saveOrSendBill ?? true;
      const askSendWa = settings.permissionRules?.sendWhatsappMessenger ?? true;

      if (askSaveBill) {
        const confirmSave = window.confirm(`কাস্টমার "${bill.customerName}" এর জন্য ${bill.total} টাকার বিলটি সেভ করতে চান?`);
        if (!confirmSave) {
          showToast('বিল সেভ করা হয়নি');
        } else {
          saveAgentDataItem('arin', {
            title: `Bill: ${bill.customerName}`,
            customer: bill.customerName,
            total: bill.total,
            items: bill.items,
            phone: bill.phone
          });
          showToast('বিল সেভ করা হয়েছে (Orders)');
        }
      } else {
        saveAgentDataItem('arin', {
          title: `Bill: ${bill.customerName}`,
          customer: bill.customerName,
          total: bill.total,
          items: bill.items,
          phone: bill.phone
        });
      }

      if (askSendWa) {
        const confirmWa = window.confirm('WhatsApp এ বিলটি পাঠাতে চান?');
        if (!confirmWa) return;
      }

      const win = window.open(bill.waUrl, '_blank');
      if (!win) showToast('ব্রাউজার ট্যাব ব্লক করেছে।');
      return;
    }

    if (msg.emailDraft && (type === 'gmail_approve' || type === 'gmail_cancel')) {
      if (type === 'gmail_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.emailDraft
              ? { ...m, emailDraft: { ...m.emailDraft, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `Gmail: ${msg.emailDraft.to}`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('ইমেইল পাঠানো বাতিল করা হয়েছে');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.emailDraft
            ? { ...m, emailDraft: { ...m.emailDraft, status: 'sending', error: undefined } }
            : m
        )
      );

      const res = await sendGmailMessage(
        settings.integrations.gmail?.accessToken || '',
        msg.emailDraft.to,
        msg.emailDraft.subject,
        msg.emailDraft.body
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.emailDraft
            ? {
                ...m,
                emailDraft: {
                  ...m.emailDraft,
                  status: res.ok ? 'sent' : 'error',
                  error: res.error,
                },
              }
            : m
        )
      );

      logFileAction({
        name: `Gmail: ${msg.emailDraft.to}`,
        size: 0,
        status: res.ok ? 'Approved' : 'Denied',
        timestamp: new Date().toISOString(),
      });
      showToast(res.ok ? 'Gmail এর মাধ্যমে ইমেইল পাঠানো হয়েছে!' : `Gmail ত্রুটি: ${res.error}`);
      return;
    }

    if (type === 'yt_file_selected' && extra?.fileName) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.ytUpload
            ? { ...m, ytUpload: { ...m.ytUpload, fileName: extra.fileName, error: undefined } }
            : m
        )
      );
      return;
    }

    if (type === 'yt_prepare_reply' && extra?.parentId && extra?.text) {
      const askYtPostReply = Boolean(settings.permissionRules?.postReplyFbYoutube ?? true);
      const replyMeta = {
        parentId: String(extra.parentId),
        text: String(extra.text),
        status: askYtPostReply ? ('pending' as const) : ('posting' as const),
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ytReply: replyMeta } : m))
      );

      if (askYtPostReply) {
        addPendingApproval({
          id: msgId,
          ruleKey: 'postReplyFbYoutube',
          title: 'Post or reply on Facebook / YouTube',
          detail: `YouTube Reply (${replyMeta.parentId}): "${replyMeta.text}"`,
          timestamp: new Date().toISOString(),
          payload: {
            kind: 'yt_reply',
            msgId,
            ytReply: replyMeta,
          },
        });
      } else {
        const res = await postYouTubeCommentReply(
          settings.integrations.youtube?.accessToken || '',
          replyMeta.parentId,
          replyMeta.text
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.ytReply
              ? {
                  ...m,
                  ytReply: {
                    ...m.ytReply,
                    status: res.ok ? 'posted' : 'error',
                    error: res.error,
                  },
                }
              : m
          )
        );
      }
      return;
    }

    if (msg.ytUpload && (type === 'yt_upload_approve' || type === 'yt_upload_cancel')) {
      if (type === 'yt_upload_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.ytUpload
              ? { ...m, ytUpload: { ...m.ytUpload, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `YouTube Upload: ${msg.ytUpload.title}`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('ইউটিউব ভিডিও আপলোড বাতিল করা হয়েছে');
        return;
      }

      const file = getYouTubeUploadFile(msgId);
      if (!file) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.ytUpload
              ? {
                  ...m,
                  ytUpload: {
                    ...m.ytUpload,
                    status: 'error',
                    error: 'অনুগ্রহ করে আগে একটি ভিডিও ফাইল সিলেক্ট করুন।',
                  },
                }
              : m
          )
        );
        showToast('অনুগ্রহ করে আগে একটি ভিডিও ফাইল সিলেক্ট করুন');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.ytUpload
            ? { ...m, ytUpload: { ...m.ytUpload, status: 'uploading', error: undefined } }
            : m
        )
      );

      const res = await uploadYouTubeVideoResumable(
        settings.integrations.youtube?.accessToken || '',
        file,
        msg.ytUpload.title,
        msg.ytUpload.description,
        msg.ytUpload.tags
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.ytUpload
            ? {
                ...m,
                ytUpload: {
                  ...m.ytUpload,
                  status: res.ok ? 'uploaded' : 'error',
                  videoId: res.videoId,
                  error: res.error,
                },
              }
            : m
        )
      );

      logFileAction({
        name: `YouTube Upload: ${msg.ytUpload.title}`,
        size: file.size,
        status: res.ok ? 'Approved' : 'Denied',
        timestamp: new Date().toISOString(),
      });
      showToast(res.ok ? 'ইউটিউবে ভিডিও আপলোড সফল হয়েছে!' : `YouTube ত্রুটি: ${res.error}`);
      return;
    }

    if (msg.ytReply && (type === 'yt_reply_approve' || type === 'yt_reply_cancel')) {
      if (type === 'yt_reply_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.ytReply
              ? { ...m, ytReply: { ...m.ytReply, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `YouTube Reply: ${msg.ytReply.parentId}`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('ইউটিউব কমেন্ট রিপ্লাই বাতিল করা হয়েছে');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.ytReply
            ? { ...m, ytReply: { ...m.ytReply, status: 'posting', error: undefined } }
            : m
        )
      );

      const res = await postYouTubeCommentReply(
        settings.integrations.youtube?.accessToken || '',
        msg.ytReply.parentId,
        msg.ytReply.text
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.ytReply
            ? {
                ...m,
                ytReply: {
                  ...m.ytReply,
                  status: res.ok ? 'posted' : 'error',
                  error: res.error,
                },
              }
            : m
        )
      );

      logFileAction({
        name: `YouTube Reply: ${msg.ytReply.parentId}`,
        size: 0,
        status: res.ok ? 'Approved' : 'Denied',
        timestamp: new Date().toISOString(),
      });
      showToast(res.ok ? 'ইউটিউব কমেন্টে রিপ্লাই পোস্ট হয়েছে!' : `YouTube ত্রুটি: ${res.error}`);
      return;
    }

    if (type === 'fb_file_selected' && extra?.fileName) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.fbPost
            ? {
                ...m,
                fbPost: {
                  ...m.fbPost,
                  fileName: extra.fileName,
                  mediaType: extra.mediaType || m.fbPost.mediaType,
                  error: undefined,
                },
              }
            : m
        )
      );
      return;
    }

    if (type === 'fb_prepare_reply' && extra?.commentId && extra?.text) {
      const askFbPostReply = Boolean(settings.permissionRules?.postReplyFbYoutube ?? true);
      const replyMeta = {
        commentId: String(extra.commentId),
        text: String(extra.text),
        status: askFbPostReply ? ('pending' as const) : ('posting' as const),
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, fbReply: replyMeta } : m))
      );

      if (askFbPostReply) {
        addPendingApproval({
          id: msgId,
          ruleKey: 'postReplyFbYoutube',
          title: 'Post or reply on Facebook / YouTube',
          detail: `Facebook Reply (${replyMeta.commentId}): "${replyMeta.text}"`,
          timestamp: new Date().toISOString(),
          payload: {
            kind: 'fb_reply',
            msgId,
            fbReply: replyMeta,
          },
        });
      } else {
        const res = await postFacebookCommentReply(
          settings.integrations.facebookPage?.accessToken || '',
          replyMeta.commentId,
          replyMeta.text
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.fbReply
              ? {
                  ...m,
                  fbReply: {
                    ...m.fbReply,
                    status: res.ok ? 'posted' : 'error',
                    error: res.error,
                  },
                }
              : m
          )
        );
      }
      return;
    }

    if (msg.fbPost && (type === 'fb_post_approve' || type === 'fb_post_cancel')) {
      if (type === 'fb_post_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.fbPost
              ? { ...m, fbPost: { ...m.fbPost, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `Facebook Post (${msg.fbPost.mediaType})`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('ফেসবুক পেজ পোস্ট বাতিল করা হয়েছে');
        return;
      }

      const file = getFacebookMediaFile(msgId);
      if (msg.fbPost.mediaType !== 'text' && !file) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.fbPost
              ? {
                  ...m,
                  fbPost: {
                    ...m.fbPost,
                    status: 'error',
                    error:
                      m.fbPost.mediaType === 'photo'
                        ? 'অনুগ্রহ করে আগে একটি ছবি (Photo) ফাইল সিলেক্ট করুন।'
                        : 'অনুগ্রহ করে আগে একটি ভিডিও (Video) ফাইল সিলেক্ট করুন।',
                  },
                }
              : m
          )
        );
        showToast('অনুগ্রহ করে আগে ফাইল সিলেক্ট করুন');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.fbPost
            ? { ...m, fbPost: { ...m.fbPost, status: 'posting', error: undefined } }
            : m
        )
      );

      const res = await publishFacebookPagePost(
        settings.integrations.facebookPage?.pageId || '',
        settings.integrations.facebookPage?.accessToken || '',
        msg.fbPost.mediaType,
        msg.fbPost.message,
        file
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.fbPost
            ? {
                ...m,
                fbPost: {
                  ...m.fbPost,
                  status: res.ok ? 'posted' : 'error',
                  postId: res.postId,
                  error: res.error,
                },
              }
            : m
        )
      );

      logFileAction({
        name: `Facebook Post (${msg.fbPost.mediaType})`,
        size: file?.size || 0,
        status: res.ok ? 'Approved' : 'Denied',
        timestamp: new Date().toISOString(),
      });
      showToast(res.ok ? 'ফেসবুক পেজে পোস্ট সফল হয়েছে!' : `Facebook ত্রুটি: ${res.error}`);
      return;
    }

    if (msg.fbReply && (type === 'fb_reply_approve' || type === 'fb_reply_cancel')) {
      if (type === 'fb_reply_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.fbReply
              ? { ...m, fbReply: { ...m.fbReply, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `Facebook Reply: ${msg.fbReply.commentId}`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('ফেসবুক কমেন্ট রিপ্লাই বাতিল করা হয়েছে');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.fbReply
            ? { ...m, fbReply: { ...m.fbReply, status: 'posting', error: undefined } }
            : m
        )
      );

      const res = await postFacebookCommentReply(
        settings.integrations.facebookPage?.accessToken || '',
        msg.fbReply.commentId,
        msg.fbReply.text
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.fbReply
            ? {
                ...m,
                fbReply: {
                  ...m.fbReply,
                  status: res.ok ? 'posted' : 'error',
                  error: res.error,
                },
              }
            : m
        )
      );

      logFileAction({
        name: `Facebook Reply: ${msg.fbReply.commentId}`,
        size: 0,
        status: res.ok ? 'Approved' : 'Denied',
        timestamp: new Date().toISOString(),
      });
      showToast(res.ok ? 'ফেসবুক কমেন্টে রিপ্লাই পোস্ট হয়েছে!' : `Facebook ত্রুটি: ${res.error}`);
      return;
    }

    if (msg.pcAction && (type === 'pc_action_approve' || type === 'pc_action_cancel')) {
      if (type === 'pc_action_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.pcAction
              ? { ...m, pcAction: { ...m.pcAction, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `PC Action (${msg.pcAction.actionType}): ${msg.pcAction.target}`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('PC অ্যাকশন বাতিল করা হয়েছে');
        return;
      }

      const permEnabled =
        msg.pcAction.actionType === 'open_app_url' || msg.pcAction.actionType === 'play_media'
          ? (settings.pcControl.openAppsAndWebsites ?? true)
          : msg.pcAction.actionType === 'type_text'
          ? (settings.pcControl.typeTextAndPressKeys ?? true)
          : msg.pcAction.actionType === 'send_whatsapp' ||
            msg.pcAction.actionType === 'send_messenger'
          ? Boolean(
              (settings.pcControl.openAppsAndWebsites ?? true) &&
                (settings.pcControl.typeTextAndPressKeys ?? true)
            )
          : (settings.pcControl.readOrOpenFiles ?? true);

      if (!permEnabled) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.pcAction
              ? {
                  ...m,
                  pcAction: {
                    ...m.pcAction,
                    status: 'error',
                    error: 'Settings > PC Control-এ এই পারমিশনটি বন্ধ (OFF) করা আছে।',
                  },
                }
              : m
          )
        );
        showToast('Settings > PC Control-এ এই পারমিশনটি বন্ধ করা আছে');
        return;
      }

      const res = await executePcAction(
        msg.pcAction.actionType,
        msg.pcAction.target,
        msg.pcAction.text
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.pcAction
            ? {
                ...m,
                pcAction: {
                  ...m.pcAction,
                  status: res.ok ? 'done' : 'error',
                  resultText: res.resultText,
                  error: res.error,
                },
              }
            : m
        )
      );

      logFileAction({
        name: `PC Action (${msg.pcAction.actionType}): ${msg.pcAction.target}`,
        size: 0,
        status: res.ok ? 'Approved' : 'Denied',
        timestamp: new Date().toISOString(),
      });
      showToast(res.ok ? res.resultText || 'PC অ্যাকশন সম্পন্ন হয়েছে' : `ত্রুটি: ${res.error}`);
      return;
    }

    if (msg.actionCommand) {
      if (type === 'action_command_cancel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.actionCommand
              ? { ...m, actionCommand: { ...m.actionCommand, status: 'cancelled' } }
              : m
          )
        );
        logFileAction({
          name: `${msg.actionCommand.type}: ${msg.actionCommand.query}`,
          size: 0,
          status: 'Denied',
          timestamp: new Date().toISOString(),
        });
        showToast('কাজটি বাতিল করা হয়েছে');
        return;
      }

      if (type === 'action_command_approve') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.actionCommand
              ? { ...m, actionCommand: { ...m.actionCommand, status: 'ready' } }
              : m
          )
        );
        logFileAction({
          name: `${msg.actionCommand.type}: ${msg.actionCommand.query}`,
          size: 0,
          status: 'Approved',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const command = msg.actionCommand;
      const win = window.open(command.url, '_blank', 'noopener,noreferrer');
      if (!win) showToast('ব্রাউজার ট্যাব ব্লক করেছে।');
    }
  };

  useEffect(() => {
    (window as any).onCommandAction = handleCommandAction;
    registerPendingApprovalResolver((item, approved) => {
      if (item.payload?.kind === 'save_file' && item.payload.msgId) {
        handleSaveFileApproval(item.payload.msgId, approved);
        return;
      }
      if (item.payload?.kind === 'gmail_send' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'gmail_approve' : 'gmail_cancel'
        );
        return;
      }
      if (item.payload?.kind === 'whatsapp_bill' && item.payload.bill) {
        if (approved) {
          saveAgentDataItem('arin', {
            title: `Bill: ${item.payload.bill.customerName}`,
            customer: item.payload.bill.customerName,
            total: item.payload.bill.total,
            items: item.payload.bill.items,
            phone: item.payload.bill.phone,
          });
          logFileAction({
            name: `Bill: ${item.payload.bill.customerName}`,
            size: 0,
            status: 'Approved',
            timestamp: new Date().toISOString(),
          });
        } else {
          logFileAction({
            name: `Bill: ${item.payload.bill.customerName}`,
            size: 0,
            status: 'Denied',
            timestamp: new Date().toISOString(),
          });
        }
        return;
      }
      if (item.payload?.kind === 'action_command' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'action_command_approve' : 'action_command_cancel'
        );
        return;
      }
      if (item.payload?.kind === 'yt_upload' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'yt_upload_approve' : 'yt_upload_cancel'
        );
        return;
      }
      if (item.payload?.kind === 'yt_reply' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'yt_reply_approve' : 'yt_reply_cancel'
        );
        return;
      }
      if (item.payload?.kind === 'fb_post' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'fb_post_approve' : 'fb_post_cancel'
        );
        return;
      }
      if (item.payload?.kind === 'fb_reply' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'fb_reply_approve' : 'fb_reply_cancel'
        );
        return;
      }
      if (item.payload?.kind === 'pc_action' && item.payload.msgId) {
        handleCommandAction(
          item.payload.msgId,
          approved ? 'pc_action_approve' : 'pc_action_cancel'
        );
        return;
      }
    });
    return () => {
      delete (window as any).onCommandAction;
      registerPendingApprovalResolver(null);
    };
  }, [messages, settings.integrations, settings.permissionRules]);

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
