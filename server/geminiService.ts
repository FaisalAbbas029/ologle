/**
 * Server-side Gemini AI Service
 * Supports audio transcription via 'gemini-3.5-transcribe'
 * and real-time text translation via 'gemini-3.8-flash'.
 */

import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export async function generateAIPracticeReply(input: {
  partnerId: string;
  profession: string;
  interests: string[];
  messages: Array<{ role: 'user' | 'assistant'; text: string }>;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('AI practice is not configured. Add GEMINI_API_KEY to the server environment.');
  }

  const { AI_PRACTICE_PARTNERS } = await import('../client/src/data/aiPracticePartners.ts');
  const partner = AI_PRACTICE_PARTNERS.find((p) => p.id === input.partnerId) || AI_PRACTICE_PARTNERS[0];

  const history = input.messages
    .slice(-10)
    .map(({ role, text }) => `${role === 'assistant' ? partner.name : 'User'}: ${text}`)
    .join('\n');

  const prompt = `You are ${partner.name}, an AI practice partner on Hayloo. You are transparently an AI peer, never misrepresenting yourself as a real human.
Partner profession: ${partner.profession}
Partner bio: ${partner.bio}
Partner conversation style: ${partner.style}
User's profession: ${input.profession || 'Not specified'}
User's interests: ${input.interests.join(', ') || 'General topics'}

Respond naturally, thoughtfully, and concisely (1-3 sentences) to the user's latest message. Be warm, curious, and end with an engaging relevant follow-up question.

Conversation history:
${history}

Reply as ${partner.name}:`;

  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { temperature: 0.75, maxOutputTokens: 200 },
    });
    const text = response.text?.trim();
    if (text) return text;
  } catch (err) {
    console.warn('Gemini 3.8 flash call failed, falling back to 3.1 flash lite:', err);
    const fallbackResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: { temperature: 0.75, maxOutputTokens: 200 },
    });
    const text = fallbackResponse.text?.trim();
    if (text) return text;
  }

  throw new Error('Empty AI response.');
}

/**
 * Transcribe pre-recorded or microphone audio using gemini-3.5-transcribe
 */
export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  targetLanguage?: string
): Promise<{ transcription: string; translation?: string }> {
  const ai = getAi();

  const audioPart = {
    inlineData: {
      mimeType: mimeType || 'audio/webm',
      data: audioBase64,
    },
  };

  const promptText = targetLanguage
    ? `Listen to this audio carefully and transcribe all spoken words verbatim. Also provide a translation into ${targetLanguage}. Return your output as clean plain text with the transcript.`
    : `Listen to this audio carefully and transcribe all spoken words verbatim into text. Return ONLY the transcribed text.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [audioPart, { text: promptText }],
    },
  });

  const transcription = response.text?.trim() || '';

  let translation: string | undefined = undefined;
  if (targetLanguage && transcription) {
    try {
      translation = await translateTextWithGemini(transcription, 'auto', targetLanguage);
    } catch {
      // Ignore secondary translation failure
    }
  }

  return {
    transcription,
    translation,
  };
}

export interface AutoDetectTranslationResult {
  detectedLanguage: string;
  detectedLanguageName: string;
  translatedText: string;
  isTranslated: boolean;
}

/**
 * Automatically detect the source language of incoming chat messages
 * and translate them to the recipient's preferred language using Gemini.
 */
export async function autoDetectAndTranslateWithGemini(
  text: string,
  targetLanguage: string = 'en'
): Promise<AutoDetectTranslationResult> {
  const clean = text.trim();
  const tCode = (targetLanguage || 'en').split('-')[0].toLowerCase();

  if (!clean) {
    return {
      detectedLanguage: tCode,
      detectedLanguageName: 'Unknown',
      translatedText: '',
      isTranslated: false,
    };
  }

  const ai = getAi();
  const prompt = `Detect the language of the following text and translate it into language code "${tCode}".
If the text is already in the target language (${tCode}) or cannot be meaningfully translated (such as numbers, pure punctuation, or emojis), set isTranslated to false and return the original text as translatedText.
Preserve natural conversational phrasing and tone.

Output MUST be valid JSON with keys:
- detectedLanguage: two-letter ISO language code (e.g. 'en', 'es', 'fr', 'zh', 'ur', 'de', 'ar', 'hi', 'ja', 'ko', etc.)
- detectedLanguageName: common English name of detected language (e.g. 'English', 'Spanish', 'French', 'Urdu', etc.)
- translatedText: the translated text in the target language (or original text if already in target language)
- isTranslated: boolean indicating whether a translation was performed (false if detectedLanguage matches targetLanguage)

Text: "${clean.replace(/"/g, '\\"')}"`;

  const parseJsonResult = (rawText: string | undefined): AutoDetectTranslationResult => {
    if (!rawText) throw new Error('Empty response from model');
    const cleaned = rawText.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      detectedLanguage: (parsed.detectedLanguage || 'auto').toLowerCase(),
      detectedLanguageName: parsed.detectedLanguageName || 'Detected Language',
      translatedText: parsed.translatedText || clean,
      isTranslated: Boolean(parsed.isTranslated),
    };
  };

  // Try primary modern flash model with fallback to gemini-3.1-flash-lite
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
    return parseJsonResult(response.text);
  } catch (primaryErr: any) {
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });
      return parseJsonResult(fallbackResponse.text);
    } catch {
      // Safe graceful fallback: return original text
      return {
        detectedLanguage: 'auto',
        detectedLanguageName: 'Auto',
        translatedText: clean,
        isTranslated: false,
      };
    }
  }
}

/**
 * Translate real-time speech text between languages using gemini-3.8-flash with fallback to gemini-3.1-flash-lite
 */
export async function translateTextWithGemini(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  const ai = getAi();
  const prompt = `Translate the following spoken conversation caption from ${sourceLang} into ${targetLang}. Preserve natural colloquial phrasing and tone. Return ONLY the translated sentence, without any explanations, notes, or quotes.

Caption: "${clean}"`;

  // Try primary modern flash model
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 250,
      },
    });

    const translated = response.text?.trim() || clean;
    return translated.replace(/^["']|["']$/g, '');
  } catch (primaryErr: any) {
    // If primary experiences 503 or transient issues, fallback to gemini-3.1-flash-lite
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 250,
        },
      });
      const translated = fallbackResponse.text?.trim() || clean;
      return translated.replace(/^["']|["']$/g, '');
    } catch {
      // Return original spoken text smoothly if translation services are temporarily unavailable
      return clean;
    }
  }
}

/**
 * Generate 3 engaging, contextual conversation starter questions / icebreakers
 * based on shared interests and professions.
 */
export async function generateIcebreakerWithGemini(
  interests: string[] = [],
  professionA?: string,
  professionB?: string
): Promise<{ prompts: string[] }> {
  const fallbackPrompts = [
    interests.length > 0
      ? `What's the most fascinating thing you've learned or built in ${interests[0]} recently?`
      : "What's a project or topic that has been capturing your curiosity lately?",
    professionA
      ? `As a ${professionA}, what is a misconception people often have about your daily craft?`
      : "If you could instantly master one new concept or craft tomorrow, what would it be?",
    interests.length > 1
      ? `How do you see ${interests[0]} and ${interests[1]} intersecting in the future?`
      : "What kind of creative problem-solving energizes you the most?",
  ];

  const ai = getAi();
  const interestsList = interests.filter(Boolean).join(', ') || 'technology, creative ideas';
  const profInfo = [professionA, professionB].filter(Boolean).join(' and ');

  const prompt = `You are an expert conversational catalyst for "Hayloo", a privacy-focused intellectual chat platform.
Generate 3 distinct, thought-provoking, friendly conversation starter questions for two strangers connecting via shared interests.
Shared Interests: ${interestsList}
Professions involved: ${profInfo || 'Knowledge workers / enthusiasts'}

Rules:
- Questions must be open-ended, warm, engaging, and intellectually curious.
- Avoid boring small talk (do not ask about the weather or "how are you").
- Focus on practical experiences, favorite tools, creative philosophies, or future trends.
- Return ONLY a JSON object with a key "prompts" containing an array of exactly 3 strings.
Example: {"prompts": ["Question 1?", "Question 2?", "Question 3?"]}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text?.trim() || '';
    const cleaned = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
      return { prompts: parsed.prompts.slice(0, 3) };
    }
    return { prompts: fallbackPrompts };
  } catch (err) {
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });
      const raw = fallbackResponse.text?.trim() || '';
      const cleaned = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
        return { prompts: parsed.prompts.slice(0, 3) };
      }
    } catch {
      // Fallback smoothly
    }
    return { prompts: fallbackPrompts };
  }
}

