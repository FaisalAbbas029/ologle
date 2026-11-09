/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BotInspectionResult {
  isSuspicious: boolean;
  score: number; // 0 (definitely bot) to 100 (definitely human)
  reasons: string[];
  webdriverDetected: boolean;
  headlessDetected: boolean;
  automationFlags: boolean;
}

export interface SecurityChallenge {
  id: string;
  question: string;
  targetEmoji: string;
  options: { id: string; label: string; emoji: string }[];
  correctId: string;
  createdAt: number;
}

class BotFirewallEngine {
  private mouseMovementsCount = 0;
  private keyStrokesCount = 0;
  private botTrapTriggered = false;
  private isHumanConfirmedLocally = false;
  private lastActionTime = Date.now();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  private initListeners() {
    const handleMouse = () => {
      this.mouseMovementsCount++;
      if (this.mouseMovementsCount > 500) {
        window.removeEventListener('mousemove', handleMouse);
      }
    };

    const handleKey = () => {
      this.keyStrokesCount++;
      if (this.keyStrokesCount > 100) {
        window.removeEventListener('keydown', handleKey);
      }
    };

    window.addEventListener('mousemove', handleMouse, { passive: true });
    window.addEventListener('keydown', handleKey, { passive: true });
  }

  public triggerHoneypot() {
    this.botTrapTriggered = true;
  }

  public markHumanConfirmed() {
    this.isHumanConfirmedLocally = true;
  }

  public isLocallyConfirmed(): boolean {
    return this.isHumanConfirmedLocally;
  }

  /**
   * Run comprehensive browser fingerprint inspection for automation frameworks
   */
  public inspectClient(): BotInspectionResult {
    const reasons: string[] = [];
    let score = 100;
    let webdriver = false;
    let headless = false;
    let automation = false;

    if (typeof window === 'undefined') {
      return {
        isSuspicious: true,
        score: 0,
        reasons: ['Executed outside browser environment'],
        webdriverDetected: false,
        headlessDetected: true,
        automationFlags: true,
      };
    }

    const nav = window.navigator as any;

    // 1. Check navigator.webdriver (Standard automation flag)
    if (nav.webdriver) {
      webdriver = true;
      score -= 50;
      reasons.push('Automated control flag (navigator.webdriver) detected');
    }

    // 2. Check for Headless user agent strings
    const ua = (nav.userAgent || '').toLowerCase();
    if (
      ua.includes('headlesschrome') ||
      ua.includes('phantomjs') ||
      ua.includes('puppeteer') ||
      ua.includes('playwright') ||
      ua.includes('selenium')
    ) {
      headless = true;
      score -= 60;
      reasons.push('Headless or scripted browser signature detected in user agent');
    }

    // 3. Check for Selenium / Puppeteer global artifacts
    const win = window as any;
    if (
      win._phantom ||
      win.__nightmare ||
      win.callPhantom ||
      win._Selenium_IDE_Recorder ||
      win.document?.__selenium_evaluate ||
      win.document?.__webdriver_evaluate ||
      win.document?.__driver_evaluate ||
      win.document?.__webdriver_unwrapped ||
      win.document?.__fxdriver_unwrapped ||
      win.document?.__driver_unwrapped ||
      win.document?.__selenium_unwrapped
    ) {
      automation = true;
      score -= 70;
      reasons.push('Automation runtime artifact found on window object');
    }

    // 4. Honeypot check
    if (this.botTrapTriggered) {
      score = 0;
      reasons.push('Hidden bot-trap field was populated');
    }

    // 5. Check plugin and language consistency
    if (!nav.languages || nav.languages.length === 0) {
      score -= 20;
      reasons.push('Missing system language headers');
    }

    // 6. Zero screen dimension checks
    if (window.screen && (window.screen.width === 0 || window.screen.height === 0)) {
      headless = true;
      score -= 40;
      reasons.push('Screen dimensions reported as 0x0');
    }

    return {
      isSuspicious: score < 70,
      score: Math.max(0, score),
      reasons,
      webdriverDetected: webdriver,
      headlessDetected: headless,
      automationFlags: automation,
    };
  }

  /**
   * Generates a randomized interactive human verification challenge
   */
  public generateChallenge(): SecurityChallenge {
    const challenges = [
      {
        question: 'Select the Security Shield to verify human entry',
        targetEmoji: '🛡️',
        options: [
          { id: 'shield', label: 'Shield', emoji: '🛡️' },
          { id: 'gear', label: 'Gear', emoji: '⚙️' },
          { id: 'wrench', label: 'Tool', emoji: '🔧' },
          { id: 'robot', label: 'Automaton', emoji: '🤖' },
        ],
        correctId: 'shield',
      },
      {
        question: 'Identify the Coffee Cup to prove human presence',
        targetEmoji: '☕',
        options: [
          { id: 'coffee', label: 'Coffee', emoji: '☕' },
          { id: 'battery', label: 'Battery', emoji: '🔋' },
          { id: 'plug', label: 'Cable', emoji: '🔌' },
          { id: 'chip', label: 'Microchip', emoji: '💾' },
        ],
        correctId: 'coffee',
      },
      {
        question: 'Select the Flame firewall symbol',
        targetEmoji: '🔥',
        options: [
          { id: 'fire', label: 'Firewall', emoji: '🔥' },
          { id: 'water', label: 'Water', emoji: '💧' },
          { id: 'cloud', label: 'Cloud', emoji: '☁️' },
          { id: 'lightning', label: 'Spark', emoji: '⚡' },
        ],
        correctId: 'fire',
      },
      {
        question: 'Select the Key to unlock human access',
        targetEmoji: '🔑',
        options: [
          { id: 'key', label: 'Passkey', emoji: '🔑' },
          { id: 'bell', label: 'Bell', emoji: '🔔' },
          { id: 'lock', label: 'Padlock', emoji: '🔒' },
          { id: 'compass', label: 'Compass', emoji: '🧭' },
        ],
        correctId: 'key',
      },
    ];

    const pick = challenges[Math.floor(Math.random() * challenges.length)];
    // Shuffle options
    const shuffledOptions = [...pick.options].sort(() => Math.random() - 0.5);

    return {
      id: `chal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: pick.question,
      targetEmoji: pick.targetEmoji,
      options: shuffledOptions,
      correctId: pick.correctId,
      createdAt: Date.now(),
    };
  }
}

export const botFirewall = new BotFirewallEngine();
