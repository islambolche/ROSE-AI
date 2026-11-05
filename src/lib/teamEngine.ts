import {
  AgentId,
  ChatMessage,
  DelegationMode,
  OfficeAgentPhase,
  TeamDelegationTask,
  FileAttachmentMeta,
} from '../types';
import { IDENTITY_AGENTS_MAP } from '../config/identity';
import { generateAgentAnswer, AgentAnswerResult } from './agentEngine';
import { getAgentData } from './dataSources';

const TEAM_TASKS_STORAGE_KEY = 'rose_team_tasks';

export type SpecialistAgentId = 'mira' | 'arin' | 'zayan' | 'naira';

const SPECIALIST_IDS: SpecialistAgentId[] = ['mira', 'arin', 'zayan', 'naira'];

const BENGALI_AGENT_NAMES: Record<SpecialistAgentId, string> = {
  mira: 'মিরা',
  arin: 'আরিন',
  zayan: 'জায়ান',
  naira: 'নাইরা',
};

export interface DelegatedTaskItem {
  agentId: SpecialistAgentId;
  mode: DelegationMode;
  task: string;
}

export interface SpecialistReportItem {
  agentId: SpecialistAgentId;
  agentName: string;
  mode: DelegationMode;
  task: string;
  reportText: string;
  emotion?: string;
  isError?: boolean;
  errorSubtext?: string;
}

export interface RoseTeamTurnResult extends AgentAnswerResult {
  mode?: 'direct' | DelegationMode;
  skipRoseFinalMessage?: boolean;
  lastHandoffText?: string;
  lastHandoffIsError?: boolean;
}

export interface TeamOrchestrationCallbacks {
  onRoseIntro?: (introText: string, emotion?: string) => void;
  onAskReportFold?: (report: SpecialistReportItem) => void;
  onHandoffAgentReply?: (report: SpecialistReportItem) => void;
  onWorkingAgentsChange?: (
    agentIds: SpecialistAgentId[],
    mode?: DelegationMode
  ) => void;
  onOfficePhaseChange?: (phases: Partial<Record<AgentId, OfficeAgentPhase>>) => void;
}

/**
 * Reads the last 20 team delegation tasks from localStorage.
 */
export function getTeamDelegationTasks(): TeamDelegationTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEAM_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-20).reverse();
  } catch {
    return [];
  }
}

function saveTeamDelegationTask(taskItem: TeamDelegationTask): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(TEAM_TASKS_STORAGE_KEY);
    const list: TeamDelegationTask[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((t) => t.id === taskItem.id);
    if (idx >= 0) {
      list[idx] = taskItem;
    } else {
      list.push(taskItem);
    }
    const trimmed = list.slice(-50);
    localStorage.setItem(TEAM_TASKS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

/**
 * Detects whether a user message explicitly requests HANDOFF or ASK.
 * Ambiguous defaults to 'ask'.
 */
export function detectModeFromUserMessage(userMessage: string): {
  mode: DelegationMode;
  isExplicitHandoff: boolean;
  isExplicitAsk: boolean;
} {
  const text = userMessage.trim();

  // HANDOFF triggers:
  // "মিরাকে বলো আমাকে জানাতে / দিতে / বলতে", "ও-ই বলুক", "সরাসরি মিরার কাছ থেকে", "মিরাকে ডাকো / পাঠাও"
  const handoffRegex =
    /(আমাকে জানাতে|আমাকে দিতে|আমাকে বলতে|জানাতে বলো|বলতে বলো|দিতে বলো|ও-ই বলুক|ওই বলুক|সে-ই বলুক|নিজে বলুক|নিজে জানাক|সরাসরি.*কাছ থেকে|সরাসরি.*বলুক|সরাসরি.*জানাতে|ডাকো|পাঠাও)/i;

  // ASK triggers:
  // "জিজ্ঞেস করো", "জেনে নাও", "খবর নাও", "তথ্য নিয়ে এসো", "নিয়ে আমাকে বলো", "দেখে বলো", "কী অবস্থা জানো"
  const askRegex =
    /(জিজ্ঞেস করো|জেনে নাও|খবর নাও|তথ্য নিয়ে এসো|নিয়ে আমাকে বলো|দেখে বলো|কী অবস্থা জানো|কি অবস্থা জানো|সবার খবর|টিম রিপোর্ট)/i;

  const isExplicitHandoff = handoffRegex.test(text);
  const isExplicitAsk = askRegex.test(text);

  if (isExplicitHandoff && !isExplicitAsk) {
    return { mode: 'handoff', isExplicitHandoff: true, isExplicitAsk: false };
  }
  return { mode: 'ask', isExplicitHandoff: false, isExplicitAsk };
}

/**
 * Parses <<ASK (mira|arin|zayan|naira)>> or <<HANDOFF (mira|arin|zayan|naira)>> lines from Rose's response.
 * Strips all tag lines so they are never shown in chat.
 */
export function parseRoseDelegations(rawText: string): {
  introText: string;
  delegations: DelegatedTaskItem[];
} {
  const lines = rawText.split('\n');
  const introLines: string[] = [];
  const delegationsMap = new Map<SpecialistAgentId, DelegatedTaskItem>();

  const tagLineRegex =
    /<<\s*(ASK|HANDOFF|DELEGATE)\s+(mira|arin|zayan|naira)\s*>>\s*(.*)/i;

  for (const line of lines) {
    const match = line.match(tagLineRegex);
    if (match) {
      const rawTag = match[1].toUpperCase();
      const mode: DelegationMode = rawTag === 'HANDOFF' ? 'handoff' : 'ask';
      const targetId = match[2].toLowerCase() as SpecialistAgentId;
      const taskDesc = (match[3] || '').trim() || 'কাজের সর্বশেষ অবস্থা জানাও';
      if (SPECIALIST_IDS.includes(targetId) && !delegationsMap.has(targetId)) {
        delegationsMap.set(targetId, {
          agentId: targetId,
          mode,
          task: taskDesc,
        });
      }
    } else {
      const cleanedLine = line
        .replace(/<<\s*(?:ASK|HANDOFF|DELEGATE)[^>]*>>/gi, '')
        .trim();
      if (cleanedLine) {
        introLines.push(cleanedLine);
      }
    }
  }

  const delegations = Array.from(delegationsMap.values()).slice(0, 4);

  return {
    introText: introLines.join('\n').trim(),
    delegations,
  };
}

/**
 * Fallback detector when Rose did not output <<ASK ...>> or <<HANDOFF ...>> tags.
 * Checks agent names (মিরা, মীরা, মিম, Mira / আরিন, এরিন, Arin / জায়ান, জাইয়ান, Zayan / নাইরা, নায়রা, Naira)
 * and the ASK / HANDOFF keyword lists.
 * "সবার খবর / টিম রিপোর্ট" -> ASK all 4 agents.
 */
export function detectFallbackDelegations(userMessage: string): DelegatedTaskItem[] {
  const text = userMessage.trim();
  if (!text) return [];

  // 1) "সবার খবর / টিম রিপোর্ট" means ASK all 4 agents
  const teamWideRegex =
    /(সবার খবর|টিম রিপোর্ট|সবাইকে জিজ্ঞেস|সবার অবস্থা|সব এজেন্ট|পুরো টিম)/i;
  if (teamWideRegex.test(text)) {
    return SPECIALIST_IDS.map((agentId) => ({
      agentId,
      mode: 'ask' as DelegationMode,
      task: text,
    }));
  }

  const { mode, isExplicitHandoff, isExplicitAsk } = detectModeFromUserMessage(text);

  // General delegation/inquiry verb check
  const generalInquiryRegex =
    /(জিজ্ঞেস|জেনে|খবর|তথ্য|দেখে বলো|আমাকে বলো|কী অবস্থা|কি অবস্থা|জানাতে|বলতে|দিতে|বলুক|ডাকো|পাঠাও|সরাসরি|রিপোর্ট)/i;

  if (!isExplicitHandoff && !isExplicitAsk && !generalInquiryRegex.test(text)) {
    return [];
  }

  const agentPatterns: Array<{ id: SpecialistAgentId; regex: RegExp }> = [
    { id: 'mira', regex: /(\bmira\b|মিরা|মীরা|মিম)/i },
    { id: 'arin', regex: /(\barin\b|আরিন|এরিন)/i },
    { id: 'zayan', regex: /(\bzayan\b|জায়ান|জাইয়ান|যায়ান)/i },
    { id: 'naira', regex: /(\bnaira\b|নাইরা|নায়রা)/i },
  ];

  // Preserve order of appearance in user's message
  const matchedWithIndex: Array<{ item: DelegatedTaskItem; index: number }> = [];
  for (const pat of agentPatterns) {
    const m = pat.regex.exec(text);
    if (m) {
      matchedWithIndex.push({
        index: m.index,
        item: {
          agentId: pat.id,
          mode,
          task: text,
        },
      });
    }
  }

  matchedWithIndex.sort((a, b) => a.index - b.index);
  return matchedWithIndex.slice(0, 4).map((x) => x.item);
}

/**
 * Formats Rose's short 1-sentence handoff acknowledgement ("ঠিক আছে, মিরাকে বলছি।")
 * without any summary, guess, or extra commentary.
 */
function buildRoseHandoffShortSentence(agentIds: SpecialistAgentId[]): string {
  const bnNames = agentIds.map((id) => BENGALI_AGENT_NAMES[id] || IDENTITY_AGENTS_MAP[id].name);
  if (bnNames.length === 1) {
    return `ঠিক আছে, ${bnNames[0]}কে বলছি।`;
  }
  if (bnNames.length === 2) {
    return `ঠিক আছে, ${bnNames[0]} ও ${bnNames[1]}কে বলছি।`;
  }
  const last = bnNames[bnNames.length - 1];
  const rest = bnNames.slice(0, -1).join(', ');
  return `ঠিক আছে, ${rest} ও ${last}কে বলছি।`;
}

/**
 * Executes a single specialist task with their own system prompt + getAgentData(agentId) +
 * "Rose তোমাকে জিজ্ঞেস করেছেন: <কাজ>".
 */
async function executeSpecialistTask(
  delegation: DelegatedTaskItem,
  fromVoice?: boolean,
  uploadedFile?: FileAttachmentMeta
): Promise<SpecialistReportItem> {
  const { agentId, mode, task } = delegation;
  const agentIdent = IDENTITY_AGENTS_MAP[agentId];
  const dataState = getAgentData(agentId);

  const taskRecordId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'ttsk_' + Math.random().toString(36).substring(2, 12);

  const nowTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  saveTeamDelegationTask({
    id: taskRecordId,
    from: 'rose',
    to: agentId,
    task,
    status: 'doing',
    result: '',
    time: nowTime,
  });

  const modeInstruction =
    mode === 'handoff'
      ? `HANDOFF নির্দেশ: ব্যবহারকারী সরাসরি তোমার কাছ থেকে উত্তর জানতে চেয়েছেন। ১-৩ বাক্যে বাংলায় সরাসরি ব্যবহারকারীকে নিজের চরিত্রে উত্তর দাও।`
      : `ASK নির্দেশ: ১-৩ বাক্যে বাংলায় শুধু Rose (Chief Manager)-কে রিপোর্ট দাও।`;

  const specialistInstruction = `Rose তোমাকে জিজ্ঞেস করেছেন: ${task}
তোমার ডেটা (${agentId}): ${JSON.stringify(dataState)}
নিয়ম: ডেটা সংযুক্ত না থাকলে (connected === false) সৎভাবে বলবে "এই ডেটা এখনও সংযুক্ত নেই", কিছু বানাবে না। ডেটা সংযুক্ত কিন্তু items খালি থাকলে বলবে নতুন কিছু নেই।
${modeInstruction}`;

  const syntheticUserMsg: ChatMessage = {
    id: `del_${Date.now()}_${agentId}`,
    sender: 'user',
    senderName: 'Rose (Chief Manager)',
    text: `Rose তোমাকে জিজ্ঞেস করেছেন: ${task}`,
    timestamp: nowTime,
    fromVoice,
  };

  try {
    const res = await generateAgentAnswer(agentId, [syntheticUserMsg], {
      extraSystemPrompt: specialistInstruction,
      fromVoice,
      uploadedFile,
    });

    const cleanReport = res.isError
      ? res.text.split('\n')[0].trim()
      : res.text.trim();

    saveTeamDelegationTask({
      id: taskRecordId,
      from: 'rose',
      to: agentId,
      task,
      status: res.isError ? 'failed' : 'done',
      result: cleanReport,
      time: nowTime,
    });

    return {
      agentId,
      agentName: agentIdent.name,
      mode,
      task,
      reportText: cleanReport,
      emotion: res.emotion,
      isError: res.isError,
      errorSubtext: res.errorMeta?.subtext,
    };
  } catch {
    const fallbackErr = 'সময়সীমা শেষ বা সংযোগ ব্যর্থ';
    saveTeamDelegationTask({
      id: taskRecordId,
      from: 'rose',
      to: agentId,
      task,
      status: 'failed',
      result: fallbackErr,
      time: nowTime,
    });

    return {
      agentId,
      agentName: agentIdent.name,
      mode,
      task,
      reportText: fallbackErr,
      isError: true,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main entry point for handling a user message to Rose with ASK or HANDOFF delegation.
 */
export async function handleRoseTeamTurn(
  history: ChatMessage[],
  callbacks?: TeamOrchestrationCallbacks,
  options?: { fromVoice?: boolean; uploadedFile?: FileAttachmentMeta }
): Promise<RoseTeamTurnResult> {
  const lastUserMsgObj = [...history].reverse().find((m) => m.sender === 'user');
  const lastUserMessage = lastUserMsgObj?.text || '';
  const isFromVoice = Boolean(options?.fromVoice || lastUserMsgObj?.fromVoice);

  const userIntent = detectModeFromUserMessage(lastUserMessage);
  const isTeamWideAsk =
    /(সবার খবর|টিম রিপোর্ট|সবাইকে জিজ্ঞেস|সবার অবস্থা|সব এজেন্ট|পুরো টিম)/i.test(
      lastUserMessage
    );

  // If the user explicitly asked for a direct HANDOFF or team-wide ASK with clear agent names,
  // check fallback detector first so we can still let Rose respond or orchestrate accurately
  const roseExtraPrompt = `মনে রাখো: কাজ ভাগ করতে হলে প্রথমে ছোট একটা বাক্য লেখো, তারপর আলাদা লাইনে <<ASK mira>> কাজের বর্ণনা অথবা <<HANDOFF mira>> কাজের বর্ণনা লেখো (এজেন্ট: mira/arin/zayan/naira)। HANDOFF হলে শুধু একটা ছোট বাক্য বলবে (যেমন "ঠিক আছে, মিরাকে বলছি।"), কোনো তথ্য বা অনুমান যোগ করবে না। সাধারণ কথা হলে কোনো ট্যাগ লিখবে না।`;

  const firstStepResult = await generateAgentAnswer('rose', history, {
    extraSystemPrompt: roseExtraPrompt,
    fromVoice: isFromVoice,
    uploadedFile: options?.uploadedFile,
  });

  if (firstStepResult.isError) {
    return {
      ...firstStepResult,
      mode: 'direct',
    };
  }

  // Parse <<ASK ...>> / <<HANDOFF ...>> tags from Rose's response
  let { introText, delegations } = parseRoseDelegations(firstStepResult.text);

  // Fallback if Rose did not write tags
  if (delegations.length === 0) {
    const fallbackList = detectFallbackDelegations(lastUserMessage);
    if (fallbackList.length > 0) {
      delegations = fallbackList;
    }
  } else {
    // Ensure explicit user intent overrides ambiguous model tag mode
    if (isTeamWideAsk) {
      delegations = delegations.map((d) => ({ ...d, mode: 'ask' }));
    } else if (userIntent.isExplicitHandoff) {
      delegations = delegations.map((d) => ({ ...d, mode: 'handoff' }));
    } else if (userIntent.isExplicitAsk) {
      delegations = delegations.map((d) => ({ ...d, mode: 'ask' }));
    }
  }

  // If no delegations needed, Rose answers directly (one party answers)
  if (delegations.length === 0) {
    return {
      ...firstStepResult,
      text: introText || firstStepResult.text,
      mode: 'direct',
      skipRoseFinalMessage: false,
    };
  }

  // Determine unified turn mode (if any is handoff -> handoff, otherwise ask; ambiguous defaults to ask)
  const turnMode: DelegationMode = delegations.some((d) => d.mode === 'handoff')
    ? 'handoff'
    : 'ask';

  const normalizedDelegations = delegations.slice(0, 4).map((d) => ({
    ...d,
    mode: turnMode,
  }));
  const targetIds = normalizedDelegations.map((d) => d.agentId);

  // ============================================================================
  // MODE 1: HANDOFF (এজেন্ট নিজে সরাসরি দেবে, ক্রমে একজন শেষ করলে পরের জন)
  // ============================================================================
  if (turnMode === 'handoff') {
    // Rose শুধু একটা ছোট বাক্য বলবে ("ঠিক আছে, মিরাকে বলছি।")। কোনো তথ্য, সারাংশ, অনুমান বা মন্তব্য যোগ করবে না।
    const shortHandoffSentence = buildRoseHandoffShortSentence(targetIds);
    if (callbacks?.onRoseIntro) {
      callbacks.onRoseIntro(shortHandoffSentence, 'warm');
    }

    let lastReplyText = '';
    let lastReplyIsError = false;

    // গ) একাধিক এজেন্ট: HANDOFF-এ ক্রমে, একজন শেষ করলে পরের জন (কখনও একসাথে নয়)
    for (const del of normalizedDelegations) {
      // চ) HANDOFF-এ Rose থেকে এজেন্ট পর্যন্ত আলোর রেখা যাবে
      if (callbacks?.onOfficePhaseChange) {
        callbacks.onOfficePhaseChange({
          rose: 'handoff_to',
          mira: del.agentId === 'mira' ? 'handoff_to' : 'idle',
          arin: del.agentId === 'arin' ? 'handoff_to' : 'idle',
          zayan: del.agentId === 'zayan' ? 'handoff_to' : 'idle',
          naira: del.agentId === 'naira' ? 'handoff_to' : 'idle',
        });
      }

      await delay(550);

      // তারপর শুধু ওই এজেন্টের গ্লো ধুকধুক করবে যতক্ষণ সে উত্তর দিচ্ছে
      if (callbacks?.onOfficePhaseChange) {
        callbacks.onOfficePhaseChange({
          rose: 'idle',
          mira: del.agentId === 'mira' ? 'handoff_speaking' : 'idle',
          arin: del.agentId === 'arin' ? 'handoff_speaking' : 'idle',
          zayan: del.agentId === 'zayan' ? 'handoff_speaking' : 'idle',
          naira: del.agentId === 'naira' ? 'handoff_speaking' : 'idle',
        });
      }

      if (callbacks?.onWorkingAgentsChange) {
        callbacks.onWorkingAgentsChange([del.agentId], 'handoff');
      }

      const rep = await executeSpecialistTask(del, isFromVoice, options?.uploadedFile);
      lastReplyText = rep.reportText;
      lastReplyIsError = Boolean(rep.isError);

      if (callbacks?.onHandoffAgentReply) {
        callbacks.onHandoffAgentReply(rep);
      }

      // Reset this agent's phase before next sequential agent
      if (callbacks?.onOfficePhaseChange) {
        callbacks.onOfficePhaseChange({
          [del.agentId]: 'idle',
        });
      }
    }

    if (callbacks?.onWorkingAgentsChange) {
      callbacks.onWorkingAgentsChange([]);
    }

    if (callbacks?.onOfficePhaseChange) {
      callbacks.onOfficePhaseChange({
        rose: 'idle',
        mira: 'idle',
        arin: 'idle',
        zayan: 'idle',
        naira: 'idle',
      });
    }

    // Rose আর কিছু বলবে না (এক পক্ষ উত্তর দেবে)
    return {
      text: '',
      emotion: 'warm',
      provider: firstStepResult.provider,
      model: firstStepResult.model,
      isError: false,
      mode: 'handoff',
      skipRoseFinalMessage: true,
      lastHandoffText: lastReplyText,
      lastHandoffIsError: lastReplyIsError,
    };
  }

  // ============================================================================
  // MODE 2: ASK (Rose ভেতরে তথ্য এনে নিজে ১-৩ বাক্যে উত্তর দেবে)
  // ============================================================================
  // চ) ASK-তে Rose থেকে এজেন্ট পর্যন্ত আলোর রেখা যাবে ও ফিরবে
  if (callbacks?.onOfficePhaseChange) {
    const delegatingPhases: Partial<Record<AgentId, OfficeAgentPhase>> = {
      rose: 'delegating',
    };
    for (const id of targetIds) {
      delegatingPhases[id] = 'delegating';
    }
    callbacks.onOfficePhaseChange(delegatingPhases);
  }

  if (callbacks?.onWorkingAgentsChange) {
    callbacks.onWorkingAgentsChange(targetIds, 'ask');
  }

  const workingTimer = setTimeout(() => {
    if (callbacks?.onOfficePhaseChange) {
      const workingPhases: Partial<Record<AgentId, OfficeAgentPhase>> = {
        rose: 'working',
      };
      for (const id of targetIds) {
        workingPhases[id] = 'working';
      }
      callbacks.onOfficePhaseChange(workingPhases);
    }
  }, 450);

  // গ) ASK-তে ভেতরে একসাথে তথ্য নেওয়া যাবে
  const reports: SpecialistReportItem[] = await Promise.all(
    normalizedDelegations.map(async (del) => {
      const rep = await executeSpecialistTask(del, isFromVoice, options?.uploadedFile);
      // চ্যাটে শুধু একটা ধূসর ছোট লাইন "Rose → Mira থেকে তথ্য নিল" (চাপলে ভাঁজ খুলে এজেন্টের রিপোর্ট দেখা যাবে)
      if (callbacks?.onAskReportFold) {
        callbacks.onAskReportFold(rep);
      }
      // আলোর রেখা এজেন্ট থেকে Rose-এ ফিরবে
      if (callbacks?.onOfficePhaseChange) {
        callbacks.onOfficePhaseChange({
          [del.agentId]: 'reporting',
          rose: 'reporting',
        });
      }
      return rep;
    })
  );

  clearTimeout(workingTimer);

  if (callbacks?.onWorkingAgentsChange) {
    callbacks.onWorkingAgentsChange([]);
  }

  const formattedReportsText = reports
    .map((r) => `${r.agentName} (${r.agentId})-এর অভ্যন্তরীণ রিপোর্ট: ${r.reportText}`)
    .join('\n');

  // তারপর শুধু Rose ব্যবহারকারীকে ১-৩ বাক্যে বাংলায় উত্তর দেবে
  const summaryInstruction = `তুমি ভেতরে টিমের কাছ থেকে তথ্য নিয়েছ। নিচের রিপোর্টগুলো থেকে ব্যবহারকারীকে ১-৩ বাক্যে বাংলায় সরাসরি তোমার উত্তর দাও। রিপোর্টে যা নেই তা বানাবে না। ডেটা সংযুক্ত নেই বললে সেটা সৎভাবে জানাও। কোনো <<ASK>> বা <<HANDOFF>> লাইন লিখবে না।`;

  const summaryHistory: ChatMessage[] = [
    ...history,
    {
      id: `rep_bundle_${Date.now()}`,
      sender: 'user',
      senderName: 'Internal Team Reports',
      text: `ব্যবহারকারীর মেসেজ ছিল: "${lastUserMessage}"\n\nটিমের অভ্যন্তরীণ রিপোর্ট:\n${formattedReportsText}\n\nএখন শুধু তুমি (Rose) ব্যবহারকারীকে ১-৩ বাক্যে বাংলায় উত্তর দাও।`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      fromVoice: isFromVoice,
    },
  ];

  const finalSummaryResult = await generateAgentAnswer('rose', summaryHistory, {
    extraSystemPrompt: summaryInstruction,
    fromVoice: isFromVoice,
  });

  if (callbacks?.onOfficePhaseChange) {
    callbacks.onOfficePhaseChange({
      rose: 'idle',
      mira: 'idle',
      arin: 'idle',
      zayan: 'idle',
      naira: 'idle',
    });
  }

  const cleanedSummary = finalSummaryResult.text
    .replace(/<<\s*(?:ASK|HANDOFF|DELEGATE)[^>]*>>.*/gi, '')
    .trim();

  return {
    ...finalSummaryResult,
    text: cleanedSummary || finalSummaryResult.text,
    mode: 'ask',
    skipRoseFinalMessage: false,
  };
}
