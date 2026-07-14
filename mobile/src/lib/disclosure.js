// Synthetic-disclosure posture — spec §7 Q2, contract §6.
// ONE toggle. When Seth picks A or B, flip DISCLOSURE and the whole group
// screen changes treatment. No contract change either way — this is UI only.
//   'A' = honest-by-default: AI-seeded chip on each synthetic + aggregate banner.
//   'B' = quiet: synthetics shape activity but carry no per-member label.
// is_synthetic stays flagged at the data layer regardless; this only controls display.
export const DISCLOSURE = 'A'; // <-- flip to 'B' if Seth chooses quiet posture

export const showSyntheticLabels = () => DISCLOSURE === 'A';
