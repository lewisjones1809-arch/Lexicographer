import { LETTER_FREQ, TOTAL_FREQ, LETTER_SCORES } from "./constants.js";
import { UPGRADES_BY_NAME, BASE_TILE_PROBS } from "./upgrades.js";
import { WORD_LIST } from "./wordList.js";

// --- UNIQUE TILE ID ---
let _tileId = Date.now();
export function nextTileId() { return "st_" + (++_tileId); }

// --- LETTER GENERATION ---
export function randomLetter() {
  let r = Math.random() * TOTAL_FREQ;
  for (const [l, f] of Object.entries(LETTER_FREQ)) { r -= f; if (r <= 0) return l; }
  return "E";
}

export function scoreWord(w) {
  return w.split("").reduce((s, c) => s + (LETTER_SCORES[c] || 0), 0);
}

// --- MONKEY BONUS TILE SCORING ---
// Applies DL/TL/DW/TW bonus tiles to a monkey-found word.
// tileChance: per-letter probability (0–1). tileLimit: max bonuses per word.
// Weights: DL=10, TL=5, DW=2, TW=1 (total 18).
const _MONKEY_TILE_WEIGHTS = [
  { type:"double_letter", w:10 },
  { type:"triple_letter", w:5  },
  { type:"double_word",   w:2  },
  { type:"triple_word",   w:1  },
];
const _MONKEY_TILE_TOTAL = 18;
export function applyMonkeyTileBonuses(word, tileChance, tileLimit) {
  if (tileChance <= 0 || tileLimit <= 0) {
    return {
      score: scoreWord(word),
      letters: word.split("").map(l => ({ letter: l, type: "normal" })),
    };
  }
  const letters = [];
  let letterTotal = 0, wordMult = 1, bonusCount = 0;
  for (let i = 0; i < word.length; i++) {
    const ls = LETTER_SCORES[word[i]] ?? 0;
    if (bonusCount < tileLimit && Math.random() < tileChance) {
      bonusCount++;
      const r = Math.random() * _MONKEY_TILE_TOTAL;
      let acc = 0, chosen = "double_letter";
      for (const { type, w } of _MONKEY_TILE_WEIGHTS) { acc += w; if (r < acc) { chosen = type; break; } }
      letters.push({ letter: word[i], type: chosen });
      if      (chosen === "double_letter") letterTotal += ls * 2;
      else if (chosen === "triple_letter") letterTotal += ls * 3;
      else if (chosen === "double_word")   { letterTotal += ls; wordMult *= 2; }
      else if (chosen === "triple_word")   { letterTotal += ls; wordMult *= 3; }
    } else {
      letters.push({ letter: word[i], type: "normal" });
      letterTotal += ls;
    }
  }
  return { score: letterTotal * wordMult, letters };
}

// --- RANDOM NON-WORD GENERATION ---
export function generateNonWord(maxAttempts = 20) {
  const length = 4 + Math.floor(Math.random() * 4); // 4–7 letters
  const vowels = "AEIOU";
  const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
  for (let i = 0; i < maxAttempts; i++) {
    let word = "";
    for (let j = 0; j < length; j++) {
      word += Math.random() < 0.38
        ? vowels[Math.floor(Math.random() * vowels.length)]
        : consonants[Math.floor(Math.random() * consonants.length)];
    }
    if (!WORD_LIST.has(word)) return word;
  }
  return "ZQXVWKJ".slice(0, length);
}

// --- NUMBER FORMATTING ---
const FMT_SUFFIXES = [
  // vigintillions (1e63–1e90)
  [1e90,"NvVg"],[1e87,"OcVg"],[1e84,"SpVg"],[1e81,"SxVg"],
  [1e78,"QiVg"],[1e75,"QaVg"],[1e72,"TVg" ],[1e69,"DVg" ],
  [1e66,"UVg" ],[1e63,"Vg"  ],
  // -decillions (1e33–1e60)
  [1e60,"Nvd"],[1e57,"Ocd"],[1e54,"Spd"],[1e51,"Sxd"],
  [1e48,"Qid"],[1e45,"Qad"],[1e42,"Td" ],[1e39,"Dd" ],
  [1e36,"Ud" ],[1e33,"Dc" ],
  // nonillion down to thousand
  [1e30,"N"],[1e27,"O"],[1e24,"S"],[1e21,"s"],
  [1e18,"Q"],[1e15,"q"],[1e12,"T"],[1e9,"B"],[1e6,"M"],[1e3,"K"],
];
export function fmt(n) {
  const v = typeof n === "number" ? n : Number(n);
  if (!isFinite(v)) return "∞";
  for (const [threshold, suffix] of FMT_SUFFIXES) {
    if (v >= threshold) return (v / threshold).toFixed(2) + suffix;
  }
  return parseFloat(v.toFixed(2)).toString();
}

// --- TILE PROBABILITY ---
export function computeEffectiveTileProbs(pUpg) {
  const tileBonus = {
    double_letter: UPGRADES_BY_NAME["Double Letter %"].valueFormula(pUpg["Double Letter %"] ?? 0),
    triple_letter: UPGRADES_BY_NAME["Triple Letter %"].valueFormula(pUpg["Triple Letter %"] ?? 0),
    double_word:   UPGRADES_BY_NAME["Double Word %"].valueFormula(pUpg["Double Word %"] ?? 0),
    triple_word:   UPGRADES_BY_NAME["Triple Word %"].valueFormula(pUpg["Triple Word %"] ?? 0),
    lexicoin:      UPGRADES_BY_NAME["Wildcard %"].valueFormula(pUpg["Wildcard %"] ?? 0),
    golden:        UPGRADES_BY_NAME["Golden Tile %"].valueFormula(pUpg["Golden Tile %"] ?? 0),
  };
  return BASE_TILE_PROBS.map(p => ({ ...p, chance: p.chance + (tileBonus[p.type] ?? 0) }));
}

export function rollTileType(effectiveTileProbs) {
  const r = Math.random(); let cum = 0;
  for (const p of effectiveTileProbs) { cum += p.chance; if (r < cum) return p.type; }
  return "normal";
}

// --- CRIT ROLLS ---
export function rollCrit(base, critChance, critMult) {
  return Math.random() < critChance
    ? { isCrit: true,  amount: base * critMult }
    : { isCrit: false, amount: base };
}

// --- LEXICON SORTING ---
export function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });
}

// --- BOARD TILE ASSIGNMENT ---
// Validates that the player's word-board placement can be satisfied by their inventory.
// Returns { assignments, newLetters, usedSpecialIds } or null if letters are insufficient.
export function assignTilesFromBoard(wordTiles, letters, specialTiles) {
  const nl = { ...letters };
  const specPool = [...specialTiles];
  const usedSpecialIds = new Set();
  const assignments = [];
  for (const tile of wordTiles) {
    const ch = tile.letter;
    if (tile.tileType === "lexicoin") {
      const wi = specPool.findIndex(t => t.id === tile.sourceTileId && t.type === "lexicoin");
      if (wi >= 0) { usedSpecialIds.add(specPool[wi].id); specPool.splice(wi, 1); }
      else {
        const wi2 = specPool.findIndex(t => t.type === "lexicoin");
        if (wi2 < 0) return null;
        usedSpecialIds.add(specPool[wi2].id); specPool.splice(wi2, 1);
      }
      assignments.push({ letter: ch, type: "lexicoin", score: 0 });
    } else if (tile.tileType && tile.tileType !== "normal") {
      const si = specPool.findIndex(t => t.letter === ch && t.type === tile.tileType);
      if (si >= 0) {
        usedSpecialIds.add(specPool[si].id);
        assignments.push({ letter: ch, type: specPool[si].type, specialId: specPool[si].id, score: LETTER_SCORES[ch] || 0 });
        specPool.splice(si, 1);
      } else { return null; }
    } else {
      if ((nl[ch] || 0) > 0) {
        nl[ch]--; if (nl[ch] <= 0) delete nl[ch];
        assignments.push({ letter: ch, type: "normal", score: LETTER_SCORES[ch] || 0 });
      } else { return null; }
    }
  }
  return { assignments, newLetters: nl, usedSpecialIds };
}

// --- WORD SCORING WITH TILE BONUSES ---
export function scoreWordWithTiles(assignments) {
  let letterTotal = 0, wordMult = 1, goldenCount = 0;
  const details = [];
  for (const a of assignments) {
    let ls = a.score;
    if (a.type === "double_letter") { ls *= 2; details.push(`${a.letter}×2`); }
    else if (a.type === "triple_letter") { ls *= 3; details.push(`${a.letter}×3`); }
    else if (a.type === "double_word") { wordMult *= 2; details.push("W×2"); }
    else if (a.type === "triple_word") { wordMult *= 3; details.push("W×3"); }
    else if (a.type === "golden") { goldenCount++; details.push("★"); }
    else if (a.type === "lexicoin") { details.push(`wild→${a.letter}`); }
    letterTotal += ls;
  }
  return { total: letterTotal * wordMult, wordMult, goldenCount, details };
}

// --- LETTER AVAILABILITY ---
export function canSupplyLetter(letters, specialTiles, wordInput, letter) {
  const normalPool = { ...letters };
  const specPool = [...specialTiles];
  for (const ch of wordInput) {
    if ((normalPool[ch] || 0) > 0) { normalPool[ch]--; continue; }
    const si = specPool.findIndex(t => t.letter === ch);
    if (si >= 0) { specPool.splice(si, 1); continue; }
    const wi = specPool.findIndex(t => t.type === "lexicoin");
    if (wi >= 0) { specPool.splice(wi, 1); continue; }
  }
  if ((normalPool[letter] || 0) > 0) return true;
  if (specPool.some(t => t.letter === letter)) return true;
  if (specPool.some(t => t.type === "lexicoin")) return true;
  return false;
}

export function getAvailableLetterCounts(letters, specialTiles, wordInput) {
  const normalPool = { ...letters };
  const specByLetter = {};
  let wildcards = 0;
  specialTiles.forEach(t => {
    if (t.type === "lexicoin") wildcards++;
    else specByLetter[t.letter] = (specByLetter[t.letter] || 0) + 1;
  });
  for (const ch of wordInput) {
    if ((normalPool[ch] || 0) > 0) { normalPool[ch]--; continue; }
    if ((specByLetter[ch] || 0) > 0) { specByLetter[ch]--; continue; }
    if (wildcards > 0) { wildcards--; continue; }
  }
  const result = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(c => {
    const n = (normalPool[c] || 0) + (specByLetter[c] || 0);
    if (n > 0 || wildcards > 0) result[c] = n;
  });
  result._wildcards = wildcards;
  result._specByLetter = specByLetter;
  return result;
}

// --- OFFLINE PROGRESS SIMULATION ---
// Simulates what managed wells and presses would have produced while the player was away.
// snapshot: saved state object from localStorage. elapsedSeconds: time away (capped by caller).
export function computeOfflineProgress(snapshot, elapsedSeconds) {
  const {
    wells = [], wellMgrOwned = [], wellMgrEnabled = [],
    wellUpgradeLevels = [],
    presses = [], pressMgrOwned = [], pressUpgradeLevels = [],
    totalLetters = 0, effectiveInkMult = 1, effectiveMaxLetters = 50,
  } = snapshot;

  let inkEarned = 0;
  const newNormals = {};
  const newSpecials = [];

  // Managed wells accumulate ink at fill rate continuously (manager auto-collects when full).
  // Total throughput = fillRate × inkMult × time, regardless of starting fill level.
  for (let i = 0; i < wells.length; i++) {
    if (!wellMgrOwned[i] || !wellMgrEnabled[i]) continue;
    const wUpg = wellUpgradeLevels[i] || {};
    const fillRate = UPGRADES_BY_NAME["Well Speed"].valueFormula(wUpg["Well Speed"] ?? 0);
    inkEarned += fillRate * effectiveInkMult * elapsedSeconds;
  }

  // Managed presses complete full cycles. Letters are capped at effectiveMaxLetters.
  let letterSlots = Math.max(0, effectiveMaxLetters - totalLetters);
  for (let i = 0; i < presses.length; i++) {
    if (!pressMgrOwned[i] || letterSlots <= 0) continue;
    const pUpg = pressUpgradeLevels[i] || {};
    const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
    const pressYield    = UPGRADES_BY_NAME["Press Yield"].valueFormula(pUpg["Press Yield"] ?? 0);
    const tileProbs     = computeEffectiveTileProbs(pUpg);

    // Account for a cycle already in progress when the player left.
    const press = presses[i] || {};
    let remaining = elapsedSeconds;
    let cycles = 0;
    if (press.running && press.timer != null) {
      if (remaining >= press.timer) { cycles = 1; remaining -= press.timer; }
      else { continue; } // cycle won't finish offline
    }
    cycles += Math.floor(remaining / pressInterval);

    const yieldCount = Math.floor(pressYield);
    for (let c = 0; c < cycles && letterSlots > 0; c++) {
      for (let y = 0; y < yieldCount && letterSlots > 0; y++) {
        const l = randomLetter();
        const tileType = rollTileType(tileProbs);
        if (tileType === "normal") {
          newNormals[l] = (newNormals[l] || 0) + 1;
        } else if (tileType === "lexicoin") {
          newSpecials.push({ id: nextTileId(), letter: null, type: "lexicoin" });
        } else {
          newSpecials.push({ id: nextTileId(), letter: l, type: tileType });
        }
        letterSlots--;
      }
    }
  }

  const totalNewLetters = Object.values(newNormals).reduce((a, b) => a + b, 0) + newSpecials.length;

  // Monkey simulation — each monkey fires based on its saved countdown timer
  const monkeyTimers      = snapshot.monkeyTimers      || [];
  const monkeySearchTime  = snapshot.monkeySearchTime  || 300;
  const findChance        = snapshot.findChance        || 0.1;
  const wordPool          = [...(snapshot.availableMonkeyWords || [])]; // mutable copy

  const monkeyWords = [];
  for (let mi = 0; mi < monkeyTimers.length; mi++) {
    let timeUntilFirst = monkeyTimers[mi];
    if (elapsedSeconds < timeUntilFirst) continue; // won't fire
    let remaining = elapsedSeconds - timeUntilFirst;
    const firings = 1 + Math.floor(remaining / monkeySearchTime);
    for (let f = 0; f < firings; f++) {
      if (Math.random() < findChance && wordPool.length > 0) {
        const wi = Math.floor(Math.random() * wordPool.length);
        const word = wordPool.splice(wi, 1)[0]; // remove so no duplicates
        monkeyWords.push({ word, score: scoreWord(word), letters: word.split("").map(l => ({ letter: l, type: "normal" })) });
      }
    }
  }

  return { inkEarned, newNormals, newSpecials, totalNewLetters, monkeyWords };
}

// --- PUBLISH CALCULATION ---
export function calculateQuillsBreakdown(entries, coverMult, pageMult, A = 0.1, B = 0.05, previousWords = new Set()) {
  const newWordCount = entries.filter(e => !previousWords.has(e.word)).length;
  const wordBonus = A * newWordCount;
  const totalLexicoins = entries.reduce((s, e) => s + e.score, 0);
  const lexicoinBonus = Math.floor(B * totalLexicoins);
  const base = wordBonus + lexicoinBonus;
  const top10 = sortEntries(entries).slice(0, 10);
  const top10Total = top10.reduce((s, e) => s + e.score, 0);
  const highMult = 1 + (top10Total / 100);
  const designMult = coverMult * pageMult;
  const total = Math.floor(base * highMult * designMult);
  return { wordCount: newWordCount, wordBonus, totalLexicoins, lexicoinBonus, base, top10, top10Total, highMult, designMult, coverMult, pageMult, total, A, B };
}
