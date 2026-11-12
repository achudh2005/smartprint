import React from 'react';
import { BrandMark } from './BrandMark';

/**
 * Confident Wordmark Lockup: "SmartPrint"
 * Weight and color contrast between "Smart" (text-surface) and "Print" (deep cyan accent)
 * Display font pairing: Space Grotesk / Inter
 */
export function Wordmark({
  size = 'md',
  withMark = true,
  className = '',
  markSize,
  ...props
}) {
  const sizeClasses = {
    sm: 'text-sm tracking-tight',
    md: 'text-base tracking-tight',
    lg: 'text-xl tracking-tight',
    xl: 'text-2xl tracking-tight',
  }[size] || 'text-base tracking-tight';

  const defaultMarkSize = {
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  }[size] || 24;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`} {...props}>
      {withMark && <BrandMark size={markSize || defaultMarkSize} />}
      <span className={`font-display inline-flex items-baseline ${sizeClasses}`}>
        <span className="font-semibold text-[#18181B] dark:text-[#FAFAFA]">Smart</span>
        <span className="font-bold text-[#0E7490] dark:text-[#22D3EE] ml-0.5">Print</span>
      </span>
    </div>
  );
}

export default Wordmark;
