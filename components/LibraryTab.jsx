import { useState } from "react";
import { Feather } from "lucide-react";
import { P, st } from "../styles.js";
import { COVERS, PAGE_STYLES } from "../constants.js";
import { scoreWord, fmt } from "../gameUtils.js";
import { BookView, MiniBookCover } from "./BookComponents.jsx";

export function LibraryTab({ publishedLexicons, quills, goldenNotebooks }) {
  const [openBook, setOpenBook] = useState(null);
  const [bookPage, setBookPage] = useState(0);

  if (openBook) {
    const pub = openBook;
    const cover = COVERS.find(c => c.id === pub.coverId) || COVERS[0];
    const page = PAGE_STYLES.find(p => p.id === pub.pageId) || PAGE_STYLES[0];
    const entries = (pub.entries || pub.words?.map(w => ({ word: w, score: scoreWord(w) })) || []);
    return (
      <div style={{ paddingTop:8 }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={st.heading}>Lexicon #{pub.index}</div>
          <div style={st.sub}>{pub.date} · {entries.length} words · <Feather size={10} style={{verticalAlign:"middle"}}/>{fmt(pub.quillsEarned)} quills</div>
        </div>
        <BookView entries={entries} cover={cover} pageStyle={page} currentPage={bookPage} setCurrentPage={setBookPage}
          onClose={() => { setOpenBook(null); setBookPage(0); }} />
      </div>
    );
  }

  return (
    <div style={{ paddingTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
        <div>
          <div style={st.heading}>My Library</div>
          <div style={st.sub}>{publishedLexicons.length} lexicon{publishedLexicons.length!==1?"s":""} published</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:1, color:P.textMuted }}>Total Quills</div>
          <div style={{ fontSize:24, fontWeight:700, color:P.quill, fontFamily:"'Playfair Display',serif", display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}><Feather size={18}/> {fmt(quills)}</div>
          {goldenNotebooks > 0 && (
            <div style={{ fontSize:14, fontWeight:700, color:P.quill, fontFamily:"'Playfair Display',serif", marginTop:4 }}>{goldenNotebooks} notebook{goldenNotebooks !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>

      {publishedLexicons.length === 0 ? (
        <div style={{ ...st.panel, textAlign:"center", padding:40 }}>
          <div style={{ fontSize:14, color:P.textMuted, fontStyle:"italic" }}>No published lexicons yet.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexWrap:"wrap", gap:16, justifyContent:"center" }}>
          {publishedLexicons.map((pub, idx) => {
            const cover = COVERS.find(c => c.id === pub.coverId) || COVERS[0];
            const entries = (pub.entries || pub.words?.map(w => ({ word: w, score: scoreWord(w) })) || []);
            return <MiniBookCover key={pub.id} cover={cover} entries={entries} quills={pub.quillsEarned}
              date={pub.date} onClick={() => { setOpenBook({ ...pub, index: publishedLexicons.length - idx }); setBookPage(0); }} />;
          })}
        </div>
      )}
    </div>
  );
}
