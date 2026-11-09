/**
 * Supported Languages for Voice Transcription, Translation, and Matchmaking
 */

export interface LanguageOption {
  code: string;       // BCP-47 code for Web Speech API (e.g. 'en-US', 'es-ES', 'ur-PK', 'fr-FR')
  shortCode: string;  // 2-letter ISO code (e.g. 'en', 'es', 'ur', 'fr')
  label: string;      // Native label (e.g. 'English', 'Español', 'اردو', 'Français')
  englishName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', shortCode: 'en', label: 'English', englishName: 'English', flag: '🇺🇸' },
  { code: 'tr-TR', shortCode: 'tr', label: 'Türkçe', englishName: 'Turkish', flag: '🇹🇷' },
  { code: 'es-ES', shortCode: 'es', label: 'Español', englishName: 'Spanish', flag: '🇪🇸' },
  { code: 'de-DE', shortCode: 'de', label: 'Deutsch', englishName: 'German', flag: '🇩🇪' },
  { code: 'fr-FR', shortCode: 'fr', label: 'Français', englishName: 'French', flag: '🇫🇷' },
  { code: 'it-IT', shortCode: 'it', label: 'Italiano', englishName: 'Italian', flag: '🇮🇹' },
  { code: 'pt-BR', shortCode: 'pt', label: 'Português', englishName: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru-RU', shortCode: 'ru', label: 'Русский', englishName: 'Russian', flag: '🇷🇺' },
  { code: 'ar-SA', shortCode: 'ar', label: 'العربية', englishName: 'Arabic', flag: '🇸🇦' },
  { code: 'fa-IR', shortCode: 'fa', label: 'فارسی', englishName: 'Persian', flag: '🇮🇷' },
  { code: 'ur-PK', shortCode: 'ur', label: 'اردو', englishName: 'Urdu', flag: '🇵🇰' },
  { code: 'hi-IN', shortCode: 'hi', label: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳' },
  { code: 'zh-CN', shortCode: 'zh', label: '中文 (Mandarin)', englishName: 'Chinese', flag: '🇨🇳' },
  { code: 'ja-JP', shortCode: 'ja', label: '日本語', englishName: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', shortCode: 'ko', label: '한국어', englishName: 'Korean', flag: '🇰🇷' },
  { code: 'nl-NL', shortCode: 'nl', label: 'Nederlands', englishName: 'Dutch', flag: '🇳🇱' },
  { code: 'pl-PL', shortCode: 'pl', label: 'Polski', englishName: 'Polish', flag: '🇵🇱' },
  { code: 'id-ID', shortCode: 'id', label: 'Bahasa Indonesia', englishName: 'Indonesian', flag: '🇮🇩' },
  { code: 'vi-VN', shortCode: 'vi', label: 'Tiếng Việt', englishName: 'Vietnamese', flag: '🇻🇳' },
  { code: 'uk-UA', shortCode: 'uk', label: 'Українська', englishName: 'Ukrainian', flag: '🇺🇦' },
  { code: 'sv-SE', shortCode: 'sv', label: 'Svenska', englishName: 'Swedish', flag: '🇸🇪' },
  { code: 'el-GR', shortCode: 'el', label: 'Ελληνικά', englishName: 'Greek', flag: '🇬🇷' },
  { code: 'th-TH', shortCode: 'th', label: 'ไทย', englishName: 'Thai', flag: '🇹🇭' },
  { code: 'bn-BD', shortCode: 'bn', label: 'বাংলা', englishName: 'Bengali', flag: '🇧🇩' },
  { code: 'ms-MY', shortCode: 'ms', label: 'Bahasa Melayu', englishName: 'Malay', flag: '🇲🇾' },
  { code: 'fil-PH', shortCode: 'tl', label: 'Filipino', englishName: 'Filipino', flag: '🇵🇭' },
  { code: 'cs-CZ', shortCode: 'cs', label: 'Čeština', englishName: 'Czech', flag: '🇨🇿' },
  { code: 'ro-RO', shortCode: 'ro', label: 'Română', englishName: 'Romanian', flag: '🇷🇴' },
];

export function getLanguageByCode(code: string): LanguageOption {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const normalized = code.toLowerCase().trim();

  // 1. Exact match on shortCode (e.g. 'en', 'tr', 'es', 'de')
  const exactShort = SUPPORTED_LANGUAGES.find((l) => l.shortCode.toLowerCase() === normalized);
  if (exactShort) return exactShort;

  // 2. Exact match on full code (e.g. 'en-us', 'tr-tr', 'de-de')
  const exactFull = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === normalized);
  if (exactFull) return exactFull;

  // 3. Exact match on English name or native label (e.g. 'Turkish', 'Türkçe', 'German', 'Deutsch')
  const exactName = SUPPORTED_LANGUAGES.find(
    (l) => l.englishName.toLowerCase() === normalized || l.label.toLowerCase() === normalized
  );
  if (exactName) return exactName;

  // 4. Prefix match for regional locale (e.g. 'en-GB' -> 'en', 'es-MX' -> 'es')
  const prefixMatch = SUPPORTED_LANGUAGES.find(
    (l) => normalized.startsWith(l.shortCode.toLowerCase() + '-') || normalized.startsWith(l.shortCode.toLowerCase() + '_')
  );
  if (prefixMatch) return prefixMatch;

  return SUPPORTED_LANGUAGES[0];
}

export function getLanguageLabel(code: string): string {
  const lang = getLanguageByCode(code);
  return `${lang.englishName} (${lang.label})`;
}
