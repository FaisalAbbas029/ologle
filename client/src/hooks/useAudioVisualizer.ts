import { useState, useEffect, useRef } from 'react';

interface UseAudioVisualizerOptions {
  stream?: MediaStream | null;
  videoElement?: HTMLVideoElement | null;
  isActive?: boolean;
  threshold?: number; // Volume threshold for isSpeaking (0-100)
  simulatedSpeaking?: boolean; // For remote partner when WebRTC audio track is synthetic/simulated
}

export interface AudioVisualizerState {
  audioLevel: number; // 0 to 100
  isSpeaking: boolean;
  frequencyData: number[]; // Normalized frequency bars [0..1]
}

export function useAudioVisualizer({
  stream = null,
  videoElement = null,
  isActive = true,
  threshold = 12,
  simulatedSpeaking = false,
}: UseAudioVisualizerOptions = {}): AudioVisualizerState {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [frequencyData, setFrequencyData] = useState<number[]>([0.2, 0.4, 0.7, 0.5, 0.3]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setAudioLevel(0);
      setIsSpeaking(false);
      return;
    }

    // Determine the active media stream (either passed directly or attached to videoElement)
    let activeStream: MediaStream | null = stream;
    if (!activeStream && videoElement && videoElement.srcObject instanceof MediaStream) {
      activeStream = videoElement.srcObject;
    }

    const hasAudioTrack = activeStream && activeStream.getAudioTracks().length > 0;

    if (activeStream && hasAudioTrack) {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;

        const ctx = new AudioCtxClass();
        audioCtxRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(activeStream);
        source.connect(analyser);
        sourceRef.current = source;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          const barCount = 5;
          const step = Math.floor(dataArray.length / barCount);
          const bars: number[] = [];

          for (let i = 0; i < barCount; i++) {
            const val = dataArray[i * step] || 0;
            bars.push(Math.min(1, Math.max(0.1, val / 255)));
            sum += val;
          }

          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));

          setAudioLevel(normalized);
          setIsSpeaking(normalized > threshold);
          setFrequencyData(bars);

          animFrameRef.current = requestAnimationFrame(checkAudio);
        };

        checkAudio();

        return () => {
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch {}
            sourceRef.current = null;
          }
          if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            try { audioCtxRef.current.close(); } catch {}
            audioCtxRef.current = null;
          }
        };
      } catch (err) {
        console.warn('Web Audio API analyzer initialization fallback:', err);
      }
    }

    // If simulated speaking is active (e.g. remote peer simulation or fallback)
    if (simulatedSpeaking) {
      let phase = 0;
      const interval = setInterval(() => {
        phase += 0.2;
        const wave = Math.sin(phase) * 0.5 + 0.5;
        const level = Math.round(wave * 70) + 15;
        setAudioLevel(level);
        setIsSpeaking(level > threshold);
        setFrequencyData([
          0.3 + 0.5 * Math.sin(phase),
          0.4 + 0.6 * Math.sin(phase + 1),
          0.5 + 0.5 * Math.cos(phase),
          0.3 + 0.4 * Math.sin(phase + 2),
          0.2 + 0.3 * Math.cos(phase + 1),
        ]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [stream, videoElement, isActive, threshold, simulatedSpeaking]);

  return { audioLevel, isSpeaking, frequencyData };
}
