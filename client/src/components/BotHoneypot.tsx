/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { botFirewall } from '../services/botFirewall.ts';

interface BotHoneypotProps {
  onBotDetected?: () => void;
}

/**
 * Invisible Honeypot Trap
 * Rendered off-screen with aria-hidden="true" and tabIndex={-1}.
 * Human users never see or interact with it, but automated web crawlers and scraping bots
 * automatically fill form inputs.
 */
export const BotHoneypot: React.FC<BotHoneypotProps> = ({ onBotDetected }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      console.warn('[FIREWALL] Automated bot trapped via honeypot input.');
      botFirewall.triggerHoneypot();
      if (onBotDetected) onBotDetected();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        opacity: 0,
        pointerEvents: 'none',
        height: 0,
        width: 0,
        zIndex: -1,
      }}
      aria-hidden="true"
    >
      <label htmlFor="hayloo_hp_website_trap">Leave this empty</label>
      <input
        id="hayloo_hp_website_trap"
        name="hayloo_hp_website_trap"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        onChange={handleChange}
      />
    </div>
  );
};
