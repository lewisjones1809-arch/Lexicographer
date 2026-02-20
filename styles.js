// --- COLOUR PALETTE ---
// Warm, light, calm. All UI colours should derive from here.
export const P = {
  // Backgrounds
  appBg:       "#f0ece4",   // warm off-white page
  panelBg:     "#faf8f4",   // slightly lighter surface
  surfaceBg:   "#f5f2ec",   // tile / card surface

  // Text
  textPrimary:   "#2c2420", // near-black warm brown
  textSecondary: "#7a6e62", // mid-tone warm grey
  textMuted:     "#b0a494", // light muted warm grey

  // Borders
  border:      "#e0d8cc",   // soft warm divider
  borderLight: "#ede8e0",   // even softer

  // Semantic accent colours (all muted)
  ink:   "#1e3a52",   // dark navy ink — ink / water / Ink stat
  quill: "#a07840",   // muted warm amber — quills / currency
  sage:  "#6b9070",   // muted sage green — success / managers
  rose:  "#b06060",   // soft muted rose — errors / warnings

  // Buttons
  btnActiveBg:     "#162c3d",
  btnActiveText:   "#f5f2ec",
  btnInactiveBg:   "#ede8e0",
  btnInactiveText: "#7a6e62",
};

// --- SHARED STYLE HELPERS ---
export const st = {
  panel:   { background:P.panelBg, border:`1px solid ${P.border}`, borderRadius:10, padding:20, marginBottom:16, boxShadow:"0 1px 4px rgba(44,36,32,0.06)" },
  heading: { fontFamily:"'BLKCHCRY',serif", fontSize:18, fontWeight:700, letterSpacing:1, color:P.textPrimary, marginBottom:4 },
  sub:     { fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif", marginBottom:16 },
  btn: (active) => ({ padding:"10px 20px", background:active?P.btnActiveBg:P.btnInactiveBg, color:active?P.btnActiveText:P.btnInactiveText, border:"none", borderRadius:6, cursor:active?"pointer":"default", fontFamily:"'BLKCHCRY',serif", fontSize:13, fontWeight:700, letterSpacing:0.5, boxShadow:active?"0 2px 8px rgba(61,90,110,0.18)":"none", transition:"all 0.2s" }),
};

