import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Check, X, Pencil, BookOpen, Eraser, HelpCircle } from "lucide-react";
import { ApertureIcon as Aperture, FeatherIcon as Feather } from "../assets/icons";
import { P, st } from "../styles.js";
import { fmt, scoreWord, scoreWordWithTiles, calculateCompendiumBreakdown } from "../gameUtils.js";
import { BASE_INK_COST, INK_COST_SCALE, LETTER_SCORES, TILE_TYPES } from "../constants.js";
import { PUZZLES, CLUE_DB, DIFFICULTY_CONFIG } from "../puzzles/puzzleData.js";
import { QwertyInventory } from "./QwertyInventory.jsx";

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function clueText(clue, rewrittenClues) {
  const db = CLUE_DB[clue.clueId];
  if (!db) return "???";
  if (rewrittenClues?.includes(clue.id)) return db.altClue;
  return db.clue;
}

function clueAnswer(clue) {
  return CLUE_DB[clue.clueId]?.answer ?? "";
}

// Count how many puzzles of a given difficulty have been completed
function countByDifficulty(completedPuzzles, difficulty) {
  return completedPuzzles.filter(p => p.difficulty === difficulty).length;
}

// Get provisionally placed tile IDs across the whole grid
function getUsedTileIds(grid) {
  const ids = new Set();
  if (!grid) return ids;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.provisionalTileId) ids.add(cell.provisionalTileId);
    }
  }
  return ids;
}

// Compute available letter counts considering provisionally placed tiles
function getAvailableLetters(letters, specialTiles, grid) {
  const usedIds = getUsedTileIds(grid);
  const usedNormal = {};
  if (grid) {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.provisional && !cell.provisionalTileId) {
          usedNormal[cell.provisional] = (usedNormal[cell.provisional] || 0) + 1;
        }
      }
    }
  }
  // Count how many provisional placements use normal letters (no tileId = normal)
  // Actually provisionalTileId is set for both normal and special. For normal tiles,
  // we track by letter. Let me reconsider:
  // - tileId is set? It's a special tile. Track by id.
  // - tileId not set? It's a normal letter. Track by letter.
  const provisionalNormals = {};
  if (grid) {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.provisional && !cell.provisionalTileId) {
          provisionalNormals[cell.provisional] = (provisionalNormals[cell.provisional] || 0) + 1;
        }
      }
    }
  }

  const available = {};
  for (const [ch, count] of Object.entries(letters)) {
    const used = provisionalNormals[ch] || 0;
    if (count - used > 0) available[ch] = count - used;
  }
  const availableSpecial = specialTiles.filter(t => !usedIds.has(t.id));
  return { available, availableSpecial };
}

// ─────────────────────────────────────────────────
// Puzzle Selection Screen
// ─────────────────────────────────────────────────

// ─────────────────────────────────────────────────
// Seal helpers
// ─────────────────────────────────────────────────

const SEAL_CONFIG = {
  bronze:      { label: "Bronze",      color: P.textMuted },
  silver:      { label: "Silver",      color: P.textSecondary },
  illuminated: { label: "Illuminated", color: P.quill },
};

function computeSealTier(eligiblePuzzles) {
  let actual = 0, theoretical = 0;
  for (const p of eligiblePuzzles) {
    actual += p.lexicoinsEarned || 0;
    const diffMult = DIFFICULTY_CONFIG[p.difficulty]?.lexicoinMult || 1;
    const wordSum = (p.words || []).reduce((s, w) => s + scoreWord(w), 0);
    theoretical += Math.round(wordSum * diffMult * 1.5);
  }
  if (theoretical === 0) return { tier: "bronze", ratio: 0 };
  const ratio = actual / theoretical;
  if (ratio > 0.75) return { tier: "illuminated", ratio };
  if (ratio >= 0.4) return { tier: "silver", ratio };
  return { tier: "bronze", ratio };
}

// ─────────────────────────────────────────────────
// Acceptance letter generation
// ─────────────────────────────────────────────────

const _GREETINGS = [
  c => `Dear Lexicographer, we have received your collection of ${c} puzzle${c !== 1 ? "s" : ""} with great interest.`,
  c => `To the esteemed Lexicographer \u2014 your submission of ${c} puzzle${c !== 1 ? "s" : ""} has been reviewed by the Board.`,
  c => `The Academy acknowledges receipt of ${c} crossword solution${c !== 1 ? "s" : ""}, submitted for compendium consideration.`,
  c => `We write to confirm that your portfolio of ${c} puzzle${c !== 1 ? "s" : ""} has been accepted for binding.`,
];

const _DIFF_NOTES = {
  compact: [
    "The works, while compact in scope, demonstrate a solid foundation in the lexicographic arts.",
    "These compact puzzles show promising command of vocabulary.",
    "A fine selection of compact-form puzzles \u2014 concise yet well constructed.",
  ],
  standard: [
    "The inclusion of Standard-difficulty works speaks to your growing ambition.",
    "We note with approval the Standard-grade puzzles among your submissions.",
    "Your Standard puzzles display a commendable breadth of knowledge.",
  ],
  cryptic: [
    "The presence of Cryptic-level solutions is particularly noteworthy \u2014 few scholars dare attempt them.",
    "Your mastery of Cryptic puzzles has not gone unnoticed by the senior faculty.",
    "Cryptic solutions of this calibre are seldom seen; the Academy is most impressed.",
  ],
};

const _SEAL_NOTES = {
  silver: [
    "Your craftsmanship earns a Silver seal \u2014 a mark of commendable skill.",
    "The quality of your solutions merits the Silver distinction.",
  ],
  illuminated: [
    "We are honoured to bestow the Illuminated seal upon this volume, reserved for works of the highest calibre.",
    "The Illuminated seal is granted \u2014 a rare honour reflecting exceptional mastery.",
  ],
};

const _CLOSINGS_FIRST = [
  "May this be the first of many volumes to bear your name.",
  "We look forward to your continued contributions to the Academy's collection.",
];
const _CLOSINGS_FEW = [
  "Your growing shelf speaks well of your dedication to the scholarly arts.",
  "The Academy's collection is enriched by your continued efforts.",
];
const _CLOSINGS_MANY = [
  "Your prodigious output has become the talk of the Academy.",
  "The library has set aside an entire shelf for your collected works \u2014 and it is filling rapidly.",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateAcceptanceLetter(puzzleCount, highestDifficulty, sealTier, lifetimeCompendiums) {
  const parts = [];
  parts.push(pick(_GREETINGS)(puzzleCount));
  parts.push(pick(_DIFF_NOTES[highestDifficulty] || _DIFF_NOTES.compact));
  if (sealTier === "silver" || sealTier === "illuminated") {
    parts.push(pick(_SEAL_NOTES[sealTier]));
  }
  const total = lifetimeCompendiums + 1;
  if (total <= 1) parts.push(pick(_CLOSINGS_FIRST));
  else if (total <= 4) parts.push(pick(_CLOSINGS_FEW));
  else parts.push(pick(_CLOSINGS_MANY));
  parts.push("With scholarly regards,\nThe Lexicographer\u2019s Academy");
  return parts.join("\n\n");
}

// ─────────────────────────────────────────────────
// Puzzle Selection Screen
// ─────────────────────────────────────────────────

function PuzzleSelection({ completedPuzzles, compendiumPublished, onSelectPuzzle, onPublishCompendium, coverMult, pageMult, scalingA, scalingB, uiScale }) {
  const sc = n => Math.round(n * uiScale);
  const tiers = Object.entries(DIFFICULTY_CONFIG);
  const [compendiumPhase, setCompendiumPhase] = useState(null); // null | "preview" | "result"
  const [compendiumData, setCompendiumData] = useState(null);

  // Eligible puzzles: not yet included in a previous compendium publish
  const eligiblePuzzles = useMemo(
    () => completedPuzzles.filter(p => !p.includedInCompendium),
    [completedPuzzles]
  );
  const canPublish = eligiblePuzzles.length >= 3;

  // Highest difficulty among eligible puzzles
  const highestDifficulty = useMemo(() => {
    const order = ["cryptic", "standard", "compact"];
    for (const d of order) {
      if (eligiblePuzzles.some(p => p.difficulty === d)) return d;
    }
    return "compact";
  }, [eligiblePuzzles]);

  const handleStartPublish = () => {
    if (!canPublish) return;
    const bd = calculateCompendiumBreakdown(eligiblePuzzles, coverMult, pageMult, scalingA, scalingB);
    const seal = computeSealTier(eligiblePuzzles);
    const letter = generateAcceptanceLetter(bd.puzzleCount, highestDifficulty, seal.tier, compendiumPublished.length);
    setCompendiumData({ breakdown: bd, seal, letter });
    setCompendiumPhase("preview");
  };

  const handleConfirmPublish = () => {
    if (!compendiumData) return;
    const { breakdown, seal, letter } = compendiumData;
    const volumeNumber = onPublishCompendium({ breakdown, sealTier: seal.tier, sealRatio: seal.ratio, acceptanceLetter: letter });
    setCompendiumData(prev => ({ ...prev, volumeNumber }));
    setCompendiumPhase("result");
  };

  // ── Pre-publish breakdown screen ──
  if (compendiumPhase === "preview" && compendiumData) {
    const { breakdown: bd } = compendiumData;
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ ...st.panel, padding: "28px 28px", maxWidth: 380, margin: "0 auto" }}>
          <div style={{ fontFamily: "'BLKCHCRY',serif", fontSize: 20, fontWeight: 700, color: P.textPrimary, letterSpacing: 1, marginBottom: 4 }}>
            Publish Compendium?
          </div>
          <div style={{ fontSize: 11, color: P.textMuted, fontFamily: "'Junicode',sans-serif", marginBottom: 18 }}>
            {bd.puzzleCount} puzzle{bd.puzzleCount !== 1 ? "s" : ""} will be bound into a new volume.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: "'Junicode',sans-serif" }}>
                {bd.puzzleCount} puzzles ({bd.baseValue} weighted) × {bd.A}
              </span>
              <span style={{ fontSize: 14, color: P.textPrimary, fontFamily: "'Junicode',sans-serif", fontWeight: 700 }}>
                {fmt(bd.puzzleBonus)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: "'Junicode',sans-serif", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Aperture size={11} />{fmt(bd.totalLexicoins)} Lexicoins × {bd.B}
              </span>
              <span style={{ fontSize: 14, color: P.textPrimary, fontFamily: "'Junicode',sans-serif", fontWeight: 700 }}>
                +{fmt(bd.lexicoinBonus)}
              </span>
            </div>
            {bd.designMult > 1.01 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: P.textSecondary, fontFamily: "'Junicode',sans-serif" }}>Design bonus</span>
                <span style={{ fontSize: 14, color: P.textPrimary, fontFamily: "'Junicode',sans-serif", fontWeight: 700 }}>
                  ×{bd.designMult.toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ height: 1, background: P.border }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: P.textSecondary, fontFamily: "'Junicode',sans-serif" }}>Quills earned</span>
              <span style={{ fontSize: 18, color: P.quill, fontFamily: "'Junicode',sans-serif", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Feather size={15} /> {fmt(bd.total)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setCompendiumPhase(null); setCompendiumData(null); }} style={{ ...st.btn(false), flex: 1, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleConfirmPublish} style={{ ...st.btn(true), flex: 2 }}>Confirm Publish</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Post-publish result screen ──
  if (compendiumPhase === "result" && compendiumData) {
    const { breakdown: bd, seal, letter, volumeNumber } = compendiumData;
    const sealCfg = SEAL_CONFIG[seal.tier] || SEAL_CONFIG.bronze;
    return (
      <div style={{ textAlign: "center" }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          style={{ ...st.panel, padding: "24px 20px", marginBottom: 16 }}
        >
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(22), color: P.textPrimary, marginBottom: 4 }}
          >
            Compendium Vol. {volumeNumber}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ fontFamily: "'Junicode',sans-serif", fontSize: sc(11), color: P.textSecondary, marginBottom: 16 }}
          >
            Published!
          </motion.div>

          {/* Performance seal */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 14 }}
            style={{
              display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              width: sc(70), height: sc(70), borderRadius: "50%",
              border: `3px solid ${sealCfg.color}`, background: `${sealCfg.color}12`,
              marginBottom: 16,
            }}
          >
            <span style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(10), color: sealCfg.color, letterSpacing: 0.5 }}>
              {sealCfg.label}
            </span>
            <span style={{ fontFamily: "'Junicode',sans-serif", fontSize: sc(7), color: P.textMuted, marginTop: 2 }}>
              {(seal.ratio * 100).toFixed(0)}%
            </span>
          </motion.div>

          {/* Quill reward */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 250, damping: 15 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 12,
              background: `${P.quill}15`, border: `2px solid ${P.quill}40`,
              marginBottom: 16,
            }}
          >
            <Feather size={sc(22)} style={{ color: P.quill }} />
            <span style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(28), color: P.quill }}>
              +{fmt(bd.total)}
            </span>
            <span style={{ fontFamily: "'Junicode',sans-serif", fontSize: sc(11), color: P.textSecondary }}>
              quills
            </span>
          </motion.div>

          {/* Breakdown */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              fontFamily: "'Junicode',sans-serif", fontSize: sc(10), color: P.textSecondary,
              lineHeight: 1.8, textAlign: "left", maxWidth: 300, margin: "0 auto",
              padding: "10px 14px", background: P.surfaceBg, borderRadius: 8,
              border: `1px solid ${P.border}`, marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{bd.puzzleCount} puzzles ({bd.baseValue} weighted)</span>
              <span style={{ color: P.textPrimary }}>{fmt(bd.puzzleBonus)} base</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{fmt(bd.totalLexicoins)} Lexicoins</span>
              <span style={{ color: P.textPrimary }}>+{fmt(bd.lexicoinBonus)} bonus</span>
            </div>
            {bd.designMult > 1.01 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cover & page bonus</span>
                <span style={{ color: P.textPrimary }}>×{bd.designMult.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${P.border}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span style={{ color: P.textPrimary }}>Total</span>
              <span style={{ color: P.quill }}>{fmt(bd.total)} quills</span>
            </div>
          </motion.div>

          {/* Acceptance letter */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            style={{
              textAlign: "left", maxWidth: 320, margin: "0 auto",
              padding: "14px 16px", background: P.surfaceBg, borderRadius: 8,
              border: `1px solid ${P.border}`,
              fontFamily: "'Junicode',sans-serif", fontSize: sc(10), color: P.textSecondary,
              lineHeight: 1.7, whiteSpace: "pre-wrap", fontStyle: "italic",
            }}
          >
            {letter}
          </motion.div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={() => { setCompendiumPhase(null); setCompendiumData(null); }}
          style={{ ...st.btn(true), padding: "12px 32px" }}
        >
          Continue
        </motion.button>
      </div>
    );
  }

  // ── Normal puzzle selection ──
  return (
    <div>
      <div style={st.heading}>Puzzles</div>
      <div style={st.sub}>Solve crosswords to earn Lexicoins and build your Compendium.</div>

      {/* Puzzle type */}
      <div style={{ ...st.panel, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{
          flex: 1, padding: "12px 16px", borderRadius: 8,
          background: P.ink + "10", border: `1.5px solid ${P.ink}`,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(14), color: P.textPrimary }}>Crossword</div>
        </div>
        <div style={{
          flex: 1, padding: "12px 16px", borderRadius: 8,
          background: P.borderLight, border: `1px solid ${P.border}`,
          textAlign: "center", opacity: 0.4,
        }}>
          <div style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(11), color: P.textMuted }}>Coming Soon</div>
        </div>
      </div>

      {/* Difficulty tiers */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tiers.map(([key, config]) => {
          const completedCount = countByDifficulty(completedPuzzles, key);
          const isUnlocked = completedCount >= 0 && (() => {
            if (config.unlockAfter === 0) return true;
            const tierKeys = Object.keys(DIFFICULTY_CONFIG);
            const idx = tierKeys.indexOf(key);
            if (idx <= 0) return true;
            const prevTier = tierKeys[idx - 1];
            return countByDifficulty(completedPuzzles, prevTier) >= config.unlockAfter;
          })();
          const puzzlesForTier = PUZZLES.filter(p => p.difficulty === key);

          return (
            <div key={key} style={{
              ...st.panel,
              opacity: isUnlocked ? 1 : 0.5,
              marginBottom: 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(14), color: P.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
                    {!isUnlocked && <Lock size={sc(12)} />}
                    {config.label}
                  </div>
                  <div style={{ fontSize: sc(10), color: P.textSecondary, fontFamily: "'Junicode',sans-serif", marginTop: 2 }}>
                    {isUnlocked
                      ? `${completedCount} completed · ×${config.lexicoinMult} Lexicoins`
                      : `Complete ${config.unlockAfter} ${Object.keys(DIFFICULTY_CONFIG)[Object.keys(DIFFICULTY_CONFIG).indexOf(key) - 1]} puzzles to unlock`
                    }
                  </div>
                </div>
                {isUnlocked && puzzlesForTier.length > 0 && (
                  <button
                    onClick={() => onSelectPuzzle(puzzlesForTier[0].id)}
                    style={st.btn(true)}
                  >Play</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compendium publish / progress — unlocked permanently after first puzzle */}
      {completedPuzzles.length >= 1 && (
        <div style={{ ...st.panel, marginTop: 16, textAlign: "center" }}>
          {canPublish ? (
            <>
              <div style={{ fontSize: sc(12), color: P.textSecondary, fontFamily: "'Junicode',sans-serif", marginBottom: 8 }}>
                {eligiblePuzzles.length} puzzle{eligiblePuzzles.length !== 1 ? "s" : ""} ready to publish as a Compendium volume!
              </div>
              <button onClick={handleStartPublish} style={st.btn(true)}>
                <BookOpen size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                Publish Compendium
              </button>
            </>
          ) : (
            <div style={{ fontSize: sc(11), color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>
              <BookOpen size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
              {eligiblePuzzles.length} / 3 puzzles for next Compendium volume
              {compendiumPublished.length > 0 && (
                <span style={{ display: "block", marginTop: 4, fontSize: sc(10), color: P.textMuted }}>
                  {compendiumPublished.length} volume{compendiumPublished.length !== 1 ? "s" : ""} published
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Crossword Grid Cell
// ─────────────────────────────────────────────────

function GridCell({ cell, cellSize, isSelected, isActiveCell, clueNumber, onClick, onLongPress, onDragOver, onDrop, isDragOver, animClass, crackLetter }) {
  const longPressTimer = useRef(null);

  const handlePointerDown = (e) => {
    if (!onLongPress) return;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      onLongPress();
    }, 500);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleContextMenu = (e) => {
    if (onLongPress) {
      e.preventDefault();
      onLongPress();
    }
  };

  if (cell.isBlack) {
    return <div style={{ width: cellSize, height: cellSize, background: P.textPrimary, borderRadius: 1 }} />;
  }

  const displayLetter = cell.placed || cell.provisional || cell.draft || "";
  const hasTile = !!cell.placed || !!cell.provisional;
  const isDraft = !cell.placed && !cell.provisional && !!cell.draft;
  const hasAnyTile = hasTile || isDraft;
  const score = displayLetter && LETTER_SCORES[displayLetter];

  // Empty cell background — selection highlighting
  let emptyBg = P.panelBg;
  if (isSelected) emptyBg = `${P.ink}10`;
  if (isActiveCell) emptyBg = `${P.ink}18`;

  // Tile appearance when a letter occupies the cell (placed or provisional)
  const tt = (cell.tileType && cell.tileType !== "normal") ? TILE_TYPES[cell.tileType] : null;
  let tileBg, tileBdr, tileTextCol, tileShadow, tileOpacity = 1;
  if (hasTile) {
    if (cell.hintPlaced) {
      // Hint-placed: quill-tinted tile
      tileBg = "#faf3e0"; tileBdr = P.quill; tileTextCol = P.quill;
      tileShadow = "0 1px 3px rgba(44,36,32,0.15), inset 0 1px 0 rgba(255,255,255,0.5)";
    } else if (cell.provisional) {
      // Provisional: slightly faded tile, use bonus tile colors if applicable
      tileBg = tt ? tt.color : "#fdf8e4";
      tileBdr = tt ? tt.border : "#c4b46a";
      tileTextCol = tt ? tt.text : "#1a1008";
      tileShadow = "0 1px 3px rgba(44,36,32,0.12), inset 0 1px 0 rgba(255,255,255,0.5)";
      tileOpacity = 0.75;
    } else {
      // Committed: full Scrabble tile, use bonus tile colors if applicable
      tileBg = tt ? tt.color : "#fdf8e4";
      tileBdr = tt ? tt.border : "#c4b46a";
      tileTextCol = tt ? tt.text : "#1a1008";
      tileShadow = tt
        ? "0 2px 5px rgba(44,36,32,0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
        : "0 2px 5px rgba(44,36,32,0.2), inset 0 1px 0 rgba(255,255,255,0.65)";
    }
  }

  const pad = Math.max(1, Math.floor(cellSize * 0.06)); // inset for tile within cell
  const tileR = Math.round(cellSize * 0.14); // tile border radius

  return (
    <div
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        width: cellSize, height: cellSize,
        border: `1px solid ${P.border}`,
        outline: isDragOver ? `2px solid ${P.ink}` : isActiveCell ? `2px solid ${P.ink}` : "none",
        outlineOffset: -2,
        borderRadius: 2,
        background: isDragOver ? `${P.ink}22` : emptyBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", cursor: "pointer",
        boxSizing: "border-box",
        touchAction: "manipulation",
      }}
    >
      {/* Clue number — show only on empty cells */}
      {clueNumber != null && !hasAnyTile && (
        <span style={{
          position: "absolute", top: 1, left: 2,
          fontSize: Math.max(7, cellSize * 0.22), color: P.textMuted,
          fontFamily: "'Junicode',sans-serif", lineHeight: 1, zIndex: 0,
        }}>{clueNumber}</span>
      )}

      {/* Scrabble-style tile overlay for placed/provisional letters */}
      {hasTile && (
        <div className={animClass === "correct" ? "lex-tile-correct" : undefined}
          style={{
          position: "absolute",
          inset: pad,
          background: tileBg,
          border: `1.5px solid ${tileBdr}`,
          borderRadius: tileR,
          boxShadow: tileShadow,
          opacity: tileOpacity,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "'Junicode',serif",
            fontSize: Math.max(10, cellSize * 0.48),
            fontWeight: 700,
            color: tileTextCol,
            lineHeight: 1,
          }}>{displayLetter}</span>
          {score != null && (
            <span style={{
              position: "absolute",
              bottom: Math.round(cellSize * 0.05), right: Math.round(cellSize * 0.07),
              fontSize: Math.max(6, cellSize * 0.22), fontWeight: 700,
              fontFamily: "'Junicode',sans-serif", lineHeight: 1,
              color: tileTextCol, opacity: 0.55,
            }}>{score}</span>
          )}
          {/* Tile type label for bonus tiles */}
          {tt && !cell.hintPlaced && (
            <span style={{
              position: "absolute", top: Math.round(cellSize * 0.04), left: Math.round(cellSize * 0.06),
              fontSize: Math.max(5, cellSize * 0.17), fontWeight: 700,
              fontFamily: "'Junicode',sans-serif", lineHeight: 1,
              color: tileTextCol, opacity: 0.6,
            }}>{tt.label}</span>
          )}
          {cell.hintPlaced && (
            <span style={{
              position: "absolute", top: Math.round(cellSize * 0.05), right: Math.round(cellSize * 0.07),
              width: 4, height: 4, borderRadius: "50%", background: P.quill,
            }} />
          )}
        </div>
      )}

      {/* Crack animation — shows the incorrect letter shattering away */}
      {animClass === "crack" && crackLetter && (
        <div className="lex-tile-crack" style={{
          position: "absolute",
          inset: pad,
          background: "#fdf8e4",
          border: "1.5px solid #c4b46a",
          borderRadius: tileR,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* Crack lines */}
          <svg className="lex-crack-lines" viewBox="0 0 40 40" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none",
          }}>
            <path d="M20 0 L18 12 L22 18 L16 28 L20 40" stroke="#8b7355" strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d="M0 18 L10 20 L18 16 L28 22 L40 20" stroke="#8b7355" strokeWidth="1" fill="none" opacity="0.5" />
            <path d="M8 0 L12 10 L16 14" stroke="#8b7355" strokeWidth="0.8" fill="none" opacity="0.4" />
          </svg>
          <span style={{
            fontFamily: "'Junicode',serif",
            fontSize: Math.max(10, cellSize * 0.48),
            fontWeight: 700,
            color: "#1a1008",
            lineHeight: 1,
          }}>{crackLetter}</span>
          {LETTER_SCORES[crackLetter] != null && (
            <span style={{
              position: "absolute",
              bottom: Math.round(cellSize * 0.05), right: Math.round(cellSize * 0.07),
              fontSize: Math.max(6, cellSize * 0.22), fontWeight: 700,
              fontFamily: "'Junicode',sans-serif", lineHeight: 1,
              color: "#1a1008", opacity: 0.55,
            }}>{LETTER_SCORES[crackLetter]}</span>
          )}
        </div>
      )}

      {/* Draft tile — same Scrabble tile but ghostly/washed-out */}
      {isDraft && (
        <div style={{
          position: "absolute",
          inset: pad,
          background: "#fdf8e4",
          border: "1.5px solid #c4b46a",
          borderRadius: tileR,
          boxShadow: "0 1px 3px rgba(44,36,32,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
          opacity: 0.55,
          filter: "saturate(0.4) brightness(1.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.12s",
        }}>
          {/* Animated wispy mist overlay */}
          <div className="lex-ghost-mist" style={{
            position: "absolute", inset: 0, borderRadius: "inherit",
            pointerEvents: "none",
          }} />
          <span style={{
            fontFamily: "'Junicode',serif",
            fontSize: Math.max(10, cellSize * 0.48),
            fontWeight: 700,
            color: "#1a1008",
            lineHeight: 1,
          }}>{displayLetter}</span>
          {score != null && (
            <span style={{
              position: "absolute",
              bottom: Math.round(cellSize * 0.05), right: Math.round(cellSize * 0.07),
              fontSize: Math.max(6, cellSize * 0.22), fontWeight: 700,
              fontFamily: "'Junicode',sans-serif", lineHeight: 1,
              color: "#1a1008", opacity: 0.55,
            }}>{score}</span>
          )}
        </div>
      )}</div>
  );
}

// ─────────────────────────────────────────────────
// Active Puzzle View
// ─────────────────────────────────────────────────

function ActivePuzzleView({
  activePuzzle, puzzleHints, puzzleInkCounter, collectedInk,
  letters, specialTiles,
  onSelectClue, onPlaceLetter, onRemoveLetter,
  onPlaceDraft, onRemoveDraft, onInscribeWord, onUseHint,
  onCompletePuzzle, onAbandonPuzzle,
  uiScale, viewW, viewH,
}) {
  const sc = n => Math.round(n * uiScale);
  const clueListRef = useRef(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null); // { correct: bool } for letter confirmation hint
  const [draftModeActive, setDraftModeActive] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null); // "r,c" — user-clicked cell cursor
  const [cellAnims, setCellAnims] = useState({}); // { "r,c": { type: "correct"|"crack", letter? } }
  const [dragOverCell, setDragOverCell] = useState(null); // "r,c" during drag
  const [floatingCoins, setFloatingCoins] = useState([]); // [{ id, amount, startX, startY }]
  const balanceRef = useRef(null); // ref for the lexicoin balance element
  const gridRef = useRef(null); // ref for the grid container

  const { grid, clues, selectedClueId, selectedDirection, rows, cols } = activePuzzle;

  // Build clue number map (cell → number label)
  const clueNumbers = useMemo(() => {
    const nums = {};
    let n = 1;
    // Assign numbers in reading order (top-to-bottom, left-to-right)
    const starts = new Map();
    for (const clue of [...clues.across, ...clues.down]) {
      const key = `${clue.row},${clue.col}`;
      if (!starts.has(key)) starts.set(key, []);
      starts.get(key).push(clue);
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r},${c}`;
        if (starts.has(key)) {
          for (const clue of starts.get(key)) {
            nums[clue.id] = n;
          }
          n++;
        }
      }
    }
    return nums;
  }, [clues, rows, cols]);

  // Map cells to their clue start number
  const cellClueNumbers = useMemo(() => {
    const map = {};
    for (const clue of [...clues.across, ...clues.down]) {
      const key = `${clue.row},${clue.col}`;
      if (!map[key]) map[key] = clueNumbers[clue.id];
    }
    return map;
  }, [clues, clueNumbers]);

  // Selected clue cells
  const selectedClue = useMemo(() => {
    if (!selectedClueId) return null;
    return [...clues.across, ...clues.down].find(c => c.id === selectedClueId);
  }, [selectedClueId, clues]);

  const selectedCells = useMemo(() => {
    if (!selectedClue) return new Set();
    const isAcross = clues.across.includes(selectedClue);
    const cells = new Set();
    for (let i = 0; i < selectedClue.length; i++) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      cells.add(`${r},${c}`);
    }
    return cells;
  }, [selectedClue, clues]);

  // Active cell = focused cell if set and in selection, else first non-placed cell
  const activeCell = useMemo(() => {
    if (!selectedClue) return null;
    // If user explicitly clicked a cell in this word, use it
    if (focusedCell && selectedCells.has(focusedCell)) return focusedCell;
    // Otherwise fall back to first empty cell
    const isAcross = clues.across.includes(selectedClue);
    for (let i = 0; i < selectedClue.length; i++) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      if (!grid[r][c].placed && !grid[r][c].provisional && !grid[r][c].draft) return `${r},${c}`;
    }
    return null;
  }, [selectedClue, clues, grid, focusedCell, selectedCells]);

  // Check if puzzle is complete
  const isComplete = useMemo(() => {
    for (const row of grid) {
      for (const cell of row) {
        if (!cell.isBlack && cell.placed !== cell.letter) return false;
      }
    }
    return true;
  }, [grid]);

  // Layout: side-by-side when viewport is wide enough, else stack
  const sideBySide = viewW >= 600;

  // Grid sizing — in side-by-side mode the grid gets ~55% of width
  const gridAreaW = sideBySide ? Math.floor((viewW - 56) * 0.55) : viewW - 40;
  const maxGridW = Math.min(gridAreaW, 400);
  const maxGridH = sideBySide ? viewH * 0.55 : viewH * 0.42;
  const cellSize = Math.floor(Math.min(maxGridW / cols, maxGridH / rows));

  // Ink cost
  const n = puzzleInkCounter;
  const inkCost = BASE_INK_COST + (INK_COST_SCALE / 2) * n * (n + 1);

  // Can inscribe?
  const canInscribe = useMemo(() => {
    if (!selectedClue) return false;
    const isAcross = clues.across.includes(selectedClue);
    let allPlaced = true;
    for (let i = 0; i < selectedClue.length; i++) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      const cell = grid[r][c];
      if (!cell.placed && !cell.provisional) return false;
      if (!cell.placed) allPlaced = false;
    }
    if (allPlaced) return false; // word already fully committed
    return collectedInk >= inkCost;
  }, [selectedClue, clues, grid, collectedInk, inkCost]);

  // Score preview — only shown when every cell in the clue has a letter
  // (placed, provisional, or hint). Uses the player's entered letters, not the solution.
  const scorePreview = useMemo(() => {
    if (!selectedClue) return null;
    const isAcross = clues.across.includes(selectedClue);
    const cells = [];
    for (let i = 0; i < selectedClue.length; i++) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      cells.push(grid[r][c]);
    }
    // Only show preview when every cell is filled (placed or provisional)
    if (!cells.every(c => c.placed || c.provisional)) return null;
    // Don't show for fully committed (solved) words
    if (cells.every(c => c.placed)) return null;
    // Use the player's visible letter, not the solution
    const playerLetters = cells.map(c => c.placed || c.provisional);
    // Build assignments from non-hint cells
    const assignments = cells.filter(c => !c.hintPlaced).map((c, idx) => {
      const pl = c.placed || c.provisional;
      return {
        letter: pl,
        type: c.tileType || "normal",
        score: LETTER_SCORES[pl] || 0,
      };
    });
    const { total: base, letterTotal, wordMult, goldenCount } = scoreWordWithTiles(assignments);
    const diffMult = DIFFICULTY_CONFIG[activePuzzle.difficulty]?.lexicoinMult || 1;
    const cleanTotal = Math.round(base * diffMult * 1.5);
    const dirtyTotal = Math.round(base * diffMult);
    // Per-letter breakdown using player's letters, showing tile bonuses
    const letterBreak = cells.filter(c => !c.hintPlaced).map(c => {
      const pl = c.placed || c.provisional;
      const s = LETTER_SCORES[pl] || 0;
      const type = c.tileType || "normal";
      if (type === "lexicoin") return `${pl}(wild)`;
      if (type === "double_letter") return `${pl}(${s}×2)`;
      if (type === "triple_letter") return `${pl}(${s}×3)`;
      return `${pl}(${s})`;
    }).join(" + ");
    const hintCount = cells.filter(c => c.hintPlaced).length;
    return { base, letterTotal, diffMult, cleanTotal, dirtyTotal, letterBreak, hintCount, wordMult, goldenCount };
  }, [selectedClue, clues, grid, activePuzzle.difficulty]);

  // Available letters
  const { available, availableSpecial } = useMemo(
    () => getAvailableLetters(letters, specialTiles, grid),
    [letters, specialTiles, grid]
  );

  // Handle cell click — select clue through it
  const handleCellClick = (r, c) => {
    const cell = grid[r][c];
    if (cell.isBlack) return;
    const key = `${r},${c}`;
    // If clicking a cell already in the current selection and it's an intersection, toggle direction
    if (selectedCells.has(key) && cell.acrossClueId && cell.downClueId) {
      const newDir = selectedDirection === "across" ? "down" : "across";
      const clueId = newDir === "across" ? cell.acrossClueId : cell.downClueId;
      setFocusedCell(key);
      onSelectClue(clueId, newDir);
      return;
    }
    // If clicking a cell already in the current selection, just move cursor there
    if (selectedCells.has(key)) {
      setFocusedCell(key);
      return;
    }
    // Selecting a new clue — set cursor to clicked cell
    setFocusedCell(key);
    // Prefer the current direction
    if (selectedDirection === "across" && cell.acrossClueId) {
      onSelectClue(cell.acrossClueId, "across");
    } else if (selectedDirection === "down" && cell.downClueId) {
      onSelectClue(cell.downClueId, "down");
    } else if (cell.acrossClueId) {
      onSelectClue(cell.acrossClueId, "across");
    } else if (cell.downClueId) {
      onSelectClue(cell.downClueId, "down");
    }
  };

  // Handle long-press on a cell — clear existing provisional or draft letter
  const handleCellLongPress = (r, c) => {
    const cell = grid[r][c];
    if (cell.isBlack || cell.placed) return;
    if (!cell.provisional && !cell.draft) return;
    // Find which clue + position this cell belongs to
    const clue = selectedClue || [...clues.across, ...clues.down].find(cl => {
      const isAcross = clues.across.includes(cl);
      for (let i = 0; i < cl.length; i++) {
        const cr = isAcross ? cl.row : cl.row + i;
        const cc = isAcross ? cl.col + i : cl.col;
        if (cr === r && cc === c) return true;
      }
      return false;
    });
    if (clue) {
      const isAcross = clues.across.includes(clue);
      for (let i = 0; i < clue.length; i++) {
        const cr = isAcross ? clue.row : clue.row + i;
        const cc = isAcross ? clue.col + i : clue.col;
        if (cr === r && cc === c) {
          if (cell.provisional) { onRemoveLetter(clue.id, i); }
          else { onRemoveDraft(clue.id, i); }
          return;
        }
      }
    }
  };

  // Handle letter tile click — place at active cell (cursor), then advance cursor
  const handleLetterClick = (letter, tileId, tileType) => {
    if (!selectedClue || !activeCell) return;
    const isAcross = clues.across.includes(selectedClue);
    // Find which position in the clue the active cell corresponds to
    const [ar, ac] = activeCell.split(",").map(Number);
    let placedIdx = -1;
    for (let i = 0; i < selectedClue.length; i++) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      if (r === ar && c === ac) { placedIdx = i; break; }
    }
    if (placedIdx < 0) return;
    const cell = grid[ar][ac];
    if (cell.placed) return; // can't overwrite committed letters
    if (draftModeActive) {
      onPlaceDraft(selectedClue.id, placedIdx, letter);
    } else {
      onPlaceLetter(selectedClue.id, placedIdx, tileId || null, letter, tileType || "normal");
    }
    // Advance cursor to next empty cell after this position
    for (let i = placedIdx + 1; i < selectedClue.length; i++) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      if (!grid[r][c].placed && !grid[r][c].provisional && !grid[r][c].draft) {
        setFocusedCell(`${r},${c}`);
        return;
      }
    }
    // No more empty cells after — clear focus so activeCell falls back to first empty
    setFocusedCell(null);
  };

  // Handle remove — erase the letter at the active cell (provisional or draft).
  // If active cell is empty/committed, fall back to erasing the last erasable letter in the clue.
  const handleErase = () => {
    if (!selectedClue) return;
    const isAcross = clues.across.includes(selectedClue);

    // Try erasing at the active cell first
    if (activeCell) {
      const [ar, ac] = activeCell.split(",").map(Number);
      const cell = grid[ar][ac];
      // Find position index within the clue
      for (let i = 0; i < selectedClue.length; i++) {
        const r = isAcross ? selectedClue.row : selectedClue.row + i;
        const c = isAcross ? selectedClue.col + i : selectedClue.col;
        if (r === ar && c === ac) {
          if (cell.provisional) { onRemoveLetter(selectedClue.id, i); return; }
          if (cell.draft) { onRemoveDraft(selectedClue.id, i); return; }
          break;
        }
      }
    }

    // Fallback: erase last non-committed letter in the clue
    for (let i = selectedClue.length - 1; i >= 0; i--) {
      const r = isAcross ? selectedClue.row : selectedClue.row + i;
      const c = isAcross ? selectedClue.col + i : selectedClue.col;
      const cell = grid[r][c];
      if (cell.provisional) { onRemoveLetter(selectedClue.id, i); setFocusedCell(`${r},${c}`); return; }
      if (cell.draft) { onRemoveDraft(selectedClue.id, i); setFocusedCell(`${r},${c}`); return; }
    }
  };

  // Handle tile drop from QWERTY keyboard onto a grid cell
  const handleCellDrop = (r, c, e) => {
    e.preventDefault();
    setDragOverCell(null);
    let data;
    try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
    if (data.source !== "inventory" || !data.letter) return;
    const cell = grid[r][c];
    if (cell.isBlack || cell.placed) return;

    // Resolve which clue + position this cell belongs to
    const findCluePosition = (clueId) => {
      const clue = [...clues.across, ...clues.down].find(cl => cl.id === clueId);
      if (!clue) return null;
      const isAcross = clues.across.includes(clue);
      for (let i = 0; i < clue.length; i++) {
        const cr = isAcross ? clue.row : clue.row + i;
        const cc = isAcross ? clue.col + i : clue.col;
        if (cr === r && cc === c) return { clue, position: i, isAcross };
      }
      return null;
    };

    // Prefer the currently selected clue if this cell is in it, else across, else down
    let match = null;
    if (selectedClueId) match = findCluePosition(selectedClueId);
    if (!match && cell.acrossClueId) match = findCluePosition(cell.acrossClueId);
    if (!match && cell.downClueId) match = findCluePosition(cell.downClueId);
    if (!match) return;

    const { clue, position, isAcross } = match;
    const letter = data.letter;

    // Select this clue so the cursor is in context
    onSelectClue(clue.id, isAcross ? "across" : "down");

    if (draftModeActive) {
      onPlaceDraft(clue.id, position, letter);
    } else {
      // Resolve tileType → tileId for special tiles
      let tileId = null;
      if (data.tileType && data.tileType !== "normal" && data.tileType !== "lexicoin") {
        const tile = availableSpecial.find(t => t.letter === letter && t.type === data.tileType);
        tileId = tile?.id || null;
      }
      onPlaceLetter(clue.id, position, tileId, letter, data.tileType || "normal");
    }

    // Advance cursor to next empty cell in this clue
    for (let i = position + 1; i < clue.length; i++) {
      const nr = isAcross ? clue.row : clue.row + i;
      const nc = isAcross ? clue.col + i : clue.col;
      if (!grid[nr][nc].placed && !grid[nr][nc].provisional && !grid[nr][nc].draft) {
        setFocusedCell(`${nr},${nc}`);
        return;
      }
    }
    setFocusedCell(null);
  };

  // Auto-scroll to active clue
  useEffect(() => {
    if (selectedClueId && clueListRef.current) {
      const el = clueListRef.current.querySelector(`[data-clue="${selectedClueId}"]`);
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedClueId]);

  // Handle hint use with letter confirmation feedback
  const handleUseHint = (type) => {
    if (type === "letterConfirmation" && selectedClue) {
      // Check if provisionals match
      const isAcross = clues.across.includes(selectedClue);
      let allMatch = true;
      let hasAny = false;
      for (let i = 0; i < selectedClue.length; i++) {
        const r = isAcross ? selectedClue.row : selectedClue.row + i;
        const c = isAcross ? selectedClue.col + i : selectedClue.col;
        const cell = grid[r][c];
        if (cell.provisional) {
          hasAny = true;
          if (cell.provisional !== cell.letter) allMatch = false;
        }
      }
      if (hasAny) {
        setConfirmResult({ correct: allMatch });
        setTimeout(() => setConfirmResult(null), 2000);
      }
    }
    onUseHint(type, selectedClueId, null);
  };

  // Solved clue set for styling
  const solvedClueIds = useMemo(() => {
    const ids = new Set();
    for (const clue of [...clues.across, ...clues.down]) {
      const isAcross = clues.across.includes(clue);
      let allPlaced = true;
      for (let i = 0; i < clue.length; i++) {
        const r = isAcross ? clue.row : clue.row + i;
        const c = isAcross ? clue.col + i : clue.col;
        if (grid[r][c].placed !== grid[r][c].letter) { allPlaced = false; break; }
      }
      if (allPlaced) ids.add(clue.id);
    }
    return ids;
  }, [grid, clues]);

  if (isComplete) {
    return (
      <PuzzleCompletion
        activePuzzle={activePuzzle}
        onCompletePuzzle={onCompletePuzzle}
        uiScale={uiScale}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={st.heading}>
          {DIFFICULTY_CONFIG[activePuzzle.difficulty]?.label || "Puzzle"}
        </div>
      </div>

      {/* Grid + Clues — side-by-side on wide viewports, stacked on narrow */}
      <div style={{
        display: "flex",
        flexDirection: sideBySide ? "row" : "column",
        gap: 8,
        marginBottom: 8,
        alignItems: sideBySide ? "flex-start" : "stretch",
      }}>
        {/* Crossword Grid + Lexicoin balance */}
        <div style={{ flexShrink: 0 }}>
        <div ref={gridRef} style={{ ...st.panel, padding: 8, display: "flex", justifyContent: "center", marginBottom: 0, position: "relative" }}>
          <div
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCell(null); }}
            style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            gap: 1,
          }}>
            {grid.map((row, r) => row.map((cell, c) => (
              <GridCell
                key={`${r},${c}`}
                cell={cell}
                cellSize={cellSize}
                isSelected={selectedCells.has(`${r},${c}`)}
                isActiveCell={activeCell === `${r},${c}`}
                clueNumber={cellClueNumbers[`${r},${c}`]}
                onClick={() => handleCellClick(r, c)}
                onLongPress={() => handleCellLongPress(r, c)}
                onDragOver={!cell.isBlack && !cell.placed ? e => { e.preventDefault(); setDragOverCell(`${r},${c}`); } : undefined}
                onDrop={!cell.isBlack && !cell.placed ? e => handleCellDrop(r, c, e) : undefined}
                isDragOver={dragOverCell === `${r},${c}`}
                animClass={cellAnims[`${r},${c}`]?.type}
                crackLetter={cellAnims[`${r},${c}`]?.letter}
              />
            )))}
          </div>
          {/* Floating coin animations */}
          <AnimatePresence>
            {floatingCoins.map(coin => {
              // Animate from coin's start position to balance position
              const balanceEl = balanceRef.current;
              const gridEl = gridRef.current;
              let targetX = 0, targetY = -40;
              if (balanceEl && gridEl) {
                const bRect = balanceEl.getBoundingClientRect();
                const gRect = gridEl.getBoundingClientRect();
                targetX = (bRect.left + bRect.width / 2) - gRect.left - coin.startX;
                targetY = (bRect.top + bRect.height / 2) - gRect.top - coin.startY;
              }
              return (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 1, x: coin.startX, y: coin.startY, scale: 1 }}
                  animate={{ opacity: [1, 1, 0], x: coin.startX + targetX, y: coin.startY + targetY, scale: [1, 1.2, 0.6] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut", times: [0, 0.6, 1] }}
                  style={{
                    position: "absolute", top: 0, left: 0,
                    pointerEvents: "none", zIndex: 20,
                    display: "flex", alignItems: "center", gap: 3,
                    fontFamily: "'Junicode',sans-serif", fontWeight: 700,
                    fontSize: sc(12), color: P.quill,
                    textShadow: "0 1px 4px rgba(180,160,80,0.5)",
                  }}
                >
                  <Aperture size={sc(12)} />+{fmt(coin.amount)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {/* Lexicoin balance — directly below grid */}
        <div ref={balanceRef} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "6px 12px", marginTop: 6,
          background: `${P.quill}10`, border: `1px solid ${P.quill}30`,
          borderRadius: 8,
        }}>
          <Aperture size={sc(13)} style={{ color: P.quill }} />
          <span style={{
            fontFamily: "'Junicode',serif", fontSize: sc(13), fontWeight: 700, color: P.quill,
          }}>{fmt(activePuzzle.lexicoinsEarned)}</span>
          <span style={{
            fontFamily: "'Junicode',sans-serif", fontSize: sc(9), color: P.textSecondary,
          }}>Lexicoins</span>
        </div>
        </div>

        {/* Clue Lists */}
        <div ref={clueListRef} style={{
          ...st.panel, padding: 8, marginBottom: 0,
          maxHeight: sideBySide ? cellSize * rows + 18 : 140,
          overflowY: "auto", flex: sideBySide ? 1 : undefined, minWidth: 0,
        }}>
          {["across", "down"].map(dir => (
            <div key={dir}>
              <div style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(11), color: P.textSecondary, marginBottom: 4, marginTop: dir === "down" ? 8 : 0 }}>
                {dir === "across" ? "Across" : "Down"}
              </div>
              {clues[dir].map(clue => {
                const isSolved = solvedClueIds.has(clue.id);
                const isActive = selectedClueId === clue.id;
                return (
                  <div
                    key={clue.id}
                    data-clue={clue.id}
                    onClick={() => { setFocusedCell(null); onSelectClue(clue.id, dir); }}
                    style={{
                      padding: "3px 6px",
                      borderRadius: 4,
                      cursor: "pointer",
                      background: isActive ? `${P.ink}10` : "transparent",
                      marginBottom: 2,
                      display: "flex", gap: 6, alignItems: "baseline",
                    }}
                  >
                    <span style={{
                      fontFamily: "'Junicode',sans-serif", fontSize: sc(10), fontWeight: 700,
                      color: isSolved ? P.sage : P.textSecondary, minWidth: 18,
                    }}>{clueNumbers[clue.id]}.</span>
                    <span style={{
                      fontFamily: "'Junicode',sans-serif", fontSize: sc(10),
                      color: isSolved ? P.textMuted : P.textPrimary,
                      textDecoration: isSolved ? "line-through" : "none",
                    }}>{clueText(clue, activePuzzle.rewrittenClues)}</span>
                    {isSolved && <Check size={10} style={{ color: P.sage, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hint Toolbar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {[
          { type: "revealTile", label: "Reveal Tile", icon: Eye },
          { type: "revealWord", label: "Reveal Word", icon: EyeOff },
          { type: "letterConfirmation", label: "Confirm", icon: Check },
          { type: "clueRewrite", label: "Rewrite Clue", icon: HelpCircle },
        ].map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            disabled={!puzzleHints[type] || !selectedClueId}
            onClick={() => handleUseHint(type)}
            style={{
              flex: 1, padding: "6px 4px",
              background: puzzleHints[type] && selectedClueId ? P.borderLight : P.surfaceBg,
              border: `1px solid ${P.border}`,
              borderRadius: 6, cursor: puzzleHints[type] && selectedClueId ? "pointer" : "not-allowed",
              opacity: puzzleHints[type] && selectedClueId ? 1 : 0.4,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              fontFamily: "'Junicode',sans-serif", fontSize: sc(8), color: P.textSecondary,
            }}
          >
            <Icon size={sc(11)} />
            <span>{label}</span>
            <span style={{ fontSize: sc(8), color: P.quill }}>{puzzleHints[type] || 0}</span>
          </button>
        ))}
      </div>

      {/* Letter confirmation result flash */}
      <AnimatePresence>
        {confirmResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: "center", padding: 8, marginBottom: 8,
              borderRadius: 6, fontFamily: "'Junicode',sans-serif", fontSize: sc(12), fontWeight: 700,
              background: confirmResult.correct ? `${P.sage}20` : `${P.rose}20`,
              color: confirmResult.correct ? P.sage : P.rose,
              border: `1px solid ${confirmResult.correct ? P.sage : P.rose}40`,
            }}
          >
            {confirmResult.correct ? "Letters are correct!" : "Some letters are wrong."}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inscribe + action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => {
            const result = onInscribeWord(selectedClueId);
            if (!result) return;
            const { cellResults, wordLexicoins } = result;
            const anims = {};
            for (const r of cellResults) {
              if (r.result === "correct") anims[`${r.row},${r.col}`] = { type: "correct" };
              if (r.result === "incorrect") anims[`${r.row},${r.col}`] = { type: "crack", letter: r.lostLetter };
            }
            setCellAnims(anims);
            setTimeout(() => setCellAnims({}), 650);
            // Floating lexicoin animation when word scores
            if (wordLexicoins > 0 && gridRef.current) {
              // Find center of the completed word cells
              const correctCells = cellResults.filter(r => r.result === "correct" || r.result === "already");
              if (correctCells.length > 0) {
                const midCell = correctCells[Math.floor(correctCells.length / 2)];
                const midR = midCell.row, midC = midCell.col;
                const startX = midC * (cellSize + 1) + cellSize / 2;
                const startY = midR * (cellSize + 1) + cellSize / 2;
                const coinId = Date.now();
                setFloatingCoins(prev => [...prev, { id: coinId, amount: wordLexicoins, startX, startY }]);
                setTimeout(() => setFloatingCoins(prev => prev.filter(c => c.id !== coinId)), 900);
              }
            }
          }}
          disabled={!canInscribe}
          style={{
            ...st.btn(canInscribe),
            flex: 1,
            opacity: canInscribe ? 1 : 0.4,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          Inscribe ({fmt(inkCost)} ink)
        </button>
        <button
          onClick={handleErase}
          disabled={!selectedClue}
          style={{
            ...st.btn(!!selectedClue),
            padding: "10px 14px",
            opacity: selectedClue ? 1 : 0.4,
          }}
        >
          <Eraser size={14} />
        </button>
        <button
          onClick={() => setShowAbandonConfirm(true)}
          style={{ ...st.btn(false), padding: "10px 14px" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Score preview — shows breakdown for selected word */}
      {scorePreview && (
        <div style={{
          padding: "6px 10px", marginBottom: 8,
          background: `${P.quill}08`, border: `1px solid ${P.quill}20`,
          borderRadius: 6, fontFamily: "'Junicode',sans-serif", fontSize: sc(9),
          color: P.textSecondary, lineHeight: 1.6,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <Aperture size={sc(10)} style={{ color: P.quill }} />
            <span style={{ fontWeight: 700, color: P.textPrimary, fontSize: sc(10) }}>If correct:</span>
          </div>
          <div style={{ paddingLeft: sc(14) }}>
            <div>{scorePreview.letterBreak} = <b>{scorePreview.letterTotal}</b></div>
            {scorePreview.wordMult > 1 && (
              <div>Word multiplier: ×{scorePreview.wordMult} = <b>{scorePreview.base}</b></div>
            )}
            <div>First guess: ×1.5</div>
            {scorePreview.goldenCount > 0 && (
              <div style={{ color: TILE_TYPES.golden.text }}>
                ★ {scorePreview.goldenCount} Golden Notebook{scorePreview.goldenCount > 1 ? "s" : ""}
              </div>
            )}
            {scorePreview.hintCount > 0 && (
              <div style={{ color: P.textMuted, fontStyle: "italic" }}>
                {scorePreview.hintCount} hint letter{scorePreview.hintCount > 1 ? "s" : ""} (0 pts)
              </div>
            )}
            {scorePreview.diffMult !== 1 && (
              <div>Difficulty: ×{scorePreview.diffMult}</div>
            )}
            <div>Total: <b style={{ color: P.quill }}>{scorePreview.cleanTotal}</b></div>
          </div>
        </div>
      )}

      {/* Abandon confirmation */}
      <AnimatePresence>
        {showAbandonConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              ...st.panel, textAlign: "center", overflow: "hidden",
            }}
          >
            <div style={{ fontSize: sc(11), color: P.textSecondary, fontFamily: "'Junicode',sans-serif", marginBottom: 8 }}>
              Abandon this puzzle? Provisional letters will be returned.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => { onAbandonPuzzle(); setShowAbandonConfirm(false); }} style={st.btn(true)}>Abandon</button>
              <button onClick={() => setShowAbandonConfirm(false)} style={st.btn(false)}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Letter Inventory */}
      <div style={st.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={st.heading}>{draftModeActive ? "Draft Letters" : "Your Letters"}</div>
          <button
            onClick={() => setDraftModeActive(d => !d)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 4,
              background: draftModeActive ? `${P.textMuted}20` : P.surfaceBg,
              border: `1px solid ${draftModeActive ? P.textMuted : P.border}`,
              color: draftModeActive ? P.textMuted : P.textSecondary,
              cursor: "pointer", fontFamily: "'Junicode',sans-serif", fontSize: sc(9),
            }}
          >
            <Pencil size={sc(10)} />
            {draftModeActive ? "Draft On" : "Draft Off"}
          </button>
        </div>
        <QwertyInventory
          letters={available}
          specialTiles={availableSpecial}
          ghostMode={draftModeActive}
          onTileClick={(letter, tileType) => {
            if (draftModeActive) { handleLetterClick(letter, null, "normal"); return; }
            if (tileType !== "normal") {
              const tile = availableSpecial.find(t => t.letter === letter && t.type === tileType);
              handleLetterClick(letter, tile?.id || null, tileType);
            } else {
              handleLetterClick(letter, null, "normal");
            }
          }}
          onWildcardClick={() => {
            const wc = availableSpecial.find(t => t.type === "lexicoin");
            if (wc) handleLetterClick("?", wc.id, "lexicoin");
          }}
        />
      </div>

      {/* Draft mode hint */}
      <div style={{ fontSize: sc(9), color: P.textMuted, fontFamily: "'Junicode',sans-serif", textAlign: "center", marginTop: 4 }}>
        <Pencil size={9} style={{ verticalAlign: -1, marginRight: 3 }} />
        {draftModeActive
          ? "Draft mode — letters placed are pencil-marks (no inventory cost). Long-press a cell to clear."
          : "Toggle Draft Mode to pencil in letters without using inventory"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Puzzle Completion
// ─────────────────────────────────────────────────

function PuzzleCompletion({ activePuzzle, onCompletePuzzle, uiScale }) {
  const sc = n => Math.round(n * uiScale);

  return (
    <div style={{ textAlign: "center" }}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div style={{ ...st.heading, fontSize: sc(22), marginBottom: 16 }}>Puzzle Complete!</div>
      </motion.div>

      <div style={st.panel}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: sc(10), color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>Lexicoins Earned</div>
              <div style={{ fontSize: sc(20), fontFamily: "'BLKCHCRY',serif", color: P.quill }}>{fmt(activePuzzle.lexicoinsEarned)}</div>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: sc(10), color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>Clean Solves</div>
                <div style={{ fontSize: sc(16), fontFamily: "'Junicode',serif", fontWeight: 700, color: P.sage }}>{activePuzzle.cleanSolves}</div>
              </div>
              <div>
                <div style={{ fontSize: sc(10), color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>Hints Used</div>
                <div style={{ fontSize: sc(16), fontFamily: "'Junicode',serif", fontWeight: 700, color: P.textPrimary }}>{activePuzzle.hintsUsed}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <button onClick={onCompletePuzzle} style={{ ...st.btn(true), marginTop: 16, padding: "12px 32px" }}>
          Continue
        </button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main PuzzlesTab Export
// ─────────────────────────────────────────────────

export function PuzzlesTab({
  activePuzzle, completedPuzzles, solvedClues,
  puzzleHints, puzzleInkCounter, collectedInk,
  letters, specialTiles, compendiumPublished,
  coverMult, pageMult, scalingA, scalingB,
  uiScale, viewW, viewH,
  onSelectPuzzle, onSelectClue, onPlaceLetter, onRemoveLetter,
  onPlaceDraft, onRemoveDraft, onInscribeWord, onUseHint,
  onCompletePuzzle, onPublishCompendium, onAbandonPuzzle,
}) {
  return (
    <div className="lex-tab-panel">
      {!activePuzzle ? (
        <PuzzleSelection
          completedPuzzles={completedPuzzles}
          compendiumPublished={compendiumPublished}
          onSelectPuzzle={onSelectPuzzle}
          onPublishCompendium={onPublishCompendium}
          coverMult={coverMult}
          pageMult={pageMult}
          scalingA={scalingA}
          scalingB={scalingB}
          uiScale={uiScale}
        />
      ) : (
        <ActivePuzzleView
          activePuzzle={activePuzzle}
          puzzleHints={puzzleHints}
          puzzleInkCounter={puzzleInkCounter}
          collectedInk={collectedInk}
          letters={letters}
          specialTiles={specialTiles}
          onSelectClue={onSelectClue}
          onPlaceLetter={onPlaceLetter}
          onRemoveLetter={onRemoveLetter}
          onPlaceDraft={onPlaceDraft}
          onRemoveDraft={onRemoveDraft}
          onInscribeWord={onInscribeWord}
          onUseHint={onUseHint}
          onCompletePuzzle={onCompletePuzzle}
          onAbandonPuzzle={onAbandonPuzzle}
          uiScale={uiScale}
          viewW={viewW}
          viewH={viewH}
        />
      )}
    </div>
  );
}
