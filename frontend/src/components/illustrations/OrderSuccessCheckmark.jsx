import React from 'react';

/**
 * Animated SVG Success Checkmark
 * Draws itself on mount via CSS stroke-dashoffset transition (400ms ease-out, zero bounce)
 */
export function OrderSuccessCheckmark({ size = 56, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Outer subtle halo ring */}
      <circle
        cx="28"
        cy="28"
        r="26"
        className="stroke-[#15803D]/20 dark:stroke-[#4ADE80]/20 fill-[#F0FDF4] dark:fill-[#052E16]"
        strokeWidth="1.5"
      />

      {/* Primary Success Circle */}
      <circle
        cx="28"
        cy="28"
        r="20"
        className="fill-[#15803D] dark:fill-[#22C55E]"
      />

      {/* Animated Stroke Checkmark */}
      <path
        d="M20 28.5L25.5 34L36 23.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw-check"
      />
    </svg>
  );
}

export default OrderSuccessCheckmark;
