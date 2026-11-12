import React from 'react';

/**
 * Geometric Line-Art Illustration for Empty Printers State
 * Precision technical hardware chassis silhouette with clean output tray
 */
export function EmptyPrintersIllustration({ size = 96, className = '', ...props }) {
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
      <line x1="8" y1="44" x2="88" y2="44" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.15" />

      {/* Printer Main Chassis */}
      <rect
        x="20"
        y="30"
        width="56"
        height="32"
        rx="6"
        className="fill-[var(--surface)] stroke-[var(--border)]"
        strokeWidth="1.5"
      />

      {/* Input Feeder Tray (Top) */}
      <path
        d="M32 30V18C32 16.8954 32.8954 16 34 16H62C63.1046 16 64 16.8954 64 18V30"
        className="fill-[var(--surface-hover)] stroke-[var(--border)]"
        strokeWidth="1.5"
      />
      {/* Paper In Tray */}
      <line x1="38" y1="23" x2="58" y2="23" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />

      {/* Output Slot */}
      <line x1="28" y1="46" x2="68" y2="46" className="stroke-[var(--border)]" strokeWidth="1.5" strokeLinecap="round" />

      {/* Output Catch Tray */}
      <path
        d="M32 46V54C32 55.1046 32.8954 56 34 56H62C63.1046 56 64 55.1046 64 54V46"
        className="fill-[var(--surface-hover)] stroke-[var(--border)]"
        strokeWidth="1.5"
      />

      {/* Status Beacon / Power LED */}
      <circle cx="68" cy="38" r="2.5" className="fill-[#0E7490] dark:fill-[#22D3EE]" />
      <circle cx="68" cy="38" r="4.5" className="stroke-[#0E7490] dark:stroke-[#22D3EE]" strokeWidth="1" strokeOpacity="0.4" />

      {/* Hardware ventilation detail */}
      <line x1="28" y1="38" x2="36" y2="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

export default EmptyPrintersIllustration;
