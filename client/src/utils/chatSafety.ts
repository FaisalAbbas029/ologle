/**
 * Chat Safety & Anti-DLP (Data Loss Prevention) Engine
 * Strict blocking of URLs, links, phone numbers, emails, and sensitive personal information.
 */

export interface ChatSafetyResult {
  isAllowed: boolean;
  reason?: string;
  matchedPattern?: 'LINK' | 'PHONE' | 'EMAIL' | 'SOCIAL_HANDLE' | 'SENSITIVE_DATA';
}

// URL / Web address patterns (includes obfuscated dots like dot, [dot], etc.)
const URL_REGEX = /(https?:\/\/|ftp:\/\/|www\.)[^\s/$.?#].[^\s]*|[a-zA-Z0-9-]+\.(com|net|org|io|co|ai|app|xyz|me|info|biz|tv|gg|link|ly|cc|to|site|online|store|tech|live|space|club|dev|top|fun|shop|pro|world|page|bio|me|in|pk|ru|cn|uk|de|fr|ca|au|us)(\/[^\s]*)?/i;
const OBFUSCATED_URL_REGEX = /[a-zA-Z0-9-]+\s*(\[dot\]|\(dot\)|\s+dot\s+|\.)\s*(com|org|net|io|co|ai|app|xyz|gg|link|ly|me|site)/i;

// Phone number patterns (International, national, spaced, hyphenated, parenthesized)
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/;
const COMPACT_DIGIT_PHONE_REGEX = /(?:\+?\d[\s.-]*){8,15}\d/;

// Email address pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const OBFUSCATED_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*(\[at\]|\(at\)|\s+at\s+)\s*[a-zA-Z0-9.-]+\s*(\[dot\]|\(dot\)|\s+dot\s+|\.)\s*[a-zA-Z]{2,}/i;

// Social messaging handles and invite links
const SOCIAL_INVITE_REGEX = /(wa\.me|t\.me|telegram\.me|discord\.(gg|com)|instagram\.com|snapchat\.com|tiktok\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com)\/[a-zA-Z0-9_.-]+/i;

export function validateChatMessage(text: string): ChatSafetyResult {
  if (!text || !text.trim()) {
    return { isAllowed: true };
  }

  const clean = text.trim();

  // 1. Check for links & URLs
  if (URL_REGEX.test(clean) || OBFUSCATED_URL_REGEX.test(clean) || SOCIAL_INVITE_REGEX.test(clean)) {
    return {
      isAllowed: false,
      reason: 'Sharing external links, websites, or social invites is strictly banned.',
      matchedPattern: 'LINK',
    };
  }

  // 2. Check for email addresses
  if (EMAIL_REGEX.test(clean) || OBFUSCATED_EMAIL_REGEX.test(clean)) {
    return {
      isAllowed: false,
      reason: 'Sharing email addresses is strictly banned for privacy and security.',
      matchedPattern: 'EMAIL',
    };
  }

  // 3. Check for phone numbers
  // Count digits in the string
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 7 && (PHONE_REGEX.test(clean) || COMPACT_DIGIT_PHONE_REGEX.test(clean))) {
    // Avoid blocking purely short casual numbers like "I am 25 years old and graduated in 2022"
    // If digits appear continuously in a phone-like pattern:
    const hasPhoneDelimiters = /[\d\s+\-().]{7,}/.test(clean);
    if (hasPhoneDelimiters && (digits.length >= 8 || /^\+?\d{7,}/.test(clean))) {
      return {
        isAllowed: false,
        reason: 'Sharing phone numbers or direct contact digits is strictly banned.',
        matchedPattern: 'PHONE',
      };
    }
  }

  return { isAllowed: true };
}

