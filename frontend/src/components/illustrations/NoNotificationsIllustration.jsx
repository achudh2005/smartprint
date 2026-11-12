import React from 'react';

/**
 * Geometric Line-Art Illustration for Zero Notifications
 * Clean technical bell contour with concentric quiet status wave
 */
export function NoNotificationsIllustration({ size = 96, className = '', ...props }) {
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
      {/* Concentric subtle soundwaves */}
      <circle cx="48" cy="38" r="32" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.12" />
      <circle cx="48" cy="38" r="24" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.18" />

      {/* Bell Outline */}
      <path
        d="M48 18C41.3726 18 36 23.3726 36 30V44L31 50H65L60 44V30C60 23.3726 54.6274 18 48 18Z"
        className="fill-[var(--surface)] stroke-[var(--border)]"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Top hanger notch */}
      <path
        d="M45 18V16C45 14.3431 46.3431 13 48 13C49.6569 13 51 14.3431 51 16V18"
        className="stroke-[var(--border)]"
        strokeWidth="1.5"
      />

      {/* Bell clapper / striker */}
      <path
        d="M44 54C44 56.2091 45.7909 58 48 58C50.2091 58 52 56.2091 52 54"
        className="stroke-[var(--border)] fill-[var(--surface-hover)]"
        strokeWidth="1.5"
      />

      {/* Clear/Quiet Check Badge Detail */}
      <circle cx="58" cy="24" r="6" className="fill-[#0E7490] dark:fill-[#22D3EE]" />
      <path
        d="M55.5 24L57.5 26L60.5 22"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default NoNotificationsIllustration;
