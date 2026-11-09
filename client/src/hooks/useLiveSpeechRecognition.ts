/**
 * Custom React Hook for Real-Time Speech Recognition & Live Transcription
 * Uses standard Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript declarations for Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface UseLiveSpeechRecognitionProps {
  spokenLanguage: string; // BCP-47 tag, e.g. 'en-US', 'es-ES', 'ur-PK'
  isEnabled: boolean;
  onTranscript: (payload: { text: string; language: string; isFinal: boolean }) => void;
}

export function useLiveSpeechRecognition({
  spokenLanguage,
  isEnabled,
  onTranscript,
}: UseLiveSpeechRecognitionProps) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef<boolean>(isEnabled);
  const spokenLanguageRef = useRef<string>(spokenLanguage);
  const onTranscriptRef = useRef(onTranscript);

  isEnabledRef.current = isEnabled;
  spokenLanguageRef.current = spokenLanguage;
  onTranscriptRef.current = onTranscript;

  // Initialize SpeechRecognition instance
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setIsSupported(true);

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = spokenLanguageRef.current;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk;
          } else {
            interim += transcriptChunk;
          }
        }

        if (interim) {
          setInterimText(interim);
          onTranscriptRef.current({
            text: interim,
            language: spokenLanguageRef.current,
            isFinal: false,
          });
        }

        if (final) {
          setInterimText('');
          onTranscriptRef.current({
            text: final.trim(),
            language: spokenLanguageRef.current,
            isFinal: true,
          });
        }
      };

      recognition.onerror = (event: any) => {
        // Ignore benign errors like no-speech
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        console.warn('[SPEECH] Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied for voice transcription.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if user still has speech recognition enabled
        if (isEnabledRef.current) {
          try {
            recognition.lang = spokenLanguageRef.current;
            recognition.start();
          } catch {
            // Already started or restarting
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Failed to create SpeechRecognition instance:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Update language dynamically when user switches language tag
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = spokenLanguage;
      if (isListening) {
        // Restart with new language
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    }
  }, [spokenLanguage]);

  // Start / Stop recognition when isEnabled changes
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isEnabled) {
      try {
        recognitionRef.current.lang = spokenLanguage;
        recognitionRef.current.start();
      } catch {
        // Already active
      }
    } else {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setInterimText('');
      } catch {
        // Already stopped
      }
    }
  }, [isEnabled]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch {
        // Ignore
      }
    } else {
      try {
        recognitionRef.current.lang = spokenLanguageRef.current;
        recognitionRef.current.start();
      } catch {
        // Ignore
      }
    }
  }, [isListening]);

  return {
    isSupported,
    isListening,
    interimText,
    error,
    toggle,
  };
}
