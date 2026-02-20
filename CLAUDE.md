# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (client only, port 5173)
npm run dev:server   # Start Express backend (port 3001, requires Node ≥22)
npm run dev:all      # Start both client and server concurrently
npm run build        # Build for production
npm run preview      # Preview production build
```

No test suite. No linter configured. Verify changes by running `npm run dev` and testing in browser.

Backend requires a `.env` file (see Backend section below). Vite proxies `/api` to `localhost:3001`.

## Architecture

React app built with Vite, split across several modules after refactoring from a single file. Entry point is [main.jsx](main.jsx).

**Module layout:**

| File | Contents |
|---|---|
| [lexicographer.jsx](lexicographer.jsx) | Root component: all state, effects, handlers, JSX shell |
| [constants.js](constants.js) | All game constants: `LETTER_FREQ`, costs, managers, `TILE_TYPES`, `COVERS`, `PAGE_STYLES`, `TABS` |
| [styles.js](styles.js) | `P` (colour palette), `st` (style helpers), `CSS_ANIMATIONS` (keyframe string) |
| [gameUtils.js](gameUtils.js) | Pure game logic: `randomLetter`, `fmt`, `scoreWord`, `assignTilesFromBoard`, `scoreWordWithTiles`, `calculateQuillsBreakdown`, `canSupplyLetter`, `nextTileId`, `rollCrit`, `rollTileType`, `computeEffectiveTileProbs`, `generateNonWord` |
| [upgradeUtils.js](upgradeUtils.js) | `mkWellUpg`, `mkMgrUpg`, `mkPressUpg`, `calcBulkBuy`, `calcQtyBuy`, `fmtUpgradeVal`, `cycleQty` |
| [upgrades.js](upgrades.js) | `UPGRADES_BY_NAME` (keyed by name), `BASE_TILE_PROBS` — per-device upgrade definitions, formulas, cost curves, max levels |
| [permanentUpgrades.js](permanentUpgrades.js) | `PERM_UPGRADES` array — quill-purchased upgrades that persist across publish rounds |
| [achievements.js](achievements.js) | `ACHIEVEMENTS` array — tiered achievement definitions with threshold/reward per level |
| [missions.js](missions.js) | `MISSION_POOL`, `generateMissions()` — daily mission definitions and selector |
| [wordList.js](wordList.js) | `WORD_LIST` Set — English word dictionary for validation |
| [components/](components/) | Tab and UI components (see below) |

**Components:**

| File | Exports |
|---|---|
| [components/LexiconTab.jsx](components/LexiconTab.jsx) | `LexiconTab` |
| [components/InkWellTab.jsx](components/InkWellTab.jsx) | `InkWellTab` |
| [components/LetterPressTab.jsx](components/LetterPressTab.jsx) | `LetterPressTab` |
| [components/ShopTab.jsx](components/ShopTab.jsx) | `ShopTab` |
| [components/LibraryTab.jsx](components/LibraryTab.jsx) | `LibraryTab` |
| [components/DebugPanel.jsx](components/DebugPanel.jsx) | `DebugPanel` |
| [components/WordBoard.jsx](components/WordBoard.jsx) | `LetterTile`, `LexiconKeyboard`, `WordBoard` |
| [components/DeviceCards.jsx](components/DeviceCards.jsx) | `QtySelector`, `InfoRow`, `WellMiniCard`, `PressMiniCard`, `DeviceUpgradeCard` |
| [components/BookComponents.jsx](components/BookComponents.jsx) | `BookView`, `MiniBookCover` |
| [components/GameCanvas.jsx](components/GameCanvas.jsx) | `GameCanvas` — PixiJS overlay (`forwardRef`), exposes `playCritBubble(x, y, text)` imperative handle |
| [components/MissionsPanel.jsx](components/MissionsPanel.jsx) | `MissionsTrigger`, `MissionsPanel` |
| [components/AchievementsPanel.jsx](components/AchievementsPanel.jsx) | `AchievementsTrigger`, `AchievementsPanel` |
| [components/AuthModal.jsx](components/AuthModal.jsx) | `AuthModal` — login / register / forgot-password / reset-password flow |
| [components/AccountModal.jsx](components/AccountModal.jsx) | `AccountModal` — logged-in user info and account actions |
| [components/StatsModal.jsx](components/StatsModal.jsx) | `StatsModal` — lifetime game statistics |
| [components/OfflineRewardModal.jsx](components/OfflineRewardModal.jsx) | `OfflineRewardModal` — shows ink/letters earned while the tab was closed |
| [components/Tutorial.jsx](components/Tutorial.jsx) | `TUTORIAL_STEPS`, `TUTORIAL_TAB_HINTS`, `TutorialWelcomeModal`, `TutorialCard` |

**Persistence:** Tutorial completion: `localStorage` (`lexTutorialDone`). Daily missions: `localStorage` (`lexDailyMissions`). Achievement levels: `localStorage` (`lexAchievements`). For logged-in users, game state is also synced to the backend via `/api/user`. Unauthenticated play is fully in-memory — refreshing the page resets the game.

### Backend

Node ≥22 is required (uses `--experimental-sqlite` for the built-in SQLite module — no external DB driver).

```
server/
  index.js        — Express entry point (port 3001); rate limiting, CORS, static serving
  db.js           — SQLite helpers (users, save states)
  middleware.js   — JWT auth middleware
  routes/
    auth.js       — POST /api/auth/register, /login, /logout, /forgot-password, /reset-password
    user.js       — GET/POST /api/user/save — load and persist game state per user
    payments.js   — Stripe checkout session + webhook
```

**Required `.env` variables:** `JWT_SECRET`, `DATABASE_URL` (path to `.db` file), `CLIENT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` (or `SMTP_*` vars for Nodemailer), `PORT` (optional, defaults to 3001).

### Game Loop

1. **Ink Wells** — fill passively via a 100ms `setInterval` tick. Player collects manually or hires well managers for auto-collection when full. Crit chance applies on collection.
2. **Letter Presses** — player starts 10-second production cycles to generate letters. Rare special tiles (DL, TL, DW, TW, ★, `◈` Lexicoin wildcard) can be produced. Press managers auto-start idle presses.
3. **Word Creation** — player drags/clicks letters onto a word board, spends ink to inscribe valid English words into the lexicon. Cost: `BASE_INK_COST + lexicon.length × INK_COST_SCALE`.
4. **Publishing** — converts the current lexicon into quills via `calculateQuillsBreakdown()`. Clears reset-on-publish state for a new round.
5. **Monkeys** — each monkey fires on a countdown timer (base 300s, reduced by Monkey Efficiency upgrade). On fire: rolls against find chance (base 10%, increased by Monkey Intuition upgrade). Success adds a random word from past published lexicons to the current lexicon; failure shows a fake word animation.
6. **Daily Missions** — 3 missions generated per UTC day, stored in `localStorage`. Progress tracked in root state and fed to `MissionsPanel`. Rewards are quills on claim.
7. **Achievements** — tiered milestones tracked in root state (`achievementProgress` counters, `achievementLevels` claimed tiers). Displayed and claimed via `AchievementsPanel`.
8. **Offline Progress** — on load, computes time elapsed since last close and simulates well filling + press completions. `OfflineRewardModal` shows the result.

### Two Upgrade Systems

**Per-device upgrades** (ink cost, reset on publish):
- Defined in [upgrades.js](upgrades.js) as `UPGRADES_BY_NAME` — shape: `{ category, name, maxLevel, valueFormula, costFormula, maxValue }`
- State stored per-device: `wellUpgradeLevels[idx]`, `mgrUpgradeLevels[idx]`, `pressUpgradeLevels[idx]`
- Initialised with `mkWellUpg()` / `mkMgrUpg()` / `mkPressUpg()` (from [upgradeUtils.js](upgradeUtils.js))
- Purchased via `buyDeviceUpgrade(deviceType, deviceIdx, upgrade, count, totalCost)`

**Permanent upgrades** (quill cost, persist across publish):
- Defined in [permanentUpgrades.js](permanentUpgrades.js) as `PERM_UPGRADES` array — two shapes:
  - `levels`-array: `{ id, name, maxLevel, levels: [{ cost, boxLabel?, unlocksQty?, label }] }` — each level has its own cost/description (e.g. Monkey with a Typewriter, Bulk Buying). Always purchased one level at a time.
  - formula: `{ id, name, maxLevel, costFormula, boxLabel, nextLabel, maxedLabel }` — supports bulk buying via `calcBulkBuy`/`calcQtyBuy`
  - Optional lock gate: `lockedIf: ({ permUpgradeLevels }) => bool` + `lockedLabel: string` — ShopTab renders these as grayed-out with a 🔒 icon until the condition is false
- State: `permUpgradeLevels` — flat object `{ upgradeId: currentLevel }`
- Purchased via `buyPermUpgrade(upgradeId, count = 1, totalCost = null)`

### Critical Prop-Threading Rule

Tab components live in separate files and have **zero access** to root state unless explicitly passed as props. Forgetting to thread a prop causes `ReferenceError` crashes on render.

Special cases passed as props from root:
- `wordString` — computed via `useMemo` in root, passed to `LexiconTab`
- `unlockedQtys` — derived from `permUpgradeLevels["bulk_buying"]`, passed to `InkWellTab`, `LetterPressTab`, and `ShopTab`
- `CSS_ANIMATIONS` — injected as `<style>{CSS_ANIMATIONS}</style>` in root JSX (imported from [styles.js](styles.js))

### State Structure (`Lexicographer` component)

**Persistent across publish rounds:** `quills`, `goldenNotebooks`, `publishedLexicons`, `ownedCovers`, `ownedPages`, `activeCoverId`, `activePageId`, `permUpgradeLevels`, `monkeyTimers`, `monkeyAnims`, `achievementProgress`, `achievementLevels`, `missions`, `currentUser`

**Reset on publish:** `collectedInk`, `letters`, `wordTiles`, `lexicon`, `wellCount`, `wells`, `wellMgrCount`, `wellMgrEnabled`, `pressCount`, `presses`, `pressMgrCount`, `specialTiles`, `wellUpgradeLevels`, `mgrUpgradeLevels`, `pressUpgradeLevels`

### Tick Loops

Three `setInterval` loops in [lexicographer.jsx](lexicographer.jsx):
- **Well tick** (100ms): fills ink, triggers manager auto-collection, fires crit popups.
- **Press tick** (200ms): counts down press timers, yields letters/special tiles on completion, triggers press manager auto-restart.
- **Monkey tick** (1000ms): decrements each monkey's countdown timer by 1. A separate `useEffect` on `monkeyTimers` detects transitions to `0` and calls `procMonkeyRef.current(i)`, then resets the timer to `monkeySearchTimeRef.current`.

The monkey proc function is assigned to `procMonkeyRef.current` on every render (not inside a `useEffect`) so it always closes over the latest state without stale-closure issues. `monkeySearchTimeRef` follows the same pattern — assigned each render from `permUpgradeLevels`.

### Animations

Framer Motion (`framer-motion`) is installed and used in components via `motion.*` and `AnimatePresence`. PixiJS v8 (`pixi.js`) is used for the crit bubble overlay:
- `gameCanvasRef = useRef(null)` in root; `<GameCanvas ref={gameCanvasRef} />` rendered as a fixed overlay (`pointerEvents: none`, `zIndex: 999`)
- `wellRefsArr = useRef([])` in root, threaded to `InkWellTab` → `WellMiniCard` as `wellRef` callback prop, used to get DOM coordinates for crit bubbles
- Crit fires via `gameCanvasRef.current?.playCritBubble(x, y, text)` in `collectWell`

### Number Formatting

`fmt(n)` (in [gameUtils.js](gameUtils.js)) formats any count-like number: integers below 1000 with no decimal places; ≥1000 with 2 decimal places + suffix (K / M / B / T / q / Q / s / S / O / N).

**Use `fmt()`** for: ink amounts, quills, costs, well ink/capacity, fill rates (with `/s` appended manually), published quill totals.

**Do NOT use `fmt()`** for: percentages (`(v*100).toFixed(1)+"%"`), multipliers (`v.toFixed(2)+"×"`), timer countdowns (`v.toFixed(1)+"s"`), upgrade value display (`fmtUpgradeVal` from [upgradeUtils.js](upgradeUtils.js)), bounded small integers like `wellCount/MAX_WELLS` or page numbers.

### Styling

All inline styles. Colors defined in the `P` object in [styles.js](styles.js). Shared style helpers in `st` object (same file). Fonts: Playfair Display (headings/labels), Courier Prime (stats/numbers). CSS `@keyframes` animations are the `CSS_ANIMATIONS` string exported from [styles.js](styles.js) and injected via `<style>` in root JSX.

### Key Constants (actual values)

| Constant | Value | Meaning |
|---|---|---|
| `MAX_LETTERS` | 50 | Max letter inventory (normal + special tiles combined) |
| `MAX_WELLS` / `MAX_PRESSES` | 5 | Upgrade cap |
| `BASE_INK_COST` | 15 | Base ink to inscribe a word |
| `INK_COST_SCALE` | 9 | Ink cost increase per word in lexicon |
| `LETTER_INTERVAL` | 10 | Seconds per press cycle (L=0 baseline) |
| `INK_WELL_MAX` | 100 | Max ink per well (L=0 baseline) |
| `scalingA` | 2 | Words multiplier in publish formula (tunable via debug) |
| `scalingB` | 0.5 | Lexicoin multiplier in publish formula (tunable via debug) |
| Monkey base timer | 300s | Reset value after firing (reduced by Monkey Efficiency upgrade) |
| Monkey base find chance | 10% | Success probability (increased by Monkey Intuition upgrade) |
