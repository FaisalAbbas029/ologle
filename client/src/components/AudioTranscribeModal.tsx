/**
 * Microphone Audio Input & Transcription using Gemini 3.5 Transcribe
 * Allows users to record audio directly from their microphone or upload an audio file,
 * then sends the audio to the server for transcription via model 'gemini-3.5-transcribe'.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  Copy,
  Check,
  Send,
  Upload,
  X,
  RefreshCw,
  FileAudio,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../data/languages.ts';

interface AudioTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
  defaultLanguage?: string;
}

export const AudioTranscribeModal: React.FC<AudioTranscribeModalProps> = ({
  isOpen,
  onClose,
  onInsertText,
  defaultLanguage = 'en-US',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedResult, setTranscribedResult] = useState<string | null>(null);
  const [translatedResult, setTranslatedResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  if (!isOpen) return null;

  // Start recording audio from microphone
  const startRecording = async () => {
    setErrorMessage(null);
    setTranscribedResult(null);
    setTranslatedResult(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(fullBlob);
        setAudioUrl(URL.createObjectURL(fullBlob));

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser.'
          : 'Could not access microphone: ' + (err.message || 'Unknown error')
      );
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Handle uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setTranscribedResult(null);
    setTranslatedResult(null);
    setAudioBlob(file);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(URL.createObjectURL(file));
  };

  // Send audio to Gemini 3.5 Transcribe
  const handleTranscribe = async () => {
    if (!audioBlob) {
      setErrorMessage('Please record or upload audio first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);

      const audioBase64 = await base64Promise;
      const targetLang = getLanguageByCode(selectedTargetLang).englishName;

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || 'audio/webm',
          targetLanguage: targetLang,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setTranscribedResult(data.transcription || 'No transcription returned.');
      if (data.translation) {
        setTranslatedResult(data.translation);
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(err.message || 'Failed to transcribe audio with Gemini 3.5.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = translatedResult || transcribedResult;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseText = () => {
    const textToUse = translatedResult || transcribedResult;
    if (textToUse && onInsertText) {
      onInsertText(textToUse);
      onClose();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1C1C1E] border border-orange-200/80 dark:border-white/10 shadow-2xl p-6 text-slate-900 dark:text-white flex flex-col gap-4 animate-in fade-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-orange-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EC5E27]/15 text-[#EC5E27] border border-[#EC5E27]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Microphone Audio Transcription</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EC5E27]/20 text-[#EC5E27] font-mono">
                  gemini-3.5-transcribe
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Record audio with your microphone for accurate AI speech-to-text
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recording / Input Stage */}
        <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-orange-50/40 dark:bg-white/5 border border-orange-200/60 dark:border-white/10 gap-3 text-center">
          {isRecording ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#EC5E27] opacity-25 flex items-center justify-center animate-ping absolute inset-0" />
                <button
                  onClick={stopRecording}
                  className="relative w-16 h-16 rounded-full bg-[#EC5E27] hover:bg-[#D94E1A] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                  title="Stop recording"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[#EC5E27] font-mono text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC5E27] animate-pulse" />
                <span>Recording: {formatSeconds(recordDuration)}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Speak clearly into your microphone...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                title="Start recording"
              >
                <Mic className="w-7 h-7" />
              </button>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Click to Record Voice</span>
                <span className="text-[11px] text-slate-400 dark:text-neutral-400">Or select an audio file below</span>
              </div>
            </div>
          )}

          {/* Audio preview player if recording exists */}
          {audioUrl && !isRecording && (
            <div className="w-full mt-2 pt-3 border-t border-orange-100 dark:border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-neutral-300">
                <span className="flex items-center gap-1 font-semibold">
                  <Volume2 className="w-3.5 h-3.5 text-[#EC5E27]" />
                  <span>Recorded Audio Clip</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                  {audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : ''}
                </span>
              </div>
              <audio src={audioUrl} controls className="w-full h-8" />
            </div>
          )}
        </div>

        {/* Target Translation / Language Option */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-orange-50/40 dark:bg-white/5 border border-orange-200/60 dark:border-white/10">
          <span className="text-xs font-medium text-slate-700 dark:text-neutral-300">Translate output to:</span>
          <select
            value={selectedTargetLang}
            onChange={(e) => setSelectedTargetLang(e.target.value)}
            className="bg-white dark:bg-[#1E293B] border border-orange-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27]"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.englishName} ({lang.label})
              </option>
            ))}
          </select>
        </div>

        {/* Actions row: Upload & Transcribe */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-orange-50 border border-orange-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white hover:text-[#EC5E27] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#EC5E27]" />
            <span>Upload Audio File</span>
          </button>

          <button
            onClick={handleTranscribe}
            disabled={!audioBlob || isRecording || isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${!audioBlob || isRecording || isLoading
                ? 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white shadow-md'
              }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Transcribing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Transcribe Audio</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transcribed Output Box */}
        {transcribedResult && (
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-orange-50/40 dark:bg-white/5 border border-orange-200/60 dark:border-white/10 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#EC5E27]" />
                <span>Transcription Output</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/10 hover:bg-orange-50 border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-white hover:text-[#EC5E27] text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-[#EC5E27]" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                {onInsertText && (
                  <button
                    onClick={handleUseText}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#EC5E27] to-[#EA580C] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3 text-white" />
                    <span>Send to Chat</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed bg-white dark:bg-black/30 p-3 rounded-lg border border-orange-200/60 dark:border-white/10 select-text">
              {transcribedResult}
            </p>

            {translatedResult && translatedResult !== transcribedResult && (
              <div className="mt-1 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[#EC5E27]">
                  Translated ({getLanguageByCode(selectedTargetLang).englishName}):
                </span>
                <p className="text-xs text-slate-800 dark:text-neutral-200 font-medium bg-white dark:bg-black/30 p-3 rounded-lg border border-orange-200/60 dark:border-white/10 select-text">
                  {translatedResult}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
