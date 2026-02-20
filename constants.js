// --- GAME CONSTANTS ---
export const LETTER_FREQ = {E:12.7,T:9.1,A:8.2,O:7.5,I:7.0,N:6.7,S:6.3,H:6.1,R:6.0,D:4.3,L:4.0,C:2.8,U:2.8,M:2.4,W:2.4,F:2.2,G:2.0,Y:2.0,P:1.9,B:1.5,V:1.0,K:0.8,J:0.15,X:0.15,Q:0.10,Z:0.07};
export const TOTAL_FREQ = Object.values(LETTER_FREQ).reduce((a,b)=>a+b,0);
export const LETTER_SCORES = {E:1,T:1,A:1,O:1,I:1,N:1,S:1,H:1,R:1,D:2,L:2,C:3,U:3,M:3,W:3,F:4,G:4,Y:4,P:4,B:5,V:5,K:6,J:8,X:8,Q:10,Z:10};

export const INK_WELL_MAX   = 100;  // L=0 baseline — used in debug panel fill
export const LETTER_INTERVAL = 10;  // L=0 baseline — used for initial/reset state
export const MAX_LETTERS    = 50;
export const BASE_INK_COST  = 15;
export const INK_COST_SCALE = 9;
export const WORDS_PER_PAGE = 10;
export const MAX_WELLS      = 5;
export const MAX_PRESSES    = 5;

// Cost to buy the Nth well / press
export const WELL_COSTS    = [0, 250, 1200, 7500, 40000];
export const PRESS_COSTS   = [100, 2000, 12000, 60000, 300000];
// Cost to hire the Nth manager
export const WELL_MGR_COSTS  = [200, 1000, 5000, 25000, 125000];
export const PRESS_MGR_COSTS = [500, 8000, 50000, 250000, 1000000];

export const WELL_MANAGERS = [
  { name:"Inksworth",           title:"The Diligent Butler",    flavor:"Never spills a drop." },
  { name:"Blotilda",            title:"Ink Baroness",           flavor:"Collects with aristocratic grace." },
  { name:"Well-iam Shakespeare",title:"The Bard of Barrels",    flavor:"To collect, or not to collect? Always collect." },
  { name:"Inkognito",           title:"Shadowy Sipper",         flavor:"You never see him work, yet the wells are always empty." },
  { name:"Sir Drips-a-Lot",     title:"Knight of the Nib",      flavor:"His armour is permanently stained." },
];

export const PRESS_MANAGERS = [
  { name:"Gutenberg Jr.",   title:"Legacy Pressman",        flavor:"Printing is in his blood." },
  { name:"Alpha Betty",     title:"Letter Wrangler",        flavor:"She knows her ABCs backwards and forwards." },
  { name:"Serif Williams",  title:"The Font of Wisdom",     flavor:"Always makes his point." },
  { name:"Type O'Negative", title:"The Gloomy Typesetter",  flavor:"Every letter is pressed with feeling." },
  { name:"Comic Sansa",     title:"Queen of the North Press",flavor:"Winter is coming... with extra vowels." },
];

export const TILE_TYPES = {
  normal:        { label:"",   badge:"",    color:"#f5f2ec", border:"#d0c8bc", text:"#2c2420" },
  double_letter: { label:"DL", badge:"×2",  color:"#e8f2fa", border:"#4a7a9a", text:"#4a7a9a" },
  triple_letter: { label:"TL", badge:"×3",  color:"#f5e8e8", border:"#9a4040", text:"#9a4040" },
  double_word:   { label:"DW", badge:"W×2", color:"#f5edd8", border:"#a07830", text:"#a07830" },
  triple_word:   { label:"TW", badge:"W×3", color:"#ede8f5", border:"#6840a0", text:"#6840a0" },
  golden:        { label:"★",  badge:"★",   color:"#f5f0d8", border:"#a08820", text:"#a08820" },
  lexicoin:      { label:"LC", badge:null,  color:"#f0ece4", border:"#8a6030", text:"#8a6030" },
};

export const COVERS = [
  { id:"classic",   name:"Classic Leather",  color:"#5c3a1e", accent:"#c8a96e", pattern:"none",       mult:1.0,  cost:0,  currency:"free"      },
  { id:"midnight",  name:"Midnight Blue",    color:"#1a2744", accent:"#7090c0", pattern:"none",       mult:1.05, cost:1,  currency:"notebooks" },
  { id:"forest",    name:"Forest Green",     color:"#1e3a2a", accent:"#6a9960", pattern:"none",       mult:1.05, cost:1,  currency:"notebooks" },
  { id:"royal",     name:"Royal Crimson",    color:"#4a1a1a", accent:"#d4726a", pattern:"none",       mult:1.1,  cost:3,  currency:"notebooks" },
  { id:"gilded",    name:"Gilded Edition",   color:"#2a2010", accent:"#d4a050", pattern:"gold-border",mult:1.15, cost:5,  currency:"notebooks" },
  { id:"arcane",    name:"Arcane Tome",      color:"#1a102a", accent:"#9070c0", pattern:"sigils",     mult:1.2,  cost:10, currency:"notebooks" },
  { id:"celestial", name:"Celestial Atlas",  color:"#0a0a1e", accent:"#c0c8e8", pattern:"stars",      mult:1.25, cost:25, currency:"notebooks" },
  { id:"obsidian",  name:"Obsidian Codex",   color:"#0a0806", accent:"#d4a860", pattern:"none",       mult:1.3,  cost:0,  currency:"iap",    premiumOnly:true  },
];

export const PAGE_STYLES = [
  { id:"parchment",   name:"Parchment",    bg:"#f5ecd7", text:"#2a1f14", accent:"#8b7355", mult:1.0,  cost:0,  currency:"free"      },
  { id:"cream",       name:"Cream Linen",  bg:"#faf6ee", text:"#3a3020", accent:"#b0a080", mult:1.02, cost:1,  currency:"notebooks" },
  { id:"aged",        name:"Aged Vellum",  bg:"#e8d8b8", text:"#3a2a1a", accent:"#9a7a50", mult:1.05, cost:2,  currency:"notebooks" },
  { id:"dark",        name:"Dark Scholar", bg:"#1e1a16", text:"#c8b898", accent:"#8b7355", mult:1.08, cost:3,  currency:"notebooks" },
  { id:"blue",        name:"Blueprint",    bg:"#0e1a2e", text:"#8ab4e0", accent:"#4a7ab0", mult:1.1,  cost:5,  currency:"notebooks" },
  { id:"rose",        name:"Rose Quartz",  bg:"#2a1a1e", text:"#e0b0b8", accent:"#c07880", mult:1.12, cost:8,  currency:"notebooks" },
  { id:"gilded_folio",name:"Gilded Folio", bg:"#0e0c08", text:"#d4c08a", accent:"#d4a860", mult:1.15, cost:0,  currency:"iap",   premiumOnly:true  },
];

export const TABS = [
  { id:"lexicon",   label:"Lexicon"    },
  { id:"inkwell",   label:"Ink Well"   },
  { id:"press",     label:"Press"      },
  { id:"shop",      label:"Shop"       },
  { id:"published", label:"My Library" },
];

// --- UPGRADE NAME LISTS ---
export const WELL_UPGRADE_NAMES  = ["Well Speed","Well Capacity","Crit Chance","Crit Multiplier"];
export const MGR_UPGRADE_NAMES   = ["Manager Speed"];
export const PRESS_UPGRADE_NAMES = ["Press Speed","Press Yield","Double Letter %","Triple Letter %","Double Word %","Triple Word %","Wildcard %","Golden Tile %"];

export const UPGRADE_SHORT_NAMES = {
  "Well Speed":      "Speed",
  "Well Capacity":   "Capacity",
  "Crit Chance":     "Crit Chance",
  "Crit Multiplier": "Crit Multiplier",
  "Manager Speed":   "Speed",
  "Press Speed":     "Speed",
  "Press Yield":     "Yield",
  "Double Letter %": "Double Letter",
  "Triple Letter %": "Triple Letter",
  "Double Word %":   "Double Word",
  "Triple Word %":   "Triple Word",
  "Wildcard %":      "Wildcard",
  "Golden Tile %":   "Golden Tile",
};

// --- IN-APP PURCHASE PRODUCTS ---
// stripePriceId is filled in after creating products in the Stripe dashboard
export const IAP_PRODUCTS = [
  { id:"quill_100",         name:"Feather Pouch",         desc:"100 quills",                 price:"£0.99",  emoji:"🪶", stripePriceId:"" },
  { id:"quill_500",         name:"Quill Bundle",           desc:"500 quills",                        price:"£3.99",  emoji:"📦", stripePriceId:"" },
  { id:"quill_2000",        name:"Grand Compendium",       desc:"2,000 quills",                       price:"£12.99", emoji:"📚", stripePriceId:"" },
  { id:"ink_boost",         name:"Ink Surge",              desc:"Instantly fills all your ink wells to maximum",   price:"£0.99",  emoji:"💧", stripePriceId:"" },
  { id:"letter_pack",       name:"Letter Loot",            desc:"10 random rare special tiles added to inventory", price:"£1.99",  emoji:"🎲", stripePriceId:"" },
  { id:"premium_cosmetics", name:"Illuminated Manuscript", desc:"Unlock Obsidian Codex cover (×1.30) and Gilded Folio pages (×1.15)", price:"£2.99", emoji:"✨", stripePriceId:"" },
];
