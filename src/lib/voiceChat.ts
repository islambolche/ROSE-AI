/**
 * Voice Chat & Hands-Free Speech Engine for ROSE AI Assistant.
 * Uses getUserMedia + AudioContext/AnalyserNode (for permission & RMS voice level)
 * together with native Web Speech API (SpeechRecognition and SpeechSynthesis).
 * Does not use Gemini Live API.
 */

import { ttsService } from './tts';
import { AgentId } from '../types';

interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export interface VoiceChatCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (bengaliMessage: string, rawCode?: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onAudioLevelChange?: (rmsLevel: number, dotHeights: number[]) => void;
}

export interface VoiceSynthesisOptions {
  language?: string;
  speed?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onMissingBengaliVoice?: (note: string) => void;
}

const QUIET_DOTS: number[] = [4, 4, 4, 4, 4];

/**
 * Strips bracketed emotion tags (e.g. [warm], [caring]), markdown symbols, and emojis
 * before sending text to speech synthesis.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[\s*[a-zA-Z0-9_\-\s]+\s*\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#~>•]/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/[\uFE00-\uFE0F\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits cleaned text into individual sentences/clauses so Chrome SpeechSynthesis
 * never stops mid-way on longer answers.
 */
export function splitTextIntoSentences(text: string): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  const rawSentences = cleaned
    .split(/(?<=[।?!.\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const sentence of rawSentences) {
    if (sentence.length <= 160) {
      chunks.push(sentence);
    } else {
      // Break very long sentences by comma/semicolon/dash
      const subParts = sentence
        .split(/(?<=[,;—–])\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      let current = '';
      for (const part of subParts) {
        if (!current) {
          current = part;
        } else if ((current + ' ' + part).length <= 160) {
          current += ' ' + part;
        } else {
          chunks.push(current);
          current = part;
        }
      }
      if (current) {
        chunks.push(current);
      }
    }
  }

  return chunks.length > 0 ? chunks : [cleaned];
}

/**
 * Maps settings store language name to BCP-47 speech recognition/synthesis code.
 */
export function getLanguageCode(language?: string): string {
  if (!language) return 'bn-BD';
  const lower = language.toLowerCase();
  if (lower.includes('বাংলা') || lower.includes('bengali') || lower === 'bn') {
    return 'bn-BD';
  }
  if (lower.includes('english') || lower.includes('ইংরেজি') || lower === 'en') {
    return 'en-US';
  }
  if (lower.includes('hindi') || lower.includes('হিন্দি') || lower === 'hi') {
    return 'hi-IN';
  }
  if (lower.includes('arabic') || lower.includes('আরবি') || lower === 'ar') {
    return 'ar-SA';
  }
  if (lower.includes('spanish') || lower.includes('স্প্যানিশ') || lower === 'es') {
    return 'es-ES';
  }
  return 'bn-BD';
}

/**
 * Maps getUserMedia DOMException error names/messages to specific Bengali instructions.
 */
export function getMediaDeviceBengaliError(err: any): string {
  const name = String(err?.name || '');
  const message = String(err?.message || '').toLowerCase();

  if (
    name === 'SecurityError' ||
    message.includes('permissions policy') ||
    message.includes('permission policy') ||
    message.includes('disallowed by permissions policy') ||
    message.includes('feature policy')
  ) {
    return 'এই ফ্রেমে মাইক বন্ধ। অ্যাপটা পূর্ণ-স্ক্রিন বা আলাদা ট্যাবে খুলুন।';
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'মাইক বন্ধ আছে। ঠিকানার পাশের তালা চিহ্ন → Microphone → Allow করে রিফ্রেশ করুন।';
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'কোনো মাইক পাওয়া যায়নি। মাইক লাগানো আছে কি দেখুন।';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'অন্য কোনো অ্যাপ মাইক ব্যবহার করছে।';
  }

  return 'মাইক বন্ধ আছে। ঠিকানার পাশের তালা চিহ্ন → Microphone → Allow করে রিফ্রেশ করুন।';
}

/**
 * Maps SpeechRecognition error events (when getUserMedia already succeeded) to specific Bengali messages.
 */
export function getSpeechRecognitionBengaliError(
  errorType: string,
  hasActiveStream: boolean
): string {
  switch (errorType) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'permission-denied':
    case 'not_supported':
      if (hasActiveStream) {
        return 'মাইক ঠিক আছে, কিন্তু ভয়েস-চেনা সেবা বন্ধ। Google Chrome ব্যবহার করুন।';
      }
      return 'মাইক বন্ধ আছে। ঠিকানার পাশের তালা চিহ্ন → Microphone → Allow করে রিফ্রেশ করুন।';
    case 'network':
      return 'ভয়েস-চেনা সেবায় ইন্টারনেট সংযোগ নেই।';
    case 'audio-capture':
      return 'কোনো মাইক পাওয়া যায়নি। মাইক লাগানো আছে কি দেখুন।';
    default:
      return 'মাইক ঠিক আছে, কিন্তু ভয়েস-চেনা সেবা বন্ধ। Google Chrome ব্যবহার করুন।';
  }
}

class VoiceChatManager {
  private recognition: any = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;

  private isMicEnabled = false;
  private isPausedForSpeaking = false;
  private currentLanguage = 'bn-BD';
  private callbacks: VoiceChatCallbacks | null = null;
  private silenceTimer: any = null;
  private currentInterim = '';
  private currentFinalAccumulator = '';
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakSessionId = 0;
  private lastEmittedError: string | null = null;
  private hasShownMissingBnVoiceNote = false;

  public isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindowSpeech;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isMicActive(): boolean {
    return this.isMicEnabled;
  }

  private emitErrorOnce(bengaliMsg: string, rawCode?: string) {
    if (this.lastEmittedError === bengaliMsg) {
      return;
    }
    this.lastEmittedError = bengaliMsg;
    this.callbacks?.onError(bengaliMsg, rawCode);
  }

  public resetLastError() {
    this.lastEmittedError = null;
  }

  /**
   * Loads available synthesis voices, waiting for voiceschanged if getVoices() is initially empty.
   */
  public async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSynthesisSupported()) return [];
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length > 0) {
      return existing;
    }

    return new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(window.speechSynthesis.getVoices() || []);
      };

      const onVoicesChanged = () => {
        done();
      };

      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      setTimeout(done, 1200);
    });
  }

  /**
   * 1) Calls navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}}) first,
   * keeps the stream alive, starts AudioContext + AnalyserNode RMS meter, and starts SpeechRecognition.
   */
  public async startRecognition(
    language: string,
    callbacks: VoiceChatCallbacks
  ): Promise<boolean> {
    this.callbacks = callbacks;
    this.currentLanguage = getLanguageCode(language);
    this.isPausedForSpeaking = false;
    this.currentInterim = '';
    this.currentFinalAccumulator = '';

    // Pre-warm speechSynthesis voices list in background
    this.getAvailableVoices().catch(() => {});

    // Clean up any previous leftover stream/context before starting fresh
    this.cleanupAudioResources();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.isMicEnabled = false;
      this.emitErrorOnce(
        'এই ফ্রেমে মাইক বন্ধ। অ্যাপটা পূর্ণ-স্ক্রিন বা আলাদা ট্যাবে খুলুন।',
        'SecurityError'
      );
      return false;
    }

    // Step 1: Request and keep real microphone stream via getUserMedia
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err: any) {
      this.isMicEnabled = false;
      this.cleanupAudioResources();
      const bengaliMsg = getMediaDeviceBengaliError(err);
      this.emitErrorOnce(bengaliMsg, err?.name || 'getUserMediaError');
      return false;
    }

    // Step 2: Start AudioContext + AnalyserNode RMS voice level loop on the active stream
    this.startAudioLevelMonitor(this.mediaStream);

    // Step 3: Check SpeechRecognition availability after getUserMedia succeeded
    if (!this.isRecognitionSupported()) {
      this.isMicEnabled = false;
      this.cleanupAudioResources();
      this.emitErrorOnce(
        'মাইক ঠিক আছে, কিন্তু ভয়েস-চেনা সেবা বন্ধ। Google Chrome ব্যবহার করুন।',
        'not_supported'
      );
      return false;
    }

    // Step 4: Start SpeechRecognition while keeping the stream active
    this.isMicEnabled = true;
    try {
      this.initRecognitionInstance();
      this.recognition.start();
      this.lastEmittedError = null;
      this.callbacks?.onListeningChange?.(true);
      return true;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('already started')) {
        return true;
      }
      this.isMicEnabled = false;
      this.cleanupAudioResources();
      this.emitErrorOnce(
        'মাইক ঠিক আছে, কিন্তু ভয়েস-চেনা সেবা বন্ধ। Google Chrome ব্যবহার করুন।',
        'start_failed'
      );
      return false;
    }
  }

  /**
   * Starts AudioContext + AnalyserNode and measures RMS amplitude via requestAnimationFrame.
   */
  private startAudioLevelMonitor(stream: MediaStream) {
    if (typeof window === 'undefined') return;
    const win = window as IWindowSpeech;
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);

      this.audioContext = ctx;
      this.sourceNode = source;
      this.analyserNode = analyser;

      const dataArray = new Uint8Array(analyser.fftSize);
      const baseWeights = [0.7, 1.0, 1.25, 0.95, 0.75];

      const tick = () => {
        if (!this.analyserNode || !this.isMicEnabled) {
          this.callbacks?.onAudioLevelChange?.(0, QUIET_DOTS);
          return;
        }

        if (this.isPausedForSpeaking || this.isSpeaking) {
          this.callbacks?.onAudioLevelChange?.(0, QUIET_DOTS);
          this.rafId = window.requestAnimationFrame(tick);
          return;
        }

        this.analyserNode.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        const normalizedLevel = Math.min(1, Math.max(0, (rms - 0.012) * 5.2));

        if (normalizedLevel < 0.03) {
          this.callbacks?.onAudioLevelChange?.(0, QUIET_DOTS);
        } else {
          const dotHeights = baseWeights.map((weight) => {
            const jitter = 0.72 + Math.random() * 0.56;
            const rawHeight = 4 + normalizedLevel * weight * jitter * 18;
            return Math.round(Math.min(22, Math.max(5, rawHeight)));
          });
          this.callbacks?.onAudioLevelChange?.(normalizedLevel, dotHeights);
        }

        this.rafId = window.requestAnimationFrame(tick);
      };

      this.rafId = window.requestAnimationFrame(tick);
    } catch {
      // Ignore if AudioContext fails on restricted environments
    }
  }

  /**
   * Completely stops getUserMedia tracks and closes AudioContext so the mic light turns off.
   */
  private cleanupAudioResources() {
    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {
        // ignore
      }
      this.analyserNode = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }

    this.callbacks?.onAudioLevelChange?.(0, QUIET_DOTS);
  }

  public setLanguage(language: string) {
    const newLang = getLanguageCode(language);
    if (newLang !== this.currentLanguage) {
      this.currentLanguage = newLang;
      if (this.recognition && this.isMicEnabled && !this.isPausedForSpeaking) {
        try {
          this.recognition.stop();
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Stop Speech Recognition AND completely close getUserMedia stream + AudioContext.
   */
  public stopRecognition() {
    this.isMicEnabled = false;
    this.isPausedForSpeaking = false;
    this.clearSilenceTimer();
    this.currentInterim = '';
    this.currentFinalAccumulator = '';

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    this.cleanupAudioResources();
    this.callbacks?.onListeningChange?.(false);
  }

  /**
   * ৭) বলার সময় (বা উত্তর তৈরির সময়) মাইক সাময়িক বন্ধ রাখো (নিজের আওয়াজ না ধরতে)
   */
  public pauseRecognitionForSpeaking() {
    this.isPausedForSpeaking = true;
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.callbacks?.onAudioLevelChange?.(0, QUIET_DOTS);
  }

  /**
   * ৭) বলা শেষে আবার মাইক শোনা চালু করো
   */
  public resumeRecognitionAfterSpeaking() {
    this.isPausedForSpeaking = false;
    if (this.isMicEnabled && !this.isSpeaking) {
      try {
        this.initRecognitionInstance();
        this.recognition.start();
        this.callbacks?.onListeningChange?.(true);
      } catch {
        // Recognition might already be running
      }
    }
  }

  /**
   * ২) ও ৪) উত্তর বাক্যে বাক্যে ভেঙে উচ্চস্বরে বলো।
   * ElevenLabs চেষ্টা করবে, ব্যর্থ হলে ব্রাউজার কণ্ঠে নামবে।
   */
  public async speak(
    rawText: string,
    agentId: AgentId,
    options?: VoiceSynthesisOptions
  ): Promise<void> {
    const sessionId = ++this.speakSessionId;
    this.pauseRecognitionForSpeaking();

    // 1. Try ElevenLabs first
    try {
      await ttsService.speak({
        agentId,
        text: rawText,
        onStart: () => {
          if (sessionId !== this.speakSessionId) return;
          this.isSpeaking = true;
          this.callbacks?.onSpeakingChange?.(true);
          options?.onStart?.();
        },
        onEnd: () => {
          if (sessionId !== this.speakSessionId) return;
          this.isSpeaking = false;
          this.callbacks?.onSpeakingChange?.(false);
          options?.onEnd?.();
          if (this.isMicEnabled) {
            this.resumeRecognitionAfterSpeaking();
          }
        },
        onError: (msg) => {
          this.callbacks?.onError(msg);
        },
        onEngineChange: (note) => {
          options?.onMissingBengaliVoice?.(note);
        }
      });
      return; // ElevenLabs played successfully
    } catch (err: any) {
      // Fallback to browser
      if (sessionId !== this.speakSessionId) return;
    }

    // 2. Browser Fallback
    if (!this.isSynthesisSupported()) {
      if (this.isMicEnabled) {
        this.resumeRecognitionAfterSpeaking();
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }

    const sentences = splitTextIntoSentences(rawText);
    if (sentences.length === 0) {
      if (this.isMicEnabled) {
        this.resumeRecognitionAfterSpeaking();
      }
      return;
    }

    const langCode = getLanguageCode(options?.language || this.currentLanguage);
    const voices = await this.getAvailableVoices();

    if (sessionId !== this.speakSessionId) return;

    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (langCode.startsWith('bn')) {
      selectedVoice = voices.find((v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('bn')
      );

      if (!selectedVoice) {
        if (!this.hasShownMissingBnVoiceNote) {
          this.hasShownMissingBnVoiceNote = true;
          options?.onMissingBengaliVoice?.(
            'এই কম্পিউটারে বাংলা কণ্ঠ নেই, উত্তর শুধু লেখায় আসবে।'
          );
        }
        this.isSpeaking = false;
        this.callbacks?.onSpeakingChange?.(false);
        options?.onEnd?.();
        if (this.isMicEnabled) {
          this.resumeRecognitionAfterSpeaking();
        }
        return;
      }
    } else {
      selectedVoice =
        voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ||
        voices.find((v) =>
          v.lang.toLowerCase().startsWith(langCode.split('-')[0].toLowerCase())
        );
    }

    const speed = typeof options?.speed === 'number' ? options.speed : 1.0;
    const volume = typeof options?.volume === 'number' ? options.volume : 1.0;
    const rateVal = Math.max(0.6, Math.min(1.8, speed));
    const volVal = Math.max(0.1, Math.min(1.0, volume));

    this.isSpeaking = true;
    this.callbacks?.onSpeakingChange?.(true);
    options?.onStart?.();

    const finishSpeakingQueue = () => {
      if (sessionId !== this.speakSessionId) return;
      this.isSpeaking = false;
      this.callbacks?.onSpeakingChange?.(false);
      options?.onEnd?.();
      if (this.isMicEnabled) {
        this.resumeRecognitionAfterSpeaking();
      }
    };

    const speakChunkAt = (index: number) => {
      if (sessionId !== this.speakSessionId) return;
      if (index >= sentences.length) {
        finishSpeakingQueue();
        return;
      }

      const chunkText = sentences[index];
      const utterance = new SpeechSynthesisUtterance(chunkText);
      this.currentUtterance = utterance;
      utterance.lang = selectedVoice?.lang || langCode;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = rateVal;
      utterance.volume = volVal;

      utterance.onend = () => {
        if (sessionId !== this.speakSessionId) return;
        speakChunkAt(index + 1);
      };

      utterance.onerror = (e) => {
        if (sessionId !== this.speakSessionId) return;
        if (e.error === 'interrupted' || e.error === 'canceled') {
          finishSpeakingQueue();
          return;
        }
        speakChunkAt(index + 1);
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finishSpeakingQueue();
      }
    };

    speakChunkAt(0);
  }

  /**
   * ৬) Stop বাটন চাপলে বলা তখনই থামবে এবং Mic ON থাকলে আবার শোনা শুরু হবে
   */
  public stopSpeaking(): void {
    this.speakSessionId++;
    ttsService.stop();
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.callbacks?.onSpeakingChange?.(false);

    if (this.isMicEnabled && this.isPausedForSpeaking) {
      this.resumeRecognitionAfterSpeaking();
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  private initRecognitionInstance() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }

    const win = window as IWindowSpeech;
    const SpeechRecConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    this.recognition = new SpeechRecConstructor();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.currentLanguage;

    this.recognition.onstart = () => {
      this.callbacks?.onListeningChange?.(true);
    };

    this.recognition.onresult = (event: any) => {
      if (this.isPausedForSpeaking || this.isSpeaking) {
        return;
      }

      let interim = '';
      let finalForThisBatch = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const transcript = item[0]?.transcript || '';
        if (item.isFinal) {
          finalForThisBatch += ' ' + transcript;
        } else {
          interim += ' ' + transcript;
        }
      }

      interim = interim.trim();
      finalForThisBatch = finalForThisBatch.trim();

      if (finalForThisBatch) {
        this.currentFinalAccumulator = (
          this.currentFinalAccumulator + ' ' + finalForThisBatch
        ).trim();
      }

      const displayInterim = (this.currentFinalAccumulator + ' ' + interim).trim();
      this.currentInterim = displayInterim;

      if (displayInterim) {
        this.lastEmittedError = null;
        this.callbacks?.onInterim(displayInterim);
        this.resetSilenceTimer();
      }
    };

    this.recognition.onerror = (event: any) => {
      const err = String(event?.error || 'error');
      if (err === 'no-speech' || err === 'aborted') {
        return;
      }

      const hasStream = Boolean(this.mediaStream && this.mediaStream.active);
      const bengaliMsg = getSpeechRecognitionBengaliError(err, hasStream);

      if (
        err === 'not-allowed' ||
        err === 'service-not-allowed' ||
        err === 'permission-denied' ||
        err === 'audio-capture'
      ) {
        this.isMicEnabled = false;
        this.cleanupAudioResources();
        this.callbacks?.onListeningChange?.(false);
      }

      this.emitErrorOnce(bengaliMsg, err);
    };

    this.recognition.onend = () => {
      if (this.isMicEnabled && !this.isPausedForSpeaking && !this.isSpeaking) {
        this.flushPendingSpeech();

        setTimeout(() => {
          if (this.isMicEnabled && !this.isPausedForSpeaking && !this.isSpeaking) {
            try {
              this.recognition?.start();
            } catch {
              // ignore restart collisions
            }
          }
        }, 150);
      } else if (!this.isMicEnabled) {
        this.callbacks?.onListeningChange?.(false);
      }
    };
  }

  /**
   * ১) ব্যবহারকারী ১.২ সেকেন্ড (1200ms) চুপ থাকলে মেসেজ নিজে পাঠাও
   */
  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.flushPendingSpeech();
    }, 1200);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private flushPendingSpeech() {
    this.clearSilenceTimer();
    const textToSend = (this.currentFinalAccumulator || this.currentInterim).trim();
    this.currentFinalAccumulator = '';
    this.currentInterim = '';

    if (textToSend) {
      // সাময়িক মাইক শোনা বন্ধ রাখো যতক্ষণ উত্তর আসছে ও বলা শেষ হচ্ছে
      this.pauseRecognitionForSpeaking();
      this.callbacks?.onInterim('');
      this.callbacks?.onFinal(textToSend);
    }
  }
}

export const voiceChat = new VoiceChatManager();
