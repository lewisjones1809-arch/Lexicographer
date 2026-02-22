import { useState } from "react";
import { FeatherIcon as Feather } from "../assets/icons";
import { P, st } from "../styles.js";
import { COVERS, PAGE_STYLES } from "../constants.js";
import { scoreWord, fmt } from "../gameUtils.js";
import { BookView, MiniBookCover } from "./BookComponents.jsx";

function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) { while (n >= vals[i]) { r += syms[i]; n -= vals[i]; } }
  return r;
}

const SEAL_STYLES = {
  bronze:      { label: "Bronze",      color: P.textMuted },
  silver:      { label: "Silver",      color: P.textSecondary },
  illuminated: { label: "Illuminated", color: P.quill },
};

export function LibraryTab({ publishedLexicons, compendiumPublished = [], uiScale = 1 }) {
  const sc = n => Math.round(n * uiScale);
  const [openBook, setOpenBook] = useState(null);
  const [openCompendium, setOpenCompendium] = useState(null);

  // Lexicon detail view
  if (openBook) {
    const pub = openBook;
    const cover = COVERS.find(c => c.id === pub.coverId) || COVERS[0];
    const page = PAGE_STYLES.find(p => p.id === pub.pageId) || PAGE_STYLES[0];
    const entries = (pub.entries || pub.words?.map(w => ({ word: w, score: scoreWord(w) })) || []);
    return (
      <div className="lex-tab-panel" style={{ paddingTop:8 }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={st.heading}>Volume {toRoman(pub.index)}</div>
          <div style={{ ...st.sub, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            <span>{pub.date}</span><span>&middot;</span><span>{entries.length} words</span><span>&middot;</span>
            <Feather size={10}/><span>{fmt(pub.quillsEarned)} quills</span>
          </div>
        </div>
        <BookView entries={entries} cover={cover} pageStyle={page}
          onClose={() => setOpenBook(null)} volumeNumber={pub.index} />
      </div>
    );
  }

  // Compendium detail view
  if (openCompendium) {
    const comp = openCompendium;
    const sealCfg = SEAL_STYLES[comp.sealTier] || null;
    return (
      <div className="lex-tab-panel" style={{ paddingTop:8 }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={st.heading}>Compendium Vol. {toRoman(comp.index)}</div>
          <div style={{ ...st.sub, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            <span>{comp.date}</span>
            {comp.puzzleCount != null && (<><span>&middot;</span><span>{comp.puzzleCount} puzzles</span></>)}
            <span>&middot;</span>
            <Feather size={10}/><span>{fmt(comp.quillsEarned)} quills</span>
          </div>
        </div>

        {/* Seal */}
        {sealCfg && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{
              display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              width: sc(64), height: sc(64), borderRadius: "50%",
              border: `3px solid ${sealCfg.color}`, background: `${sealCfg.color}12`,
            }}>
              <span style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(10), color: sealCfg.color, letterSpacing: 0.5 }}>
                {sealCfg.label}
              </span>
              {comp.sealRatio != null && (
                <span style={{ fontFamily: "'Junicode',sans-serif", fontSize: sc(7), color: P.textMuted, marginTop: 2 }}>
                  {(comp.sealRatio * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Acceptance letter */}
        {comp.acceptanceLetter && (
          <div style={{
            ...st.panel,
            maxWidth: 360, margin: "0 auto 16px",
            fontFamily: "'Junicode',sans-serif", fontSize: sc(10), color: P.textSecondary,
            lineHeight: 1.7, whiteSpace: "pre-wrap", fontStyle: "italic",
          }}>
            {comp.acceptanceLetter}
          </div>
        )}

        {/* Words list */}
        {(comp.words || []).length > 0 && (
          <div style={{
            ...st.panel, maxWidth: 360, margin: "0 auto 16px",
            fontFamily: "'Junicode',sans-serif", fontSize: sc(10), color: P.textSecondary,
          }}>
            <div style={{ fontFamily: "'BLKCHCRY',serif", fontSize: sc(12), color: P.textPrimary, marginBottom: 8 }}>
              Words ({comp.words.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {comp.words.map(w => (
                <span key={w} style={{
                  padding: "2px 6px", background: P.surfaceBg,
                  border: `1px solid ${P.border}`, borderRadius: 3,
                  fontSize: sc(9), color: P.textSecondary,
                }}>{w.toLowerCase()}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setOpenCompendium(null)}
            style={{
              background: "none", border: `1px solid ${P.border}`,
              color: P.textSecondary, padding: "8px 20px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'BLKCHCRY',serif", fontSize: 12, letterSpacing: 1,
            }}
          >Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lex-tab-panel" style={{ paddingTop:8 }}>
      <div style={{ marginBottom:20 }}>
        <div style={st.heading}>My Library</div>
        <div style={st.sub}>{publishedLexicons.length} lexicon{publishedLexicons.length!==1?"s":""} published</div>
      </div>

      {publishedLexicons.length === 0 && compendiumPublished.length === 0 ? (
        <div style={{ ...st.panel, textAlign:"center", padding:40 }}>
          <div style={{ fontSize:14, color:P.textMuted, fontStyle:"italic" }}>No published lexicons yet.</div>
        </div>
      ) : (<>
        {publishedLexicons.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:sc(16), justifyContent:"center" }}>
            {publishedLexicons.map((pub, idx) => {
              const cover = COVERS.find(c => c.id === pub.coverId) || COVERS[0];
              const entries = (pub.entries || pub.words?.map(w => ({ word: w, score: scoreWord(w) })) || []);
              const volNum = publishedLexicons.length - idx;
              return <MiniBookCover key={pub.id} cover={cover} entries={entries} quills={pub.quillsEarned}
                date={pub.date} volumeNumber={volNum}
                onClick={() => setOpenBook({ ...pub, index: volNum })} />;
            })}
          </div>
        )}

        {compendiumPublished.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ ...st.sub, marginBottom: 8 }}>
              {compendiumPublished.length} compendium volume{compendiumPublished.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:sc(16), justifyContent:"center" }}>
              {compendiumPublished.map((comp, idx) => {
                const cover = COVERS.find(c => c.id === comp.coverId) || COVERS[0];
                const entries = (comp.words || []).map(w => ({ word: w, score: scoreWord(w) }));
                return <MiniBookCover key={comp.id} cover={cover} entries={entries} quills={comp.quillsEarned}
                  date={comp.date} volumeNumber={idx + 1} badge="Compendium"
                  sealTier={comp.sealTier}
                  onClick={() => setOpenCompendium({ ...comp, index: idx + 1 })} />;
              })}
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
