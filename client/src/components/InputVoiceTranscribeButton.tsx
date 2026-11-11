import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { transcribeAudioApi } from '../services/translationService.ts';

interface InputVoiceTranscribeButtonProps {
  onTranscribeComplete: (text: string) => void;
  targetLanguage?: string;
  disabled?: boolean;
}

export const InputVoiceTranscribeButton: React.FC<InputVoiceTranscribeButtonProps> = ({
  onTranscribeComplete,
  targetLanguage = 'en-US',
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clear timer and stream on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle ESC key to cancel recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecording) {
        cancelRecording();
      }
    };
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (disabled || isTranscribing) return;
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const fullBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (fullBlob.size < 100) {
          setIsTranscribing(false);
          return;
        }

        // Send to /api/transcribe-audio endpoint
        setIsTranscribing(true);
        try {
          const result = await transcribeAudioApi(fullBlob, targetLanguage);
          const text = result.transcription?.trim();
          if (text) {
            onTranscribeComplete(text);
          }
        } catch (err: any) {
          console.error('Speech-to-text /api/transcribe-audio error:', err);
          setErrorMessage(err.message || 'Transcription failed. Please try again.');
          setTimeout(() => setErrorMessage(null), 3500);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone blocked. Please grant access.'
          : 'Microphone unavailable.'
      );
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
    audioChunksRef.current = [];
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Recording indicator tooltip / pill */}
      {isRecording && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 dark:bg-[#1C1C1E] text-white text-[11px] font-semibold whitespace-nowrap shadow-lg border border-orange-500/30 z-20 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-ping shrink-0" />
          <span>Recording: {formatDuration(duration)}</span>
          <span className="text-[9px] text-white/60 ml-1">(Click to stop)</span>
        </div>
      )}

      {/* Transcribing state pill */}
      {isTranscribing && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 dark:bg-[#1C1C1E] border border-orange-500/30 text-[#EC5E27] text-[11px] font-semibold whitespace-nowrap shadow-md z-20">
          <Loader2 className="w-3 h-3 animate-spin text-[#EC5E27]" />
          <span>Transcribing speech...</span>
        </div>
      )}

      {/* Error bubble */}
      {errorMessage && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-[#1C1C1E] border border-rose-500/40 text-rose-400 text-[11px] font-medium whitespace-nowrap shadow-md z-20">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* The Microphone Action Button */}
      <button
        type="button"
        id="input-voice-transcribe-btn"
        disabled={disabled || isTranscribing}
        onClick={isRecording ? stopRecording : startRecording}
        title={
          isRecording
            ? 'Click to stop recording & transcribe speech to text'
            : isTranscribing
            ? 'Transcribing audio...'
            : 'Convert speech into text in real-time (/api/transcribe-audio)'
        }
        className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
          isRecording
            ? 'bg-[#EC5E27] text-white border border-[#EC5E27] ring-2 ring-[#EC5E27]/40 animate-pulse'
            : isTranscribing
            ? 'bg-orange-500/10 text-[#EC5E27] cursor-wait border border-orange-500/30'
            : 'text-slate-500 dark:text-neutral-400 hover:text-[#EC5E27] dark:hover:text-[#EC5E27] hover:bg-orange-500/10'
        }`}
        aria-label={
          isRecording
            ? 'Stop recording voice message'
            : 'Record voice to transcribe into text'
        }
      >
        {isTranscribing ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#EC5E27]" />
        ) : isRecording ? (
          <Square className="w-3.5 h-3.5 fill-current text-white" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
