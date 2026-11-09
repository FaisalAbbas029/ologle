import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../types/index.ts';
import { autoDetectAndTranslateMessage } from '../services/translationService.ts';

export interface UseChatTranslationOptions {
  messages: ChatMessage[];
  onUpdateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  storagePrefix?: string;
  defaultTargetLanguage?: string;
}

export function useChatTranslation({
  messages,
  onUpdateMessage,
  storagePrefix = 'hayloo_chat',
  defaultTargetLanguage = 'en-US',
}: UseChatTranslationOptions) {
  // Toggle state: true = automatically translate incoming peer messages
  const [isAutoTranslateEnabled, setIsAutoTranslateEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${storagePrefix}_translate_enabled`);
    return saved !== null ? saved === 'true' : true;
  });

  // Preferred target language for translation
  const [targetLanguage, setTargetLanguageState] = useState<string>(() => {
    return (
      localStorage.getItem(`${storagePrefix}_target_lang`) ||
      localStorage.getItem('hayloo_subtitle_lang') ||
      defaultTargetLanguage
    );
  });

  const inFlightRef = useRef<Set<string>>(new Set());

  const setTargetLanguage = useCallback(
    (code: string) => {
      setTargetLanguageState(code);
      localStorage.setItem(`${storagePrefix}_target_lang`, code);
    },
    [storagePrefix]
  );

  const toggleAutoTranslate = useCallback(() => {
    setIsAutoTranslateEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(`${storagePrefix}_translate_enabled`, String(next));
      return next;
    });
  }, [storagePrefix]);

  const translateSingleMessage = useCallback(
    async (messageId: string, customTargetLang?: string) => {
      if (inFlightRef.current.has(messageId)) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.sender === 'self' || msg.sender === 'system') return;

      const target = (customTargetLang || targetLanguage || 'en').split('-')[0].toLowerCase();

      inFlightRef.current.add(messageId);
      onUpdateMessage(messageId, { isTranslating: true, translationError: false });

      try {
        const result = await autoDetectAndTranslateMessage(msg.text, target);
        onUpdateMessage(messageId, {
          isTranslating: false,
          translatedText: result.translatedText,
          detectedLanguage: result.detectedLanguage,
          detectedLanguageName: result.detectedLanguageName,
          targetLanguage: target,
          translationError: false,
        });
      } catch (err) {
        console.warn('Auto-detect translation failed for message:', messageId, err);
        onUpdateMessage(messageId, {
          isTranslating: false,
          translationError: true,
        });
      } finally {
        inFlightRef.current.delete(messageId);
      }
    },
    [messages, targetLanguage, onUpdateMessage]
  );

  // Reactive translation loop: automatically translate incoming peer messages when enabled
  useEffect(() => {
    if (!isAutoTranslateEnabled) return;

    const targetShort = targetLanguage.split('-')[0].toLowerCase();

    // Find peer messages needing translation
    const pendingMessages = messages.filter((m) => {
      if (m.sender === 'self' || m.sender === 'system') return false;
      if (inFlightRef.current.has(m.id)) return false;
      if (m.isTranslating) return false;

      // Needs translation if not yet translated or was translated to a different target language
      const needsTranslation =
        !m.translatedText ||
        (m.targetLanguage && m.targetLanguage.toLowerCase() !== targetShort);

      return needsTranslation;
    });

    if (pendingMessages.length === 0) return;

    // Translate up to the most recent 10 pending messages to be snappy and avoid flooding
    const toProcess = pendingMessages.slice(-10);
    toProcess.forEach((msg) => {
      translateSingleMessage(msg.id, targetShort);
    });
  }, [messages, isAutoTranslateEnabled, targetLanguage, translateSingleMessage]);

  return {
    isAutoTranslateEnabled,
    targetLanguage,
    toggleAutoTranslate,
    setTargetLanguage,
    translateSingleMessage,
  };
}
