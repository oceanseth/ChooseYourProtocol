// Goal taxonomy + the agent's library of guided-conversation topics.

export const CATEGORIES = [
  {
    key: 'fitness',
    label: 'Fitness',
    icon: '💪',
    blurb: 'Move more, together. Micro-activities matched to your body goals.',
    subGoals: [
      { key: 'flexibility', label: 'Flexibility', activity: 'Toe-touch stretch + hold' },
      { key: 'strength', label: 'Strength', activity: 'Wall-sit hold' },
      { key: 'endurance', label: 'Endurance', activity: 'Plank hold' }
    ]
  },
  {
    key: 'social',
    label: 'Social',
    icon: '🤝',
    blurb: 'Forge novel connections across your org with guided conversations.',
    subGoals: [
      { key: 'newConnections', label: 'New connections', activity: 'Plank + intro' },
      { key: 'crossTeam', label: 'Cross-team bonds', activity: 'Plank + swap stories' },
      { key: 'belonging', label: 'Belonging', activity: 'Plank + shared values' }
    ]
  },
  {
    key: 'business',
    label: 'Business',
    icon: '📈',
    blurb: 'Level up the systems you build and the company you build them in.',
    subGoals: [
      { key: 'growth', label: 'Growth', activity: 'Plank + growth idea swap' },
      { key: 'craft', label: 'Craft & quality', activity: 'Plank + craft talk' },
      { key: 'alignment', label: 'Alignment', activity: 'Plank + goal sync' }
    ]
  }
];

export function categoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key);
}

// The "agent-selected" guided topic for a session. Deterministic-ish per call.
const TOPICS = {
  fitness: [
    'What does feeling strong look like for you in 3 months?',
    'Share one tiny habit that has actually stuck.',
    'What is the body signal you most often ignore while working?'
  ],
  social: [
    'What is something you are great at that your team rarely sees?',
    'Who outside your team do you wish you collaborated with more?',
    'Describe a moment you felt genuinely in flow with a colleague.'
  ],
  business: [
    'If you could delete one process tomorrow, what would it be?',
    'What is the smallest change that would 10x our quality?',
    'What customer truth do we keep forgetting?'
  ],
  general: ['What is the most interesting problem on your plate this week?']
};

export function pickTopic(category) {
  const list = TOPICS[category] || TOPICS.general;
  return list[Math.floor(Math.random() * list.length)];
}
