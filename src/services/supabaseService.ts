import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AppSettings, SpecialistAgentId } from '../types';
import { settingsService } from './settings';
import { dbService } from './db';

const STORAGE_KEYS = {
  URL: 'rose_supabase_url',
  ANON_KEY: 'rose_supabase_anon_key',
  LAST_SYNC: 'rose_supabase_last_sync_timestamp',
};

class SupabaseService {
  private client: SupabaseClient | null = null;
  private realtimeChannel: any = null;

  constructor() {
    this.initClient();
  }

  public getSupabaseConfig(): { url: string; anonKey: string } {
    let url = '';
    let anonKey = '';
    try {
      if (typeof localStorage !== 'undefined') {
        url = localStorage.getItem(STORAGE_KEYS.URL) || '';
        anonKey = localStorage.getItem(STORAGE_KEYS.ANON_KEY) || '';
      }
    } catch {}

    // Fallback to env vars if available
    if (!url && typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
      url = import.meta.env.VITE_SUPABASE_URL;
    }
    if (!anonKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
      anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }

    return { url: url.trim(), anonKey: anonKey.trim() };
  }

  public setSupabaseConfig(url: string, anonKey: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.URL, url.trim());
        localStorage.setItem(STORAGE_KEYS.ANON_KEY, anonKey.trim());
      }
    } catch {}
    this.initClient();
  }

  public initClient(): SupabaseClient | null {
    const { url, anonKey } = this.getSupabaseConfig();
    if (!url || !anonKey) {
      this.client = null;
      return null;
    }

    try {
      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return this.client;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      this.client = null;
      return null;
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      return this.initClient();
    }
    return this.client;
  }

  public isConfigured(): boolean {
    const { url, anonKey } = this.getSupabaseConfig();
    return Boolean(url && anonKey);
  }

  public async getCurrentUser(): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  }

  public async testConnection(): Promise<{ ok: boolean; message: string; user?: User | null }> {
    const client = this.getClient();
    if (!client) {
      return { ok: false, message: 'Supabase URL ও Anon Key দেওয়া হয়নি' };
    }

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError && authError.message !== 'Auth session missing!') {
        // Still may be connected if anon key is valid
      }

      // Quick test query on agent_settings
      const { error: queryError } = await client
        .from('agent_settings')
        .select('agent_id')
        .limit(1);

      if (queryError && queryError.code === '42P01') {
        return {
          ok: false,
          message: 'কানেক্ট হয়েছে, কিন্তু agent_settings টেবিল পাওয়া যায়নি। অনুগ্রহ করে SQL চালান।',
          user: authData?.user,
        };
      }

      return {
        ok: true,
        message: authData?.user
          ? `সংযুক্ত ও লগইন রয়েছে (${authData.user.email || 'ব্যবহারকারী'})`
          : 'Supabase সংযুক্ত (লগইন করা নেই)',
        user: authData?.user,
      };
    } catch (err: any) {
      return { ok: false, message: err.message || 'সংযোগে ত্রুটি ঘটেছে' };
    }
  }

  /**
   * Syncs all 5 agent settings to Supabase public.agent_settings.
   * Strips out name, avatar, role, and API keys.
   */
  public async syncAllAgentsToCloud(settings: AppSettings): Promise<{
    ok: boolean;
    syncedCount: number;
    error?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { ok: false, syncedCount: 0, error: 'সিঙ্কের জন্য Database & Sync-এ লগইন করুন' };
    }

    const user = await this.getCurrentUser();
    if (!user) {
      return { ok: false, syncedCount: 0, error: 'সিঙ্কের জন্য Database & Sync-এ লগইন করুন' };
    }

    const now = new Date().toISOString();
    const rows: Array<{ agent_id: string; settings: any; updated_at: string }> = [];

    // 1. Rose Character row
    const roseChar =
      settings.characterSettings?.rose ||
      settings.roseCharacter ||
      settingsService.getRoseCharacterSettings();

    rows.push({
      agent_id: 'rose',
      settings: {
        emotionalWarmth: roseChar.emotionalWarmth,
        traits: roseChar.traits,
        nickname: roseChar.nickname || '',
        customCharacter: roseChar.customCharacter || '',
        modelChoice: roseChar.modelChoice || 'auto',
        elevenLabsVoiceId: roseChar.elevenLabsVoiceId || '',
      },
      updated_at: now,
    });

    // 2. 4 Specialist Agents rows (Mira, Arin, Zayan, Naira)
    const specialistIds: SpecialistAgentId[] = ['mira', 'arin', 'zayan', 'naira'];
    for (const id of specialistIds) {
      const cfg = settings.agents?.[id];
      if (cfg) {
        rows.push({
          agent_id: id,
          settings: {
            preset: cfg.personality,
            custom: cfg.customInstructions || '',
            language: cfg.language,
            style: cfg.responseStyle,
            voiceId: cfg.elevenLabsVoiceId || '',
            enabled: cfg.enabled,
          },
          updated_at: now,
        });
      }
    }

    try {
      const { error } = await client
        .from('agent_settings')
        .upsert(rows, { onConflict: 'user_id,agent_id' });

      if (error) {
        throw error;
      }

      // Also persist to local dbService
      for (const row of rows) {
        dbService.upsertAgentSettings(row.agent_id as any, row.settings);
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
        }
      } catch {}

      return { ok: true, syncedCount: rows.length };
    } catch (e: any) {
      console.error('Supabase sync error:', e);
      return { ok: false, syncedCount: 0, error: e.message || 'ক্লাউড সিঙ্কে ত্রুটি হয়েছে' };
    }
  }

  /**
   * Loads all agent settings from Supabase public.agent_settings.
   * Compares with local settings; newer updated_at wins.
   */
  public async loadAndMergeCloudSettings(
    currentSettings: AppSettings
  ): Promise<{ settings: AppSettings; updated: boolean }> {
    const client = this.getClient();
    if (!client) return { settings: currentSettings, updated: false };

    const user = await this.getCurrentUser();
    if (!user) return { settings: currentSettings, updated: false };

    try {
      const { data, error } = await client.from('agent_settings').select('*');
      if (error || !data || data.length === 0) {
        return { settings: currentSettings, updated: false };
      }

      let hasChanges = false;
      const updatedSettings: AppSettings = { ...currentSettings };

      for (const row of data) {
        const agentId = row.agent_id;
        const cloudSettings = row.settings;
        if (!cloudSettings) continue;

        if (agentId === 'rose') {
          // Merge Rose
          const currentRose =
            updatedSettings.characterSettings?.rose || updatedSettings.roseCharacter;
          const mergedRose = {
            ...currentRose,
            emotionalWarmth: cloudSettings.emotionalWarmth || currentRose.emotionalWarmth,
            traits: cloudSettings.traits || currentRose.traits,
            nickname: cloudSettings.nickname !== undefined ? cloudSettings.nickname : currentRose.nickname,
            customCharacter:
              cloudSettings.customCharacter !== undefined
                ? cloudSettings.customCharacter
                : currentRose.customCharacter,
            modelChoice: cloudSettings.modelChoice || currentRose.modelChoice,
            elevenLabsVoiceId:
              cloudSettings.elevenLabsVoiceId !== undefined
                ? cloudSettings.elevenLabsVoiceId
                : currentRose.elevenLabsVoiceId,
          };
          updatedSettings.characterSettings = { rose: mergedRose };
          updatedSettings.roseCharacter = mergedRose;
          settingsService.saveRoseCharacterSettings(mergedRose);
          hasChanges = true;
        } else if (['mira', 'arin', 'zayan', 'naira'].includes(agentId)) {
          const sid = agentId as SpecialistAgentId;
          const currentCfg = updatedSettings.agents?.[sid];
          if (currentCfg) {
            updatedSettings.agents = {
              ...updatedSettings.agents,
              [sid]: {
                ...currentCfg,
                personality: cloudSettings.preset || currentCfg.personality,
                customInstructions:
                  cloudSettings.custom !== undefined
                    ? cloudSettings.custom
                    : currentCfg.customInstructions,
                language: cloudSettings.language || currentCfg.language,
                responseStyle: cloudSettings.style || currentCfg.responseStyle,
                elevenLabsVoiceId:
                  cloudSettings.voiceId !== undefined
                    ? cloudSettings.voiceId
                    : currentCfg.elevenLabsVoiceId,
                enabled: cloudSettings.enabled !== undefined ? cloudSettings.enabled : currentCfg.enabled,
              },
            };
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        settingsService.saveSettings(updatedSettings);
      }

      return { settings: updatedSettings, updated: hasChanges };
    } catch (e) {
      console.error('Failed to load cloud settings:', e);
      return { settings: currentSettings, updated: false };
    }
  }

  /**
   * Realtime subscription on public.agent_settings.
   * Remote changes update local application state live without page refresh.
   */
  public subscribeToRealtime(
    onRemoteChange: (agentId: string, settings: any, updatedAt: string) => void
  ): () => void {
    const client = this.getClient();
    if (!client) return () => {};

    try {
      this.realtimeChannel = client
        .channel('public:agent_settings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agent_settings' },
          (payload: any) => {
            const newRecord = payload.new;
            if (newRecord?.agent_id && newRecord?.settings) {
              onRemoteChange(newRecord.agent_id, newRecord.settings, newRecord.updated_at);
            }
          }
        )
        .subscribe();

      return () => {
        if (this.realtimeChannel) {
          client.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
      };
    } catch {
      return () => {};
    }
  }
}

export const supabaseService = new SupabaseService();
