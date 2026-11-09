/**
 * Client Translation Service
 * Relies on the server-side Gemini endpoint /api/translate with caching
 * and fast conversational heuristics.
 */

const translationCache = new Map<string, string>();
const autoDetectCache = new Map<string, AutoDetectResult>();

export interface AutoDetectResult {
  detectedLanguage: string;
  detectedLanguageName: string;
  translatedText: string;
  isTranslated: boolean;
}

export async function autoDetectAndTranslateMessage(
  text: string,
  targetLangCode: string
): Promise<AutoDetectResult> {
  const clean = text.trim();
  const tShort = (targetLangCode || 'en').split('-')[0].toLowerCase();

  if (!clean) {
    return {
      detectedLanguage: tShort,
      detectedLanguageName: 'Unknown',
      translatedText: '',
      isTranslated: false,
    };
  }

  const cacheKey = `autodetect:${tShort}:${clean.toLowerCase()}`;
  if (autoDetectCache.has(cacheKey)) {
    return autoDetectCache.get(cacheKey)!;
  }

  try {
    const res = await fetch('/api/translate-autodetect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        targetLanguage: tShort,
      }),
    });

    if (res.ok) {
      const data: AutoDetectResult = await res.json();
      if (data && data.translatedText !== undefined) {
        autoDetectCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Auto-detect translation request failed:', err);
  }

  return {
    detectedLanguage: 'auto',
    detectedLanguageName: 'Auto',
    translatedText: clean,
    isTranslated: false,
  };
}

export async function translateCaption(
  text: string,
  sourceLangCode: string,
  targetLangCode: string
): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  const sShort = sourceLangCode.split('-')[0].toLowerCase();
  const tShort = targetLangCode.split('-')[0].toLowerCase();

  // If same language, no translation needed
  if (sShort === tShort) {
    return clean;
  }

  const cacheKey = `${sShort}->${tShort}:${clean.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        sourceLanguage: sShort,
        targetLanguage: tShort,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.translatedText) {
        translationCache.set(cacheKey, data.translatedText);
        return data.translatedText;
      }
    }
  } catch (err) {
    console.warn('Translation request failed, using original text fallback:', err);
  }

  return clean;
}

export interface TranscribeAudioResult {
  transcription: string;
  translation?: string;
}

/**
 * Send microphone audio directly to /api/transcribe-audio
 * for speech-to-text conversion via Gemini 3.5 Transcribe
 */
export async function transcribeAudioApi(
  audioBlob: Blob,
  targetLanguage?: string
): Promise<TranscribeAudioResult> {
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

  const res = await fetch('/api/transcribe-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: audioBlob.type || 'audio/webm',
      targetLanguage,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server responded with status ${res.status}`);
  }

  return await res.json();
}

