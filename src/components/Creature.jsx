import React from 'react';

// Renders a PokéVibe creature as an animated SVG from its generated traits.
// Deterministic look comes entirely from the creature's palette + shape ints,
// so the same creature always renders identically (no external assets).
export default function Creature({ creature, size = 160, animate = true }) {
  if (!creature) return null;
  const p = creature.palette || {};
  const body = p.body || '#7c5cff';
  const bodyDark = p.bodyDark || '#5b3fd6';
  const belly = p.belly || '#fde68a';
  const accent = p.accent || '#22d3ee';
  const glow = p.glow || '#fbbf24';
  const eye = p.eye || '#0b0f1a';
  const shape = creature.bodyShape ?? 0;
  const pattern = creature.pattern ?? 0;

  // Body silhouette varies by shape index.
  const bodyPaths = [
    'M50 78 Q20 78 22 50 Q24 18 50 18 Q76 18 78 50 Q80 78 50 78 Z',          // round
    'M50 80 Q18 74 24 44 Q28 22 50 22 Q72 22 76 44 Q82 74 50 80 Z',          // egg
    'M50 80 Q22 80 26 46 Q30 26 38 24 Q50 14 62 24 Q70 26 74 46 Q78 80 50 80 Z', // tufted
    'M50 80 Q24 76 22 52 Q20 28 50 20 Q80 28 78 52 Q76 76 50 80 Z'           // wide
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={animate ? 'creature creature-animate' : 'creature'}
      style={{ filter: `drop-shadow(0 0 10px ${glow}aa)` }}
    >
      <defs>
        <radialGradient id={`g-${creature.seed}`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={body} />
          <stop offset="100%" stopColor={bodyDark} />
        </radialGradient>
      </defs>

      {/* aura */}
      <circle cx="50" cy="50" r="46" fill={glow} opacity="0.10" />

      {/* ears / horns */}
      <circle cx="30" cy="22" r="8" fill={bodyDark} />
      <circle cx="70" cy="22" r="8" fill={bodyDark} />

      {/* body */}
      <path d={bodyPaths[shape % bodyPaths.length]} fill={`url(#g-${creature.seed})`} stroke={bodyDark} strokeWidth="1.5" />

      {/* belly */}
      <ellipse cx="50" cy="60" rx="16" ry="14" fill={belly} opacity="0.9" />

      {/* pattern accents */}
      {pattern === 0 && <circle cx="50" cy="40" r="4" fill={accent} />}
      {pattern === 1 && (
        <>
          <circle cx="38" cy="42" r="3" fill={accent} />
          <circle cx="62" cy="42" r="3" fill={accent} />
        </>
      )}
      {pattern === 2 && <path d="M40 38 L50 34 L60 38" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />}

      {/* eyes */}
      <circle cx="41" cy="48" r="5" fill="#fff" />
      <circle cx="59" cy="48" r="5" fill="#fff" />
      <circle cx="42" cy="49" r="2.4" fill={eye} />
      <circle cx="60" cy="49" r="2.4" fill={eye} />

      {/* cheeks */}
      <circle cx="34" cy="56" r="3" fill={accent} opacity="0.6" />
      <circle cx="66" cy="56" r="3" fill={accent} opacity="0.6" />

      {/* mouth */}
      <path d="M46 58 Q50 62 54 58" stroke={eye} strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* feet */}
      <ellipse cx="40" cy="80" rx="6" ry="3.5" fill={bodyDark} />
      <ellipse cx="60" cy="80" rx="6" ry="3.5" fill={bodyDark} />
    </svg>
  );
}
