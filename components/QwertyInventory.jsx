import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TILE_TYPES, LETTER_SCORES } from "../constants.js";
import { P } from "../styles.js";
import { LetterTile } from "./WordBoard.jsx";

const QWERTY_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M"],
];

const TILE_PRIORITY_ORDER = ["triple_word","double_word","triple_letter","double_letter","golden","normal"];
const TILE_PRIORITY = Object.fromEntries(TILE_PRIORITY_ORDER.map((t, i) => [t, i]));

function buildLetterStacks(letters, specialTiles, wordTiles) {
  const stacks = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(c => { stacks[c] = []; });

  // Clone mutable pools
  const normalPool = { ...letters };
  const specPool = specialTiles.filter(t => t.type !== "lexicoin").map(t => ({ ...t }));

  // Consume tiles already on the board (mirrors assignTilesFromBoard greedy logic)
  for (const wt of wordTiles) {
    if (wt.tileType === "lexicoin") continue;
    if (wt.tileType === "normal") {
      if ((normalPool[wt.letter] || 0) > 0) normalPool[wt.letter]--;
    } else {
      const si = specPool.findIndex(t => t.letter === wt.letter && t.type === wt.tileType);
      if (si >= 0) specPool.splice(si, 1);
    }
  }

  // Populate stacks from remaining special tiles
  for (const t of specPool) {
    stacks[t.letter].push({ tileType: t.type, letter: t.letter, id: t.id });
  }

  // Populate stacks from remaining normal tiles
  for (const [letter, count] of Object.entries(normalPool)) {
    for (let i = 0; i < count; i++) {
      stacks[letter].push({ tileType: "normal", letter });
    }
  }

  // Sort each stack by priority (highest bonus first)
  for (const letter of Object.keys(stacks)) {
    stacks[letter].sort((a, b) => (TILE_PRIORITY[a.tileType] ?? 99) - (TILE_PRIORITY[b.tileType] ?? 99));
  }

  return stacks;
}

export function QwertyInventory({
  letters, specialTiles, wordTiles = [], onTileClick, onWildcardClick,
  readOnly = false, ghostMode = false,
}) {
  const [popoverLetter, setPopoverLetter] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const longPressTimerRef = useRef(null);
  const didLongPressRef = useRef(false);

  const letterStacks = useMemo(
    () => ghostMode ? null : buildLetterStacks(letters, specialTiles, wordTiles),
    [letters, specialTiles, wordTiles, ghostMode]
  );

  // Wildcard count
  const usedLexicoins = wordTiles.filter(t => t.tileType === "lexicoin").length;
  const availLexicoins = specialTiles.filter(t => t.type === "lexicoin").length - usedLexicoins;

  // --- Handlers ---
  // Long press and HTML5 drag conflict on the same element because draggable
  // steals pointer events on movement. Split by device: touch gets long press
  // (HTML5 drag doesn't exist on touch), mouse gets draggable (right-click or
  // popover tiles serve the "pick specific tile" use case on desktop).
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const hasMultipleTypes = (stack) => {
    if (!stack || stack.length < 2) return false;
    const first = stack[0].tileType;
    return stack.some(t => t.tileType !== first);
  };

  const handlePointerDown = (e, letter, stack) => {
    // Long press only for touch — on mouse, drag handles the hold gesture
    if (e.pointerType !== "touch") return;
    if (readOnly || !hasMultipleTypes(stack)) return;
    didLongPressRef.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      didLongPressRef.current = true;
      setPopoverLetter(letter);
      setPopoverAnchor({ x: rect.left + rect.width / 2, y: rect.top });
    }, 400);
  };

  const handlePointerUp = () => cancelLongPress();
  const handlePointerLeave = () => cancelLongPress();

  const handleClick = (letter, stack) => {
    if (didLongPressRef.current) { didLongPressRef.current = false; return; }
    if (readOnly || !onTileClick) return;
    if (ghostMode) { onTileClick(letter, "normal"); return; }
    if (!stack || stack.length === 0) return;
    const top = stack[0];
    onTileClick(letter, top.tileType);
  };

  // Right-click always opens the popover on any key with tiles
  const handleContextMenu = (e, letter, stack) => {
    e.preventDefault();
    if (readOnly || !stack || stack.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverLetter(letter);
    setPopoverAnchor({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleDragStart = (e, letter, tileType) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({
      source: "inventory", letter, tileType,
    }));
  };

  const closePopover = () => {
    setPopoverLetter(null);
    setPopoverAnchor(null);
  };

  // Empty state
  if (!ghostMode) {
    const hasAnyTiles = Object.values(letterStacks).some(s => s.length > 0) || availLexicoins > 0;
    if (!hasAnyTiles) {
      return (
        <div style={{ fontSize: 13, color: P.textMuted, fontStyle: "italic", fontFamily: "'Junicode',sans-serif" }}>
          No letters yet{readOnly ? "" : " — visit the Press tab!"}
        </div>
      );
    }
  }

  const interactive = !readOnly && !!onTileClick;

  return (
    <div>
      {/* QWERTY rows */}
      {QWERTY_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: ri < 2 ? 4 : 0 }}>
          {row.map(letter => {
            const stack = ghostMode ? null : letterStacks[letter];
            const count = ghostMode ? 0 : stack.length;
            const dimmed = !ghostMode && count === 0;
            const topTile = ghostMode ? null : stack[0];
            const tt = dimmed ? null : ghostMode ? null : TILE_TYPES[topTile.tileType] || TILE_TYPES.normal;
            const hasBonus = tt && topTile && topTile.tileType !== "normal";

            return (
              <div
                key={letter}
                onClick={() => handleClick(letter, stack)}
                onPointerDown={interactive && !ghostMode ? e => handlePointerDown(e, letter, stack) : undefined}
                onPointerUp={interactive && !ghostMode ? handlePointerUp : undefined}
                onPointerLeave={interactive && !ghostMode ? handlePointerLeave : undefined}
                onContextMenu={interactive && !ghostMode ? e => handleContextMenu(e, letter, stack) : e => e.preventDefault()}
                draggable={!readOnly && !ghostMode && count > 0}
                onDragStart={!readOnly && !ghostMode && count > 0 ? e => handleDragStart(e, letter, topTile.tileType) : undefined}
                style={{
                  width: 36, height: 42,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: ghostMode ? P.surfaceBg : dimmed ? P.btnInactiveBg : tt.color,
                  border: ghostMode ? `1.5px solid ${P.border}` : dimmed ? `1.5px solid ${P.border}` : `2px solid ${tt.border}`,
                  borderBottom: ghostMode ? `3px solid ${P.border}` : dimmed ? `3px solid ${P.border}` : `3px solid ${tt.border}`,
                  borderRadius: 6,
                  fontFamily: "'Junicode', serif",
                  fontSize: 16, fontWeight: 700,
                  color: ghostMode ? P.textMuted : dimmed ? P.textMuted : tt.text,
                  cursor: (dimmed && !ghostMode) || (!interactive && !ghostMode) ? "default" : "pointer",
                  userSelect: "none",
                  position: "relative",
                  boxShadow: dimmed || ghostMode ? "none" : "0 2px 4px rgba(44,36,32,0.15), inset 0 1px 0 rgba(255,255,255,0.5)",
                  transition: "all 0.12s",
                  opacity: ghostMode ? 0.55 : dimmed ? 0.5 : 1,
                  touchAction: "manipulation",
                  ...(ghostMode ? { filter: "saturate(0.4) brightness(1.1)" } : {}),
                }}
              >
                {letter}

                {/* Score — inside key, bottom-right (Scrabble style) */}
                {!ghostMode && !dimmed && LETTER_SCORES[letter] != null && (
                  <span style={{
                    position: "absolute", bottom: 2, right: 3,
                    fontSize: 9, fontWeight: 700,
                    fontFamily: "'Junicode',sans-serif", lineHeight: 1,
                    color: tt.text, opacity: 0.55,
                  }}>{LETTER_SCORES[letter]}</span>
                )}

                {/* Count badge */}
                {!ghostMode && count > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -5,
                    background: hasBonus ? tt.border : P.textSecondary,
                    color: "#ffffff", borderRadius: "50%",
                    width: 18, height: 18, fontSize: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Junicode', sans-serif", fontWeight: 700,
                  }}>{count}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Wildcard button */}
      {!ghostMode && specialTiles.some(t => t.type === "lexicoin") && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <LetterTile
            letter=""
            count={availLexicoins}
            onClick={!readOnly && availLexicoins > 0 ? onWildcardClick : undefined}
            size={40}
            tileType="lexicoin"
            dimmed={availLexicoins <= 0}
            draggable={!readOnly && availLexicoins > 0}
            onDragStart={e => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", JSON.stringify({ source: "inventory", letter: null, tileType: "lexicoin" }));
            }}
          />
        </div>
      )}

      {/* Popover backdrop (click-away) */}
      {!ghostMode && popoverLetter && (
        <div onClick={closePopover} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
      )}

      {/* Tile stack popover */}
      <AnimatePresence>
        {!ghostMode && popoverLetter && popoverAnchor && (
          <motion.div
            key="tile-popover"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: popoverAnchor.x,
              top: popoverAnchor.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 200,
              background: P.panelBg,
              border: `1px solid ${P.border}`,
              borderRadius: 10,
              padding: "8px 10px",
              boxShadow: "0 4px 16px rgba(44,36,32,0.18)",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 240,
            }}
          >
            <div style={{
              width: "100%", fontSize: 10, color: P.textSecondary,
              fontFamily: "'Junicode', sans-serif", textAlign: "center", marginBottom: 2,
            }}>
              {popoverLetter} tiles
            </div>
            {/* Group tiles by type with counts */}
            {TILE_PRIORITY_ORDER
              .map(type => {
                const n = letterStacks[popoverLetter].filter(t => t.tileType === type).length;
                if (n === 0) return null;
                return (
                  <LetterTile
                    key={type}
                    letter={popoverLetter}
                    count={n}
                    onClick={() => {
                      onTileClick(popoverLetter, type);
                      closePopover();
                    }}
                    size={40}
                    tileType={type}
                    draggable
                    onDragStart={e => {
                      handleDragStart(e, popoverLetter, type);
                      closePopover();
                    }}
                  />
                );
              })
              .filter(Boolean)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
