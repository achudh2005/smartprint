import React from 'react';

/**
 * Geometric Line-Art Illustration for Empty Orders Feed
 * Linear/Notion style: Stroke width 1.5px, precision registration guides, no cartoon clipart.
 */
export function EmptyOrdersIllustration({ size = 96, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={(size * 80) / 96}
      viewBox="0 0 96 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Background Registration Crosshairs */}
      <line x1="8" y1="40" x2="88" y2="40" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.15" />
      <line x1="48" y1="8" x2="48" y2="72" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.15" />

      {/* Back Document Sheet */}
      <rect
        x="30"
        y="14"
        width="42"
        height="50"
        rx="4"
        className="stroke-[var(--border)] fill-[var(--surface-hover)]"
        strokeWidth="1.5"
      />
      {/* Back Sheet Lines */}
      <line x1="38" y1="24" x2="58" y2="24" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="38" y1="30" x2="52" y2="30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />

      {/* Foreground Document Sheet with Corner Fold */}
      <path
        d="M24 22C24 19.7909 25.7909 18 28 18H52L64 30V62C64 64.2091 62.2091 66 60 66H28C25.7909 66 24 64.2091 24 62V22Z"
        className="fill-[var(--surface)] stroke-[var(--border)]"
        strokeWidth="1.5"
      />
      {/* Corner fold flap */}
      <path
        d="M52 18V28C52 29.1046 52.8954 30 54 30H64"
        className="stroke-[var(--border)] fill-[var(--surface-hover)]"
        strokeWidth="1.5"
      />

      {/* Abstract Content Grid Lines */}
      <line x1="32" y1="36" x2="56" y2="36" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
      <line x1="32" y1="42" x2="50" y2="42" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
      <line x1="32" y1="48" x2="44" y2="48" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />

      {/* Precision Accent Registration Mark */}
      <circle cx="54" cy="54" r="5" className="stroke-[#0E7490] dark:stroke-[#22D3EE]" strokeWidth="1.5" />
      <circle cx="54" cy="54" r="1.5" className="fill-[#0E7490] dark:fill-[#22D3EE]" />
    </svg>
  );
}

export default EmptyOrdersIllustration;
