import React, { useState } from 'react';
import { HAYLOO_PROFESSIONS } from '../data/constants.ts';

interface OnboardingViewProps {
  initialProfile: {
    displayName: string;
    headline: string;
    professionId: string;
    experience: string;
    skills: string[];
    bio: string;
  };
  onSave: (profile: any) => void;
  onCancel?: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  initialProfile,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    displayName: initialProfile.displayName || '',
    professionId: initialProfile.professionId || 'software-development',
    experience: initialProfile.experience || 'Mid-level',
    headline: initialProfile.headline || '',
    bio: initialProfile.bio || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 flex-1 w-full animate-fadeIn">
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 sm:p-8 shadow-2xl text-white">
        <span className="rounded-full bg-[#EC5E27] px-2.5 py-1 font-mono text-xs font-bold text-white tracking-wider">
          ONBOARDING WIZARD
        </span>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Set Up Your Professional Identity
        </h1>
        <p className="text-sm text-neutral-300 mt-1.5 leading-relaxed">
          No phone number or employer disclosure required. Customize what peers see when matched.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Display Name
            </label>
            <input
              type="text"
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black px-3.5 py-2 text-sm text-white focus:border-[#EC5E27] focus:outline-none transition-colors"
              placeholder="e.g. Alex Rivera"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Current Profession
              </label>
              <select
                value={formData.professionId}
                onChange={(e) => setFormData({ ...formData, professionId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black px-3.5 py-2 text-sm text-white focus:border-[#EC5E27] focus:outline-none transition-colors cursor-pointer"
              >
                {HAYLOO_PROFESSIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Experience Level
              </label>
              <select
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black px-3.5 py-2 text-sm text-white focus:border-[#EC5E27] focus:outline-none transition-colors cursor-pointer"
              >
                {['Student', 'Junior', 'Mid-level', 'Senior', 'Expert', 'Founder or Executive'].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Professional Headline
            </label>
            <input
              type="text"
              required
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black px-3.5 py-2 text-sm text-white focus:border-[#EC5E27] focus:outline-none transition-colors"
              placeholder="e.g. Full-Stack & AI Systems Architect"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Short Professional Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black px-3.5 py-2 text-sm text-white focus:border-[#EC5E27] focus:outline-none transition-colors"
              placeholder="Tell peers what you are building, researching, or interested in discussing..."
            />
          </div>

          <div className="rounded-xl bg-[#1A1A1A] p-4 border border-white/10 text-xs text-neutral-300 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EC5E27]" />
              Camera & Microphone Commitment
            </p>
            <p className="leading-relaxed">
              Ologle never activates your camera or microphone in the background. Browser permissions are requested only when you actively enter a live video room.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-xs font-bold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] px-6 py-2.5 text-xs sm:text-sm font-bold text-white tracking-wide transition-all shadow-lg cursor-pointer"
            >
              Save & Start Matchmaking →
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
