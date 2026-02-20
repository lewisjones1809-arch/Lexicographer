import { WELL_UPGRADE_NAMES, MGR_UPGRADE_NAMES, PRESS_UPGRADE_NAMES } from "./constants.js";

// --- DEVICE UPGRADE-LEVEL INITIALISERS ---
export const mkWellUpg  = () => Object.fromEntries(WELL_UPGRADE_NAMES.map(n => [n, 0]));
export const mkMgrUpg   = () => Object.fromEntries(MGR_UPGRADE_NAMES.map(n => [n, 0]));
export const mkPressUpg = () => Object.fromEntries(PRESS_UPGRADE_NAMES.map(n => [n, 0]));

// --- UPGRADE PURCHASE CALCULATION ---

// calcBulkBuy: how many levels can be afforded up to qty (or "max").
// Stops when the player can no longer afford the next level.
export function calcBulkBuy(upgrade, currentLevel, collectedInk, qty) {
  const maxPossible = upgrade.maxLevel - currentLevel;
  const target = qty === "max" ? maxPossible : Math.min(qty, maxPossible);
  let totalCost = 0; let count = 0;
  for (let i = 0; i < target; i++) {
    const cost = upgrade.costFormula(currentLevel + i);
    if (totalCost + cost > collectedInk) break;
    totalCost += cost; count++;
  }
  return { count, totalCost: Math.ceil(totalCost), newLevel: currentLevel + count };
}

// calcQtyBuy: cost for exactly min(qty, maxLevel - currentLevel) levels regardless of affordability.
export function calcQtyBuy(upgrade, currentLevel, qty) {
  const maxPossible = upgrade.maxLevel - currentLevel;
  if (maxPossible <= 0) return { count: 0, totalCost: 0, newLevel: currentLevel };
  const target = qty === "max" ? maxPossible : Math.min(qty, maxPossible);
  let totalCost = 0;
  for (let i = 0; i < target; i++) totalCost += upgrade.costFormula(currentLevel + i);
  return { count: target, totalCost: Math.ceil(totalCost), newLevel: currentLevel + target };
}

// --- UPGRADE VALUE FORMATTING ---
export function fmtUpgradeVal(upgrade, v) {
  const mv = upgrade.maxValue;
  if (mv.endsWith("/s"))      return v.toFixed(2) + "/s";
  if (mv.endsWith("%"))       return (v * 100).toFixed(1) + "%";
  if (mv.endsWith("x"))       return v.toFixed(2) + "x";
  if (mv.includes("Letters")) return Math.floor(v) + " Letters";
  return v.toFixed(2);
}

// --- QTY SELECTOR CYCLE ---
// unlockedQtys: array of allowed qty values, e.g. [1, 5, 10]
export function cycleQty(current, unlockedQtys) {
  const idx = unlockedQtys.indexOf(current);
  if (idx === -1) return unlockedQtys[0];
  return unlockedQtys[(idx + 1) % unlockedQtys.length];
}
