import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2 } from 'lucide-react';

export const FloatingContactButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<'feedback' | 'bug' | 'safety' | 'privacy'>('feedback');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setError('Please provide a brief message.');
      return;
    }
    if (trimmedMsg.length < 10) {
      setError('Message should be at least 10 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        setEmail('');
        setIsOpen(false);
      }, 2500);
    }, 700);
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button
        id="floating-contact-btn"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open support and feedback modal"
        className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-[#141414] text-white border border-white/20 shadow-xl hover:bg-[#EC5E27] hover:text-white hover:border-[#EC5E27] hover:shadow-[0_0_20px_rgba(236,94,39,0.4)] transition-all duration-200 transform hover:-translate-y-1 active:scale-95 cursor-pointer flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC5E27]"
      >
        <MessageSquarePlus className="w-5 h-5 text-[#EC5E27] group-hover:text-white transition-colors" />
        <span className="hidden sm:inline text-xs font-bold tracking-wide pr-1">Ologle Support</span>
      </button>

      {/* Contact & Support Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Contact and Feedback"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#EC5E27]/40 shadow-2xl p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#EC5E27] text-white">
                  <MessageSquarePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ologle Innovation Support</h3>
                  <p className="text-xs text-neutral-400">Direct channel to the engineering & safety team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#202020] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#EC5E27]/20 text-[#EC5E27] flex items-center justify-center mx-auto border border-[#EC5E27]">
                  <CheckCircle2 className="w-6 h-6 text-[#EC5E27]" />
                </div>
                <h4 className="text-base font-bold text-white">Message Transmitted Successfully</h4>
                <p className="text-xs text-neutral-300 max-w-xs mx-auto">
                  Thank you for your feedback. We prioritize technical issues and user privacy inquiries promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Subject Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-xs font-semibold text-white focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27] cursor-pointer"
                  >
                    <option value="feedback">General Feedback & Ideas</option>
                    <option value="bug">Technical / WebRTC Bug Report</option>
                    <option value="safety">Safety or Moderation Concern</option>
                    <option value="privacy">Privacy & Zero-Log Architecture Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-email@domain.com (only if you want a response)"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-white">
                      Message
                    </label>
                    <span className="text-[10px] text-neutral-400">{message.length}/800</span>
                  </div>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={800}
                    placeholder="Describe what happened or share your suggestions with the team..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC5E27] focus:ring-1 focus:ring-[#EC5E27] resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-[#EC5E27] bg-[#EC5E27]/10 border border-[#EC5E27]/30 px-3 py-1.5 rounded-lg">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#2c2c2c] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#EC5E27] hover:bg-[#D94E1A] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
