import { P, st } from "../styles.js";

export const TUTORIAL_TAB_HINTS = {
  2: "inkwell",
  3: "inkwell",
  4: "lexicon",
  5: "lexicon",
  6: "press",
  7: "lexicon",
};

export const TUTORIAL_STEPS = [
  null, // 0 = welcome modal
  {
    title: "Your First Word",
    body: "Your word board is where you build your lexicon. You have 15 ink and a set of letters. Spell out STORE — click S, T, O, R, E from your letter tray — then click Inscribe.",
    tabHint: null, showNext: false,
  },
  {
    title: "Your Ink Supply",
    body: "Ink wells fill passively over time. Your first well is on the house — it costs nothing. Head over and claim it.",
    tabHint: "inkwell", tabLabel: "Go to Ink Wells", showNext: false,
  },
  {
    title: "Waiting for Ink",
    body: "Your well fills at 2 ink/second and holds up to 100 ink. You'll need 57 ink to write your next two words. When your well has enough, click it to collect.",
    tabHint: null, showNext: false,
  },
  {
    title: "Double Letter Tile",
    body: "Head back to the Lexicon tab and spell ALLOW. Notice the ×2 tile in your tray — that's a Double Letter tile. When placed on the board, it doubles that letter's score.",
    tabHint: "lexicon", tabLabel: "Go to Lexicon", showNext: false,
  },
  {
    title: "Lexicoin Wildcard",
    body: "Now spell MULCH. You don't have a U — but you have a Lexicoin wildcard. Click it on the board, pick U, and it stands in for the missing letter. It scores 0 but lets you inscribe words you otherwise couldn't.",
    tabHint: null, showNext: false,
  },
  {
    title: "The Letter Press",
    body: "You're out of letters! The Letter Press produces new ones on a timed cycle. Buy presses with ink, upgrade their speed and yield, and hire managers to run them automatically.",
    tabHint: "press", tabLabel: "Go to Press", showNext: true,
  },
  {
    title: "Publishing",
    body: "Publishing converts your lexicon into Quills — your permanent currency. But publishing resets the round: ink, letters, wells, and presses all start fresh. The projected Quill reward is shown at the top of the Lexicon tab. Only publish when you're satisfied.",
    tabHint: "lexicon", tabLabel: "Go to Lexicon", showNext: false, isComplete: true,
  },
];

export function TutorialWelcomeModal({ onStart, onSkip }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(44,36,32,0.72)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16,
    }}>
      <div style={{
        background:P.panelBg, border:`1px solid ${P.border}`,
        borderRadius:12, padding:"32px 28px", maxWidth:400, width:"100%",
        boxShadow:"0 8px 40px rgba(44,36,32,0.32)", textAlign:"center",
      }}>
        <div style={{ fontFamily:"'BLKCHCRY',serif", fontSize:22, fontWeight:700, letterSpacing:1, color:P.textPrimary, marginBottom:10 }}>
          Lexicographer
        </div>
        <div style={{ width:60, height:1, background:P.border, margin:"0 auto 18px" }}/>
        <p style={{ fontFamily:"'Junicode',sans-serif", fontSize:13, color:P.textSecondary, lineHeight:1.75, margin:"0 0 10px" }}>
          You are a wordsmith. Each round, you collect ink, press letters into being, and inscribe words into your lexicon.
        </p>
        <p style={{ fontFamily:"'Junicode',sans-serif", fontSize:13, color:P.textSecondary, lineHeight:1.75, margin:"0 0 24px" }}>
          When you're satisfied, you publish — converting your words into Quills, the currency of literary legacy.
        </p>
        <p style={{ fontFamily:"'Junicode',sans-serif", fontSize:11, color:P.textMuted, marginBottom:24 }}>
          A short guide will walk you through the basics.
        </p>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <button onClick={onStart} style={{ ...st.btn(true), padding:"10px 28px", fontSize:13 }}>
            Begin the Guide
          </button>
          <button onClick={onSkip} style={{
            background:"none", border:"none", color:P.textMuted,
            fontFamily:"'Junicode',sans-serif", fontSize:11,
            cursor:"pointer", textDecoration:"underline",
          }}>
            Skip Tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

export function TutorialCard({ step, onNext, onSkip, setActiveTab }) {
  const data = TUTORIAL_STEPS[step];
  if (!data) return null;
  return (
    <div style={{ position:"fixed", bottom:24, right:16, zIndex:150, maxWidth:300, width:"calc(100% - 32px)" }}>
      <div style={{
        background:P.panelBg, border:`1px solid ${P.border}`,
        borderRadius:10, padding:16,
        boxShadow:"0 4px 20px rgba(44,36,32,0.18)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div style={{ fontFamily:"'BLKCHCRY',serif", fontSize:13, fontWeight:700, color:P.textPrimary, letterSpacing:0.5, lineHeight:1.3 }}>
            {data.title}
          </div>
          <button onClick={onSkip} style={{
            background:"none", border:"none", color:P.textMuted,
            fontFamily:"'Junicode',sans-serif", fontSize:10,
            cursor:"pointer", padding:"0 0 0 8px", flexShrink:0,
          }}>Skip</button>
        </div>

        <div style={{ fontFamily:"'Junicode',sans-serif", fontSize:12, color:P.textSecondary, lineHeight:1.65, marginBottom:14 }}>
          {data.body}
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {data.tabHint && (
            <button onClick={() => setActiveTab(data.tabHint)} style={{ ...st.btn(true), padding:"6px 12px", fontSize:11 }}>
              {data.tabLabel} →
            </button>
          )}
          {data.showNext && (
            <button onClick={onNext} style={{ ...st.btn(true), padding:"6px 12px", fontSize:11 }}>
              Next →
            </button>
          )}
          {data.isComplete && (
            <button onClick={onNext} style={{ ...st.btn(true), padding:"6px 14px", fontSize:11 }}>
              Got It — Start Playing
            </button>
          )}
        </div>

        {/* Step dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:12 }}>
          {[1,2,3,4,5,6,7].map(s => (
            <div key={s} style={{
              width:6, height:6, borderRadius:"50%",
              background: s <= step ? P.ink : P.borderLight,
              border: s <= step ? "none" : `1px solid ${P.border}`,
              transition:"background 0.3s",
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}
