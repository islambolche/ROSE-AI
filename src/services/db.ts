import { AgentId, AgentMessageRecord, AgentTaskRecord } from '../types';

const STORAGE_KEYS = {
  MESSAGES: 'rose_ai_public_agent_messages',
  TASKS: 'rose_ai_public_agent_tasks',
  CURRENT_USER_ID: 'rose_ai_current_user_id',
};

// Generates or retrieves local persistent auth.uid()
export function getOrCreateUserId(): string {
  let uid = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!uid) {
    uid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'usr_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, uid);
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
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      const seeded = INITIAL_SEED_MESSAGES.map((m) => ({
        ...m,
        user_id: this.userId,
      }));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(seeded));
    }

    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      const seeded = INITIAL_SEED_TASKS.map((t) => ({
        ...t,
        user_id: this.userId,
      }));
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(seeded));
    }
  }

  // Query public.agent_messages
  // Corresponds to: SELECT * FROM public.agent_messages WHERE user_id = auth.uid() ORDER BY created_at ASC
  public getMessages(agentId?: AgentId): AgentMessageRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
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
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(current));
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
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(retained));
    } catch (e) {
      console.error('Failed to clear messages:', e);
    }
  }

  // Query public.agent_tasks
  // Corresponds to: SELECT * FROM public.agent_tasks WHERE user_id = auth.uid() ORDER BY updated_at DESC
  public getTasks(agentId?: AgentId): AgentTaskRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
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
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(current));
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

      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(current));
      return current[index];
    } catch (e) {
      console.error('Failed to update task:', e);
      return null;
    }
  }

  private getAllRawMessages(): AgentMessageRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getAllRawTasks(): AgentTaskRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Generate SQL export commands containing both tables and sample data
  public generateSQLExport(): string {
    const messages = this.getMessages();
    const tasks = this.getTasks();

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

alter table public.agent_messages enable row level security;
alter table public.agent_tasks enable row level security;

create policy "own messages" on public.agent_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on public.agent_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.agent_messages;
alter publication supabase_realtime add table public.agent_tasks;

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

    return sql;
  }
}

export const dbService = new DatabaseService();
