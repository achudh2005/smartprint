import React from 'react';

/**
 * Abstract Document Stack Illustration for Auth Hero Panel
 * Isometric stacked document planes with print registration corner details,
 * flat deep cyan and neutral tones, enterprise SaaS aesthetic.
 */
export function DocumentStackIllustration({ size = 260, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={(size * 200) / 260}
      viewBox="0 0 260 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Background Registration Grid Axes */}
      <line x1="20" y1="100" x2="240" y2="100" stroke="white" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.12" />
      <line x1="130" y1="20" x2="130" y2="180" stroke="white" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.12" />

      {/* Outer Technical Registration Guides */}
      <circle cx="130" cy="100" r="70" stroke="white" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.08" />

      {/* Layer 1: Bottom Shadow Document Plane */}
      <rect
        x="65"
        y="55"
        width="110"
        height="125"
        rx="8"
        fill="#083344"
        stroke="#155E75"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        transform="rotate(-8 65 55)"
      />

      {/* Layer 2: Middle Document Plane */}
      <rect
        x="80"
        y="42"
        width="110"
        height="125"
        rx="8"
        fill="#0E7490"
        fillOpacity="0.5"
        stroke="#22D3EE"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        transform="rotate(4 80 42)"
      />

      {/* Layer 3: Foreground Primary Document Plane with Precision Corner Fold */}
      <g transform="translate(75, 32)">
        {/* Main Sheet with top-right chamfer for fold */}
        <path
          d="M0 8C0 3.58172 3.58172 0 8 0H86L110 24V117C110 121.418 106.418 125 102 125H8C3.58172 125 0 121.418 0 117V8Z"
          fill="#111113"
          stroke="#22D3EE"
          strokeWidth="1.75"
        />

        {/* Precision Corner Fold Flap */}
        <path
          d="M86 0V20C86 22.2091 87.7909 24 90 24H110"
          fill="#164E63"
          stroke="#22D3EE"
          strokeWidth="1.75"
        />

        {/* Abstract Document Hierarchy Bars */}
        <rect x="18" y="24" width="48" height="6" rx="3" fill="#22D3EE" fillOpacity="0.9" />
        <rect x="18" y="40" width="74" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
        <rect x="18" y="50" width="66" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
        <rect x="18" y="60" width="54" height="3" rx="1.5" fill="white" fillOpacity="0.4" />

        {/* Precision Grid Matrix detail in document body */}
        <rect x="18" y="74" width="74" height="32" rx="4" fill="#18181B" stroke="#27272A" strokeWidth="1" />
        <line x1="18" y1="90" x2="92" y2="90" stroke="#27272A" strokeWidth="1" />
        <line x1="55" y1="74" x2="55" y2="106" stroke="#27272A" strokeWidth="1" strokeDasharray="2 2" />

        {/* Registration mark on paper */}
        <circle cx="78" cy="90" r="4" stroke="#22D3EE" strokeWidth="1.2" strokeOpacity="0.7" />
        <circle cx="78" cy="90" r="1.5" fill="#22D3EE" />
      </g>

      {/* Floating Accent Print Registration Crosshair Marks */}
      <g transform="translate(195, 45)">
        <circle cx="10" cy="10" r="8" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="10" y1="0" x2="10" y2="20" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.6" />
      </g>
    </svg>
  );
}

export default DocumentStackIllustration;
