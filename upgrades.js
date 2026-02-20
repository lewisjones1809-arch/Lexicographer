export const UPGRADES = [
  // INK WELL
  {
    category: "Ink Well",
    name: "Well Speed",
    maxLevel: 1000,
    valueFormula: (L) => 2 + (0.5 * L) * Math.pow(1.0202, L),
    costFormula: (L) => 15 * Math.pow(1.11, L),
    maxValue: "500,000,000/s"
  },
  {
    category: "Ink Well",
    name: "Well Capacity",
    maxLevel: 1000,
    valueFormula: (L) => 100 + (10 * L) * Math.pow(1.0162, L),
    costFormula: (L) => 25 * Math.pow(1.10, L),
    maxValue: "1,000,000,000"
  },
  {
    category: "Ink Well",
    name: "Crit Chance",
    maxLevel: 99,
    valueFormula: (L) => 0.01 + L * 0.01,
    costFormula: (L) => 300 * Math.pow(1.35, L),
    maxValue: "99%"
  },
  {
    category: "Ink Well",
    name: "Crit Multiplier",
    maxLevel: 100,
    valueFormula: (L) => 5 + (L * 0.1),
    costFormula: (L) => 150 * Math.pow(1.25, L),
    maxValue: "15.0x"
  },

  // MANAGERS
  {
    category: "Managers",
    name: "Manager Speed",
    maxLevel: 9,
    valueFormula: (L) => 5 - (L * 0.5),
    costFormula: (L) => 2000 * Math.pow(1.5, L),
    maxValue: "0.1s"
  },
  // LETTER PRESS
  {
    category: "Letter Press",
    name: "Press Speed",
    maxLevel: 99,
    valueFormula: (L) => 10 - (L * 0.1),
    costFormula: (L) => 2500 * Math.pow(1.14, L),
    maxValue: "0.1s"
  },
  {
    category: "Letter Press",
    name: "Press Yield",
    maxLevel: 9,
    valueFormula: (L) => 1 + L,
    costFormula: (L) => 10000 * Math.pow(1.8, L),
    maxValue: "10 Letters"
  },
  {
    category: "Letter Press",
    name: "Double Letter %",
    maxLevel: 10,
    valueFormula: (L) => L * 0.01,
    costFormula: (L) => 50000 * Math.pow(1.4, L),
    maxValue: "10%"
  },
  {
    category: "Letter Press",
    name: "Triple Letter %",
    maxLevel: 10,
    valueFormula: (L) => L * 0.01,
    costFormula: (L) => 100000 * Math.pow(1.5, L),
    maxValue: "10%"
  },
  {
    category: "Letter Press",
    name: "Double Word %",
    maxLevel: 10,
    valueFormula: (L) => L * 0.005,
    costFormula: (L) => 250000 * Math.pow(1.6, L),
    maxValue: "5%"
  },
  {
    category: "Letter Press",
    name: "Triple Word %",
    maxLevel: 10,
    valueFormula: (L) => L * 0.005,
    costFormula: (L) => 500000 * Math.pow(1.7, L),
    maxValue: "5%"
  },
  {
    category: "Letter Press",
    name: "Wildcard %",
    maxLevel: 10,
    valueFormula: (L) => L * 0.003,
    costFormula: (L) => 1000000 * Math.pow(1.8, L),
    maxValue: "3%"
  },
  {
    category: "Letter Press",
    name: "Golden Tile %",
    maxLevel: 10,
    valueFormula: (L) => L * 0.002,
    costFormula: (L) => 2000000 * Math.pow(2.0, L),
    maxValue: "2%"
  }
];

export const UPGRADES_BY_NAME = Object.fromEntries(UPGRADES.map(u => [u.name, u]));

export const BASE_TILE_PROBS = [
  { type:"double_letter", chance:0.015, label:"Double Letter (×2)" },
  { type:"triple_letter", chance:0.005, label:"Triple Letter (×3)" },
  { type:"double_word",   chance:0.008, label:"Double Word (×2)" },
  { type:"triple_word",   chance:0.002, label:"Triple Word (×3)" },
  { type:"golden",        chance:0.0005, label:"Golden Tile (★)" },
  { type:"lexicoin",      chance:0.003,  label:"Lexicoin Wildcard (◈)" },
];