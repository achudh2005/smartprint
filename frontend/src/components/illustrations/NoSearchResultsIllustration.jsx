import React from 'react';

/**
 * Geometric Line-Art Illustration for Empty Search Results
 * Magnifier examining an empty data register grid
 */
export function NoSearchResultsIllustration({ size = 96, className = '', ...props }) {
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
      {/* Background Matrix Grid */}
      <rect
        x="18"
        y="16"
        width="60"
        height="48"
        rx="4"
        className="stroke-[var(--border)] fill-[var(--surface)]"
        strokeWidth="1.5"
      />
      <line x1="18" y1="28" x2="78" y2="28" className="stroke-[var(--border)]" strokeWidth="1" />
      <line x1="18" y1="40" x2="78" y2="40" className="stroke-[var(--border)]" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />
      <line x1="18" y1="52" x2="78" y2="52" className="stroke-[var(--border)]" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />

      {/* Row placeholder ticks */}
      <line x1="24" y1="22" x2="36" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
      <line x1="24" y1="34" x2="48" y2="34" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" />
      <line x1="24" y1="46" x2="40" y2="46" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" />

      {/* Modernist Magnifying Lens */}
      <circle
        cx="56"
        cy="42"
        r="14"
        className="fill-[var(--surface-hover)] stroke-[#0E7490] dark:stroke-[#22D3EE]"
        strokeWidth="2"
      />
      {/* Lens reflection/crosshair */}
      <line x1="49" y1="42" x2="63" y2="42" className="stroke-[#0E7490] dark:stroke-[#22D3EE]" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="56" y1="35" x2="56" y2="49" className="stroke-[#0E7490] dark:stroke-[#22D3EE]" strokeWidth="1" strokeOpacity="0.5" />

      {/* Lens Handle */}
      <line
        x1="66"
        y1="52"
        x2="78"
        y2="64"
        className="stroke-[#0E7490] dark:stroke-[#22D3EE]"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default NoSearchResultsIllustration;
