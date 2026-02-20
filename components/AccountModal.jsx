import { FeatherIcon as Feather } from "../assets/icons";
import { X, Mail, BookOpen, Star } from "lucide-react";
import { P } from "../styles.js";
import { fmt } from "../gameUtils.js";

export function AccountModal({ currentUser, quills, goldenNotebooks, publishedLexicons, onClose }) {
  const totalWords = publishedLexicons.reduce((sum, lex) => sum + (lex.entries?.length ?? 0), 0);

  const row = (icon, label, value) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${P.borderLight}` }}>
      <div style={{ color:P.textMuted, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, fontSize:12, color:P.textSecondary, fontFamily:"'Courier Prime',monospace" }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:P.textPrimary, fontFamily:"'Playfair Display',serif" }}>{value}</div>
    </div>
  );

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:P.surfaceBg, border:`1px solid ${P.border}`,
        borderRadius:12, padding:28, width:320, maxWidth:"90vw",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Feather size={18} color={P.quill} />
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:P.textPrimary }}>
              Your Account
            </span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:P.textMuted, padding:4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Email */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:P.panelBg, borderRadius:6, marginBottom:16, border:`1px solid ${P.borderLight}` }}>
          <Mail size={13} color={P.textMuted} />
          <span style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Courier Prime',monospace" }}>{currentUser.email}</span>
        </div>

        {/* Stats */}
        <div style={{ marginBottom:4 }}>
          {row(<Feather size={13}/>,    "Quills",              fmt(quills))}
          {row(<Star size={13}/>,       "Golden notebooks",    fmt(goldenNotebooks))}
          {row(<BookOpen size={13}/>,   "Lexicons published",  publishedLexicons.length)}
          {row(<BookOpen size={13}/>,   "Total words written", totalWords)}
        </div>
      </div>
    </div>
  );
}
