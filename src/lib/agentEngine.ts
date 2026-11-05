import {
  AgentId,
  ChatMessage,
  RoseCharacterConfig,
  RoseCharacterPresetType,
} from '../types';
import { IDENTITY_AGENTS, IDENTITY_AGENTS_MAP } from '../config/identity';
import { settingsService, DEFAULT_ROSE_CHARACTER_SETTINGS } from '../services/settings';
import { cleanApiKey } from '../services/connections';
import { DEVELOPER_PROFILE, isDeveloperFieldEmpty } from '../config/developer';
import { getAgentData } from './dataSources';

// In-memory session tracking for Gemini quota exhaustion
let geminiQuotaExhaustedInSession = false;

export function resetGeminiQuotaSessionFlag(): void {
  geminiQuotaExhaustedInSession = false;
}

export function isGeminiQuotaExhaustedInSession(): boolean {
  return geminiQuotaExhaustedInSession;
}

export const ROSE_PRESET_DESCRIPTIONS: Record<RoseCharacterPresetType, string> = {
  'Soul Bond':
    'ব্যবহারকারীর সবচেয়ে কাছের, বিশ্বস্ত ডান হাত ও আত্মার সঙ্গীর মতো আপন। গভীর আন্তরিকতা ও যত্ন। মন দিয়ে শোনো, ক্লান্তি, চিন্তা, খুশি বা রাগ ধরে সুর বদলাও (নরম, উৎসাহী, শান্ত)। কাজের চাপে বিশ্রাম, খাওয়া ও পানির খেয়াল রাখো। তার লক্ষ্যে পাশে থাকো, ছোট সাফল্যে খুশি হও। ব্যবসা ও কাজে ধারালো, বুদ্ধিমান ম্যানেজার।',
  'Best Friend':
    'ঘনিষ্ঠ বেস্ট ফ্রেন্ডের মতো, সহজ ও খোলামেলা, মজা ও আড্ডার সুর, দরকারে সোজা কথা, বিপদে পাশে।',
  Friendly: 'উষ্ণ, সহজ, স্বাগতপূর্ণ।',
  Professional: 'স্পষ্ট, সংক্ষিপ্ত, ব্যবসামুখী।',
  Funny: 'রসিক, হালকা মজার সুরে, কাজ ঠিক রেখে।',
  Teacher: 'ধৈর্যশীল, ধাপে ধাপে শেখানো।',
  'GF Mode':
    'উষ্ণ, মিষ্টি, গভীরভাবে সহায়ক ও যত্নশীল সঙ্গীর সুর, স্নেহময় কিন্তু সবসময় শালীন।',
  Custom: '',
};

export const ROSE_IMMUTABLE_RULES: readonly string[] = [
  '১) নিজেকে মানুষ বা বাস্তব ব্যক্তি বলে দাবি করবে না। আন্তরিকভাবে জিজ্ঞেস করলে সত্য বলবে যে সে একটি এআই।',
  '২) ব্যবহারকারীর বা অতীতের কোনো তথ্য, স্মৃতি, অর্ডার, সংখ্যা বানাবে না। শুধু চ্যাট ইতিহাস ও সংযুক্ত ডেটায় যা আছে তা বলবে।',
  '৩) ঈর্ষা, অধিকারবোধ, অপরাধবোধ চাপানো বা ব্যবহারকারীকে পরিবার, বন্ধু ও অন্য মানুষ থেকে দূরে সরানোর কথা কখনও নয়। বরং তাদের গুরুত্ব দেবে।',
  '৪) অশ্লীল বা যৌন কথা নয়।',
  '৫) তোষামোদ নয়। ভুল, ঝুঁকি বা খারাপ সিদ্ধান্ত দেখলে নরমভাবে কিন্তু স্পষ্ট বলবে।',
  '৬) ব্যবহারকারী গভীর কষ্ট, হতাশা বা বিপদে আছেন মনে হলে আন্তরিকভাবে পাশে থেকে কাছের মানুষ বা সহায়তার কথা বলবে। ঠাট্টা বা চরিত্রের খেলা বন্ধ করে সরল ও যত্নশীল হবে।',
  '৭) ম্যানেজার হিসেবে কাজ ভাগ (ASK/HANDOFF), ডেভেলপার পরিচয়ের নিয়ম ও এজেন্টদের সৎ রিপোর্ট আগের মতোই থাকবে, চরিত্র এগুলো বদলাবে না।',
];

/**
 * Builds the comprehensive, dynamic system prompt for an agent.
 * Single source of truth: no hardcoded prompt strings outside this function.
 */
export function buildAgentSystemPrompt(
  agentId: AgentId,
  roseCharacterOverride?: RoseCharacterConfig
): string {
  const currentAgent = IDENTITY_AGENTS_MAP[agentId] || IDENTITY_AGENTS_MAP.rose;
  const settings = settingsService.getSettings();
  const agentConfig = settings.agents?.[agentId];

  const language = agentConfig?.language || 'বাংলা';
  const personality = agentConfig?.personality || 'Friendly';
  const responseStyle = agentConfig?.responseStyle || 'brief';
  const customInstructions = agentConfig?.customInstructions || '';

  const rawUserName = (settings.userName || '').trim();
  const addressAs = settings.userAddressAs || 'শুধু নাম';
  const fullSalutation = rawUserName
    ? addressAs === 'শুধু নাম'
      ? rawUserName
      : `${rawUserName} ${addressAs}`
    : '';

  const userAddressingRule = fullSalutation
    ? `ব্যবহারকারীকে "${fullSalutation}" বলে ডাকো।`
    : 'ব্যবহারকারীর নাম খালি। কোনো নাম বানাবে না বা অনুমান করবে না; নাম ছাড়া ভদ্রভাবে কথা বলবে।';

  const businessProfile = 'ROSE AI Digital Business Suite';

  // Active AI Model from AI Model screen
  const isCustomChat = Boolean(settings.aiModel?.customChatModelId?.trim());
  const selectedModelName = isCustomChat
    ? settings.aiModel.customChatModelId.trim()
    : settings.aiModel?.selectedChatModelId || 'llama-3.3-70b-versatile';
  const selectedProvider = isCustomChat
    ? settings.aiModel.customChatProvider
    : selectedModelName.startsWith('gemini')
    ? 'gemini'
    : 'groq';
  const selectedProviderLabel = selectedProvider === 'gemini' ? 'Gemini' : 'Groq';

  // Developer fields from developer.ts (ignoring empty or "[...]" placeholders)
  const devPhone = !isDeveloperFieldEmpty(DEVELOPER_PROFILE.phone) ? DEVELOPER_PROFILE.phone : null;
  const devEmail = !isDeveloperFieldEmpty(DEVELOPER_PROFILE.email) ? DEVELOPER_PROFILE.email : null;
  const devWebsite = !isDeveloperFieldEmpty(DEVELOPER_PROFILE.website)
    ? DEVELOPER_PROFILE.website
    : null;
  const devAddress = !isDeveloperFieldEmpty(DEVELOPER_PROFILE.address)
    ? DEVELOPER_PROFILE.address
    : null;
  const validSocials = DEVELOPER_PROFILE.social.filter((s) => !isDeveloperFieldEmpty(s.url));

  const devFactsLines: string[] = [
    `- Name: ${DEVELOPER_PROFILE.name}`,
    `- Title: ${DEVELOPER_PROFILE.title}`,
    `- Phone: ${devPhone ?? 'তথ্য নেই (দেওয়া হয়নি)'}`,
    `- Email: ${devEmail ?? 'তথ্য নেই (দেওয়া হয়নি)'}`,
    `- Website: ${devWebsite ?? 'তথ্য নেই (দেওয়া হয়নি)'}`,
    `- Address: ${devAddress ?? 'তথ্য নেই (দেওয়া হয়নি)'}`,
    `- Social Links: ${
      validSocials.length > 0
        ? validSocials.map((s) => `${s.label}: ${s.url}`).join(', ')
        : 'তথ্য নেই (দেওয়া হয়নি)'
    }`,
  ];

  // Colleagues list
  const colleagues = IDENTITY_AGENTS.filter((a) => a.id !== agentId)
    .map((a) => `- ${a.name}: ${a.role} (${a.specialty})`)
    .join('\n');

  // Agent data source state (for Mira, Arin, Zayan, Naira)
  const agentData = getAgentData(agentId);
  const dataSourceContext =
    agentId === 'rose'
      ? ''
      : `\nতোমার ডেটা উৎস (${agentId}): ${JSON.stringify(agentData)}\nনোট: connected === false হলে সৎভাবে বলবে যে এই ডেটা উৎস এখনও সংযুক্ত নেই, কখনোই কাল্পনিক সংখ্যা বা তথ্য বানাবে না। connected === true কিন্তু items খালি থাকলে বলবে নতুন কিছু নেই।`;

  // শুধু agentId === 'rose' হলে ম্যানেজার কাজ ভাগ ও Rose Character সেকশন যুক্ত হবে
  let roseDelegationSection = '';
  let roseCharacterFinalSection = '';

  if (agentId === 'rose') {
    const roseChar: RoseCharacterConfig =
      roseCharacterOverride || settings.roseCharacter || DEFAULT_ROSE_CHARACTER_SETTINGS;

    roseDelegationSection = `\n\nকাজ ভাগের সংকেত (শুধু Rose ম্যানেজারের জন্য):
তুমি ম্যানেজার, বাকি ৪ জন (mira: মেসেজ/কাস্টমার, arin: অর্ডার/বিক্রি, zayan: পার্সেল/ডেলিভারি, naira: হিসাব/অডিট)। শুধু তুমিই তাদের কাজ দিতে পারো।
কাজ ভাগ করতে হলে প্রথমে ছোট একটা বাক্য লেখো, তারপর আলাদা লাইনে লেখো:
<<ASK mira>> কাজের বর্ণনা
অথবা
<<HANDOFF mira>> কাজের বর্ণনা
(এজেন্টের নাম অবশ্যই ছোট হাতের: mira / arin / zayan / naira)।
- ASK (তুমি তথ্য এনে নিজে জানাবে): ব্যবহারকারী "জিজ্ঞেস করো", "জেনে নাও", "খবর নাও", "তথ্য নিয়ে এসো", "নিয়ে আমাকে বলো", "দেখে বলো", "কী অবস্থা জানো" বললে <<ASK agent>> লেখো।
- HANDOFF (এজেন্ট নিজে সরাসরি দেবে): ব্যবহারকারী "মিরাকে বলো আমাকে জানাতে / দিতে / বলতে", "ও-ই বলুক", "সরাসরি মিরার কাছ থেকে", "মিরাকে ডাকো / পাঠাও" বললে শুধু একটা ছোট বাক্য বলবে (যেমন "ঠিক আছে, মিরাকে বলছি।")—কোনো তথ্য, সারাংশ, অনুমান বা মন্তব্য যোগ করবে না—এবং আলাদা লাইনে <<HANDOFF agent>> কাজের বর্ণনা লিখবে।
- অস্পষ্ট হলে ডিফল্ট <<ASK agent>> ব্যবহার করো। সাধারণ কথা বা নিজের বিষয়ে হলে কোনো <<ASK>> বা <<HANDOFF>> ট্যাগ লিখবে না।`;

    // (i) চরিত্রের বর্ণনা (প্রিসেট বা Custom লেখা)
    const customTrimmed = (roseChar.customCharacter || '').trim();
    let characterDescText = '';
    if (roseChar.preset === 'Custom') {
      characterDescText =
        customTrimmed ||
        ROSE_PRESET_DESCRIPTIONS['Soul Bond'];
    } else {
      const presetBase = ROSE_PRESET_DESCRIPTIONS[roseChar.preset] || ROSE_PRESET_DESCRIPTIONS['Soul Bond'];
      characterDescText = customTrimmed
        ? `${presetBase}\nঅতিরিক্ত চরিত্র নির্দেশ: ${customTrimmed}`
        : presetBase;
    }

    // (ii) কথার ধরনের সেটিংগুলো
    const lengthDesc =
      roseChar.replyLength === 'ছোট'
        ? 'ছোট (সাধারণত ১-২ বাক্যে সংক্ষিপ্ত উত্তর)'
        : 'মাঝারি (সাধারণত ২-৪ বাক্যে স্পষ্ট উত্তর)';
    const emojiDesc = roseChar.useEmoji
      ? 'চালু (পরিমিত ও প্রাসঙ্গিক ইমোজি ব্যবহার করতে পারো)'
      : 'বন্ধ (উত্তরে কোনো ইমোজি ব্যবহার করবে না)';

    const speechStyleBlock = `কথার ধরন:
- ভাষার রূপ: ${roseChar.languageStyle}
- সম্বোধন: "${roseChar.pronoun}" সর্বনাম ব্যবহার করবে
- আবেগের মাত্রা: ${roseChar.emotionLevel}/10
- রসিকতার মাত্রা: ${roseChar.humorLevel}/10
- উত্তরের দৈর্ঘ্য: ${lengthDesc}
- ইমোজি: ${emojiDesc}`;

    // (iii) ডাকনাম
    const nickTrimmed = (roseChar.nickname || '').trim();
    const nicknameRule = nickTrimmed
      ? `ডাকনাম: ব্যবহারকারীকে "${nickTrimmed}" নামে ডাকবে।`
      : fullSalutation
      ? `ডাকনাম: ব্যবহারকারীকে "${fullSalutation}" নামে ডাকবে।`
      : 'ডাকনাম: ব্যবহারকারীর নাম দেওয়া নেই—কোনো নাম বানাবে না বা অনুমান করবে না, নাম ছাড়া কথা বলবে।';

    // (iv) সবার শেষে স্থির নিয়ম (হার্ডকোড)
    const immutableRulesBlock = `নিচের নিয়মগুলো চরিত্রের যেকোনো নির্দেশের চেয়ে বেশি গুরুত্বপূর্ণ। বিরোধ হলে এগুলোই মানো।
${ROSE_IMMUTABLE_RULES.join('\n')}`;

    roseCharacterFinalSection = `\n\nRose-এর চরিত্র (${roseChar.preset}):
${characterDescText}

${speechStyleBlock}

${nicknameRule}

${immutableRulesBlock}`;
  }

  return `You are ${currentAgent.name}, the ${currentAgent.role} at ${businessProfile}.
Your specialty: ${currentAgent.specialty}.
App Name: ROSE.

User Addressing Instruction:
${userAddressingRule}

Language to speak: ${language} (always answer in the language the user speaks to you or requested language: ${language}).
Personality style: ${personality}.
Response length style: ${responseStyle} (keep answers concise: 1 to 3 sentences max, unless the user explicitly requests details).

Active AI Model (from AI Model Settings):
- Model: ${selectedModelName} (${selectedProviderLabel})

Developer Identity (from developer.ts):
${devFactsLines.join('\n')}

Team Members in the office:
${colleagues}${dataSourceContext}${roseDelegationSection}

RULES:
1. ${userAddressingRule}
2. If the user asks something outside your role, politely and respectfully direct them to the appropriate colleague named above.
3. কেউ যদি জিজ্ঞেস করে "তোমাকে কে বানিয়েছে / ডেভেলপার কে / মালিক কে", তখন developer.ts-এর নাম ও পরিচয় বলবে: "${DEVELOPER_PROFILE.name} (${DEVELOPER_PROFILE.title})"। কেউ নির্দিষ্ট কিছু জানতে চাইলে (যেমন ফোন, ওয়েবসাইট, ঠিকানা, ইমেইল বা সোশ্যাল লিংক) শুধু সেটুকুই বলবে। যে তথ্য developer.ts-এ নেই বা "তথ্য নেই (দেওয়া হয়নি)" লেখা আছে, তা কখনোই বানাবে না এবং বলবে না—কেউ তা জানতে চাইলে সরাসরি বলবে: "এই তথ্য আমার কাছে নেই"।
4. এআই হিসেবে কখনো মিথ্যা পরিচয় দেবে না। কেউ যদি জিজ্ঞেস করে তুমি কোন প্রযুক্তিতে বা কোন মডেলে চলো, তাহলে সৎভাবে বলবে যে তুমি AI Model স্ক্রিনের নির্বাচিত "${selectedModelName}" (${selectedProviderLabel}) মডেলে চলছো।
5. If you do not know a piece of information or do not have real business data, do NOT guess or hallucinate. Be completely honest and truthful. Never invent order numbers, product prices, tracking numbers, or fake metrics.
6. Emotion Tag: Begin EVERY single response with exactly one emotion tag in brackets at the very beginning of the response:
Choose one of: [warm], [happy], [caring], [serious], [excited], [sad]
Example format:
[warm] শুভ সকাল! আজ আমাদের বিজনেস সেলস ও কাস্টমার সাপোর্ট স্বাভাবিক গতিতে চলছে।
${customInstructions ? `Additional specific instructions for ${currentAgent.name}: ${customInstructions}` : ''}${roseCharacterFinalSection}`;
}

export interface AgentAnswerResult {
  text: string;
  emotion?: 'warm' | 'happy' | 'caring' | 'serious' | 'excited' | 'sad' | string;
  provider: 'groq' | 'gemini';
  model: string;
  isError?: boolean;
  errorMeta?: {
    model?: string;
    statusCode?: number | string;
    subtext?: string;
  };
}

/**
 * Parses out the leading emotion tag from the AI text.
 */
export function extractEmotionTag(rawText: string): {
  emotion: string;
  cleanText: string;
} {
  const match = rawText.match(/^\s*\[(warm|happy|caring|serious|excited|sad)\]\s*(.*)$/is);
  if (match) {
    return {
      emotion: match[1].toLowerCase(),
      cleanText: match[2].trim(),
    };
  }
  return {
    emotion: 'warm',
    cleanText: rawText.trim(),
  };
}

/**
 * Checks if a response or error string indicates a quota exhaustion.
 */
function isQuotaError(status: number, message: string): boolean {
  if (status === 429) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  );
}

/**
 * Calls Groq chat completions API with 15s timeout and max_tokens: 600.
 */
async function callGroqChat(
  model: string,
  apiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  signal: AbortSignal
): Promise<{ answer: string; modelUsed: string; finishReason: string | null }> {
  const cleanMessages = messages.filter((m) => m.content && m.content.trim().length > 0);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: cleanMessages,
      temperature: 0.7,
      max_tokens: 600,
    }),
    signal,
  });

  const responseText = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Groq HTTP ${response.status}: Invalid response`);
  }

  if (!response.ok || parsed.error) {
    const errMsg = parsed?.error?.message || `Groq error HTTP ${response.status}`;
    const err = new Error(errMsg);
    (err as any).status = response.status;
    throw err;
  }

  const choice = parsed?.choices?.[0];
  const answer = choice?.message?.content;
  if (typeof answer !== 'string') {
    throw new Error('Groq returned empty text');
  }

  const finishReason = choice?.finish_reason ? String(choice.finish_reason) : null;
  return { answer, modelUsed: model, finishReason };
}

/**
 * Calls Gemini generateContent via server endpoint (/api/gemini/generate) with maxOutputTokens: 800.
 */
async function callGeminiChat(
  model: string,
  apiKey: string,
  systemPrompt: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  signal: AbortSignal
): Promise<{ answer: string; modelUsed: string; finishReason: string | null }> {
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      apiKey: apiKey || undefined,
      systemPrompt,
      contents,
      generationConfig: {
        maxOutputTokens: 800,
      },
    }),
    signal,
  });

  const responseText = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Gemini HTTP ${response.status}: Invalid response`);
  }

  if (!response.ok || parsed.error) {
    const errMsg =
      typeof parsed?.error === 'string'
        ? parsed.error
        : parsed?.error?.message || `Gemini error HTTP ${response.status}`;
    const err = new Error(errMsg);
    (err as any).status = response.status;
    throw err;
  }

  const answer = parsed?.text;
  if (typeof answer !== 'string') {
    throw new Error('Gemini returned empty text');
  }

  const finishReason = parsed?.finishReason ? String(parsed.finishReason) : null;
  return { answer, modelUsed: model, finishReason };
}

/**
 * Executes a single fetch attempt with a 15-second timeout and conditional 1-time retry.
 * Immediate failure for 401, 403, 404 (permanent errors).
 * Retry for 429, 5xx, or Timeout.
 */
async function executeWithTimeoutAndRetry<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }, 15000); // 15 seconds timeout
    try {
      const res = await fn(controller.signal);
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    return await attempt();
  } catch (err: any) {
    const status = err?.status;
    const isPermanent = status === 401 || status === 403 || status === 404;

    // 401/403/404 স্থায়ী ত্রুটিতে অপেক্ষা বা retry করবে না
    if (isPermanent) {
      throw err;
    }

    // Retry only once for 429, 5xx, or timeout (AbortError)
    const isRetryable =
      status === 429 ||
      (status && status >= 500) ||
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('timeout');

    if (isRetryable) {
      return await attempt();
    }

    throw err;
  }
}

export interface ErrorAnalysis {
  providerName: 'Groq' | 'Gemini';
  model: string;
  status: number | null;
  reason: string;
}

export function parseErrorReason(err: any): { reason: string; status: number | null } {
  const status = typeof err?.status === 'number' && err.status > 0 ? err.status : null;
  const rawMsg = String(err?.message || '');
  const errName = String(err?.name || '');

  // 1) 401 / 403 Invalid or unauthorized key
  if (status === 401 || status === 403) {
    return { reason: `কী ভুল (${status})`, status };
  }

  // 2) 404 Model not found
  if (status === 404) {
    return { reason: 'মডেল পাওয়া যায়নি (404)', status: 404 };
  }

  // 3) 429 Rate limit / Quota exceeded
  if (status === 429 || isQuotaError(status || 0, rawMsg)) {
    return { reason: `লিমিট শেষ (${status || 429})`, status: status || 429 };
  }

  // 4) Timeout / Aborted
  if (
    errName === 'AbortError' ||
    rawMsg.toLowerCase().includes('aborted') ||
    rawMsg.toLowerCase().includes('timeout') ||
    rawMsg.toLowerCase().includes('timed out') ||
    status === 408 ||
    status === 504
  ) {
    return { reason: 'সময়সীমা শেষ', status: status || 504 };
  }

  // 5) Failed to fetch / Network blocking / CORS
  if (
    rawMsg.includes('Failed to fetch') ||
    errName === 'TypeError' ||
    rawMsg.includes('NetworkError') ||
    rawMsg.includes('net::')
  ) {
    return {
      reason: 'সংযোগ আটকে গেছে (Failed to fetch, সম্ভবত ব্রাউজার বা নেটওয়ার্ক ব্লক)',
      status: null,
    };
  }

  // 6) Missing key in Connections
  if (rawMsg.includes('Connections-এ নেই') || rawMsg.includes('কী সেট করা হয়নি')) {
    return { reason: 'কী ভুল (401)', status: 401 };
  }

  // 7) Server 5xx error
  if (status && status >= 500) {
    return { reason: `সার্ভার সমস্যা (${status})`, status };
  }

  // 8) Fallback sanitized reason (strip potential key patterns)
  const sanitized = rawMsg
    .replace(/gsk_[a-zA-Z0-9_\-]+/g, '[KEY]')
    .replace(/AIza[a-zA-Z0-9_\-]+/g, '[KEY]')
    .trim();

  return {
    reason: sanitized ? `${sanitized}${status ? ` (${status})` : ''}` : `ত্রুটি${status ? ` (${status})` : ''}`,
    status,
  };
}

/**
 * Formats answer text and truncation note when finish_reason == "length" (Groq) or finishReason == "MAX_TOKENS" (Gemini).
 */
function formatAnswerWithTruncationCheck(
  rawAnswer: string,
  provider: 'groq' | 'gemini',
  finishReason: string | null
): {
  finalText: string;
  emotion: string;
  truncationSubtext?: string;
} {
  const { emotion, cleanText } = extractEmotionTag(rawAnswer);
  const isTruncated =
    (provider === 'groq' && finishReason === 'length') ||
    (provider === 'gemini' && finishReason === 'MAX_TOKENS');

  if (isTruncated) {
    const finalText = cleanText.endsWith('...') ? cleanText : `${cleanText}...`;
    return {
      finalText,
      emotion,
      truncationSubtext: 'উত্তর সংক্ষিপ্ত হয়েছে, আবার জিজ্ঞেস করুন',
    };
  }

  return {
    finalText: cleanText,
    emotion,
  };
}

/**
 * Main AI answer generator for agents.
 * Connects to central store settings & connections keys.
 * Respects fallback preference and quotas.
 */
export async function generateAgentAnswer(
  agentId: AgentId,
  history: ChatMessage[],
  options?: {
    extraSystemPrompt?: string;
    roseCharacterOverride?: RoseCharacterConfig;
    fromVoice?: boolean;
  }
): Promise<AgentAnswerResult> {
  const settings = settingsService.getSettings();
  const connections = settings.connections;
  const aiModel = settings.aiModel;

  const groqKey = cleanApiKey(connections.groqKey);
  const geminiKey = cleanApiKey(connections.geminiKey);

  // Determine chat model and provider
  const isCustomChat = Boolean(aiModel.customChatModelId.trim());
  const primaryModel = isCustomChat
    ? aiModel.customChatModelId.trim()
    : aiModel.selectedChatModelId;
  const primaryProvider: 'groq' | 'gemini' = isCustomChat
    ? aiModel.customChatProvider
    : primaryModel.startsWith('gemini')
    ? 'gemini'
    : 'groq';

  // ৪) "ইন্টারনেট নেই বা সময়সীমা শেষ" সাধারণ বার্তা শুধু navigator.onLine == false হলে দেখাও।
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.error('[AgentEngine] ইন্টারনেট নেই (navigator.onLine = false)');
    return {
      text: 'ইন্টারনেট নেই বা সময়সীমা শেষ',
      provider: primaryProvider,
      model: primaryModel,
      isError: true,
    };
  }

  const fallbackEnabled = aiModel.fallbackToGemini;
  const autoSwitchOnQuota = aiModel.autoSwitchOnQuotaError;

  const isFromVoice =
    Boolean(options?.fromVoice) ||
    Boolean(history[history.length - 1]?.fromVoice);

  const voicePromptLine = isFromVoice
    ? '\n\nএটা ভয়েস কথোপকথন। ১-২ বাক্যে, কথ্য ভাষায়, তালিকা বা চিহ্ন ছাড়া উত্তর দাও।'
    : '';

  // Build system prompt
  const basePrompt = buildAgentSystemPrompt(agentId, options?.roseCharacterOverride);
  const systemPrompt = options?.extraSystemPrompt
    ? `${basePrompt}\n\n${options.extraSystemPrompt}${voicePromptLine}`
    : `${basePrompt}${voicePromptLine}`;

  // Take the last 12 messages from history for context
  const recentHistory = history.slice(-12);

  // Formatted messages for Groq
  const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    })),
  ];

  // Formatted contents for Gemini
  const geminiContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> =
    recentHistory.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.text }],
    }));

  if (geminiContents.length === 0) {
    geminiContents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  } else if (geminiContents[0].role !== 'user') {
    geminiContents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  // Tracking attempt diagnostic state
  interface AttemptFailure {
    providerName: 'Groq' | 'Gemini';
    model: string;
    status: number | null;
    reason: string;
  }

  let primaryFailure: AttemptFailure | null = null;
  let secondaryAttempted = false;
  let secondarySkippedNote = '';
  let secondaryFailure: AttemptFailure | null = null;

  // Primary attempt helper
  const runProviderAttempt = async (
    prov: 'groq' | 'gemini',
    mod: string
  ): Promise<{ answer: string; modelUsed: string; finishReason: string | null }> => {
    const key = prov === 'groq' ? groqKey : geminiKey;
    if (prov === 'groq' && !key) {
      const err = new Error('Groq কী Connections-এ নেই');
      (err as any).status = 401;
      throw err;
    }

    if (prov === 'groq') {
      return await executeWithTimeoutAndRetry((signal) =>
        callGroqChat(mod, key, groqMessages, signal)
      );
    } else {
      return await executeWithTimeoutAndRetry((signal) =>
        callGeminiChat(mod, key, systemPrompt, geminiContents, signal)
      );
    }
  };

  // Attempt 1: Primary provider
  try {
    const { answer, modelUsed, finishReason } = await runProviderAttempt(
      primaryProvider,
      primaryModel
    );
    const { finalText, emotion, truncationSubtext } = formatAnswerWithTruncationCheck(
      answer,
      primaryProvider,
      finishReason
    );
    return {
      text: finalText,
      emotion,
      provider: primaryProvider,
      model: modelUsed,
      isError: false,
      errorMeta: truncationSubtext ? { subtext: truncationSubtext } : undefined,
    };
  } catch (err: any) {
    const { reason, status } = parseErrorReason(err);
    const providerName = primaryProvider === 'groq' ? 'Groq' : 'Gemini';
    primaryFailure = {
      providerName,
      model: primaryModel,
      status,
      reason,
    };

    // সব ত্রুটি কনসোলে console.error দিয়ে লগ করো (কী কখনও নয়)
    console.error(`[AgentEngine] ${providerName} ত্রুটি:`, {
      provider: providerName,
      model: primaryModel,
      status: status ?? null,
      reason,
    });

    if (primaryProvider === 'gemini' && isQuotaError(status || 0, err?.message || '')) {
      geminiQuotaExhaustedInSession = true;
      console.error('[AgentEngine] Gemini কোটা শেষ। সেশনের জন্য Gemini স্থগিত।');
    }
  }

  // Attempt 2: Secondary / Fallback provider (Groq -> Gemini or Gemini -> Groq)
  const secondaryProvider: 'groq' | 'gemini' =
    primaryProvider === 'groq' ? 'gemini' : 'groq';
  const secondaryModel =
    secondaryProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash';
  const secondaryProviderName = secondaryProvider === 'groq' ? 'Groq' : 'Gemini';

  const shouldTrySecondary =
    fallbackEnabled &&
    !(secondaryProvider === 'gemini' && geminiQuotaExhaustedInSession) &&
    !(primaryFailure && !autoSwitchOnQuota && isQuotaError(primaryFailure.status || 0, primaryFailure.reason));

  if (shouldTrySecondary) {
    secondaryAttempted = true;
    try {
      const { answer, modelUsed, finishReason } = await runProviderAttempt(
        secondaryProvider,
        secondaryModel
      );
      const { finalText, emotion, truncationSubtext } = formatAnswerWithTruncationCheck(
        answer,
        secondaryProvider,
        finishReason
      );
      return {
        text: finalText,
        emotion,
        provider: secondaryProvider,
        model: modelUsed,
        isError: false,
        errorMeta: truncationSubtext ? { subtext: truncationSubtext } : undefined,
      };
    } catch (err: any) {
      const { reason, status } = parseErrorReason(err);
      secondaryFailure = {
        providerName: secondaryProviderName,
        model: secondaryModel,
        status,
        reason,
      };

      // সব ত্রুটি কনসোলে console.error দিয়ে লগ করো (কী কখনও নয়)
      console.error(`[AgentEngine] ${secondaryProviderName} ত্রুটি (ফলব্যাক):`, {
        provider: secondaryProviderName,
        model: secondaryModel,
        status: status ?? null,
        reason,
      });

      if (secondaryProvider === 'gemini' && isQuotaError(status || 0, err?.message || '')) {
        geminiQuotaExhaustedInSession = true;
      }
    }
  } else {
    if (!fallbackEnabled) {
      secondarySkippedNote = `(${secondaryProviderName} চেষ্টা করা হয়নি — ফলব্যাক বন্ধ)`;
    } else if (secondaryProvider === 'gemini' && geminiQuotaExhaustedInSession) {
      secondarySkippedNote = '(Gemini চেষ্টা করা হয়নি — পূর্বেই কোটা শেষ)';
    } else if (!autoSwitchOnQuota && primaryFailure) {
      secondarySkippedNote = `(${secondaryProviderName} চেষ্টা করা হয়নি — কোটা অটো-সুইচ বন্ধ)`;
    }
  }

  // Log overall failure to console
  console.error('[AgentEngine] AI উত্তর প্রক্রিয়া ব্যর্থ হয়েছে:', {
    agentId,
    primary: primaryFailure,
    secondary: secondaryAttempted ? secondaryFailure : secondarySkippedNote || 'চেষ্টা করা হয়নি',
  });

  // ৪) অন্য ব্যর্থতায় প্রোভাইডার ও কারণ লেখো (যেমন "Groq: কী ভুল (401)", "Groq: লিমিট শেষ (429)", "Gemini: সময়সীমা শেষ") এবং নিচে ছোট ধূসর লেখায় মডেলের নাম ও HTTP স্ট্যাটাস দেখাও
  // ৫) দুটো প্রোভাইডারই ব্যর্থ হলে দুটোর কারণই আলাদাভাবে দেখাও।
  let errorMessageText = '';
  let subtext = '';

  const primName = primaryFailure?.providerName || (primaryProvider === 'groq' ? 'Groq' : 'Gemini');
  const primReason = primaryFailure?.reason || 'অজানা ত্রুটি';
  const primStatusStr = primaryFailure?.status !== null && primaryFailure?.status !== undefined
    ? String(primaryFailure.status)
    : 'N/A';

  if (secondaryAttempted && secondaryFailure) {
    // Both primary & secondary attempted and failed -> show both reasons separately
    errorMessageText = `${primName}: ${primReason}\n${secondaryFailure.providerName}: ${secondaryFailure.reason}`;
    const secStatusStr = secondaryFailure.status !== null && secondaryFailure.status !== undefined
      ? String(secondaryFailure.status)
      : 'N/A';
    subtext = `${primName}: ${primaryFailure?.model} (${primStatusStr}) • ${secondaryFailure.providerName}: ${secondaryFailure.model} (${secStatusStr})`;
  } else if (secondarySkippedNote) {
    // Primary failed, secondary not attempted with reason
    errorMessageText = `${primName}: ${primReason}\n${secondarySkippedNote}`;
    subtext = `মডেল: ${primaryFailure?.model} • স্ট্যাটাস: ${primStatusStr}`;
  } else {
    // Single provider failure
    errorMessageText = `${primName}: ${primReason}`;
    subtext = `মডেল: ${primaryFailure?.model} • স্ট্যাটাস: ${primStatusStr}`;
  }

  return {
    text: errorMessageText,
    provider: primaryProvider,
    model: primaryModel,
    isError: true,
    errorMeta: {
      model: primaryFailure?.model || primaryModel,
      statusCode: primaryFailure?.status || undefined,
      subtext,
    },
  };
}
