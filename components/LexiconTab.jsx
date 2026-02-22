import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ApertureIcon as Aperture } from "../assets/icons";
import { Keyboard } from "lucide-react";
import { WORDS_PER_PAGE } from "../constants.js";
import { P, st } from "../styles.js";
import { fmt, assignTilesFromBoard, scoreWordWithTiles, scoreWord, sortEntries } from "../gameUtils.js";
import { BookView, ScoreBreakdown } from "./BookComponents.jsx";
import { LetterTile, LexiconKeyboard, WordBoard } from "./WordBoard.jsx";
import { QwertyInventory } from "./QwertyInventory.jsx";

function formatMonkeyTimer(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Typewriter sound synthesis (Web Audio API) ──

function playTypeClick(ctx) {
  const t = ctx.currentTime;

  // Layer 1 — sharp mechanical strike (key bar hitting platen)
  const strikeDur = 0.05;
  const strikeLen = Math.ceil(ctx.sampleRate * strikeDur);
  const strikeBuf = ctx.createBuffer(1, strikeLen, ctx.sampleRate);
  const sd = strikeBuf.getChannelData(0);
  for (let i = 0; i < strikeLen; i++) {
    sd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (strikeLen * 0.08));
  }
  const strikeSrc = ctx.createBufferSource();
  strikeSrc.buffer = strikeBuf;
  strikeSrc.playbackRate.value = 0.9 + Math.random() * 0.2;
  const strikeBp = ctx.createBiquadFilter();
  strikeBp.type = "bandpass";
  strikeBp.frequency.value = 2500 + Math.random() * 1500;
  strikeBp.Q.value = 2.0;
  const strikeGain = ctx.createGain();
  strikeGain.gain.value = 0.18 + Math.random() * 0.04;
  strikeSrc.connect(strikeBp);
  strikeBp.connect(strikeGain);
  strikeGain.connect(ctx.destination);
  strikeSrc.start(t);

  // Layer 2 — low-frequency body thud (mechanical weight)
  const thudDur = 0.06;
  const thudLen = Math.ceil(ctx.sampleRate * thudDur);
  const thudBuf = ctx.createBuffer(1, thudLen, ctx.sampleRate);
  const td = thudBuf.getChannelData(0);
  for (let i = 0; i < thudLen; i++) {
    td[i] = (Math.random() * 2 - 1) * Math.exp(-i / (thudLen * 0.15));
  }
  const thudSrc = ctx.createBufferSource();
  thudSrc.buffer = thudBuf;
  thudSrc.playbackRate.value = 0.4 + Math.random() * 0.2;
  const thudLp = ctx.createBiquadFilter();
  thudLp.type = "lowpass";
  thudLp.frequency.value = 200 + Math.random() * 100;
  thudLp.Q.value = 1.0;
  const thudGain = ctx.createGain();
  thudGain.gain.value = 0.12 + Math.random() * 0.03;
  thudSrc.connect(thudLp);
  thudLp.connect(thudGain);
  thudGain.connect(ctx.destination);
  thudSrc.start(t);
}


export function LexiconTab({
  letters, specialTiles, totalLetters, collectedInk, lexicon, inkCost,
  wordTiles, wordString,
  addWordTile, addLexiconPlaceholder, assignLexiconLetter,
  removeWordTile, clearWord, reorderWordTiles,
  createWord, publishLexicon, isValidWord,
  activeCover, activePageStyle, maxLetters,
  monkeyCount, monkeyTimers, monkeyAnims, clearMonkeyAnim, volumeNumber,
}) {
  const [lexiconPickerOpen, setLexiconPickerOpen] = useState(false);
  const [pendingLexiconTileId, setPendingLexiconTileId] = useState(null);
  const [viewH, setViewH] = useState(window.innerHeight);
  const [viewW, setViewW] = useState(window.innerWidth);
  const [bookSpread, setBookSpread] = useState(0);
  const [typingAnim, setTypingAnim] = useState(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const onResize = () => { setViewH(window.innerHeight); setViewW(window.innerWidth); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isWide = viewW >= 1400;
  // bookW drives sizing; bookH derived to fit exactly 10 words per page (ratio ≈ 1.5)
  const bookW = isWide
    ? Math.max(130, Math.min(Math.floor(viewH * 0.25), 260))
    : Math.max(110, Math.min(Math.floor(viewH * 0.21), 200));
  const bookH = Math.ceil(bookW * 1.5);
  const monkeyScale = bookH / 360;

  // Auto-remove monkey animations after their duration
  useEffect(() => {
    if (!monkeyAnims || monkeyAnims.length === 0) return;
    const timers = monkeyAnims.map(anim => {
      const duration = anim.type === "success" ? 2500 : 2000;
      return setTimeout(() => clearMonkeyAnim(anim.id), duration);
    });
    return () => timers.forEach(clearTimeout);
  }, [monkeyAnims, clearMonkeyAnim]);

  // ── Typewriter character progression ──
  useEffect(() => {
    if (!typingAnim) return;
    const ctx = audioCtxRef.current;
    if (typingAnim.charCount < typingAnim.word.length) {
      const timer = setTimeout(() => {
        if (ctx) playTypeClick(ctx);
        setTypingAnim(prev => prev ? { ...prev, charCount: prev.charCount + 1 } : null);
      }, 120);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setTypingAnim(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [typingAnim?.charCount, typingAnim?.word]);

  const word = wordString.toUpperCase();
  const alreadyInLexicon = word.length >= 3 && lexicon.some(e => e.word === word);
  const valid = word.length >= 3 && !alreadyInLexicon && isValidWord(word);

  const boardResult = useMemo(
    () => wordTiles.length > 0 ? assignTilesFromBoard(wordTiles, letters, specialTiles) : null,
    [wordTiles, letters, specialTiles]
  );
  const hasPendingLexicoin = wordTiles.some(t => t.tileType === "lexicoin" && t.letter === null);
  const canAssign = boardResult !== null && !hasPendingLexicoin;

  const previewScore = useMemo(() => {
    if (!valid || !canAssign) return null;
    const result = scoreWordWithTiles(boardResult.assignments);
    const tileLetters = boardResult.assignments.map(a => ({ letter: a.letter, type: a.type }));
    return { ...result, tileLetters };
  }, [valid, canAssign, boardResult]);

  const handleInscribe = () => {
    if (!valid || !canAssign || collectedInk < inkCost) {
      createWord(); // let createWord show its own error messages
      return;
    }
    const animWord = wordString.toUpperCase().trim();
    const animScore = previewScore.total;

    createWord();

    // Navigate book to the spread containing the new word
    const newSorted = sortEntries([...lexicon, { word: animWord, score: animScore }]);
    const wordIdx = newSorted.findIndex(e => e.word === animWord);
    if (wordIdx >= 0) {
      const pageSlot = Math.floor(wordIdx / WORDS_PER_PAGE) + 1; // +1 because slot 0 is IFC
      setBookSpread(Math.floor(pageSlot / 2));
    }

    // Initialize audio context on user interaction
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();

    setTypingAnim({ word: animWord, charCount: 0 });
  };

  // Column slot ranges: inner-left 0-4, outer-left 5-9, inner-right 10-14, outer-right 15-19
  const monkeyColumn = (indices) => {
    const visible = indices.filter(i => i < monkeyCount);
    if (visible.length === 0) return null;
    return (
      <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-evenly", alignItems:"center", width:Math.round(44 * monkeyScale) }}>
        {visible.map(i => (
          <div key={i} style={{ position:"relative", display:"flex", justifyContent:"center" }}>
            {/* Floating animations */}
            {(monkeyAnims || []).filter(a => a.monkeyIdx === i).map(anim => (
              <div key={anim.id} style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)", pointerEvents:"none", zIndex:10 }}>
                <motion.div
                  animate={anim.type === "success"
                    ? { opacity: [0, 1, 0], x: [0, 35, 70], y: [0, -10, -20] }
                    : { opacity: [0, 0.8, 0], y: [0, -18, -36] }
                  }
                  transition={anim.type === "success"
                    ? { duration: 2.5, ease: "easeOut", times: [0, 0.15, 1] }
                    : { duration: 2, ease: "easeOut", times: [0, 0.15, 1] }
                  }
                  style={{
                    fontSize:Math.round(10 * monkeyScale), fontFamily:"'Junicode',sans-serif",
                    color: anim.type === "success" ? P.sage : P.rose,
                    whiteSpace:"nowrap",
                  }}
                >
                  {anim.word.toUpperCase()}
                </motion.div>
              </div>
            ))}
            {/* Monkey card */}
            <div style={{
              background:P.panelBg, border:`1px solid ${P.border}`,
              borderRadius:8, padding:`${Math.round(5 * monkeyScale)}px ${Math.round(4 * monkeyScale)}px`,
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
            }}>
              <Keyboard size={Math.round(16 * monkeyScale)} color={P.textSecondary} />
              <div style={{ fontSize:Math.round(8 * monkeyScale), fontFamily:"'Junicode',sans-serif", color:P.textMuted, letterSpacing:0.5 }}>
                {formatMonkeyTimer(monkeyTimers ? (monkeyTimers[i] ?? 300) : 300)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="lex-lexicon-outer">
      {/* Left column: Book + Monkey columns */}
      <div className="lex-book-col">
        <div style={{ display:"flex", gap:4, marginBottom:16, alignItems:"stretch", justifyContent:"center" }}>
          {/* Left outer column: slots 5-9 */}
          {monkeyCount > 5 && monkeyColumn([5,6,7,8,9])}
          {/* Left inner column: slots 0-4 */}
          {monkeyCount > 0 && monkeyColumn([0,1,2,3,4])}
          {/* Book */}
          <div style={{ flexShrink:0 }}>
            <BookView entries={lexicon} cover={activeCover} pageStyle={activePageStyle} bw={bookW} bh={bookH} volumeNumber={volumeNumber} onPublish={publishLexicon}
            spread={bookSpread} setSpread={setBookSpread} typingAnim={typingAnim} />
          </div>
          {/* Right inner column: slots 10-14 */}
          {monkeyCount > 10 && monkeyColumn([10,11,12,13,14])}
          {/* Right outer column: slots 15-19 */}
          {monkeyCount > 15 && monkeyColumn([15,16,17,18,19])}
        </div>
      </div>

      {/* Right column: word creation + letter inventory */}
      <div className="lex-form-col">
        {/* Word creation panel */}
        <div style={st.panel}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
            <div style={st.heading}>Create Word</div>
            <div style={{ fontSize:12, color:P.ink, fontFamily:"'Junicode',sans-serif" }}>cost: {fmt(inkCost)} ink</div>
          </div>
          <WordBoard wordTiles={wordTiles} removeWordTile={removeWordTile} clearWord={clearWord}
            reorderWordTiles={reorderWordTiles}
            insertWordTile={(l, tileType, at) => {
              if (tileType === "lexicoin" && l === null) {
                const tileId = addLexiconPlaceholder(at);
                if (tileId !== null) { setPendingLexiconTileId(tileId); setLexiconPickerOpen(true); }
              } else {
                addWordTile(l, tileType, at);
              }
            }}
          />
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
            <button onClick={handleInscribe} style={st.btn(valid && canAssign && collectedInk >= inkCost)}>Inscribe</button>
          </div>
          {/* Score breakdown box */}
          {previewScore && (
            <ScoreBreakdown tileLetters={previewScore.tileLetters} />
          )}
          {/* Validation feedback */}
          {wordTiles.length > 0 && !previewScore && (
            <div style={{ fontSize:12, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:6 }}>
              {word.length > 0 && (
                <span style={{ color:P.textSecondary, display:"inline-flex", alignItems:"center", gap:3 }}><Aperture size={12}/>{scoreWord(word)}</span>
              )}
              {alreadyInLexicon && <span style={{ color:P.rose, fontWeight:600 }}>— already in lexicon</span>}
              {word.length >= 3 && !alreadyInLexicon && !isValidWord(word) && <span style={{ color:P.rose, fontWeight:600 }}>— not a valid word</span>}
              {word.length >= 3 && !canAssign && <span style={{ color:P.rose }}>— missing letters</span>}
            </div>
          )}
          {previewScore && collectedInk < inkCost && (
            <div style={{ fontSize:12, color:P.rose, fontWeight:600, marginTop:4 }}>— not enough ink</div>
          )}
        </div>

        {/* Letter inventory — QWERTY keyboard */}
        <div style={st.panel}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
            <div style={st.heading}>Your Letters</div>
            <div style={{ fontSize:12, color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>{totalLetters}/{maxLetters}</div>
          </div>
          <QwertyInventory
            letters={letters}
            specialTiles={specialTiles}
            wordTiles={wordTiles}
            onTileClick={addWordTile}
            onWildcardClick={() => {
              const tileId = addLexiconPlaceholder(null);
              if (tileId !== null) { setPendingLexiconTileId(tileId); setLexiconPickerOpen(true); }
            }}
          />
          {wordTiles.length > 0 && (
            <div style={{ marginTop:8, fontSize:11, color:P.textMuted, fontStyle:"italic" }}>
              {wordTiles.length} letter{wordTiles.length !== 1 ? "s" : ""} placed
            </div>
          )}
        </div>

        {/* Lexicoin keyboard picker */}
        {lexiconPickerOpen && (
          <LexiconKeyboard
            onSelect={(letter) => { assignLexiconLetter(pendingLexiconTileId, letter); setLexiconPickerOpen(false); setPendingLexiconTileId(null); }}
          />
        )}
      </div>

    </div>
  );
}
