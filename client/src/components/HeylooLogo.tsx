import React, { useState, useEffect, useRef } from 'react';

interface HeylooLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  animated?: boolean;
}

const LOGO_CHARS = [
  { char: 'O', isOrange: true, isUpper: true },
  { char: 'l', isOrange: false, isUpper: false },
  { char: 'o', isOrange: true, isUpper: false },
  { char: 'g', isOrange: false, isUpper: false },
  { char: 'l', isOrange: false, isUpper: false },
  { char: 'e', isOrange: false, isUpper: false },
];

export const HeylooLogo: React.FC<HeylooLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
  animated = true,
}) => {
  // Height and font sizing for proportional rendering
  const sizeConfig = {
    sm: { text: 'text-xl', oScale: '1.08em', oSmallScale: '1.05em' },
    md: { text: 'text-2xl sm:text-[26px]', oScale: '1.08em', oSmallScale: '1.05em' },
    lg: { text: 'text-3xl sm:text-[34px]', oScale: '1.08em', oSmallScale: '1.05em' },
    xl: { text: 'text-4xl sm:text-[44px]', oScale: '1.08em', oSmallScale: '1.05em' },
  };

  const current = sizeConfig[size] || sizeConfig.md;

  // Typing state: fully static when animated is false, or loop typing when true
  const [visibleCount, setVisibleCount] = useState<number>(animated ? 1 : LOGO_CHARS.length);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!animated) {
      setVisibleCount(LOGO_CHARS.length);
      return;
    }

    let count = 1;
    let isDeleting = false;

    const tick = () => {
      if (!isDeleting) {
        // Typing forward
        count += 1;
        setVisibleCount(count);
        if (count >= LOGO_CHARS.length) {
          // Pause at complete word before starting deletion
          isDeleting = true;
          timerRef.current = setTimeout(tick, 2800);
          return;
        }
        timerRef.current = setTimeout(tick, 120);
      } else {
        // Deleting backward
        count -= 1;
        setVisibleCount(count);
        if (count <= 1) {
          // Hold initial 'O', pause, then type again in loop
          isDeleting = false;
          timerRef.current = setTimeout(tick, 650);
          return;
        }
        timerRef.current = setTimeout(tick, 75);
      }
    };

    timerRef.current = setTimeout(tick, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-2 select-none cursor-pointer group ${className}`}
      title="Heyloo"
    >
      {/* Clean, Background-Free Wordmark Logo with Looping Typing (No typing cursor line) */}
      <span
        className={`font-black tracking-[-0.035em] leading-none inline-flex items-baseline ${current.text}`}
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Outfit', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {LOGO_CHARS.slice(0, visibleCount).map((item, idx) => {
          if (item.isOrange) {
            return (
              <span
                key={idx}
                className="text-[#EC5E27] font-black inline-block transform-gpu transition-all duration-150 group-hover:scale-105"
                style={{
                  fontSize: item.isUpper ? current.oScale : current.oSmallScale,
                  marginLeft: item.isUpper ? undefined : '-0.01em',
                  marginRight: '-0.01em',
                }}
              >
                {item.char}
              </span>
            );
          }

          return (
            <span
              key={idx}
              className="text-slate-900 dark:text-white font-extrabold transition-colors inline-block"
            >
              {item.char}
            </span>
          );
        })}
      </span>

      {showTagline && (
        <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-l border-slate-300 dark:border-white/10 pl-2">
          Network
        </span>
      )}
    </div>
  );
};

export const OlogleLogo = HeylooLogo;
export const LenovoLogo = HeylooLogo;
