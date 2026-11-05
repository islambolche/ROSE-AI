import { AgentId } from '../types';

export interface AgentDataSource {
  connected: boolean;
  items: any[];
}

const DATA_SOURCE_KEYS: Partial<Record<AgentId, string>> = {
  mira: 'rose_inbox',
  arin: 'rose_orders',
  zayan: 'rose_parcels',
  naira: 'rose_accounts',
};

/**
 * Returns the real data source state for a given agent from localStorage.
 * By default, connected is always false unless explicitly connected in future integrations.
 * Never fabricates or mocks items.
 */
export function getAgentData(agentId: AgentId): AgentDataSource {
  const storageKey = DATA_SOURCE_KEYS[agentId];
  if (!storageKey || typeof window === 'undefined') {
    return { connected: false, items: [] };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { connected: false, items: [] };
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        connected: parsed.connected === true ? true : false,
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    }

    if (Array.isArray(parsed)) {
      return {
        connected: false,
        items: parsed,
      };
    }

    return { connected: false, items: [] };
  } catch {
    return { connected: false, items: [] };
  }
}
export function saveAgentDataItem(agentId: AgentId, item: any): void {
  const storageKey = DATA_SOURCE_KEYS[agentId];
  if (!storageKey || typeof window === 'undefined') return;

  try {
    const data = getAgentData(agentId);
    data.items.push({
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data item:', e);
  }
}
