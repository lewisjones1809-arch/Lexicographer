// --- DAILY MISSIONS ---

const MISSION_POOL = [
  { id: "wi_3",  type: "words_inscribed",  target: 3,   reward: 1, desc: "Inscribe 3 words into your lexicon." },
  { id: "wi_6",  type: "words_inscribed",  target: 6,   reward: 1, desc: "Inscribe 6 words into your lexicon." },
  { id: "wi_10", type: "words_inscribed",  target: 10,  reward: 2, desc: "Inscribe 10 words into your lexicon." },
  { id: "ic_300",type: "ink_collected",    target: 300, reward: 1, desc: "Collect 300 ink from your wells." },
  { id: "ic_700",type: "ink_collected",    target: 700, reward: 2, desc: "Collect 700 ink from your wells." },
  { id: "lc_10", type: "letters_collected",target: 10,  reward: 1, desc: "Collect 10 letters from your presses." },
  { id: "lc_25", type: "letters_collected",target: 25,  reward: 2, desc: "Collect 25 letters from your presses." },
  { id: "lw_6",  type: "long_word",        target: 1,   reward: 1, desc: "Inscribe a word with 6 or more letters.", minLength: 6 },
  { id: "lw_7",  type: "long_word",        target: 1,   reward: 2, desc: "Inscribe a word with 7 or more letters.", minLength: 7 },
  { id: "pub_1", type: "publish",          target: 1,   reward: 3, desc: "Publish a completed lexicon." },
];

// Pick 3 missions of distinct types from the pool.
export function generateMissions() {
  const types = [...new Set(MISSION_POOL.map(m => m.type))];
  // Shuffle types
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const selectedTypes = types.slice(0, 3);
  return selectedTypes.map(type => {
    const candidates = MISSION_POOL.filter(m => m.type === type);
    const template = candidates[Math.floor(Math.random() * candidates.length)];
    return { ...template, progress: 0, claimed: false };
  });
}

// Pure function — returns a new missions array with progress advanced for the given type.
export function advanceProgress(missions, type, amount = 1, opts = {}) {
  return missions.map(m => {
    if (m.claimed || m.type !== type) return m;
    if (type === "long_word" && (opts.wordLength == null || opts.wordLength < m.minLength)) return m;
    return { ...m, progress: Math.min(m.progress + amount, m.target) };
  });
}

export function loadDailyMissions() {
  try {
    const date = localStorage.getItem("lexMissionDate");
    const raw  = localStorage.getItem("lexDailyMissions");
    const missions = raw ? JSON.parse(raw) : null;
    return { missions, date };
  } catch {
    return { missions: null, date: null };
  }
}

export function saveDailyMissions(missions, date) {
  try {
    localStorage.setItem("lexMissionDate", date);
    localStorage.setItem("lexDailyMissions", JSON.stringify(missions));
  } catch {
    // localStorage unavailable — silent fail
  }
}
