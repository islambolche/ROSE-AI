-- ==============================================================================
-- Migration: Create public.agent_settings
-- Schema Definition for Rose AI Multi-Agent Digital Business Suite
-- ==============================================================================

create table if not exists public.agent_settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id text not null check (agent_id in ('rose','mira','arin','zayan','naira')),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_id)
);

-- Enable Row Level Security (RLS)
alter table public.agent_settings enable row level security;

-- Create policy for user access control
create policy "own agent settings" on public.agent_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Enable Supabase Realtime subscriptions
alter publication supabase_realtime add table public.agent_settings;
