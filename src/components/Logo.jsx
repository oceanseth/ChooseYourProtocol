import React from 'react';

// StackMax mark — three stacked purple bars (widest at the bottom),
// matching the shipped app icon. Pure inline SVG, currentColor-agnostic.
export function LogoMark({ size = 28, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="StackMax"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sm-bar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9b86ff" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      {/* top (widest) */}
      <rect x="7"  y="9"  width="34" height="8" rx="4" fill="url(#sm-bar)" />
      {/* middle */}
      <rect x="11" y="20" width="26" height="8" rx="4" fill="url(#sm-bar)" />
      {/* bottom (narrowest) */}
      <rect x="15" y="31" width="18" height="8" rx="4" fill="url(#sm-bar)" />
    </svg>
  );
}

export function Wordmark({ markSize = 28, className }) {
  return (
    <span className={`brand-lockup ${className || ''}`.trim()}>
      <LogoMark size={markSize} />
      <span className="brand-word">Stack<span className="brand-word-accent">Max</span></span>
    </span>
  );
}

export default LogoMark;
