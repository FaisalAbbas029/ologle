import React from 'react';
import { Globe } from 'lucide-react';
import { COUNTRIES_LIST } from '../data/countriesData.ts';

interface CountryFlagProps {
  code: string;
  name?: string;
  flagEmoji?: string;
  className?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  name = '',
  flagEmoji = '',
  className = 'w-5 h-3.5',
}) => {
  const cleanCode = (code || '').trim();

  if (!cleanCode || cleanCode.toUpperCase() === 'GLOBAL') {
    return (
      <div className="w-4 h-4 bg-[#EC5E27] flex items-center justify-center text-white shrink-0 rounded-xs">
        <Globe className="w-2.5 h-2.5 text-white" />
      </div>
    );
  }

  // Find country if full name or mixed case was provided
  const matched = cleanCode.length === 2
    ? COUNTRIES_LIST.find((c) => c.code.toLowerCase() === cleanCode.toLowerCase())
    : COUNTRIES_LIST.find(
        (c) =>
          c.name.toLowerCase() === cleanCode.toLowerCase() ||
          c.code.toLowerCase() === cleanCode.toLowerCase()
      );

  const isoCode = (matched ? matched.code : cleanCode).toLowerCase();
  const resolvedEmoji = flagEmoji || (matched ? matched.flag : '');

  return (
    <span className="inline-flex items-center shrink-0 leading-none">
      <img
        src={`https://flagcdn.com/w40/${isoCode}.png`}
        srcSet={`https://flagcdn.com/w80/${isoCode}.png 2x`}
        width="20"
        height="14"
        alt={name || `${isoCode.toUpperCase()} flag`}
        className={`${className} object-cover rounded-xs shadow-xs border border-white/15 shrink-0 inline-block align-middle`}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const next = target.nextElementSibling as HTMLElement | null;
          if (next) {
            next.style.display = 'inline-flex';
          }
        }}
      />
      <span className="hidden items-center text-xs leading-none text-slate-400" aria-hidden="true">
        <Globe className="w-3 h-3 text-[#EC5E27]" />
      </span>
    </span>
  );
};
