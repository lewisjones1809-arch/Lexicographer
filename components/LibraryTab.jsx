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

export function LibraryTab({ publishedLexicons }) {
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
          <div style={st.heading}>Volume {toRoman(pub.index)}</div>
          <div style={{ ...st.sub, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            <span>{pub.date}</span><span>·</span><span>{entries.length} words</span><span>·</span>
            <Feather size={10}/><span>{fmt(pub.quillsEarned)} quills</span>
          </div>
        </div>
        <BookView entries={entries} cover={cover} pageStyle={page} currentPage={bookPage} setCurrentPage={setBookPage}
          onClose={() => { setOpenBook(null); setBookPage(0); }} volumeNumber={pub.index} />
      </div>
    );
  }

  return (
    <div style={{ paddingTop:8 }}>
      <div style={{ marginBottom:20 }}>
        <div style={st.heading}>My Library</div>
        <div style={st.sub}>{publishedLexicons.length} lexicon{publishedLexicons.length!==1?"s":""} published</div>
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
            const volNum = publishedLexicons.length - idx;
            return <MiniBookCover key={pub.id} cover={cover} entries={entries} quills={pub.quillsEarned}
              date={pub.date} volumeNumber={volNum}
              onClick={() => { setOpenBook({ ...pub, index: volNum }); setBookPage(0); }} />;
          })}
        </div>
      )}
    </div>
  );
}
