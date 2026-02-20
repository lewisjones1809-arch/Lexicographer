import { X, BarChart2, Droplet, Feather, BookOpen, Trophy, Star, CaseSensitive } from "lucide-react";
import { P } from "../styles.js";
import { fmt } from "../gameUtils.js";

export function StatsModal({ onClose, publishedLexicons, achievementProgress, achievementLevels }) {
  const wordsPublished = publishedLexicons.reduce((s, p) => s + p.entries.length, 0);
  const inkCollected   = achievementProgress.ink_collected ?? 0;
  const quillsEarned   = publishedLexicons.reduce((s, p) => s + (p.quillsEarned ?? 0), 0);
  const achClaimed     = Object.values(achievementLevels).reduce((s, v) => s + v, 0);

  let bestWord = null, longestWord = null;
  for (const lex of publishedLexicons) {
    for (const entry of lex.entries) {
      if (!bestWord || entry.score > bestWord.score) bestWord = entry;
      if (!longestWord || entry.word.length > longestWord.length) longestWord = entry.word;
    }
  }

  const row = (icon, label, value) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${P.borderLight}` }}>
      <div style={{ color:P.textMuted, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, fontSize:12, color:P.textSecondary, fontFamily:"'Courier Prime',monospace" }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:P.textPrimary, fontFamily:"'Playfair Display',serif" }}>{value}</div>
    </div>
  );

  return (
    <div
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:P.surfaceBg, border:`1px solid ${P.border}`,
        borderRadius:12, padding:28, width:340, maxWidth:"90vw",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <BarChart2 size={18} color={P.quill} />
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:P.textPrimary }}>
              Your Stats
            </span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, padding:4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Stat rows */}
        <div>
          {row(<BookOpen size={13}/>,       "Lexicons published",       publishedLexicons.length)}
          {row(<BookOpen size={13}/>,       "Words published",           fmt(wordsPublished))}
          {row(<Droplet size={13}/>,        "Ink collected (all time)",  fmt(inkCollected))}
          {row(<Feather size={13}/>,        "Quills earned (all time)",  fmt(quillsEarned))}
          {row(<Trophy size={13}/>,         "Achievements claimed",      achClaimed)}
          {row(<Star size={13}/>,           "Best word score",           bestWord ? `${bestWord.word} (${fmt(bestWord.score)}q)` : "—")}
          {row(<CaseSensitive size={13}/>,  "Longest word",              longestWord ?? "—")}
        </div>
      </div>
    </div>
  );
}
