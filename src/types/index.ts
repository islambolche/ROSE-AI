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
  kind:
    | 'delegation'
    | 'report'
    | 'rose_task'
    | 'ask_fold'
    | 'handoff_reply'
    | 'save_file'
    | 'character_divider';
  mode?: DelegationMode;
  targetAgentId?: AgentId;
  reportAgentId?: AgentId;
  taskText?: string;
  reportText?: string;
  isError?: boolean;
  characterName?: string;
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
  bill?: BillMeta;
  emailDraft?: EmailDraftMeta;
  ytUpload?: YouTubeUploadMeta;
  ytComments?: YouTubeCommentsMeta;
  ytReply?: YouTubeReplyMeta;
  fbPost?: FacebookPostMeta;
  fbComments?: FacebookCommentsMeta;
  fbReply?: FacebookReplyMeta;
  pcAction?: PcActionMeta;
  actionCommand?: {
    type: string;
    query: string;
    url: string;
    status?: 'pending' | 'ready' | 'cancelled';
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

export type RoseEmotionalWarmth = 'gentle' | 'warm' | 'deep';

export interface RoseCharacterTraits {
  sweetGentle: boolean;
  emotionallyAware: boolean;
  caringSupportive: boolean;
  attentiveListener: boolean;
  calmReassuring: boolean;
  deepThoughtful: boolean;
  cheerfulPositive: boolean;
  motivational: boolean;
  friendlyNatural: boolean;
  quietSoftSpoken: boolean;
  empathetic: boolean;
  thoughtfulQuestions: boolean;
}

export type RoseModelChoiceType = 'auto' | 'groq' | 'gemini';

export interface RoseCharacterConfig {
  characterId?: 'rose';
  emotionalWarmth: RoseEmotionalWarmth;
  traits: RoseCharacterTraits;
  nickname?: string;
  customCharacter?: string;
  modelChoice?: RoseModelChoiceType;
}

export interface RoseCharacterNamespace {
  rose: RoseCharacterConfig;
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

export interface BillMeta {
  customerName: string;
  phone: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  waUrl: string;
}

export interface PcControlConfig {
  allowFileSave: boolean;
  workFolderName?: string;
  openAppsAndWebsites?: boolean;
  typeTextAndPressKeys?: boolean;
  readOrOpenFiles?: boolean;
  cameraAndMic?: boolean;
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

export interface PermissionRulesConfig {
  sendWhatsappMessenger: boolean;
  postReplyFbYoutube: boolean;
  sendEmailApplyJob: boolean;
  saveOrSendBill: boolean;
  openWebsiteOrAppPc: boolean;
  typeTextOrKeysPc: boolean;
  readOrOpenFilesPc: boolean;
  playMusicVideo: boolean;
  deleteFiles: boolean;
  paymentsOrTransfer: boolean;
  passwordsOrPrivateData: boolean;
  installOrUninstallSoftware: boolean;
}

export interface EmailDraftMeta {
  to: string;
  subject: string;
  body: string;
  status?: 'pending' | 'sending' | 'sent' | 'cancelled' | 'error';
  error?: string;
}

export interface YouTubeUploadMeta {
  title: string;
  description: string;
  tags: string[];
  fileName?: string;
  status?: 'pending' | 'uploading' | 'uploaded' | 'cancelled' | 'error';
  videoId?: string;
  error?: string;
}

export interface YouTubeCommentItem {
  threadId: string;
  topLevelCommentId: string;
  author: string;
  text: string;
  publishedAt: string;
}

export interface YouTubeCommentsMeta {
  videoId: string;
  status?: 'loading' | 'loaded' | 'error';
  comments: YouTubeCommentItem[];
  error?: string;
}

export interface YouTubeReplyMeta {
  parentId: string;
  text: string;
  status?: 'pending' | 'posting' | 'posted' | 'cancelled' | 'error';
  replyId?: string;
  error?: string;
}

export interface FacebookPostMeta {
  mediaType: 'text' | 'photo' | 'video';
  message: string;
  fileName?: string;
  status?: 'pending' | 'posting' | 'posted' | 'cancelled' | 'error';
  postId?: string;
  error?: string;
}

export interface FacebookCommentItem {
  id: string;
  author: string;
  text: string;
  createdTime: string;
}

export interface FacebookCommentsMeta {
  postId: string;
  status?: 'loading' | 'loaded' | 'error';
  comments: FacebookCommentItem[];
  error?: string;
}

export interface FacebookReplyMeta {
  commentId: string;
  text: string;
  status?: 'pending' | 'posting' | 'posted' | 'cancelled' | 'error';
  replyId?: string;
  error?: string;
}

export interface PcActionMeta {
  actionType:
    | 'open_app_url'
    | 'type_text'
    | 'read_file'
    | 'send_whatsapp'
    | 'send_messenger'
    | 'play_media';
  target: string;
  text?: string;
  status?: 'pending' | 'done' | 'cancelled' | 'error';
  resultText?: string;
  error?: string;
}

export interface PendingApprovalAction {
  id: string;
  ruleKey: keyof PermissionRulesConfig;
  title: string;
  detail: string;
  timestamp: string;
  payload?: {
    kind:
      | 'action_command'
      | 'whatsapp_bill'
      | 'save_file'
      | 'gmail_send'
      | 'yt_upload'
      | 'yt_reply'
      | 'fb_post'
      | 'fb_reply'
      | 'pc_action';
    msgId?: string;
    url?: string;
    bill?: BillMeta;
    emailDraft?: EmailDraftMeta;
    ytUpload?: YouTubeUploadMeta;
    ytReply?: YouTubeReplyMeta;
    fbPost?: FacebookPostMeta;
    fbReply?: FacebookReplyMeta;
    pcAction?: PcActionMeta;
    fileName?: string;
    fileContent?: string;
  };
}

export interface AppSettings {
  userName: string; // default ''
  userAddressAs: UserAddressAsType; // default 'শুধু নাম'
  hasCompletedWelcome?: boolean;
  glowIntensity: number; // 50 to 150, default 100
  chatFontSize: ChatFontSizeType; // 'small' | 'medium' | 'large'
  showCameraMic: boolean; // default true
  agents: Record<AgentId, AgentSettingsConfig>;
  characterSettings: RoseCharacterNamespace;
  roseCharacter: RoseCharacterConfig;
  connections: ApiConnections;
  aiModel: AiModelConfig;
  voiceSettings: VoiceSettingsConfig;
  pcControl: PcControlConfig;
  voiceCaptions: boolean; // default false
  integrations: IntegrationsConfig;
  permissionRules: PermissionRulesConfig;
}


