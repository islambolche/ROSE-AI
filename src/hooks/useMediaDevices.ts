import { useState, useEffect, useRef, useCallback } from 'react';

export type DeviceStatus = 'off' | 'requesting' | 'connected' | 'denied' | 'unavailable';

export interface UseMediaDevicesResult {
  cameraStatus: DeviceStatus;
  micStatus: DeviceStatus;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  audioLevel: number;
  cameraError: string | null;
  micError: string | null;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  stopAll: () => void;
}

export function useMediaDevices(): UseMediaDevicesResult {
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>('off');
  const [micStatus, setMicStatus] = useState<DeviceStatus>('off');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    setVideoStream(null);
    setCameraStatus('off');
    setCameraError(null);
  }, []);

  // Stop microphone helper
  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioStream(null);
    setAudioLevel(0);
    setMicStatus('off');
    setMicError(null);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraStatus === 'connected' || cameraStatus === 'requesting') {
      stopCamera();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraError('Camera API not supported in this browser environment.');
      return;
    }

    setCameraStatus('requesting');
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      videoStreamRef.current = stream;
      setVideoStream(stream);
      setCameraStatus('connected');
    } catch (err: unknown) {
      stopCamera();
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraError('Camera permission was denied in browser permissions.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraStatus('unavailable');
        setCameraError('No video camera device detected on this hardware.');
      } else {
        setCameraStatus('unavailable');
        setCameraError(error.message || 'Could not initialize camera hardware.');
      }
    }
  }, [cameraStatus, stopCamera]);

  const toggleMic = useCallback(async () => {
    if (micStatus === 'connected' || micStatus === 'requesting') {
      stopMic();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicStatus('unavailable');
      setMicError('Audio API not supported in this browser environment.');
      return;
    }

    setMicStatus('requesting');
    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setAudioStream(stream);
      setMicStatus('connected');

      // Set up real AudioContext audio visualizer
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudio = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            // Normalize level between 0 and 100
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(normalized);
            animFrameRef.current = requestAnimationFrame(updateAudio);
          }
        };

        updateAudio();
      } catch {
        // If AudioContext fails to initialize, default level to active
        setAudioLevel(50);
      }
    } catch (err: unknown) {
      stopMic();
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicStatus('denied');
        setMicError('Microphone permission was denied in browser permissions.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMicStatus('unavailable');
        setMicError('No microphone hardware detected on this device.');
      } else {
        setMicStatus('unavailable');
        setMicError(error.message || 'Could not initialize microphone input.');
      }
    }
  }, [micStatus, stopMic]);

  const stopAll = useCallback(() => {
    stopCamera();
    stopMic();
  }, [stopCamera, stopMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    cameraStatus,
    micStatus,
    videoStream,
    audioStream,
    audioLevel,
    cameraError,
    micError,
    toggleCamera,
    toggleMic,
    stopAll,
  };
}
