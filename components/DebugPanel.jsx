import { useState } from "react";
import { INK_WELL_MAX } from "../constants.js";
import { randomLetter, fmt, nextTileId } from "../gameUtils.js";

export function DebugPanel({
  collectedInk, setCollectedInk,
  letters, setLetters,
  setLexicon, setQuills, setWells, setSpecialTiles, setGoldenNotebooks,
  puzzlesUnlocked, setPuzzlesUnlocked,
  puzzleHints, setPuzzleHints,
  showMsg,
  scalingA, setScalingA, scalingB, setScalingB,
  onClose
}) {
  const [dli, setDli] = useState("");
  const [dia, setDia] = useState("100");
  const [dqa, setDqa] = useState("50");

  const ds = {
    row:   { display:"flex", gap:6, alignItems:"center", marginBottom:8, flexWrap:"wrap" },
    input: { padding:"6px 10px", background:"#1a1a1a", color:"#0f0", border:"1px solid #333", borderRadius:4, fontFamily:"monospace", fontSize:12, outline:"none", width:80 },
    btn:   { padding:"6px 12px", background:"#222", color:"#0f0", border:"1px solid #444", borderRadius:4, cursor:"pointer", fontFamily:"monospace", fontSize:11 },
    label: { fontSize:11, color:"#888", fontFamily:"monospace", minWidth:70 }
  };

  return (
    <div style={{ background:"#0a0a0a", border:"1px solid #333", borderRadius:8, padding:14, marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:12, color:"#0f0", fontFamily:"monospace" }}>DEBUG TOOLS</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontFamily:"monospace", fontSize:14, lineHeight:1, padding:0 }}>✕</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>Ink:</span>
        <input value={dia} onChange={e=>setDia(e.target.value)} style={ds.input}/>
        <button style={ds.btn} onClick={()=>{setCollectedInk(p=>p+(parseInt(dia)||0));showMsg(`[DEBUG] +${dia} ink`);}}>+ Add</button>
        <button style={ds.btn} onClick={()=>{setCollectedInk(0);showMsg("[DEBUG] Ink zeroed");}}>Zero</button>
        <button style={ds.btn} onClick={()=>{setWells(p=>p.map(w=>({...w,ink:INK_WELL_MAX})));showMsg("[DEBUG] Wells filled");}}>Fill Wells</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>Letters:</span>
        <input value={dli} onChange={e=>setDli(e.target.value)} placeholder="ABC..." style={{...ds.input,width:100}}
          onKeyDown={e=>{if(e.key==="Enter"){const ch=dli.toUpperCase().replace(/[^A-Z]/g,"");if(ch){const nl={...letters};for(const c of ch)nl[c]=(nl[c]||0)+1;setLetters(nl);showMsg(`[DEBUG] +${ch}`);setDli("");}}}}/>
        <button style={ds.btn} onClick={()=>{const ch=dli.toUpperCase().replace(/[^A-Z]/g,"");if(ch){const nl={...letters};for(const c of ch)nl[c]=(nl[c]||0)+1;setLetters(nl);showMsg(`[DEBUG] +${ch}`);setDli("");}}}>+ Add</button>
        <button style={ds.btn} onClick={()=>{const nl={...letters};for(let i=0;i<10;i++){const l=randomLetter();nl[l]=(nl[l]||0)+1;}setLetters(nl);showMsg("[DEBUG] +10 rng");}}>+10 Rng</button>
        <button style={ds.btn} onClick={()=>{setLetters({});showMsg("[DEBUG] Cleared");}}>Clear</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>Quills:</span>
        <input value={dqa} onChange={e=>setDqa(e.target.value)} style={ds.input}/>
        <button style={ds.btn} onClick={()=>{setQuills(p=>p+(parseInt(dqa)||0));showMsg(`[DEBUG] +${dqa} quills`);}}>+ Add</button>
        <button style={ds.btn} onClick={()=>{setQuills(0);showMsg("[DEBUG] Zeroed");}}>Zero</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>Lexicon:</span>
        <button style={ds.btn} onClick={()=>{setLexicon([]);showMsg("[DEBUG] Cleared");}}>Clear</button>
        <button style={ds.btn} onClick={()=>{setLexicon(p=>[...p,...["THE","QUICK","BROWN","FOX","JUMPS","OVER","LAZY","DOG","HELLO","WORLD"].filter(w=>!p.some(e=>e.word===w)).map(w=>({word:w,score:0}))]);showMsg("[DEBUG] +samples");}}>+ Samples</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>Quick:</span>
        <button style={ds.btn} onClick={()=>{const nl={...letters};"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(c=>nl[c]=(nl[c]||0)+3);setLetters(nl);showMsg("[DEBUG] +3 each");}}>+3 Alpha</button>
        <button style={ds.btn} onClick={()=>{const nl={...letters};"AEIOU".split("").forEach(c=>nl[c]=(nl[c]||0)+5);setLetters(nl);showMsg("[DEBUG] +5 vowels");}}>+5 Vowels</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>Specials:</span>
        <button style={ds.btn} onClick={()=>{const l=randomLetter();setSpecialTiles(p=>[...p,{id:nextTileId(),letter:l,type:"double_letter"}]);showMsg(`[DEBUG] +DL ${l}`);}}>+DL</button>
        <button style={ds.btn} onClick={()=>{const l=randomLetter();setSpecialTiles(p=>[...p,{id:nextTileId(),letter:l,type:"triple_word"}]);showMsg(`[DEBUG] +TW ${l}`);}}>+TW</button>
        <button style={ds.btn} onClick={()=>{setSpecialTiles(p=>[...p,{id:nextTileId(),letter:null,type:"lexicoin"}]);showMsg("[DEBUG] +Wildcard");}}>+Wild</button>
        <button style={ds.btn} onClick={()=>{const l=randomLetter();setSpecialTiles(p=>[...p,{id:nextTileId(),letter:l,type:"golden"}]);showMsg(`[DEBUG] +★ ${l}`);}}>+Gold</button>
        <button style={ds.btn} onClick={()=>{setSpecialTiles([]);showMsg("[DEBUG] Specials cleared");}}>Clear</button>
      </div>

      <div style={ds.row}>
        <span style={ds.label}>📓 Golden:</span>
        <button style={ds.btn} onClick={()=>{setGoldenNotebooks(p=>p+1);showMsg("[DEBUG] +1 📓");}}>+1</button>
        <button style={ds.btn} onClick={()=>{setGoldenNotebooks(0);showMsg("[DEBUG] 📓 zeroed");}}>Zero</button>
      </div>

      {/* Scaling multipliers */}
      <div style={{ borderTop:"1px solid #333", marginTop:8, paddingTop:8 }}>
        <div style={{ fontSize:11, color:"#0f0", fontFamily:"monospace", marginBottom:8 }}>QUILL FORMULA SCALING</div>
        <div style={ds.row}>
          <span style={ds.label}>A (words):</span>
          <input value={scalingA} onChange={e => setScalingA(parseFloat(e.target.value) || 0)} type="number" step="0.5" style={{ ...ds.input, width:60 }}/>
          <span style={{ fontSize:10, color:"#666", fontFamily:"monospace" }}>wordCount × {scalingA}</span>
        </div>
        <div style={ds.row}>
          <span style={ds.label}>B (coins):</span>
          <input value={scalingB} onChange={e => setScalingB(parseFloat(e.target.value) || 0)} type="number" step="0.1" style={{ ...ds.input, width:60 }}/>
          <span style={{ fontSize:10, color:"#666", fontFamily:"monospace" }}>lexicoins × {scalingB}</span>
        </div>
        <div style={ds.row}>
          <button style={ds.btn} onClick={() => { setScalingA(2); setScalingB(0.5); showMsg("[DEBUG] Scaling reset to defaults"); }}>Reset Defaults</button>
          <span style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>formula: (A×words + B×lexicoins) × topMult × designMult</span>
        </div>
      </div>

      {/* Puzzles */}
      <div style={{ borderTop:"1px solid #333", marginTop:8, paddingTop:8 }}>
        <div style={ds.row}>
          <span style={ds.label}>Puzzles:</span>
          <button style={{ ...ds.btn, background: puzzlesUnlocked ? "#0a2a0a" : "#222", color: puzzlesUnlocked ? "#0f0" : "#888" }}
            onClick={() => { setPuzzlesUnlocked(p => !p); showMsg(`[DEBUG] Puzzles ${puzzlesUnlocked ? "locked" : "unlocked"}`); }}>
            {puzzlesUnlocked ? "Unlocked ✓" : "Locked ✕"}
          </button>
        </div>
        <div style={ds.row}>
          <span style={ds.label}>Hints:</span>
          {[["revealTile","Tile"],["revealWord","Word"],["letterConfirmation","Confirm"],["clueRewrite","Rewrite"]].map(([key,label])=>(
            <button key={key} style={ds.btn} onClick={()=>{setPuzzleHints(p=>({...p,[key]:(p[key]||0)+5}));showMsg(`[DEBUG] +5 ${label}`);}}>
              +5 {label} ({puzzleHints[key]||0})
            </button>
          ))}
        </div>
      </div>

      {/* Tutorial */}
      <div style={{ borderTop:"1px solid #333", marginTop:8, paddingTop:8 }}>
        <div style={ds.row}>
          <span style={ds.label}>Tutorial:</span>
          <button style={ds.btn} onClick={() => { localStorage.removeItem('lexTutorialDone'); window.location.reload(); }}>Replay Tutorial</button>
        </div>
      </div>
    </div>
  );
}
