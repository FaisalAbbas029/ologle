import React, { useState, useEffect, useRef } from 'react';
import { Code2, Copy, Check, Trash2, X, Terminal } from 'lucide-react';

interface EphemeralCodePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncPad: (content: string, language: string) => void;
  remoteContent?: string;
  remoteLanguage?: string;
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
  { id: 'html', label: 'HTML / CSS' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'plaintext', label: 'Plain Text' },
];

export const EphemeralCodePad: React.FC<EphemeralCodePadProps> = ({
  isOpen,
  onClose,
  onSyncPad,
  remoteContent,
  remoteLanguage,
}) => {
  const [content, setContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [copied, setCopied] = useState<boolean>(false);
  const isSelfEditingRef = useRef(false);

  // Sync remote changes when received
  useEffect(() => {
    if (remoteContent !== undefined && !isSelfEditingRef.current) {
      setContent(remoteContent);
    }
  }, [remoteContent]);

  useEffect(() => {
    if (remoteLanguage && !isSelfEditingRef.current) {
      setLanguage(remoteLanguage);
    }
  }, [remoteLanguage]);

  if (!isOpen) return null;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    isSelfEditingRef.current = true;
    onSyncPad(val, language);
    setTimeout(() => {
      isSelfEditingRef.current = false;
    }, 150);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguage(val);
    isSelfEditingRef.current = true;
    onSyncPad(content, val);
    setTimeout(() => {
      isSelfEditingRef.current = false;
    }, 150);
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleClear = () => {
    setContent('');
    onSyncPad('', language);
  };

  return (
    <div
      id="ephemeral-code-pad"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-[#111111]/95 border-l border-white/10 shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300 animate-slideLeft"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#141414]/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#EC5E27]/15 text-[#EC5E27] border border-[#EC5E27]/30">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              Ephemeral Code & Notes Pad
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EC5E27]/20 text-white font-normal">
                Live Sync
              </span>
            </h3>
            <p className="text-[10px] text-neutral-400">Zero persistence • Cleared on room exit</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy code"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleClear}
            title="Clear pad"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close pad"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#141414]/30 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={language}
            onChange={handleLanguageChange}
            className="bg-[#141414] text-neutral-200 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#EC5E27]"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-neutral-500 font-mono">
          {content.length} chars • {content.split('\n').length} lines
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 p-3 flex flex-col bg-[#111111]/80">
        <textarea
          id="ephemeral-pad-textarea"
          value={content}
          onChange={handleContentChange}
          placeholder="// Paste code snippets, architecture diagrams, or notes here...
// Both you and your partner see edits in real-time.
// Zero data is saved to disk."
          spellCheck={false}
          className="w-full h-full resize-none font-mono text-xs leading-relaxed text-neutral-100 bg-transparent outline-none p-2 rounded-xl focus:ring-1 focus:ring-[#EC5E27]/30 selection:bg-[#EC5E27]/30"
        />
      </div>

      {/* Footer Notice */}
      <div className="px-4 py-2 bg-[#141414] border-t border-white/10 text-[11px] text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[#EC5E27]">
          <span className="w-2 h-2 rounded-full bg-[#EC5E27] animate-pulse"></span>
          Peer P2P synchronized
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-neutral-400 hover:text-white"
        >
          Hide Pad
        </button>
      </div>
    </div>
  );
};
