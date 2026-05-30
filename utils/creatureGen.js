// PokéVibe creature generator.
//
// Turns the "vibe" of a completed activity (the guided conversation + the
// plank they held together) into a rare collectible creature — the AI-generated
// "child" the two participants just brought into the world. Fully deterministic
// from a seed so the same session always mints the same creature, and so it runs
// offline without any external image/model API. The frontend renders the
// creature from the returned palette + traits as an animated SVG.

const TYPES = [
  'Spark', 'Flow', 'Iron', 'Bloom', 'Tide', 'Ember', 'Frost', 'Stone',
  'Gale', 'Lumen', 'Shadow', 'Pulse', 'Verdant', 'Quartz', 'Nova'
];

const PREFIXES = ['Zy', 'Mo', 'Bra', 'Lu', 'Ka', 'Ve', 'Ny', 'Or', 'Pi', 'Qua', 'Sol', 'Thal', 'Wis', 'Xan', 'Glo'];
const MIDS = ['va', 'ри', 'lo', 'mi', 'ze', 'ko', 'ny', 'shi', 'dra', 'fen', 'qui', 'bo'];
const SUFFIXES = ['mon', 'puff', 'tail', 'fin', 'wing', 'paw', 'horn', 'spark', 'leaf', 'byte'];

const RARITY_TIERS = [
  { name: 'Common', min: 0, glow: '#9ca3af' },
  { name: 'Uncommon', min: 35, glow: '#34d399' },
  { name: 'Rare', min: 55, glow: '#38bdf8' },
  { name: 'Epic', min: 72, glow: '#a78bfa' },
  { name: 'Legendary', min: 86, glow: '#fbbf24' },
  { name: 'Mythic', min: 95, glow: '#f472b6' }
];

// Small deterministic string hash -> 32-bit int.
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Mulberry32 PRNG.
function rng(seedInt) {
  let a = seedInt >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function hsl(h, s, l) {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Score the conversation "vibe" from session signals.
 * @param {Object} input
 * @param {Array} input.messages  conversation turns: [{ senderUid, text }]
 * @param {number} input.durationSeconds  how long they held the activity
 * @param {string} input.topic   the agent-selected discussion topic
 * @param {string} input.category goal category
 * @returns {Object} vibe descriptor + 0-100 rarityScore
 */
function scoreVibe({ messages = [], durationSeconds = 0, topic = '', category = 'social' }) {
  const turns = messages.length;
  const words = messages.reduce((n, m) => n + String(m.text || '').trim().split(/\s+/).filter(Boolean).length, 0);
  const speakers = new Set(messages.map((m) => m.senderUid)).size;

  // Energy: how lively the exchange was. Focus: staying power on the plank.
  // Harmony: balanced two-way participation.
  const energy = Math.min(100, turns * 8 + words * 0.6);
  const focus = Math.min(100, (durationSeconds / 60) * 45);
  const harmony = speakers >= 2 ? Math.min(100, 60 + turns * 4) : Math.max(20, turns * 4);

  const rarityScore = Math.round(
    Math.max(8, Math.min(100, energy * 0.4 + focus * 0.35 + harmony * 0.25))
  );

  let descriptor = 'a warm, steady connection';
  if (rarityScore >= 95) descriptor = 'an electric, once-in-a-quarter meeting of minds';
  else if (rarityScore >= 86) descriptor = 'a high-voltage, deeply-in-sync exchange';
  else if (rarityScore >= 72) descriptor = 'a vivid, energizing back-and-forth';
  else if (rarityScore >= 55) descriptor = 'a focused, genuinely curious conversation';
  else if (rarityScore >= 35) descriptor = 'a friendly, encouraging chat';

  return { energy: Math.round(energy), focus: Math.round(focus), harmony: Math.round(harmony), rarityScore, descriptor, turns, words, durationSeconds, topic, category };
}

function rarityFor(score) {
  let tier = RARITY_TIERS[0];
  for (const t of RARITY_TIERS) if (score >= t.min) tier = t;
  return tier;
}

/**
 * Mint a creature from a vibe + a stable seed (e.g. `${sessionId}:${ownerUid}`).
 */
function generateCreature({ seed, vibe, parents = [] }) {
  const seedInt = hashSeed(String(seed));
  const rand = rng(seedInt);

  const name = pick(rand, PREFIXES) + pick(rand, MIDS) + pick(rand, SUFFIXES);
  const primaryType = pick(rand, TYPES);
  let secondaryType = pick(rand, TYPES);
  if (secondaryType === primaryType) secondaryType = null;

  const tier = rarityFor(vibe.rarityScore);

  const baseHue = Math.floor(rand() * 360);
  const palette = {
    body: hsl(baseHue, 70, 58),
    bodyDark: hsl(baseHue, 65, 42),
    belly: hsl((baseHue + 30) % 360, 80, 82),
    accent: hsl((baseHue + 180) % 360, 75, 60),
    eye: '#0b0f1a',
    glow: tier.glow
  };

  // Stats scale with the vibe; rarer creatures are stronger.
  const stat = (base) => Math.round(base + (vibe.rarityScore / 100) * 60 + rand() * 25);
  const stats = {
    hp: stat(40),
    power: stat(35),
    focus: stat(35),
    charm: stat(35),
    stamina: stat(40)
  };

  const traits = [
    pick(rand, ['curious', 'bold', 'calm', 'playful', 'wise', 'fierce', 'gentle', 'radiant']),
    pick(rand, ['born mid-plank', 'forged in conversation', 'hatched from focus', 'sparked by laughter'])
  ];

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    species: secondaryType ? `${primaryType}/${secondaryType}` : primaryType,
    types: secondaryType ? [primaryType, secondaryType] : [primaryType],
    rarity: tier.name,
    rarityScore: vibe.rarityScore,
    palette,
    stats,
    traits,
    nature: vibe.descriptor,
    bodyShape: Math.floor(rand() * 4), // 0-3, rendered by the frontend
    pattern: Math.floor(rand() * 3),
    parents,
    seed: String(seed)
  };
}

module.exports = { scoreVibe, generateCreature, rarityFor };
