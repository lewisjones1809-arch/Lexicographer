import { useState, useMemo, useEffect } from "react";
import { Feather, Aperture, Keyboard } from "lucide-react";
import { P, st } from "../styles.js";
import { fmt, assignTilesFromBoard, scoreWordWithTiles, scoreWord, getAvailableLetterCounts, calculateQuillsBreakdown } from "../gameUtils.js";
import { BookView } from "./BookComponents.jsx";
import { LetterTile, LexiconKeyboard, WordBoard } from "./WordBoard.jsx";

function formatMonkeyTimer(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function LexiconTab({
  letters, specialTiles, totalLetters, collectedInk, lexicon, inkCost,
  wordTiles, wordString,
  addWordTile, addLexiconPlaceholder, assignLexiconLetter,
  removeWordTile, clearWord, reorderWordTiles,
  createWord, publishLexicon, isValidWord,
  activeCover, activePageStyle, coverMult, pageMult, maxLetters, scalingA, scalingB,
  monkeyCount, monkeyTimers, monkeyAnims, clearMonkeyAnim,
}) {
  const [bookPage, setBookPage] = useState(0);
  const [lexiconPickerOpen, setLexiconPickerOpen] = useState(false);
  const [pendingLexiconTileId, setPendingLexiconTileId] = useState(null);

  // Auto-remove monkey animations after their duration
  useEffect(() => {
    if (!monkeyAnims || monkeyAnims.length === 0) return;
    const timers = monkeyAnims.map(anim => {
      const duration = anim.type === "success" ? 2500 : 2000;
      return setTimeout(() => clearMonkeyAnim(anim.id), duration);
    });
    return () => timers.forEach(clearTimeout);
  }, [monkeyAnims, clearMonkeyAnim]);

  const letterEntries = Object.entries(letters).sort((a,b) => a[0].localeCompare(b[0]));
  const word = wordString.toUpperCase();
  const alreadyInLexicon = word.length >= 3 && lexicon.some(e => e.word === word);
  const valid = word.length >= 3 && !alreadyInLexicon && isValidWord(word);

  const boardResult = useMemo(
    () => wordTiles.length > 0 ? assignTilesFromBoard(wordTiles, letters, specialTiles) : null,
    [wordTiles, letters, specialTiles]
  );
  const hasPendingLexicoin = wordTiles.some(t => t.tileType === "lexicoin" && t.letter === null);
  const canAssign = boardResult !== null && !hasPendingLexicoin;

  const breakdown = useMemo(
    () => calculateQuillsBreakdown(lexicon, coverMult, pageMult, scalingA, scalingB),
    [lexicon, coverMult, pageMult, scalingA, scalingB]
  );

  const previewScore = valid && canAssign ? scoreWordWithTiles(boardResult.assignments) : null;

  // Group special tiles by key for display
  const specByKey = {};
  specialTiles.forEach(t => {
    const k = t.type === "lexicoin" ? "_wild" : `${t.letter}_${t.type}`;
    specByKey[k] = specByKey[k] || { letter:t.letter, type:t.type, count:0, tiles:[] };
    specByKey[k].count++;
    specByKey[k].tiles.push(t);
  });
  const usedLexicoins = wordTiles.filter(t => t.tileType === "lexicoin").length;
  const availLexicoins = (specByKey._wild?.count || 0) - usedLexicoins;

  // Column slot ranges: inner-left 0-4, outer-left 5-9, inner-right 10-14, outer-right 15-19
  const monkeyColumn = (indices) => {
    const visible = indices.filter(i => i < monkeyCount);
    if (visible.length === 0) return null;
    return (
      <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-evenly", alignItems:"center", width:44 }}>
        {visible.map(i => (
          <div key={i} style={{ position:"relative", display:"flex", justifyContent:"center" }}>
            {/* Floating animations */}
            {(monkeyAnims || []).filter(a => a.monkeyIdx === i).map(anim => (
              <div key={anim.id} style={{
                position:"absolute", bottom:"100%", left:"50%",
                transform:"translateX(-50%)",
                animation: anim.type === "success"
                  ? "monkeySuccess 2.5s ease-out forwards"
                  : "monkeyFail 2s ease-out forwards",
                fontSize:10, fontFamily:"'Courier Prime',monospace",
                color: anim.type === "success" ? P.sage : P.rose,
                pointerEvents:"none", whiteSpace:"nowrap", zIndex:10,
              }}>
                {anim.word.toUpperCase()}
              </div>
            ))}
            {/* Monkey card */}
            <div style={{
              background:P.panelBg, border:`1px solid ${P.border}`,
              borderRadius:8, padding:"5px 4px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
            }}>
              <Keyboard size={16} color={P.textSecondary} />
              <div style={{ fontSize:8, fontFamily:"'Courier Prime',monospace", color:P.textMuted, letterSpacing:0.5 }}>
                {formatMonkeyTimer(monkeyTimers ? (monkeyTimers[i] ?? 300) : 300)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* The Book + Monkey columns (inner-left, outer-left, book, inner-right, outer-right) */}
      <div style={{ display:"flex", gap:4, marginBottom:16, alignItems:"stretch", justifyContent:"center" }}>
        {/* Left outer column: slots 5-9 */}
        {monkeyCount > 5 && monkeyColumn([5,6,7,8,9])}
        {/* Left inner column: slots 0-4 */}
        {monkeyCount > 0 && monkeyColumn([0,1,2,3,4])}
        {/* Book */}
        <div style={{ flexShrink:0 }}>
          <BookView entries={lexicon} cover={activeCover} pageStyle={activePageStyle} currentPage={bookPage} setCurrentPage={setBookPage} compact />
        </div>
        {/* Right inner column: slots 10-14 */}
        {monkeyCount > 10 && monkeyColumn([10,11,12,13,14])}
        {/* Right outer column: slots 15-19 */}
        {monkeyCount > 15 && monkeyColumn([15,16,17,18,19])}
      </div>

      {/* Word creation panel */}
      <div style={st.panel}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <div style={st.heading}>Create Word</div>
          <div style={{ fontSize:12, color:P.ink, fontFamily:"'Courier Prime',monospace" }}>cost: {fmt(inkCost)} ink</div>
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
          <button onClick={createWord} style={st.btn(valid && canAssign && collectedInk >= inkCost)}>Inscribe</button>
        </div>
        {wordTiles.length > 0 && (
          <div style={{ fontSize:12, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:6 }}>
            {previewScore ? (
              <span style={{ color:P.quill, fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}><Aperture size={12}/>{previewScore.total} Lexicoins{previewScore.wordMult > 1 ? ` (W×${previewScore.wordMult})` : ""}{previewScore.goldenCount > 0 ? " +★" : ""}</span>
            ) : word.length > 0 && (
              <span style={{ color:P.textSecondary, display:"inline-flex", alignItems:"center", gap:3 }}><Aperture size={12}/>{scoreWord(word)}</span>
            )}
            {previewScore && previewScore.details.length > 0 && (
              <span style={{ fontSize:10, color:P.textMuted }}>[{previewScore.details.join(", ")}]</span>
            )}
            {alreadyInLexicon && <span style={{ color:P.rose, fontWeight:600 }}>— already in lexicon</span>}
            {word.length >= 3 && !alreadyInLexicon && !isValidWord(word) && <span style={{ color:P.rose, fontWeight:600 }}>— not a valid word</span>}
            {valid && <span style={{ color:P.sage }}>✓ valid</span>}
            {word.length >= 3 && !canAssign && <span style={{ color:P.rose }}>— missing letters</span>}
            {collectedInk < inkCost && <span style={{ color:P.rose }}>— not enough ink</span>}
          </div>
        )}
      </div>

      {/* Letter inventory */}
      <div style={st.panel}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <div style={st.heading}>Your Letters</div>
          <div style={{ fontSize:12, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{totalLetters}/{maxLetters}</div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, minHeight:44 }}>
          {letterEntries.length === 0 && specialTiles.length === 0 ? (
            <div style={{ fontSize:13, color:P.textMuted, fontStyle:"italic" }}>No letters yet — visit the Press tab!</div>
          ) : (<>
            {letterEntries.map(([l, tc]) => {
              const avail = getAvailableLetterCounts(letters, specialTiles, wordString);
              const available = (avail[l]||0) > 0 || avail._wildcards > 0;
              const boardUsed = wordTiles.filter(t => t.letter === l && t.tileType === "normal").length;
              return <LetterTile key={l} letter={l} count={Math.max(0, tc - boardUsed)} onClick={() => addWordTile(l)} dimmed={!available}
                draggable={available}
                onDragStart={e => { e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain", JSON.stringify({ source:"inventory", letter:l, tileType:"normal" })); }}
              />;
            })}
            {/* Special tiles */}
            {Object.values(specByKey).map(g => {
              const isWild = g.type === "lexicoin";
              const wildDimmed = isWild && availLexicoins <= 0;
              return (
                <LetterTile key={g.type + (g.letter||"W")}
                  letter={g.letter||""}
                  count={isWild ? availLexicoins : g.count}
                  onClick={() => {
                    if (isWild && availLexicoins > 0) {
                      const tileId = addLexiconPlaceholder(null);
                      if (tileId !== null) { setPendingLexiconTileId(tileId); setLexiconPickerOpen(true); }
                    } else if (!isWild && g.letter) addWordTile(g.letter, g.type);
                  }}
                  size={40} tileType={g.type} dimmed={wildDimmed}
                  draggable={isWild ? availLexicoins > 0 : !wildDimmed}
                  onDragStart={e => { e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain", JSON.stringify({ source:"inventory", letter: isWild ? null : g.letter, tileType:g.type })); }}
                />
              );
            })}
          </>)}
        </div>
        {wordTiles.length > 0 && <div style={{ marginTop:8, fontSize:11, color:P.textMuted, fontStyle:"italic" }}>{wordTiles.length} letter{wordTiles.length!==1?"s":""} placed</div>}
      </div>

      {/* Lexicoin keyboard picker */}
      {lexiconPickerOpen && (
        <LexiconKeyboard
          onSelect={(letter) => { assignLexiconLetter(pendingLexiconTileId, letter); setLexiconPickerOpen(false); setPendingLexiconTileId(null); }}
        />
      )}

      {/* Publish */}
      <div style={{ display:"flex", justifyContent:"center" }}>
        <button onClick={publishLexicon} disabled={lexicon.length===0} style={{ ...st.btn(lexicon.length>0), padding:"12px 28px", fontSize:14 }}>
          <Feather size={13} style={{marginRight:5, verticalAlign:"middle"}}/> Publish ({breakdown.total} quills)
        </button>
      </div>
    </div>
  );
}
