import React from 'react';

/**
 * Geometric Line-Art Illustration for 404 Page
 * Disconnected print registration coordinate lines and missing sheet plane
 */
export function NotFoundIllustration({ size = 160, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={(size * 120) / 160}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Precision coordinate grid */}
      <line x1="20" y1="60" x2="140" y2="60" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.15" />
      <line x1="80" y1="15" x2="80" y2="105" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.15" />

      {/* Displaced Document Plane 1 */}
      <rect
        x="36"
        y="24"
        width="54"
        height="70"
        rx="6"
        className="fill-[var(--surface-hover)] stroke-[var(--border)]"
        strokeWidth="1.5"
        transform="rotate(-6 36 24)"
      />

      {/* Primary Missing Document Plane */}
      <rect
        x="60"
        y="26"
        width="60"
        height="76"
        rx="6"
        className="fill-[var(--surface)] stroke-[#0E7490] dark:stroke-[#22D3EE]"
        strokeWidth="1.5"
      />

      {/* 404 Technical Stamp in center */}
      <text
        x="90"
        y="62"
        textAnchor="middle"
        className="font-display font-bold fill-[#0E7490] dark:fill-[#22D3EE] text-[20px]"
        letterSpacing="0.05em"
      >
        404
      </text>

      {/* Technical dashed missing section line */}
      <line x1="72" y1="72" x2="108" y2="72" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="3 3" />
      <line x1="78" y1="78" x2="102" y2="78" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="3 3" />

      {/* Precision Corner Registration Marks */}
      <path d="M52 18V24M52 18H58" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M128 18V24M128 18H122" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M52 102V96M52 102H58" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M128 102V96M128 102H122" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
    </svg>
  );
}

export default NotFoundIllustration;
