/**
 * Zero-Data-Storage In-Flight Client-Side Moderation Engine
 * 
 * Technical Design:
 * 1. Executes strictly in browser volatile memory (RAM).
 * 2. Instant pre-render inspection: checks for profanity, harassment, and PII leaks.
 * 3. ZERO PERSISTENCE: Chat logs and moderation telemetry are never written to disk,
 *    localStorage, IndexedDB, or cloud logs. Discarded immediately after session ends.
 */

// Luhn algorithm for accurate in-flight credit card detection
function isLuhnValid(digitsOnly: string): boolean {
  if (digitsOnly.length < 13 || digitsOnly.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Regex patterns for sensitive PII and safety violations
const PII_PATTERNS = {
  // Matches potential credit card sequences (13 to 19 digits with optional hyphens/spaces)
  creditCardCandidate: /\b(?:\d[ -]*?){13,19}\b/g,
  // Social Security Number format
  ssn: /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/i,
  // Standard phone numbers (North America & International formats)
  phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/i,
  // Email address
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i,
  // Physical street address indicators
  physicalAddress: /\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/i,
};

const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|slut|whore)\b/i,
  /\b(f[u*@]ck|sh[!1*]t|b[!1*]tch|a[s$]{2}hole)\b/i, // Leetspeak variations
];

const HARASSMENT_THREAT_PATTERNS = [
  /\b(kill you|murder you|shoot you|stab you|hunt you down)\b/i,
  /\b(kill yourself|kys|hope you die|hang yourself)\b/i,
  /\b(doxx you|swat your house|find your address and hurt)\b/i,
  /\b(nigg(er|a)|fagg(ot|s)|kike|chink|gook|wetback|spic)\b/i, // Slurs
];

export interface InFlightCheckResult {
  isSafe: boolean;
  category: 'pii' | 'profanity' | 'harassment' | 'threat' | null;
  warningMessage?: string;
  piiDetected?: boolean;
  sanitizedText?: string;
}

/**
 * Perform real-time, zero-storage in-memory analysis on outgoing or incoming text.
 */
export function analyzeInFlightText(rawText: string): InFlightCheckResult {
  if (!rawText || !rawText.trim()) {
    return { isSafe: true, category: null };
  }

  const text = rawText.trim();

  // 1. Direct Threat / Extreme Harassment Check (Strict Block)
  for (const pattern of HARASSMENT_THREAT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafe: false,
        category: 'threat',
        warningMessage: 'Message blocked: Direct threats, slurs, or harassment violate zero-tolerance community safety policies.',
      };
    }
  }

  // 2. Personal Identifiable Information (PII) Leak Check
  // Check SSN
  if (PII_PATTERNS.ssn.test(text)) {
    return {
      isSafe: false,
      category: 'pii',
      piiDetected: true,
      warningMessage: 'Message blocked: Detected Social Security Number or sensitive personal ID. Please do not share confidential identifiers.',
    };
  }

  // Check Credit Card with Luhn Verification
  const ccMatches = text.match(PII_PATTERNS.creditCardCandidate);
  if (ccMatches) {
    for (const match of ccMatches) {
      const cleanDigits = match.replace(/[\s-]/g, '');
      if (isLuhnValid(cleanDigits)) {
        return {
          isSafe: false,
          category: 'pii',
          piiDetected: true,
          warningMessage: 'Message blocked: Detected payment card number. Never share credit or debit cards in chat.',
        };
      }
    }
  }

  // Check Physical Address Leak
  if (PII_PATTERNS.physicalAddress.test(text)) {
    return {
      isSafe: false,
      category: 'pii',
      piiDetected: true,
      warningMessage: 'Message blocked: Sharing physical home addresses is restricted to protect your real-world privacy.',
    };
  }

  // Check Phone number
  if (PII_PATTERNS.phone.test(text)) {
    return {
      isSafe: false,
      category: 'pii',
      piiDetected: true,
      warningMessage: 'Message blocked: Sharing direct phone numbers is restricted to prevent harassment and spam.',
    };
  }

  // Check Email leakage
  if (PII_PATTERNS.email.test(text)) {
    return {
      isSafe: false,
      category: 'pii',
      piiDetected: true,
      warningMessage: 'Message blocked: Detected email address. Please maintain conversation privacy within the secure room.',
    };
  }

  // 3. Profanity / Abusive Language Check
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafe: false,
        category: 'profanity',
        warningMessage: 'Message contains profane or abusive language. Please keep professional and constructive communication.',
      };
    }
  }

  return { isSafe: true, category: null };
}

/**
 * Scrub volatile text memory. Replaces string references in ephemeral arrays.
 */
export function purgeEphemeralTextBuffer<T extends { text?: string }>(items: T[]): void {
  for (let i = 0; i < items.length; i++) {
    if (items[i].text) {
      items[i].text = '';
    }
  }
  items.length = 0;
}
