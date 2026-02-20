# Platform Strategy & Roadmap — Lexicographer

## Is React the Right Foundation?

**Yes — with augmentation, not replacement.**

The UI complexity of Lexicographer (tabbed interface, upgrade trees, mission panels, modal dialogs, achievement system) is exactly what React excels at. Migrating to a game engine (Phaser, Unity, Godot) would mean rebuilding ~4,000 lines of interface code in an environment that isn't designed for it, for no meaningful gain. The path is: **keep React for UI, add specialist tools for animations and wrap for each platform.**

---

## Platform Paths at a Glance

| Goal | Technology | Code reuse | Effort |
|---|---|---|---|
| Steam | Electron wrapper | ~95% | 2–4 weeks |
| iOS / Android (first pass) | Capacitor | ~90% | 4–6 weeks |
| iOS / Android (if Capacitor falls short) | React Native port | ~60% (logic only) | 2–3 months |
| Sophisticated animations | PixiJS canvas layer + Framer Motion | Additive | 2–4 weeks |
| Custom art assets | SVG components + PixiJS sprite sheets | Additive | Ongoing (art-limited) |

---

## ✅ Do Now — Foundation Work

These pay off **immediately and regardless of which platform strategy is eventually chosen.** They also get harder and more expensive to do the longer they're deferred.

### 1. Replace CSS keyframe string with Framer Motion

**Why now:** The 13 animations currently live as a raw string in `styles.js` injected via a `<style>` tag. At 13 animations it's already hard to maintain; as the game grows this will become unmanageable. Framer Motion makes animations declarative, composable, and colocated with the components that use them.

- Replace `CSS_ANIMATIONS` string in [styles.js](styles.js) with Framer Motion `motion.*` components
- Covers: `fadeMsg`, `fadeIn`, `publishPop`, `slideRow`, `pressShake`, `tileEject`, `tileAppear`, `wordFadeIn`, `critBubble`, `tutorialPulse`, `monkeySuccess`, `monkeyFail`
- Estimated effort: ~1 week

### 2. Set up a custom SVG asset pipeline (replace lucide-react)

**Why now:** lucide-react icons are placeholders. Every icon that ships as lucide is one more icon you have to hunt down and replace later. Setting up the folder structure and conventions now means custom art can slot in incrementally as it's produced.

- Create `src/assets/icons/` with a simple React SVG component convention
- Replace lucide icons one-by-one as custom SVGs are designed
- Remove `lucide-react` dependency once the last icon is replaced
- Estimated effort: ~1–2 days to set up; ongoing as art is produced

### 3. Fix touch/pointer events on WordBoard

**Why now:** The word board uses the HTML5 Drag & Drop API (`onDragStart`, `onDrop`, etc.) which **does not work on mobile**. This must be fixed before any mobile testing is possible. It's also a better experience on desktop to use pointer events.

- Audit [components/WordBoard.jsx](components/WordBoard.jsx) for all `onDrag*` / `onDrop` handlers
- Replace with pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`)
- Test on touch device or browser devtools touch simulation
- Estimated effort: ~2–3 days

### 4. Introduce a PixiJS canvas layer (scoped to 2–3 animations)

**Why now:** This validates the React + PixiJS coexistence pattern at low cost before the game is larger. Starting small (just letter tile eject and ink collection) proves the approach and gives a foundation to build on.

- Add `pixi.js` as a dependency
- Create `components/GameCanvas.jsx` — a PixiJS Application mounted in a canvas element behind the word board
- Move the letter tile eject animation and one ink particle effect into PixiJS
- Estimated effort: ~1–2 weeks

---

## 🔜 Near Future — Steam

**When:** After foundation work is done; before or alongside full art production.

**Prerequisites:** Steamworks Partner account (~$100 one-time fee).

**How it works:** Electron wraps the existing React web app in a desktop shell. Almost no React code changes are required. The existing Express backend remains hosted separately — Steam users connect to the same server.

**Steps:**
1. Add `electron` and `electron-builder` as dev dependencies
2. Write `electron/main.js` — the minimal entry point (< 50 lines)
3. Configure `vite.config.js` for Electron (base path, disable dev server proxy)
4. Integrate Steamworks SDK for achievements, cloud saves, and Steam overlay
5. Set up CI producing Windows `.exe` and macOS `.dmg` installers

**Estimated effort:** 2–4 weeks

---

## 🔜 Near Future — iOS & Android

**When:** After the touch event fix above (item 3). That fix is a hard prerequisite.

**Prerequisites:** Apple Developer account ($99/yr), Google Play account ($25 one-time fee).

**Recommended approach: Start with Capacitor.** Capacitor wraps the existing web app in a native shell, preserving ~90% of current code. Performance is bounded by the WebView, which is acceptable for an idle/word game.

**Steps:**
1. Add `@capacitor/core` and `@capacitor/cli`
2. `npx cap init` — configure `capacitor.config.ts`
3. `npx cap add ios` and `npx cap add android`
4. Add `@capacitor/haptics` for tactile feedback on letter placement and word submission
5. Submit to App Store and Play Store

**Estimated effort:** 4–6 weeks (including store submission process)

**Decision point:** If animation performance on device is noticeably poor, scope a React Native port. The game logic files (`gameUtils.js`, `upgradeUtils.js`, `upgrades.js`, `permanentUpgrades.js`, etc.) are pure JavaScript and port without changes. Only the 16 UI component files need rewriting.

---

## 🔮 Future — Full Custom Art

**When:** When art assets are actually produced. This is not a code problem yet.

The pipeline to build toward:
- **Icons:** Custom SVG React components in `src/assets/icons/` (see item 2 above)
- **Animated sprites:** PixiJS texture atlases from Aseprite/TexturePacker (monkey, letter tiles, press machine, ink well)
- **Bitmap fonts:** PixiJS BitmapFont for in-game numbers and special labels
- **Particle effects:** PixiJS particle system for ink splashes, publish celebrations, crit hits

None of this requires architecture changes — it's art pipeline work that slots into the PixiJS layer (item 4 above).

---

## 🔮 Future — React Native Port (only if Capacitor falls short)

**When:** Only if Capacitor mobile proves limiting in practice.

React Native (via Expo) gives native UI components, GPU-accelerated animations via `react-native-reanimated` + `react-native-skia`, and premium gesture handling. It's the right choice if the game becomes a serious commercial mobile product and the Capacitor performance ceiling is a real problem.

All game logic files port without changes. Only the UI component files need rewriting (~16 files, ~2,500 lines of JSX).

**Estimated effort:** 2–3 months

---

## What NOT to Do

- **Don't migrate to a game engine** (Phaser, Unity, Godot). The UI complexity means rebuilding everything for no meaningful gain. These engines are designed for full-screen game views, not rich multi-panel interfaces.
- **Don't start with React Native** before validating that Capacitor is insufficient. Capacitor is much faster to market and good enough to validate the mobile product.
- **Don't defer the touch event fix.** Every mobile path (Capacitor and React Native both) depends on it.
- **Don't defer Framer Motion.** The longer the CSS keyframe string grows, the bigger the migration.
