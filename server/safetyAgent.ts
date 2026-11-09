/**
 * Hayloo Server-Side Pluggable Safety Agent Module
 * Evaluates messages before relay using confidence-tiered rule-based analysis.
 * Can be swapped with an ML / LLM classifier via the `SafetyClassifier` interface.
 */

export type SafetyCategory =
  | 'hate_speech'
  | 'harassment_bullying'
  | 'threats_violence'
  | 'sexual_solicitation'
  | 'explicit_sexual'
  | 'spam_scam'
  | 'dangerous_content'
  | 'doxxing_pii';

export interface SafetyClassificationResult {
  isSafe: boolean;
  category: SafetyCategory | null;
  confidence: number; // 0.0 to 1.0
  severityTier: 'safe' | 'low' | 'medium' | 'high';
  reason?: string;
  senderFeedback?: string;
  timestamp: number;
}

export interface SafetyClassifier {
  classifyMessage(text: string): Promise<SafetyClassificationResult> | SafetyClassificationResult;
}

interface PatternRule {
  category: SafetyCategory;
  pattern: RegExp;
  weight: number; // 0.1 to 1.0
  description: string;
}

// Comprehensive pattern rules for safety evaluation
const RULES: PatternRule[] = [
  // Threats & Violence (High confidence blocks)
  {
    category: 'threats_violence',
    pattern: /\b(i (will|am going to) (kill|murder|attack|shoot|stab|bomb|slaughter|hunt) you)\b/i,
    weight: 0.95,
    description: 'Direct threat of physical violence',
  },
  {
    category: 'threats_violence',
    pattern: /\b(hope you die|go die|kill yourself|kys|hang yourself)\b/i,
    weight: 0.92,
    description: 'Incitement of self-harm or death wishes',
  },
  {
    category: 'threats_violence',
    pattern: /\b(pipe bomb|swatting|doxx your family|destroy your life)\b/i,
    weight: 0.88,
    description: 'Threats of terrorism, swatting or harm',
  },

  // Hate Speech (High confidence blocks)
  {
    category: 'hate_speech',
    pattern: /\b(nigg(er|a|az)|fagg(ot|otz|s)|kike|chink|gook|wetback|spic|tranny)\b/i,
    weight: 0.95,
    description: 'Racial, ethnic, or identity slurs',
  },
  {
    category: 'hate_speech',
    pattern: /\b(all (blacks|whites|jews|muslims|asians|gays|trans) should (burn|die|be killed|be erased))\b/i,
    weight: 0.96,
    description: 'Genocidal or hate-motivated group statements',
  },

  // Sexual Solicitation & Explicit Content
  {
    category: 'sexual_solicitation',
    pattern: /\b(send (nudes|feet pics|tit pics|naked photos|dick pics))\b/i,
    weight: 0.89,
    description: 'Solicitation of explicit imagery',
  },
  {
    category: 'sexual_solicitation',
    pattern: /\b(cyber sex|cam sex|pay for sex|onlyfans\.com\/|t\.me\/[a-z0-9_]*nsfw)\b/i,
    weight: 0.85,
    description: 'Commercial or unsolicited sexual solicitation',
  },
  {
    category: 'explicit_sexual',
    pattern: /\b(horny (m|f) (wants|looking for)|wanna sext|show me your (cock|pussy|tits))\b/i,
    weight: 0.88,
    description: 'Explicit sexual propositioning',
  },

  // Harassment & Bullying
  {
    category: 'harassment_bullying',
    pattern: /\b(you are (ugly|worthless|pathetic|retarded|a subhuman|a piece of shit))\b/i,
    weight: 0.76,
    description: 'Direct derogatory insult or harassment',
  },
  {
    category: 'harassment_bullying',
    pattern: /\b(shut up (idiot|moron|bitch|whore|slut|cunt))\b/i,
    weight: 0.78,
    description: 'Abusive language and gendered insults',
  },

  // Spam & Scams
  {
    category: 'spam_scam',
    pattern: /\b(free (crypto|bitcoin|robux|nitro|giftcard)|send eth to 0x|whatsapp me at \+?\d{8,}|telegram: @\w+ for money)\b/i,
    weight: 0.90,
    description: 'Cryptocurrency/gift card scam or off-platform solicitation',
  },
  {
    category: 'spam_scam',
    pattern: /\b(make \$?\d{3,5}\/day working from home|click here: (http|bit\.ly|tinyurl))\b/i,
    weight: 0.75,
    description: 'Work-from-home spam or suspicious URL shortener',
  },

  // Doxxing / Unsolicited PII Harvesting & Sensitive Data Leaks
  {
    category: 'doxxing_pii',
    pattern: /\b(what is your (full name|real address|social security|credit card|phone number|exact home address))\b/i,
    weight: 0.85,
    description: 'Aggressive PII solicitation',
  },
  {
    category: 'doxxing_pii',
    pattern: /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/,
    weight: 0.95,
    description: 'Direct Social Security Number (SSN) leak detected in-flight',
  },
  {
    category: 'doxxing_pii',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    weight: 0.96,
    description: 'Payment card / credit card number leak detected in-flight',
  },
  {
    category: 'doxxing_pii',
    pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    weight: 0.82,
    description: 'Direct phone number leak detected in-flight',
  },
  {
    category: 'doxxing_pii',
    pattern: /\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/i,
    weight: 0.84,
    description: 'Physical residential street address leak detected in-flight',
  },

  // Medium Confidence / Boundary Warnings
  {
    category: 'harassment_bullying',
    pattern: /\b(dumb|stupid|annoying|shut up|loser|weirdo)\b/i,
    weight: 0.48,
    description: 'Mild borderline negativity',
  },
  {
    category: 'spam_scam',
    pattern: /\b(visit my (site|channel|stream)|subscribe to|follow me on (insta|tiktok|snap))\b/i,
    weight: 0.52,
    description: 'Self-promotion / social redirect',
  }
];

export class RuleBasedSafetyAgent implements SafetyClassifier {
  public classifyMessage(text: string): SafetyClassificationResult {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        isSafe: true,
        category: null,
        confidence: 0,
        severityTier: 'safe',
        timestamp: Date.now(),
      };
    }

    let highestConfidence = 0;
    let primaryCategory: SafetyCategory | null = null;
    let matchedReason: string | undefined;

    for (const rule of RULES) {
      if (rule.pattern.test(cleanText)) {
        if (rule.weight > highestConfidence) {
          highestConfidence = rule.weight;
          primaryCategory = rule.category;
          matchedReason = rule.description;
        }
      }
    }

    // Determine confidence tier
    // Low: < 0.35 -> safe / normal relay
    // Medium: 0.35 - 0.75 -> deliver with sender warning
    // High: > 0.75 -> block message completely
    let severityTier: 'safe' | 'low' | 'medium' | 'high' = 'safe';
    let isSafe = true;
    let senderFeedback: string | undefined;

    if (highestConfidence >= 0.75) {
      severityTier = 'high';
      isSafe = false;
      senderFeedback =
        "Your message was blocked because it violates Hayloo's community rules (harassment, explicit content, or threats).";
    } else if (highestConfidence >= 0.35) {
      severityTier = 'medium';
      isSafe = true; // Still delivered, but with a warning to sender
      senderFeedback =
        "This message may be close to violating Hayloo's community rules. Please keep conversations respectful and focused on shared interests.";
    } else if (highestConfidence > 0) {
      severityTier = 'low';
      isSafe = true;
    }

    return {
      isSafe,
      category: primaryCategory,
      confidence: highestConfidence,
      severityTier,
      reason: matchedReason,
      senderFeedback,
      timestamp: Date.now(),
    };
  }
}

export const defaultSafetyAgent = new RuleBasedSafetyAgent();
