import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/index.ts';
import { Languages, Globe, Sparkles, Eye, EyeOff, Loader2, Check, CheckCheck, Clock, Copy, Code, FileText } from 'lucide-react';
import { getLanguageByCode } from '../data/languages.ts';

const formatHHmm = (timestamp: number): string => {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Formatted message body supporting code blocks with a copy-to-clipboard button
 */
const FormattedMessageBody: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = async (snippet: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {}
  };

  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return (
      <div className="space-y-2">
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const rawContent = part.slice(3, -3);
            const firstLineBreak = rawContent.indexOf('\n');
            let lang = '';
            let code = rawContent;
            if (firstLineBreak > 0 && firstLineBreak < 20) {
              lang = rawContent.slice(0, firstLineBreak).trim();
              code = rawContent.slice(firstLineBreak + 1);
            }
            const isCopied = copiedIndex === idx;

            return (
              <div
                key={idx}
                className="my-1.5 rounded-xl bg-black/90 border border-white/10 overflow-hidden text-left font-mono text-xs"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#141414]/90 border-b border-white/10 text-[10px] text-neutral-400">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#EC5E27]">
                    <Code className="w-3 h-3" />
                    <span>{lang || 'code'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(code.trim(), idx)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 hover:text-white transition-all cursor-pointer font-sans"
                    title="Copy code snippet"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-400" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-neutral-200 leading-relaxed font-mono text-[11px] select-text">
                  <code>{code.trim()}</code>
                </pre>
              </div>
            );
          }
          if (!part) return null;
          return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
        })}
      </div>
    );
  }

  // Render attachment if present: [📎 filename (size)]
  if (text.includes('[📎 ') && text.includes(')]')) {
    const parts = text.split(/(\[📎\s*[^)]+\)\])/g);
    return (
      <div className="space-y-1">
        {parts.map((part, idx) => {
          if (part.startsWith('[📎 ') && part.endsWith(')]')) {
            const match = part.match(/\[📎\s*([^(]+)\s*\(([^)]+)\)\]/);
            const fileName = match ? match[1].trim() : 'Attachment';
            const fileSize = match ? match[2].trim() : '';
            return (
              <div
                key={idx}
                className="my-1.5 p-2 rounded-xl bg-black/15 dark:bg-white/10 border border-black/10 dark:border-white/10 flex items-center gap-2 max-w-xs text-left backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-[#EC5E27]/25 flex items-center justify-center text-[#EC5E27] shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-tight">{fileName}</p>
                  {fileSize && <p className="text-[10px] opacity-75">{fileSize}</p>}
                </div>
              </div>
            );
          }
          if (!part.trim()) return null;
          return <p key={idx} className="m-0 font-medium whitespace-pre-wrap break-words">{part}</p>;
        })}
      </div>
    );
  }

  return <p className="m-0 font-medium whitespace-pre-wrap break-words">{text}</p>;
};

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
  preferredLanguage?: string;
  autoTranslateEnabled?: boolean;
  onManualTranslate?: (messageId: string) => void;
  showSenderName?: boolean;
  senderLabel?: string;
  isHost?: boolean;
  onMessageInViewport?: (messageId: string) => void;
  showTimeOnHover?: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isSelf,
  preferredLanguage = 'en',
  autoTranslateEnabled = true,
  onManualTranslate,
  showSenderName = false,
  senderLabel,
  isHost = false,
  onMessageInViewport,
  showTimeOnHover = true,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Trigger read receipt when a peer message enters the user's viewport
  useEffect(() => {
    if (isSelf || message.sender === 'system' || !onMessageInViewport || !bubbleRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onMessageInViewport(message.id);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(bubbleRef.current);

    return () => {
      observer.disconnect();
    };
  }, [message.id, isSelf, message.sender, onMessageInViewport]);

  // System messages
  if (message.sender === 'system') {
    return (
      <div className="text-center py-1" id={`msg-system-${message.id}`}>
        <span className="inline-block px-3 py-1 rounded-full bg-[#141414]/90 border border-white/10 text-[11px] text-neutral-300 font-medium shadow-xs">
          {message.text}
        </span>
      </div>
    );
  }

  const prefShort = preferredLanguage.split('-')[0].toLowerCase();
  const detectedShort = message.detectedLanguage?.split('-')[0]?.toLowerCase();
  const hasTranslation = Boolean(
    message.translatedText &&
    message.translatedText.trim() !== message.text.trim() &&
    (!detectedShort || detectedShort !== prefShort)
  );

  const displayedText = hasTranslation && !showOriginal
    ? message.translatedText!
    : message.text;

  const detectedLangOption = message.detectedLanguage
    ? getLanguageByCode(message.detectedLanguage)
    : null;

  const defaultSenderLabel = isSelf ? 'You:' : (senderLabel || 'Stranger:');

  return (
    <div
      ref={bubbleRef}
      id={`msg-bubble-${message.id}`}
      className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} group mb-1.5`}
    >
      {/* Sender Header */}
      {showSenderName && (
        <div className="flex items-center gap-1.5 px-1 mb-0.5">
          <span className="text-[10px] font-bold text-neutral-300">
            {defaultSenderLabel}
          </span>
          {isHost && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#EC5E27]/20 text-white border border-[#EC5E27]/30">
              HOST
            </span>
          )}
          {/* Auto-detected badge if translated */}
          {!isSelf && hasTranslation && (
            <span
              title={`Detected: ${message.detectedLanguageName || detectedLangOption?.englishName || 'Auto'} (translated to ${prefShort.toUpperCase()})`}
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-[#141414] border border-[#EC5E27]/30 text-[9px] font-bold text-[#EC5E27]"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#EC5E27]" />
              <span className="flex items-center gap-1">
                <Globe className="w-2.5 h-2.5 text-[#EC5E27] shrink-0" />
                <span>{message.detectedLanguageName || detectedLangOption?.englishName || 'Auto'} → {prefShort.toUpperCase()}</span>
              </span>
            </span>
          )}
          {/* Translating in progress spinner */}
          {!isSelf && message.isTranslating && (
            <span className="inline-flex items-center gap-1 text-[9px] text-neutral-400 font-medium">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-[#EC5E27]" />
              <span>Translating...</span>
            </span>
          )}
        </div>
      )}

      {/* Main Message Bubble with Hover Time Pill */}
      <div
        className="relative group/bubble flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Time Pill on Hover */}
        {showTimeOnHover && (
          <div
            className={`absolute ${
              isSelf ? '-left-16' : '-right-16'
            } top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150 z-20 whitespace-nowrap hidden sm:flex items-center ${
              isHovered
                ? 'opacity-100 scale-100 translate-x-0'
                : isSelf
                ? 'opacity-0 scale-95 translate-x-1'
                : 'opacity-0 scale-95 -translate-x-1'
            }`}
          >
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200 text-[10px] font-mono tracking-tight shadow-md border border-orange-200/80 dark:border-white/10 select-none">
              <Clock className="w-2.5 h-2.5 text-[#EC5E27]" />
              <span>{formatHHmm(message.timestamp)}</span>
            </span>
          </div>
        )}

        <div
          title={showTimeOnHover ? `Sent at ${formatHHmm(message.timestamp)}` : undefined}
          className={`w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words transition-all ${
            isSelf
              ? 'bg-gradient-to-r from-orange-500 to-[#EC5E27] text-white rounded-br-xs shadow-md shadow-orange-950/20'
              : 'bg-white/95 dark:bg-[#141414]/90 border border-orange-200/80 dark:border-white/10 text-slate-800 dark:text-white rounded-bl-xs shadow-xs'
          }`}
        >
          <FormattedMessageBody text={displayedText} />

          {/* Translation Footer / Original Toggle */}
          {!isSelf && hasTranslation && (
            <div className="mt-2 pt-2 border-t border-orange-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-neutral-400">
              <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-neutral-300">
                <Languages className="w-3 h-3 text-[#EC5E27]" />
                <span>
                  {showOriginal
                    ? `Original (${message.detectedLanguageName || 'Detected'})`
                    : `Auto-translated (${prefShort.toUpperCase()})`}
                </span>
              </span>

              <button
                type="button"
                onClick={() => setShowOriginal(!showOriginal)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 dark:bg-[#1A1A1A] hover:bg-orange-100 dark:hover:bg-[#262626] border border-orange-200/80 dark:border-white/10 text-slate-700 dark:text-neutral-200 font-semibold transition-colors cursor-pointer"
                title={showOriginal ? 'Show translated text' : 'Show original source text'}
              >
                {showOriginal ? (
                  <>
                    <Eye className="w-2.5 h-2.5 text-[#EC5E27]" />
                    <span>Show Translation</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-2.5 h-2.5 text-neutral-400" />
                    <span>View Original</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timestamp and Status Actions */}
      <div className="flex items-center gap-1.5 mt-0.5 px-1">
        <span
          className={`text-[9px] font-mono transition-colors flex items-center gap-1 ${
            isHovered ? 'text-[#EC5E27] font-bold' : 'text-neutral-400'
          }`}
          title={`Sent at ${formatHHmm(message.timestamp)} (${new Date(message.timestamp).toLocaleDateString()})`}
        >
          {showTimeOnHover ? (
            <>
              {isHovered && <Clock className="w-2.5 h-2.5 text-[#EC5E27]" />}
              <span>{formatHHmm(message.timestamp)}</span>
            </>
          ) : (
            new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          )}
        </span>

        {/* Read Receipt Status for Sent Messages */}
        {isSelf && (
          <span
            id={`msg-read-status-${message.id}`}
            className="inline-flex items-center gap-0.5 text-[9px] transition-colors select-none"
            title={
              message.isRead
                ? `Read${message.readAt ? ` at ${new Date(message.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
                : 'Sent (delivered to peer)'
            }
          >
            {message.isRead ? (
              <span className="inline-flex items-center gap-0.5 text-[#EC5E27] font-bold">
                <CheckCheck className="w-3 h-3 text-[#EC5E27]" />
                <span className="text-[8px] font-sans uppercase tracking-wider">Read</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-neutral-500">
                <Check className="w-3 h-3 text-neutral-500" />
                <span className="text-[8px] font-sans uppercase tracking-wider">Sent</span>
              </span>
            )}
          </span>
        )}

        {/* Manual Translate button if auto-translate was off or skipped */}
        {!isSelf && !hasTranslation && !message.isTranslating && onManualTranslate && (
          <button
            type="button"
            onClick={() => onManualTranslate(message.id)}
            className="text-[9px] text-neutral-400 hover:text-[#EC5E27] flex items-center gap-1 transition-opacity font-bold cursor-pointer"
            title={`Translate this message to ${prefShort.toUpperCase()}`}
          >
            <Globe className="w-2.5 h-2.5 text-[#EC5E27]" />
            <span>{message.translationError ? 'Retry translation' : 'Translate'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
