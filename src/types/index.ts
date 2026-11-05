export type AgentId = 'rose' | 'mira' | 'arin' | 'zayan' | 'naira';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  title: string;
  themeColor: string; // 'rose' | 'green' | 'blue' | 'orange' | 'purple'
  accentHex: string;
  accentBg: string;
  borderHex: string;
  status: 'Online' | 'Busy' | 'In Call' | 'Processing';
  currentTask: string;
  avatarSeed: string;
  deskPosition: 'center' | 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
  specialty: string;
  kpi: string;
  kpiLabel: string;
  voiceNote: string;
}

export type DelegationMode = 'ask' | 'handoff';

export interface TeamMessageMeta {
  kind: 'delegation' | 'report' | 'rose_task' | 'ask_fold' | 'handoff_reply' | 'save_file';
  mode?: DelegationMode;
  targetAgentId?: AgentId;
  reportAgentId?: AgentId;
  taskText?: string;
  reportText?: string;
  isError?: boolean;
}

export type OfficeAgentPhase =
  | 'idle'
  | 'delegating'
  | 'working'
  | 'reporting'
  | 'handoff_to'
  | 'handoff_speaking';

export interface TeamDelegationTask {
  id: string;
  from: AgentId;
  to: AgentId;
  task: string;
  status: 'pending' | 'doing' | 'done' | 'failed';
  result: string;
  time: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | AgentId;
  senderName: string;
  senderRole?: string;
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  actions?: string[];
  attachments?: string[];
  emotion?: 'warm' | 'happy' | 'caring' | 'serious' | 'excited' | 'sad' | string;
  isSystem?: boolean;
  fromVoice?: boolean;
  fileMeta?: FileAttachmentMeta;
  saveFileMeta?: SaveFileRequestMeta;
  actionCommand?: {
    type: string;
    query: string;
    url: string;
  };
  errorMeta?: {
    model?: string;
    statusCode?: number | string;
    subtext?: string;
  };
  teamMeta?: TeamMessageMeta;
}

export interface BusinessMetric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  subtext: string;
}

export interface ActivityItem {
  id: string;
  agentId: AgentId;
  agentName: string;
  action: string;
  target: string;
  time: string;
  type: 'order' | 'delivery' | 'support' | 'audit' | 'system';
}

export type QuickActionType =
  | 'dashboard'
  | 'chat'
  | 'orders'
  | 'delivery'
  | 'analytics'
  | 'facebook'
  | 'youtube'
  | 'browser';

// Database Table: public.agent_messages
export interface AgentMessageRecord {
  id: string; // uuid
  user_id: string; // uuid default auth.uid()
  agent_id: AgentId; // check (agent_id in ('rose','mira','arin','zayan','naira'))
  role: 'user' | 'agent'; // check (role in ('user','agent'))
  content: string;
  device: string; // default 'pc'
  created_at: string; // timestamptz
  is_system?: boolean;
  error_subtext?: string;
  team_meta?: TeamMessageMeta;
}

// Database Table: public.agent_tasks
export interface AgentTaskRecord {
  id: string; // uuid
  user_id: string; // uuid default auth.uid()
  agent_id: AgentId; // check (agent_id in ('rose','mira','arin','zayan','naira'))
  title: string;
  detail: string | null;
  status: 'pending' | 'doing' | 'done' | 'failed'; // check status
  result: string | null;
  device: string; // default 'pc'
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export type PersonalityType =
  | 'Normal'
  | 'Friendly'
  | 'Professional'
  | 'Funny'
  | 'Teacher'
  | 'Developer'
  | 'Caring'
  | 'Custom';

export type LanguageType = 'বাংলা' | 'English' | 'Hindi' | 'Arabic' | 'Spanish';
export type ResponseStyleType = 'brief' | 'detailed';
export type ChatFontSizeType = 'small' | 'medium' | 'large';

export interface AgentSettingsConfig {
  personality: PersonalityType;
  language: LanguageType;
  responseStyle: ResponseStyleType;
  customInstructions: string;
  enabled: boolean;
  elevenLabsVoiceId?: string;
}

export type RoseCharacterPresetType =
  | 'Soul Bond'
  | 'Best Friend'
  | 'Friendly'
  | 'Professional'
  | 'Funny'
  | 'Teacher'
  | 'GF Mode'
  | 'Custom';

export type RoseLanguageStyleType = 'শুদ্ধ বাংলা' | 'কথ্য বাংলা' | 'বাংলা-ইংরেজি মিশ্র';
export type RosePronounType = 'তুমি' | 'আপনি' | 'তুই';
export type RoseReplyLengthType = 'ছোট' | 'মাঝারি';

export interface RoseCharacterConfig {
  preset: RoseCharacterPresetType; // default 'Soul Bond'
  customCharacter: string; // max 1500 chars
  languageStyle: RoseLanguageStyleType; // default 'কথ্য বাংলা'
  pronoun: RosePronounType; // default 'তুমি'
  emotionLevel: number; // 0 to 10, default 8
  humorLevel: number; // 0 to 10, default 4
  replyLength: RoseReplyLengthType; // 'ছোট' | 'মাঝারি', default 'ছোট'
  useEmoji: boolean; // default false
  nickname: string; // default ''
}

export interface ApiConnections {
  geminiKey: string;
  groqKey: string;
  elevenLabsKey: string;
}

export type ConnectionProvider = 'gemini' | 'groq' | 'elevenLabs';
export type ConnectionStatus = 'not_set' | 'checking' | 'ready' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  message?: string;
}

export interface AiModelConfig {
  selectedChatModelId: string;
  customChatModelId: string;
  customChatProvider: 'groq' | 'gemini';
  liveVoiceModelId: string;
  customLiveVoiceModelId: string;
  sttModelId: string;
  fallbackToGemini: boolean;
  autoSwitchOnQuotaError: boolean;
}

export type UserAddressAsType = 'শুধু নাম' | 'ভাই' | 'আপু' | 'স্যার' | 'ম্যাডাম';

export type TtsEngineType = 'Auto' | 'ElevenLabs' | 'Browser';

export interface VoiceSettingsConfig {
  voiceReply: boolean; // default true
  speed: number; // default 1.0
  volume: number; // default 1.0
  engine: TtsEngineType; // default 'Auto'
  elevenLabsModelId: string; // default 'eleven_v3'
  elevenLabsCharLimit: number; // default 300
}

export interface FileAttachmentMeta {
  name: string;
  size: number;
  type: string;
  content: string;
  isTruncated?: boolean;
}

export interface SaveFileRequestMeta {
  name: string;
  content: string;
  size: number;
  status: 'pending' | 'allowed' | 'denied' | 'saved';
  error?: string;
  timestamp: string;
}

export interface PcControlConfig {
  allowFileSave: boolean;
  workFolderName?: string;
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

export interface GoogleAuthConfig {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  clientId: string;
}

export interface FacebookConfig {
  accessToken: string;
  pageId: string;
}

export interface IntegrationsConfig {
  pcAccess: boolean;
  whatsapp: WhatsAppConfig;
  youtube: GoogleAuthConfig;
  facebookPage: FacebookConfig;
  tiktok: string; // Access token
  gmail: GoogleAuthConfig;
  askBeforeAction: boolean; // default true
}

export interface AppSettings {
  userName: string; // default ''
  userAddressAs: UserAddressAsType; // default 'শুধু নাম'
  hasCompletedWelcome?: boolean;
  glowIntensity: number; // 50 to 150, default 100
  chatFontSize: ChatFontSizeType; // 'small' | 'medium' | 'large'
  showCameraMic: boolean; // default true
  agents: Record<AgentId, AgentSettingsConfig>;
  roseCharacter: RoseCharacterConfig;
  connections: ApiConnections;
  aiModel: AiModelConfig;
  voiceSettings: VoiceSettingsConfig;
  pcControl: PcControlConfig;
  voiceCaptions: boolean; // default false
  integrations: IntegrationsConfig;
}


