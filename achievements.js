export const ACHIEVEMENTS = [
  {
    id: "ink_collected",
    visibility: "always",
    levels: [
      { name: "Drop in the Ocean",   threshold: 1_000,                 reward: 1   },
      { name: "Blot",                threshold: 10_000,                reward: 2   },
      { name: "Squid Farmer",        threshold: 100_000,               reward: 5   },
      { name: "Millionaire",         threshold: 1_000_000,             reward: 10  },
      { name: "Billionaire",         threshold: 1_000_000_000,         reward: 25  },
      { name: "Numpad",              threshold: 1_234_567_890,         reward: 5   },
      { name: "Trillionaire",        threshold: 1_000_000_000_000,     reward: 50  },
      { name: "The Meaning of Life", threshold: 4_242_424_242_424_242, reward: 100 },
    ],
  },
];

// Returns count of achievements where the current level is claimable but not yet claimed.
// Used for the numeric red badge on the trigger button.
export function countClaimable(achievementProgress, achievementLevels) {
  let count = 0;
  for (const a of ACHIEVEMENTS) {
    const claimed  = achievementLevels[a.id]  ?? 0;
    const progress = achievementProgress[a.id] ?? 0;
    if (claimed >= a.levels.length) continue;
    if (progress >= a.levels[claimed].threshold) count++;
  }
  return count;
}
