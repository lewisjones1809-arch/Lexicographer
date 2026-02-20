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
  ink:   "#6b8fa8",   // dusty slate-blue — ink / water / Ink stat
  quill: "#a07840",   // muted warm amber — quills / currency
  sage:  "#6b9070",   // muted sage green — success / managers
  rose:  "#b06060",   // soft muted rose — errors / warnings

  // Buttons
  btnActiveBg:     "#3d5a6e",
  btnActiveText:   "#f5f2ec",
  btnInactiveBg:   "#ede8e0",
  btnInactiveText: "#7a6e62",
};

// --- SHARED STYLE HELPERS ---
export const st = {
  panel:   { background:P.panelBg, border:`1px solid ${P.border}`, borderRadius:10, padding:20, marginBottom:16, boxShadow:"0 1px 4px rgba(44,36,32,0.06)" },
  heading: { fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:P.textPrimary, marginBottom:4 },
  sub:     { fontSize:12, color:P.textSecondary, fontFamily:"'Courier Prime',monospace", marginBottom:16 },
  btn: (active) => ({ padding:"10px 20px", background:active?P.btnActiveBg:P.btnInactiveBg, color:active?P.btnActiveText:P.btnInactiveText, border:"none", borderRadius:6, cursor:active?"pointer":"default", fontFamily:"'Playfair Display',serif", fontSize:13, fontWeight:700, letterSpacing:1, textTransform:"uppercase", boxShadow:active?"0 2px 8px rgba(61,90,110,0.18)":"none", transition:"all 0.2s" }),
};

// --- CSS ANIMATIONS ---
// Injected via a <style> tag in the root component
export const CSS_ANIMATIONS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Courier+Prime:wght@400;700&display=swap');
  @keyframes fadeMsg { 0%{opacity:0;transform:translateY(-4px)} 15%{opacity:1;transform:translateY(0)} 70%{opacity:1} 100%{opacity:0} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes publishPop { 0%{opacity:0;transform:scale(0.8)} 100%{opacity:1;transform:scale(1)} }
  @keyframes slideRow { 0%{opacity:0;transform:translateY(10px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes pressShake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-0.4deg)} 75%{transform:rotate(0.4deg)} }
  @keyframes tileEject { 0%{transform:translateY(0);opacity:1;} 75%{opacity:1;} 100%{transform:translateY(-72px);opacity:0;} }
  @keyframes tileAppear { from{transform:scale(0.5);opacity:0;} to{transform:scale(1);opacity:1;} }
  @keyframes wordFadeIn { 0%{opacity:0} 100%{opacity:1} }
  @keyframes phantomExpand { from{width:0;opacity:0} to{width:44px;opacity:1} }
  @keyframes critBubble { 0%{opacity:0;transform:translateX(-50%) translateY(0)} 15%{opacity:1;transform:translateX(-50%) translateY(-8px)} 70%{opacity:1;transform:translateX(-50%) translateY(-18px)} 100%{opacity:0;transform:translateX(-50%) translateY(-28px)} }
  @keyframes tutorialPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes monkeySuccess { 0%{opacity:0;transform:translate(0,0) scale(0.8)} 15%{opacity:1} 100%{opacity:0;transform:translate(70px,-20px) scale(1.05)} }
  @keyframes monkeyFail { 0%{opacity:0;transform:translateY(0)} 15%{opacity:0.8} 100%{opacity:0;transform:translateY(-36px)} }
  input::placeholder { color:#b0a494; font-style:italic; letter-spacing:1px; font-size:14px; }
  * { box-sizing: border-box; }
`;
