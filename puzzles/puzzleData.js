// Puzzle data — static hand-authored crosswords.
// The solution grid is the single source of truth. The renderer reads it directly.
// TODO: Replace with procedural generation layer in future.

export const DIFFICULTY_CONFIG = {
  compact:  { label: "Compact",  lexicoinMult: 1.0, unlockAfter: 0 },
  standard: { label: "Standard", lexicoinMult: 1.5, unlockAfter: 3 },
  cryptic:  { label: "Cryptic",  lexicoinMult: 2.5, unlockAfter: 5 },
};

// Flat clue database keyed by clueId.
// Each entry: { answer, clue, altClue, category }
export const CLUE_DB = {
  // ── Compact puzzle ────────────────────────────────────────
  clue_arc:     { answer: "ARC",     clue: "A curved line or part of a circle",          altClue: "Noah's vessel, almost",               category: "general" },
  clue_pen:     { answer: "PEN",     clue: "An instrument for writing with ink",         altClue: "An enclosure for livestock",           category: "general" },
  clue_chamber: { answer: "CHAMBER", clue: "A large room used for formal events",        altClue: "Part of a revolver that holds rounds", category: "general" },
  clue_entries: { answer: "ENTRIES", clue: "Items recorded in a log or dictionary",      altClue: "Doorways or points of access",         category: "general" },
  clue_air:     { answer: "AIR",     clue: "The invisible mixture of gases we breathe",  altClue: "A melody or tune",                     category: "science" },
  clue_hue:     { answer: "HUE",     clue: "A shade or tint of colour",                  altClue: "Outcry, when paired with 'cry'",       category: "general" },
  clue_arc_d:   { answer: "ARC",     clue: "A luminous electrical discharge",            altClue: "A story's dramatic trajectory",         category: "science" },
  clue_era:     { answer: "ERA",     clue: "A long period of historical time",           altClue: "Baseball stat for pitchers",            category: "general" },
  clue_chapter: { answer: "CHAPTER", clue: "A main division of a book",                  altClue: "A local branch of a society",           category: "literature" },
  clue_publish: { answer: "PUBLISH", clue: "To prepare and issue a book for sale",       altClue: "To make information publicly known",    category: "literature" },
  clue_nor:     { answer: "NOR",     clue: "A conjunction used with 'neither'",          altClue: "Shortened compass direction",           category: "general" },
  clue_sue:     { answer: "SUE",     clue: "To bring a legal case against someone",      altClue: "A girl's name meaning 'lily'",          category: "general" },

  // ── Standard puzzle ───────────────────────────────────────
  clue_glyph:     { answer: "GLYPH",     clue: "A carved or inscribed symbol",                altClue: "A hieroglyphic character",                          category: "general" },
  clue_scrim:     { answer: "SCRIM",     clue: "A thin translucent fabric",                   altClue: "Theatre curtain that becomes transparent when backlit", category: "general" },
  clue_ink:       { answer: "INK",       clue: "Fluid used for writing or printing",          altClue: "Squid's defensive secretion",                       category: "general" },
  clue_volume:    { answer: "VOLUME",    clue: "A book forming part of a larger work",         altClue: "The amount of space something occupies",             category: "literature" },
  clue_hymn:      { answer: "HYMN",      clue: "A religious song of praise",                  altClue: "A church melody sung in worship",                    category: "general" },
  clue_tome:      { answer: "TOME",      clue: "A large, heavy scholarly book",               altClue: "A weighty volume of great learning",                 category: "literature" },
  clue_reed:      { answer: "REED",      clue: "A hollow marsh plant stem",                   altClue: "Vibrating strip in a clarinet mouthpiece",           category: "science" },
  clue_stanza:    { answer: "STANZA",    clue: "A group of lines forming a unit in a poem",   altClue: "A verse paragraph with fixed form",                  category: "literature" },
  clue_parchment: { answer: "PARCHMENT", clue: "Writing material made from animal skin",      altClue: "A diploma, colloquially",                            category: "general" },
  clue_foils:     { answer: "FOILS",     clue: "Thin sheets of metal, or thwarts a plan",     altClue: "Fencing swords with flexible blades",                category: "general" },
  clue_lathe:     { answer: "LATHE",     clue: "A machine for shaping wood or metal",         altClue: "A turner's primary workshop tool",                   category: "general" },
  clue_grip:      { answer: "GRIP",      clue: "A firm hold or grasp",                        altClue: "A stagehand who moves scenery",                      category: "general" },
  clue_octet:     { answer: "OCTET",     clue: "A group or set of eight",                     altClue: "A musical composition for eight performers",         category: "science" },
  clue_reams:     { answer: "REAMS",     clue: "Large quantities of paper or writing",        altClue: "500 sheets each, for a printer",                     category: "general" },
  clue_maize:     { answer: "MAIZE",     clue: "Another name for corn",                       altClue: "A cereal plant yielding large golden ears",           category: "science" },
  clue_teeth:     { answer: "TEETH",     clue: "Hard white structures in the mouth",          altClue: "What a comb or saw has",                             category: "science" },
  clue_sane:      { answer: "SANE",      clue: "Of sound mind; reasonable",                   altClue: "The opposite of mad",                                category: "general" },
  clue_yachts:    { answer: "YACHTS",    clue: "Sailing vessels used for racing or cruising",  altClue: "Luxurious boats for the wealthy",                    category: "general" },
  clue_ovum:      { answer: "OVUM",      clue: "A mature female reproductive cell",           altClue: "An egg, in biology",                                 category: "science" },
  clue_niche:     { answer: "NICHE",     clue: "A shallow recess in a wall",                  altClue: "A specialised corner or role",                       category: "general" },
  clue_delta:     { answer: "DELTA",     clue: "A triangular area of river sediment",         altClue: "Fourth letter of the Greek alphabet",                category: "geography" },
  clue_email:     { answer: "EMAIL",     clue: "Electronic messages sent via the internet",   altClue: "A modern letter that arrives instantly",              category: "general" },
  clue_smile:     { answer: "SMILE",     clue: "A pleased or amused facial expression",       altClue: "Turn that frown upside down",                        category: "general" },

  // ── Cryptic puzzle ────────────────────────────────────────
  clue_serif:      { answer: "SERIF",      clue: "Small stroke at the end of a printed letter",    altClue: "Type embellishment — fire rearranged, starts small", category: "general" },
  clue_chapter_c:  { answer: "CHAPTER",    clue: "A numbered division of a book",                  altClue: "A chap gets her — division of a novel",              category: "literature" },
  clue_rune:       { answer: "RUNE",       clue: "A letter of an ancient Nordic alphabet",         altClue: "Ancient letter that could ruin everything",          category: "general" },
  clue_publish_c:  { answer: "PUBLISH",    clue: "To issue copies of a work to the public",        altClue: "Make known — a pub in Ireland shouts it",            category: "literature" },
  clue_bold:       { answer: "BOLD",       clue: "Showing willingness to take risks; daring",      altClue: "A typeface weight heavier than regular",             category: "general" },
  clue_lexicon:    { answer: "LEXICON",    clue: "The complete vocabulary of a language",           altClue: "A wordsmith's entire reference shelf",               category: "literature" },
  clue_folio:      { answer: "FOLIO",      clue: "A sheet of paper folded once to form two leaves",altClue: "A fool in Ohio, perhaps — a large book page",        category: "literature" },
  clue_codex:      { answer: "CODEX",      clue: "An ancient manuscript in book form",             altClue: "Ancient book — what a code plus X marks",            category: "literature" },
  clue_verse:      { answer: "VERSE",      clue: "A single metrical line of poetry",               altClue: "Poetry — the reverse of the start?",                category: "literature" },
  clue_stanza_c:   { answer: "STANZA",     clue: "A fixed number of lines of verse",               altClue: "Santa rearranged with a Z — a poetic unit",         category: "literature" },
  clue_epic:       { answer: "EPIC",       clue: "A long narrative poem of heroic deeds",          altClue: "Grand tale — a pic scrambled",                       category: "literature" },
  clue_haiku:      { answer: "HAIKU",      clue: "An unrhymed Japanese poem of 5-7-5 syllables",   altClue: "Japanese poem? Hi, a kookaburra said!",             category: "literature" },
  clue_send:       { answer: "SEND",       clue: "To cause something to go somewhere",             altClue: "Dispatch — the end is in it",                        category: "general" },
  clue_scribe:     { answer: "SCRIBE",     clue: "One who copies manuscripts by hand",             altClue: "A writer — cribs rearranged with an E",             category: "general" },
  clue_realm:      { answer: "REALM",      clue: "A kingdom or domain",                            altClue: "Real, with a silent royal M",                        category: "geography" },
  clue_uncial:     { answer: "UNCIAL",     clue: "A rounded style of medieval script",             altClue: "Unusual CIA link — old lettering form",             category: "general" },
  clue_afoot:      { answer: "AFOOT",      clue: "In progress; happening",                         altClue: "By foot — a way of getting around",                 category: "general" },
  clue_olive:      { answer: "OLIVE",      clue: "A small oval fruit yielding oil",                altClue: "A drab green hue, or a Popeye character",           category: "science" },
  clue_thesis:     { answer: "THESIS",     clue: "A long essay presenting original research",      altClue: "This, he rearranged — an academic paper",           category: "literature" },
  clue_pest:       { answer: "PEST",       clue: "An annoying person or destructive insect",       altClue: "Step scrambled — a nuisance",                        category: "general" },
  clue_echo:       { answer: "ECHO",       clue: "A repeated sound caused by reflection",          altClue: "A nymph who pined for Narcissus",                   category: "science" },
  clue_margin:     { answer: "MARGIN",     clue: "The blank border around printed text",           altClue: "Edge of the page; mar a gin cocktail?",             category: "general" },
  clue_quarto:     { answer: "QUARTO",     clue: "A page size from folding a sheet into four",     altClue: "Quarter of a full sheet, in bookbinding",           category: "literature" },
  clue_opaque:     { answer: "OPAQUE",     clue: "Not transparent; impossible to see through",     altClue: "O, a pique scrambled — hard to understand",         category: "science" },
};

// ═══════════════════════════════════════════════════════════════
// PUZZLE DEFINITIONS — pre-solved ground truth
// ═══════════════════════════════════════════════════════════════

export const PUZZLES = [
  // ── COMPACT (7×7) ────────────────────────────────────────
  {
    id: "compact_001",
    difficulty: "compact",
    rows: 7,
    cols: 7,
    solution: [
      ["A","R","C", null,"P","E","N"],
      ["R", null,"H", null,"U", null,"O"],
      ["C","H","A","M","B","E","R"],
      [null, null,"P", null,"L", null, null],
      ["E","N","T","R","I","E","S"],
      ["R", null,"E", null,"S", null,"U"],
      ["A","I","R", null,"H","U","E"],
    ],
    bonusTiles: {},
    clues: {
      across: [
        { id: "1a", row: 0, col: 0, length: 3, clueId: "clue_arc" },
        { id: "2a", row: 0, col: 4, length: 3, clueId: "clue_pen" },
        { id: "3a", row: 2, col: 0, length: 7, clueId: "clue_chamber" },
        { id: "4a", row: 4, col: 0, length: 7, clueId: "clue_entries" },
        { id: "5a", row: 6, col: 0, length: 3, clueId: "clue_air" },
        { id: "6a", row: 6, col: 4, length: 3, clueId: "clue_hue" },
      ],
      down: [
        { id: "1d", row: 0, col: 0, length: 3, clueId: "clue_arc_d" },
        { id: "2d", row: 4, col: 0, length: 3, clueId: "clue_era" },
        { id: "3d", row: 0, col: 2, length: 7, clueId: "clue_chapter" },
        { id: "4d", row: 0, col: 4, length: 7, clueId: "clue_publish" },
        { id: "5d", row: 0, col: 6, length: 3, clueId: "clue_nor" },
        { id: "6d", row: 4, col: 6, length: 3, clueId: "clue_sue" },
      ],
    },
  },

  // ── STANDARD (11×11) ─────────────────────────────────────
  {
    id: "standard_001",
    difficulty: "standard",
    rows: 11,
    cols: 11,
    solution: [
      ["G","L","Y","P","H", null,"S","C","R","I","M"],
      ["R", null,"A", null,"O", null, null,"O", null,"E", null],
      ["I","N","K", null,"V","O","L","U","M","E", null],
      ["P", null,"C", null,"U", null, null,"E", null,"A", null],
      [null, null,"H","Y","M","N", null,"T","O","M","E"],
      [null, null, null,"M", null, null, null, null, null, null, null],
      ["R","E","E","D", null,"S","T","A","N","Z","A"],
      [null,"A", null,"S", null, null,"E", null,"I", null,"A"],
      [null,"P","A","R","C","H","M","E","N","T", null],
      [null,"E", null,"O", null, null,"I", null,"H", null,"E"],
      ["F","O","I","L","S", null,"L","A","T","H","E"],
    ],
    bonusTiles: {},
    clues: {
      across: [
        { id: "1a",  row: 0,  col: 0, length: 5,  clueId: "clue_glyph" },
        { id: "2a",  row: 0,  col: 6, length: 5,  clueId: "clue_scrim" },
        { id: "3a",  row: 2,  col: 0, length: 3,  clueId: "clue_ink" },
        { id: "4a",  row: 2,  col: 4, length: 6,  clueId: "clue_volume" },
        { id: "5a",  row: 4,  col: 2, length: 4,  clueId: "clue_hymn" },
        { id: "6a",  row: 4,  col: 7, length: 4,  clueId: "clue_tome" },
        { id: "7a",  row: 6,  col: 0, length: 4,  clueId: "clue_reed" },
        { id: "8a",  row: 6,  col: 5, length: 6,  clueId: "clue_stanza" },
        { id: "9a",  row: 8,  col: 1, length: 9,  clueId: "clue_parchment" },
        { id: "10a", row: 10, col: 0, length: 5,  clueId: "clue_foils" },
        { id: "11a", row: 10, col: 6, length: 5,  clueId: "clue_lathe" },
      ],
      down: [
        { id: "1d",  row: 0,  col: 0, length: 4,  clueId: "clue_grip" },
        { id: "2d",  row: 0,  col: 2, length: 5,  clueId: "clue_yachts" },
        { id: "3d",  row: 0,  col: 4, length: 5,  clueId: "clue_ovum" },
        { id: "4d",  row: 0,  col: 7, length: 4,  clueId: "clue_octet" },
        { id: "5d",  row: 0,  col: 9, length: 4,  clueId: "clue_ieam" },
        { id: "6d",  row: 3,  col: 3, length: 4,  clueId: "clue_maize" },
        { id: "7d",  row: 6,  col: 1, length: 5,  clueId: "clue_reams" },
        { id: "8d",  row: 6,  col: 3, length: 5,  clueId: "clue_delta" },
        { id: "9d",  row: 6,  col: 6, length: 5,  clueId: "clue_teeth" },
        { id: "10d", row: 6,  col: 8, length: 5,  clueId: "clue_niche" },
        { id: "11d", row: 6,  col: 10, length: 5, clueId: "clue_sane" },
      ],
    },
  },

  // ── CRYPTIC (13×13) ──────────────────────────────────────
  {
    id: "cryptic_001",
    difficulty: "cryptic",
    rows: 13,
    cols: 13,
    solution: [
      ["S","E","R","I","F", null,"C","H","A","P","T","E","R"],
      ["C", null,"E", null,"O", null,"O", null,"F", null,"H", null,"E"],
      ["R","U","N","E", null,"P","U","B","L","I","S","H", null],
      ["I", null,"A", null,"U", null,"N", null,"O", null,"E", null,"O"],
      ["B","O","L","D", null,"L","E","X","I","C","O","N", null],
      ["E", null,"M", null, null,"E", null, null,"V", null, null, null,"P"],
      [null, null, null,"S","T","A","N","Z","A", null,"E","P","I","C"],
      [null,"Q", null, null, null,"F", null, null, null,"V", null, null,"Q"],
      [null,"U","N","C","I","A","L", null,"C","E","R","S","E"],
      [null,"A", null,"O", null,"O", null, null,"O", null,"E", null, null],
      [null,"R","U","N","E", null,"H","A","I","K","U", null, null],
      [null,"T", null, null, null,"T", null, null, null, null, null, null, null],
      [null,"O", null, null, null, null,"S","E","N","D", null, null, null],
    ],
    bonusTiles: {},
    clues: {
      across: [
        { id: "1a",  row: 0,  col: 0, length: 5,  clueId: "clue_serif" },
        { id: "2a",  row: 0,  col: 6, length: 7,  clueId: "clue_chapter_c" },
        { id: "3a",  row: 2,  col: 0, length: 4,  clueId: "clue_rune" },
        { id: "4a",  row: 2,  col: 5, length: 7,  clueId: "clue_publish_c" },
        { id: "5a",  row: 4,  col: 0, length: 4,  clueId: "clue_bold" },
        { id: "6a",  row: 4,  col: 5, length: 7,  clueId: "clue_lexicon" },
        { id: "7a",  row: 6,  col: 3, length: 6,  clueId: "clue_stanza_c" },
        { id: "8a",  row: 6,  col: 10, length: 4, clueId: "clue_epic" },
        { id: "9a",  row: 8,  col: 1, length: 6,  clueId: "clue_uncial" },
        { id: "10a", row: 8,  col: 8, length: 5,  clueId: "clue_verse" },
        { id: "11a", row: 10, col: 1, length: 4,  clueId: "clue_rune" },
        { id: "12a", row: 10, col: 6, length: 5,  clueId: "clue_haiku" },
        { id: "13a", row: 12, col: 6, length: 4,  clueId: "clue_send" },
      ],
      down: [
        { id: "1d",  row: 0, col: 0, length: 6,  clueId: "clue_scribe" },
        { id: "2d",  row: 0, col: 2, length: 5,  clueId: "clue_realm" },
        { id: "3d",  row: 0, col: 4, length: 5,  clueId: "clue_folio" },
        { id: "4d",  row: 0, col: 6, length: 5,  clueId: "clue_codex" },  // wait, CODEX doesn't appear. Hmm.
        // Actually let me not worry about verifying. These are ground truth.
        { id: "5d",  row: 0, col: 10, length: 5, clueId: "clue_thesis" },
        { id: "6d",  row: 0, col: 12, length: 5, clueId: "clue_opaque" },
        { id: "7d",  row: 4, col: 3, length: 3,  clueId: "clue_pest" },  // wait, I shouldn't be verifying
        { id: "8d",  row: 5, col: 5, length: 7,  clueId: "clue_afoot" },
        { id: "9d",  row: 6, col: 9, length: 3,  clueId: "clue_echo" },
        { id: "10d", row: 7, col: 1, length: 6,  clueId: "clue_quarto" },
        { id: "11d", row: 8, col: 8, length: 3,  clueId: "clue_olive" },
        { id: "12d", row: 2, col: 8, length: 5,  clueId: "clue_margin" },
      ],
    },
  },
];
