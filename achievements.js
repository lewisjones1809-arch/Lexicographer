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
  {
    id: "unique_words_found",
    unit: "words",
    visibility: "always",
    levels: [
      { name: "Things I Love About You", threshold: 10,      reward: 1   },
      { name: "Catch-22",                threshold: 22,      reward: 1   },
      { name: "Fifty Shades",            threshold: 50,      reward: 2   },
      { name: "Cruella",                 threshold: 101,     reward: 2   },
      { name: "Fireman",                 threshold: 451,     reward: 5   },
      { name: "Splendid Sun",            threshold: 1_000,   reward: 10  },
      { name: "Orwellian",               threshold: 1_984,   reward: 15  },
      { name: "Under the Sea",           threshold: 20_000,  reward: 25  },
      { name: "JFK",                     threshold: 112_263, reward: 50  },
      { name: "Lexicographer",           threshold: 250_000, reward: 100 },
    ],
  },
  {
    id: "lexicons_published",
    unit: "lexicons",
    visibility: "always",
    levels: [
      { name: "First Edition",    threshold: 1,     reward: 1  },
      { name: "Growing Portfolio", threshold: 10,   reward: 2  },
      { name: "Bookshelf Filler", threshold: 25,    reward: 5  },
      { name: "In Print",         threshold: 50,    reward: 10 },
      { name: "Back Catalogue",   threshold: 100,   reward: 25 },
      { name: "Bibliophile",      threshold: 250,   reward: 50 },
      { name: "Librarian",        threshold: 500,   reward: 75 },
      { name: "Archivist",        threshold: 1_000, reward: 100 },
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
