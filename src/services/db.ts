import { AgentId, AgentMessageRecord, AgentTaskRecord, AgentSettingsRecord } from '../types';

const STORAGE_KEYS = {
  MESSAGES: 'rose_ai_public_agent_messages',
  TASKS: 'rose_ai_public_agent_tasks',
  SETTINGS: 'rose_ai_public_agent_settings',
  CURRENT_USER_ID: 'rose_ai_current_user_id',
};

const memoryStore = new Map<string, string>();

export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStore.get(key) ?? null;
}

export function safeSetItem(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch {}
  memoryStore.set(key, val);
}

// Generates or retrieves local persistent auth.uid()
export function getOrCreateUserId(): string {
  let uid = safeGetItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!uid) {
    uid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'usr_' + Math.random().toString(36).substring(2, 15);
    safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, uid);
  }
  return uid;
}

// Clean initialization: no mock/seed messages
const INITIAL_SEED_MESSAGES: AgentMessageRecord[] = [];

// Initial seed tasks matching public.agent_tasks
const INITIAL_SEED_TASKS: AgentTaskRecord[] = [
  {
    id: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    user_id: 'default-user',
    agent_id: 'rose',
    title: 'Executive Daily Briefing',
    detail: 'Synchronize 5 departmental pipelines and allocate server workloads',
    status: 'doing',
    result: 'All queues green',
    device: 'pc',
    created_at: '2026-11-04T09:00:00.000Z',
    updated_at: '2026-11-04T09:30:00.000Z',
  },
  {
    id: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    user_id: 'default-user',
    agent_id: 'mira',
    title: 'Customer WhatsApp Routing',
    detail: 'Resolve priority customer tickets and maintain 12s response benchmark',
    status: 'doing',
    result: '18 tickets active',
    device: 'pc',
    created_at: '2026-11-04T09:15:00.000Z',
    updated_at: '2026-11-04T10:00:00.000Z',
  },
  {
    id: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f',
    user_id: 'default-user',
    agent_id: 'arin',
    title: 'Validate Enterprise Order #4587',
    detail: 'Dispatched to regional fulfillment center with express delivery',
    status: 'done',
    result: 'Dispatched for delivery',
    device: 'pc',
    created_at: '2026-11-04T09:30:00.000Z',
    updated_at: '2026-11-04T10:27:00.000Z',
  },
  {
    id: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70',
    user_id: 'default-user',
    agent_id: 'zayan',
    title: 'Wave #3 Courier Dispatch',
    detail: 'Fleet logistics routing for 42 outbound parcels',
    status: 'doing',
    result: '94% routes clear',
    device: 'pc',
    created_at: '2026-11-04T09:45:00.000Z',
    updated_at: '2026-11-04T10:15:00.000Z',
  },
  {
    id: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c71',
    user_id: 'default-user',
    agent_id: 'naira',
    title: 'Financial & Ledger Audit',
    detail: 'Reconcile payment gateways, merchant checkout margins and fees',
    status: 'done',
    result: 'Zero discrepancy. Margin steady at 31.4%',
    device: 'pc',
    created_at: '2026-11-04T08:30:00.000Z',
    updated_at: '2026-11-04T09:45:00.000Z',
  },
];

class DatabaseService {
  private userId: string;

  constructor() {
    this.userId = typeof window !== 'undefined' ? getOrCreateUserId() : 'default-user';
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!safeGetItem(STORAGE_KEYS.MESSAGES)) {
      const seeded = INITIAL_SEED_MESSAGES.map((m) => ({
        ...m,
        user_id: this.userId,
      }));
      safeSetItem(STORAGE_KEYS.MESSAGES, JSON.stringify(seeded));
    }

    if (!safeGetItem(STORAGE_KEYS.TASKS)) {
      const seeded = INITIAL_SEED_TASKS.map((t) => ({
        ...t,
        user_id: this.userId,
      }));
      safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(seeded));
    }

    if (!safeGetItem(STORAGE_KEYS.SETTINGS)) {
      const defaultAgents: AgentId[] = ['rose', 'mira', 'arin', 'zayan', 'naira'];
      const seededSettings: AgentSettingsRecord[] = defaultAgents.map((agentId) => ({
        user_id: this.userId,
        agent_id: agentId,
        settings: {},
        updated_at: new Date().toISOString(),
      }));
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(seededSettings));
    }
  }

  // Query public.agent_messages
  // Corresponds to: SELECT * FROM public.agent_messages WHERE user_id = auth.uid() ORDER BY created_at ASC
  public getMessages(agentId?: AgentId): AgentMessageRecord[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.MESSAGES);
      if (!raw) return [];
      const messages: AgentMessageRecord[] = JSON.parse(raw);
      // RLS Policy emulation: only own messages
      const userFiltered = messages.filter((m) => m.user_id === this.userId);
      if (agentId) {
        return userFiltered
          .filter((m) => m.agent_id === agentId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return userFiltered.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } catch (e) {
      console.error('Failed to get messages:', e);
      return [];
    }
  }

  // Insert into public.agent_messages
  public addMessage(params: {
    agent_id: AgentId;
    role: 'user' | 'agent';
    content: string;
    device?: string;
    is_system?: boolean;
    error_subtext?: string;
    team_meta?: AgentMessageRecord['team_meta'];
  }): AgentMessageRecord {
    const record: AgentMessageRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'msg_' + Math.random().toString(36).substring(2, 15),
      user_id: this.userId,
      agent_id: params.agent_id,
      role: params.role,
      content: params.content,
      device: params.device || 'pc',
      created_at: new Date().toISOString(),
      is_system: params.is_system,
      error_subtext: params.error_subtext,
      team_meta: params.team_meta,
    };

    try {
      const current = this.getAllRawMessages();
      current.push(record);
      // Keep up to 50 messages per agent
      safeSetItem(STORAGE_KEYS.MESSAGES, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save message:', e);
    }

    return record;
  }

  // Clear messages for a specific agent
  public clearMessages(agentId: AgentId): void {
    try {
      const current = this.getAllRawMessages();
      const retained = current.filter(
        (m) => !(m.user_id === this.userId && m.agent_id === agentId)
      );
      safeSetItem(STORAGE_KEYS.MESSAGES, JSON.stringify(retained));
    } catch (e) {
      console.error('Failed to clear messages:', e);
    }
  }

  // Query public.agent_tasks
  // Corresponds to: SELECT * FROM public.agent_tasks WHERE user_id = auth.uid() ORDER BY updated_at DESC
  public getTasks(agentId?: AgentId): AgentTaskRecord[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.TASKS);
      if (!raw) return [];
      const tasks: AgentTaskRecord[] = JSON.parse(raw);
      const userFiltered = tasks.filter((t) => t.user_id === this.userId);
      if (agentId) {
        return userFiltered
          .filter((t) => t.agent_id === agentId)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      }
      return userFiltered.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (e) {
      console.error('Failed to get tasks:', e);
      return [];
    }
  }

  // Insert into public.agent_tasks
  public addTask(params: {
    agent_id: AgentId;
    title: string;
    detail?: string;
    status?: 'pending' | 'doing' | 'done' | 'failed';
    device?: string;
  }): AgentTaskRecord {
    const now = new Date().toISOString();
    const record: AgentTaskRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'tsk_' + Math.random().toString(36).substring(2, 15),
      user_id: this.userId,
      agent_id: params.agent_id,
      title: params.title,
      detail: params.detail || null,
      status: params.status || 'pending',
      result: null,
      device: params.device || 'pc',
      created_at: now,
      updated_at: now,
    };

    try {
      const current = this.getAllRawTasks();
      current.push(record);
      safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save task:', e);
    }

    return record;
  }

  // Update task status
  public updateTask(
    taskId: string,
    updates: Partial<Pick<AgentTaskRecord, 'status' | 'result' | 'detail' | 'title'>>
  ): AgentTaskRecord | null {
    try {
      const current = this.getAllRawTasks();
      const index = current.findIndex((t) => t.id === taskId);
      if (index === -1) return null;

      current[index] = {
        ...current[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(current));
      return current[index];
    } catch (e) {
      console.error('Failed to update task:', e);
      return null;
    }
  }

  private getAllRawMessages(): AgentMessageRecord[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.MESSAGES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getAllRawTasks(): AgentTaskRecord[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.TASKS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Query public.agent_settings
  // Corresponds to: SELECT * FROM public.agent_settings WHERE user_id = auth.uid() AND agent_id = $1
  public getAgentSettings(agentId: AgentId): AgentSettingsRecord | null {
    try {
      const all = this.getAllRawSettings();
      const match = all.find((s) => s.user_id === this.userId && s.agent_id === agentId);
      return match || null;
    } catch (e) {
      console.error('Failed to get agent settings:', e);
      return null;
    }
  }

  // Corresponds to: SELECT * FROM public.agent_settings WHERE user_id = auth.uid()
  public getAllAgentSettings(): AgentSettingsRecord[] {
    try {
      const all = this.getAllRawSettings();
      return all.filter((s) => s.user_id === this.userId);
    } catch (e) {
      console.error('Failed to get all agent settings:', e);
      return [];
    }
  }

  // Upsert into public.agent_settings
  // Corresponds to: INSERT INTO public.agent_settings (user_id, agent_id, settings, updated_at) VALUES ... ON CONFLICT (user_id, agent_id) DO UPDATE ...
  public upsertAgentSettings(agentId: AgentId, settings: Record<string, any>): AgentSettingsRecord {
    const now = new Date().toISOString();
    const all = this.getAllRawSettings();
    const existingIndex = all.findIndex((s) => s.user_id === this.userId && s.agent_id === agentId);

    const record: AgentSettingsRecord = {
      user_id: this.userId,
      agent_id: agentId,
      settings: settings || {},
      updated_at: now,
    };

    if (existingIndex >= 0) {
      all[existingIndex] = record;
    } else {
      all.push(record);
    }

    try {
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save agent settings:', e);
    }

    return record;
  }

  private getAllRawSettings(): AgentSettingsRecord[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Generate SQL export commands containing tables and sample data
  public generateSQLExport(): string {
    const messages = this.getMessages();
    const tasks = this.getTasks();
    const agentSettings = this.getAllAgentSettings();

    let sql = `-- =======================================================
-- Rose AI Business Assistant: Database Schema & Migration
-- =======================================================

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null check (agent_id in ('rose','mira','arin','zayan','naira')),
  role text not null check (role in ('user','agent')),
  content text not null,
  device text default 'pc',
  created_at timestamptz not null default now()
);
create index if not exists agent_messages_idx on public.agent_messages (user_id, agent_id, created_at);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null check (agent_id in ('rose','mira','arin','zayan','naira')),
  title text not null,
  detail text,
  status text not null default 'pending' check (status in ('pending','doing','done','failed')),
  result text,
  device text default 'pc',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null check (agent_id in ('rose','mira','arin','zayan','naira')),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);

create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_device text not null check (from_device in ('mobile','pc')),
  to_device text not null check (to_device in ('mobile','pc')),
  kind text not null default 'ask' check (kind in ('ask','note')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','done','failed','denied')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_commands_idx on public.device_commands (user_id, to_device, status, created_at);

alter table public.agent_messages enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_settings enable row level security;
alter table public.device_commands enable row level security;

create policy "own messages" on public.agent_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on public.agent_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own agent settings" on public.agent_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own commands" on public.device_commands
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.agent_messages;
alter publication supabase_realtime add table public.agent_tasks;
alter publication supabase_realtime add table public.agent_settings;
alter publication supabase_realtime add table public.device_commands;

-- Current Records:
`;

    if (messages.length > 0) {
      sql += `\n-- Seed agent_messages:\nINSERT INTO public.agent_messages (id, agent_id, role, content, device, created_at) VALUES\n`;
      sql += messages
        .map(
          (m) =>
            `  ('${m.id}', '${m.agent_id}', '${m.role}', '${m.content.replace(/'/g, "''")}', '${m.device}', '${m.created_at}')`
        )
        .join(',\n') + ';\n';
    }

    if (tasks.length > 0) {
      sql += `\n-- Seed agent_tasks:\nINSERT INTO public.agent_tasks (id, agent_id, title, detail, status, result, device, created_at, updated_at) VALUES\n`;
      sql += tasks
        .map(
          (t) =>
            `  ('${t.id}', '${t.agent_id}', '${t.title.replace(/'/g, "''")}', ${
              t.detail ? `'${t.detail.replace(/'/g, "''")}'` : 'NULL'
            }, '${t.status}', ${
              t.result ? `'${t.result.replace(/'/g, "''")}'` : 'NULL'
            }, '${t.device}', '${t.created_at}', '${t.updated_at}')`
        )
        .join(',\n') + ';\n';
    }

    if (agentSettings.length > 0) {
      sql += `\n-- Seed agent_settings:\nINSERT INTO public.agent_settings (user_id, agent_id, settings, updated_at) VALUES\n`;
      sql += agentSettings
        .map(
          (s) =>
            `  ('${s.user_id}', '${s.agent_id}', '${JSON.stringify(s.settings).replace(/'/g, "''")}'::jsonb, '${s.updated_at}')`
        )
        .join(',\n') +
        `\nON CONFLICT (user_id, agent_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = EXCLUDED.updated_at;\n`;
    }

    return sql;
  }
}

export const dbService = new DatabaseService();
