import { supabaseService } from '../services/supabaseService';
import { dbService } from '../services/db';
import { handleRoseTeamTurn } from './teamEngine';
import { ChatMessage } from '../types';

export interface DeviceCommandRecord {
  id: string;
  user_id?: string;
  from_device: string;
  to_device: string;
  kind: string;
  payload: { text?: string; [key: string]: any };
  status: 'pending' | 'processing' | 'done' | 'failed' | 'denied';
  result?: { text?: string; error?: string; [key: string]: any };
  created_at: string;
  updated_at?: string;
}

type CommandHandlerCallback = (command: DeviceCommandRecord) => void;
type StatusChangeCallback = (status: 'Listening' | 'Paused' | 'Error', errorMsg?: string) => void;

class DeviceLinkService {
  private isRunning = false;
  private isPaused = false;
  private pollIntervalId: any = null;
  private realtimeChannel: any = null;
  private processingQueue = false;
  private lastProcessedTimestamp = 0;
  private commandCallbacks: CommandHandlerCallback[] = [];
  private statusCallbacks: StatusChangeCallback[] = [];
  private currentStatus: 'Listening' | 'Paused' | 'Error' = 'Paused';
  private lastError: string | null = null;
  private recentRequests: DeviceCommandRecord[] = [];

  constructor() {
    this.loadRecentRequests();
  }

  public subscribeCommands(cb: CommandHandlerCallback) {
    this.commandCallbacks.push(cb);
    return () => {
      this.commandCallbacks = this.commandCallbacks.filter((c) => c !== cb);
    };
  }

  public subscribeStatus(cb: StatusChangeCallback) {
    this.statusCallbacks.push(cb);
    cb(this.currentStatus, this.lastError || undefined);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((c) => c !== cb);
    };
  }

  private setStatus(status: 'Listening' | 'Paused' | 'Error', err?: string) {
    this.currentStatus = status;
    this.lastError = err || null;
    this.statusCallbacks.forEach((cb) => cb(status, this.lastError || undefined));
  }

  private async loadRecentRequests() {
    try {
      const client = supabaseService.getClient();
      if (!client) return;
      const user = await supabaseService.getCurrentUser();
      if (!user) return;

      const { data, error } = await client
        .from('device_commands')
        .select('*')
        .eq('to_device', 'pc')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        this.recentRequests = data as DeviceCommandRecord[];
      }
    } catch {}
  }

  public getRecentRequests(): DeviceCommandRecord[] {
    return this.recentRequests;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.setStatus('Paused');
    } else if (supabaseService.isConfigured()) {
      this.setStatus('Listening');
    } else {
      this.setStatus('Error', 'Supabase কনফিগার করা নেই');
    }
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public async startService(onNewAnswer?: (question: string, answer: string) => void) {
    if (this.isRunning) return;
    this.isRunning = true;

    const user = await supabaseService.getCurrentUser();
    if (!user || !supabaseService.isConfigured()) {
      this.setStatus('Error', 'Database & Sync-এ লগইন করুন');
      this.isRunning = false;
      return;
    }

    this.setStatus('Paused');
    await this.pollPendingCommands(onNewAnswer);

    this.pollIntervalId = setInterval(async () => {
      if (!this.isPaused && this.isRunning) {
        await this.pollPendingCommands(onNewAnswer);
      }
    }, 20000);

    const client = supabaseService.getClient();
    if (client) {
      try {
        this.realtimeChannel = client
          .channel('public:device_commands')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'device_commands',
              filter: "to_device=eq.pc",
            },
            async () => {
              if (!this.isPaused && this.isRunning) {
                await this.pollPendingCommands(onNewAnswer);
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED' && !this.isPaused) {
              this.setStatus('Listening');
            } else if (status === 'CHANNEL_ERROR') {
              this.setStatus('Error', 'রিয়েলটাইম সংযোগ ত্রুটি');
            }
          });
      } catch (e: any) {
        this.setStatus('Error', e?.message || 'রিয়েলটাইম শুরু করা যায়নি');
      }
    }
  }

  public stopService() {
    this.isRunning = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.realtimeChannel) {
      const client = supabaseService.getClient();
      if (client) {
        client.removeChannel(this.realtimeChannel);
      }
      this.realtimeChannel = null;
    }
    this.setStatus('Paused');
  }

  public async selfTest(): Promise<{ ok: boolean; message: string }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { ok: false, message: 'Database & Sync-এ লগইন করুন' };
    }
    const user = await supabaseService.getCurrentUser();
    if (!user) {
      return { ok: false, message: 'Database & Sync-এ লগইন করুন' };
    }

    try {
      const { data, error } = await client
        .from('device_commands')
        .insert({
          user_id: user.id,
          from_device: 'pc',
          to_device: 'pc',
          kind: 'ask',
          payload: { text: 'টেস্ট: তুমি কি শুনতে পাচ্ছ?' },
          status: 'pending',
          result: {},
        })
        .select()
        .single();

      if (error || !data) {
        return { ok: false, message: error?.message || 'টেস্ট কমান্ড পাঠানো যায়নি' };
      }

      setTimeout(() => this.pollPendingCommands(), 500);

      return { ok: true, message: 'সেলফ-টেস্ট সফলভাবে পাঠানো হয়েছে' };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'সেলফ-টেস্টে ত্রুটি' };
    }
  }

  private async pollPendingCommands(onNewAnswer?: (q: string, a: string) => void) {
    if (this.isPaused || this.processingQueue) return;
    const client = supabaseService.getClient();
    if (!client) return;
    const user = await supabaseService.getCurrentUser();
    if (!user) {
      this.setStatus('Error', 'Database & Sync-এ লগইন করুন');
      return;
    }

    this.processingQueue = true;
    try {
      if (!this.isPaused) {
        this.setStatus('Listening');
      }

      const { data, error } = await client
        .from('device_commands')
        .select('*')
        .eq('to_device', 'pc')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      if (error || !data || data.length === 0) {
        this.processingQueue = false;
        return;
      }

      for (const cmd of data) {
        if (this.isPaused || !this.isRunning) break;

        const now = Date.now();
        const elapsed = now - this.lastProcessedTimestamp;
        if (elapsed < 3000) {
          await new Promise((r) => setTimeout(r, 3000 - elapsed));
        }
        this.lastProcessedTimestamp = Date.now();

        const { data: updatedRows, error: updateErr } = await client
          .from('device_commands')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', cmd.id)
          .eq('status', 'pending')
          .select();

        if (updateErr || !updatedRows || updatedRows.length !== 1) {
          continue;
        }

        const record = cmd as DeviceCommandRecord;
        let finalStatus: 'done' | 'failed' | 'denied' = 'done';
        let finalResult: any = {};

        if (record.kind === 'ask') {
          const rawText = record.payload?.text || '';
          const trimmedText = rawText.slice(0, 1000);

          try {
            const userMsg: ChatMessage = {
              id: `phone_${record.id}_user`,
              sender: 'user',
              senderName: 'Phone User',
              text: trimmedText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            const records = dbService.getMessages('rose');
            const history: ChatMessage[] = records.map((rec) => ({
              id: rec.id,
              sender: rec.role === 'user' ? 'user' : rec.agent_id,
              senderName: rec.role === 'user' ? 'Phone User' : 'Rose',
              text: rec.content,
              timestamp: new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            const updatedHistory = [...history, userMsg];

            const response = await handleRoseTeamTurn(updatedHistory);
            const roseAnswer = response.text || 'উত্তর পাওয়া যায়নি।';

            dbService.addMessage({
              agent_id: 'rose',
              role: 'user',
              content: `📱 ফোন থেকে প্রশ্ন: ${trimmedText}`,
            });

            dbService.addMessage({
              agent_id: 'rose',
              role: 'agent',
              content: roseAnswer,
            });

            finalStatus = 'done';
            finalResult = { text: roseAnswer };

            if (onNewAnswer) {
              onNewAnswer(trimmedText, roseAnswer);
            }
          } catch (e: any) {
            finalStatus = 'failed';
            finalResult = { error: e?.message || 'উত্তর তৈরি করতে সমস্যা হয়েছে' };
          }
        } else if (record.kind === 'note') {
          const noteText = record.payload?.text || '';
          dbService.addMessage({
            agent_id: 'rose',
            role: 'agent',
            content: `📱 ফোন নোট: ${noteText}`,
          });
          finalStatus = 'done';
          finalResult = { text: 'নোট সংরক্ষিত হয়েছে' };
        } else {
          finalStatus = 'denied';
          finalResult = { error: 'এই কাজ এখনও চালু নয়' };
        }

        await client
          .from('device_commands')
          .update({
            status: finalStatus,
            result: finalResult,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        record.status = finalStatus;
        record.result = finalResult;

        this.recentRequests = [record, ...this.recentRequests.filter((r) => r.id !== record.id)].slice(0, 10);
        this.commandCallbacks.forEach((cb) => cb(record));
      }
    } catch (e: any) {
      this.setStatus('Error', e?.message || 'কমান্ড প্রসেসিং ত্রুটি');
    } finally {
      this.processingQueue = false;
    }
  }
}

export const deviceLinkService = new DeviceLinkService();
