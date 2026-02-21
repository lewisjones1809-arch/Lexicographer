import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DropletIcon as Droplet, CaseUpperIcon as CaseUpper, FeatherIcon as Feather, BookMarkedIcon as BookMarked, ApertureIcon as Aperture } from "./assets/icons";
import { Settings } from "lucide-react";
import { WORD_LIST } from "./wordList.js";
import { UPGRADES_BY_NAME } from "./upgrades.js";
import {
  TABS, COVERS, PAGE_STYLES,
  BASE_INK_COST, INK_COST_SCALE, LETTER_INTERVAL, MAX_LETTERS,
  MAX_WELLS, MAX_PRESSES,
  WELL_COSTS, PRESS_COSTS, WELL_MGR_COSTS, PRESS_MGR_COSTS,
  WELL_MANAGERS, PRESS_MANAGERS,
} from "./constants.js";
import { P, st } from "./styles.js";
import {
  randomLetter, fmt, rollCrit, computeEffectiveTileProbs, rollTileType,
  assignTilesFromBoard, scoreWordWithTiles, calculateQuillsBreakdown,
  canSupplyLetter, nextTileId, generateNonWord, applyMonkeyTileBonuses,
  computeOfflineProgress,
} from "./gameUtils.js";
import { mkWellUpg, mkMgrUpg, mkPressUpg } from "./upgradeUtils.js";
import { PERM_UPGRADES } from "./permanentUpgrades.js";
import { LexiconTab } from "./components/LexiconTab.jsx";
import { InkWellTab } from "./components/InkWellTab.jsx";
import { LetterPressTab } from "./components/LetterPressTab.jsx";
import { ShopTab } from "./components/ShopTab.jsx";
import { LibraryTab } from "./components/LibraryTab.jsx";
import { DebugPanel } from "./components/DebugPanel.jsx";
import { TUTORIAL_TAB_HINTS, TutorialWelcomeModal, TutorialCard } from "./components/Tutorial.jsx";
import { OfflineRewardModal } from "./components/OfflineRewardModal.jsx";
import { MissionsTrigger, MissionsPanel } from "./components/MissionsPanel.jsx";
import { generateMissions, loadDailyMissions, saveDailyMissions, advanceProgress } from "./missions.js";
import { AchievementsTrigger, AchievementsPanel } from "./components/AchievementsPanel.jsx";
import { ACHIEVEMENTS, countClaimable } from "./achievements.js";
import { GameCanvas } from "./components/GameCanvas.jsx";
import { AuthModal } from "./components/AuthModal.jsx";
import { AccountModal } from "./components/AccountModal.jsx";
import { StatsModal } from "./components/StatsModal.jsx";

export default function Lexicographer() {
  const isTutorial = localStorage.getItem('lexTutorialDone') !== 'true';

  const [wellFloats, setWellFloats] = useState({});
  const [collectedInk, setCollectedInk] = useState(isTutorial ? 15 : 0);
  const [letters, setLetters] = useState(() =>
    isTutorial
      ? { A:1, C:1, E:1, H:1, L:2, M:1, O:2, R:1, S:1, T:1, W:1 }
      : (() => { const s={}; for(let i=0;i<15;i++){const l=randomLetter();s[l]=(s[l]||0)+1;} return s; })()
  );
  const [wordTiles, setWordTiles] = useState([]);
  const [lexicon, setLexicon] = useState([]);
  const [quills, setQuills] = useState(0);
  const [publishedLexicons, setPublishedLexicons] = useState([]);
  const [activeTab, setActiveTab] = useState("lexicon");
  const [showPublishAnim, setShowPublishAnim] = useState(false);
  const [showPublishPreview, setShowPublishPreview] = useState(false);
  const [publishBreakdown, setPublishBreakdown] = useState(null);
  const gameCanvasRef = useRef(null);
  const wellRefsArr   = useRef([]);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Multi-well system
  const [wellCount, setWellCount] = useState(isTutorial ? 0 : 1);
  const [wells, setWells] = useState(() => isTutorial ? [] : [{ ink: 50, collecting: false, collectTimer: 10 }]);
  const [wellMgrOwned, setWellMgrOwned] = useState([]);
  const [wellMgrEnabled, setWellMgrEnabled] = useState([]);

  // Multi-press system
  const [pressCount, setPressCount] = useState(0);
  const [presses, setPresses] = useState([]);
  const [pressMgrOwned, setPressMgrOwned] = useState([]);
  const [recentTiles, setRecentTiles] = useState([]);
  const [pressEjects, setPressEjects] = useState({});

  // Special tiles and golden notebooks
  const [specialTiles, setSpecialTiles] = useState(() =>
    isTutorial
      ? [{ id:'t-dl', letter:'L', type:'double_letter' }, { id:'t-lc', letter:null, type:'lexicoin' }]
      : []
  );
  const [goldenNotebooks, setGoldenNotebooks] = useState(0);

  // Permanent upgrades (persist across publish rounds) — { upgradeId: currentLevel }
  const [permUpgradeLevels, setPermUpgradeLevels] = useState({});

  // Monkey with a Typewriter — timers and animation queue (persist across publish rounds)
  const [monkeyTimers, setMonkeyTimers] = useState([]);
  const [monkeyAnims, setMonkeyAnims]   = useState([]);

  // Refs so interval callbacks can access fresh state without stale closures
  const publishedLexiconsRef = useRef(publishedLexicons);
  useEffect(() => { publishedLexiconsRef.current = publishedLexicons; }, [publishedLexicons]);
  const lexiconRef = useRef(lexicon);
  useEffect(() => { lexiconRef.current = lexicon; }, [lexicon]);

  // Auth refs (currentUserRef assigned after currentUser state is declared below)
  const currentUserRef  = useRef(null);
  const suppressSyncRef = useRef(false); // suppressed while loading state from server
  const syncTimerRef    = useRef(null);
  const syncStateRef    = useRef({});    // full state snapshot for sync/beforeunload

  // Book customization
  const [ownedCovers, setOwnedCovers] = useState(["classic"]);
  const [ownedPages, setOwnedPages] = useState(["parchment"]);
  const [activeCoverId, setActiveCoverId] = useState("classic");
  const [activePageId, setActivePageId] = useState("parchment");

  // Scaling multipliers (tunable via debug)
  const [scalingA, setScalingA] = useState(0.1);
  const [scalingB, setScalingB] = useState(0.05);

  // Daily missions
  const [showMissions, setShowMissions] = useState(false);
  const [missions, setMissions] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    const { missions: saved, date } = loadDailyMissions();
    return (date === today && Array.isArray(saved) && saved.length > 0) ? saved : generateMissions();
  });

  // Achievements (persistent across publish rounds — never reset)
  const [achievementProgress, setAchievementProgress] = useState({});
  const [achievementLevels, setAchievementLevels] = useState({});
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Tutorial
  const [tutorialStep, setTutorialStep] = useState(() =>
    localStorage.getItem('lexTutorialDone') === 'true' ? -1 : 0
  );
  const [tutorialActive, setTutorialActive] = useState(isTutorial);

  // Auth
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authResetToken, setAuthResetToken] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  currentUserRef.current = currentUser;

  // Per-device upgrade levels
  const [wellUpgradeLevels, setWellUpgradeLevels] = useState(() => isTutorial ? [] : [mkWellUpg()]);
  const [mgrUpgradeLevels, setMgrUpgradeLevels] = useState([]);
  const [pressUpgradeLevels, setPressUpgradeLevels] = useState([]);

  // Derived values
  const activeCover     = useMemo(() => COVERS.find(c => c.id === activeCoverId) || COVERS[0], [activeCoverId]);
  const activePageStyle = useMemo(() => PAGE_STYLES.find(p => p.id === activePageId) || PAGE_STYLES[0], [activePageId]);
  const coverMult       = useMemo(() => 1 + COVERS.filter(c => ownedCovers.includes(c.id)).reduce((sum, c) => sum + (c.mult - 1), 0), [ownedCovers]);
  const pageMult        = useMemo(() => 1 + PAGE_STYLES.filter(p => ownedPages.includes(p.id)).reduce((sum, p) => sum + (p.mult - 1), 0), [ownedPages]);
  const unlockedQtys       = useMemo(() => {
    const qtys = [1];
    const bb = PERM_UPGRADES.find(u => u.id === "bulk_buying");
    const level = permUpgradeLevels["bulk_buying"] || 0;
    for (let i = 0; i < level; i++) qtys.push(bb.levels[i].unlocksQty);
    return qtys;
  }, [permUpgradeLevels]);
  const effectiveMaxLetters = useMemo(
    () => MAX_LETTERS + (permUpgradeLevels["max_letters"] || 0) * 10,
    [permUpgradeLevels]
  );
  const effectiveInkMult    = useMemo(
    () => Math.pow(1.01, permUpgradeLevels["ink_multiplier"] || 0),
    [permUpgradeLevels]
  );
  const claimableCount  = useMemo(() => countClaimable(achievementProgress, achievementLevels), [achievementProgress, achievementLevels]);
  const wordString      = useMemo(() => wordTiles.map(t => t.letter).join(""), [wordTiles]);
  const totalLetters    = useMemo(() => Object.values(letters).reduce((a,b)=>a+b,0) + specialTiles.length, [letters, specialTiles]);
  const inkCost         = useMemo(() => BASE_INK_COST + lexicon.length * INK_COST_SCALE, [lexicon.length]);

  const isValidWord = useCallback((w) => WORD_LIST.has(w.toUpperCase()), []);
  // eslint-disable-next-line no-unused-vars
  const showMsg     = useCallback((_msg) => {}, []);

  const buyPermUpgrade = useCallback((upgradeId, count = 1, totalCost = null) => {
    const upg = PERM_UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;
    const currentLevel = permUpgradeLevels[upgradeId] || 0;
    if (currentLevel >= upg.maxLevel) return;
    const cost = totalCost ?? (upg.levels ? upg.levels[currentLevel].cost : upg.costFormula(currentLevel));
    if (quills < cost) return;
    setQuills(q => q - cost);
    setPermUpgradeLevels(prev => ({ ...prev, [upgradeId]: Math.min(currentLevel + count, upg.maxLevel) }));
    if (upgradeId === "monkey_efficiency") {
      setMonkeyTimers(prev => prev.map(t => Math.max(1, t - 10 * count)));
    }
  }, [permUpgradeLevels, quills]);

  // Sync monkey timer array length when the monkey upgrade level changes
  useEffect(() => {
    const count = permUpgradeLevels["monkey_typewriter"] || 0;
    setMonkeyTimers(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const searchTime = monkeySearchTimeRef.current;
        const newTimers = Array.from({ length: count - prev.length }, () => Math.max(1, Math.floor(Math.random() * searchTime)));
        return [...prev, ...newTimers];
      }
      return prev.slice(0, count);
    });
  }, [permUpgradeLevels]);

  // Offline progress
  const [offlineReward, setOfflineReward] = useState(null);
  const pendingOfflineRef = useRef(null); // { elapsed } — set at mount, consumed by applyServerState

  // procMonkey via ref so the interval doesn't go stale
  const procMonkeyRef = useRef(null);
  const monkeySearchTimeRef = useRef(300);
  monkeySearchTimeRef.current = Math.max(30, 300 - (permUpgradeLevels["monkey_efficiency"] || 0) * 10);
  procMonkeyRef.current = (monkeyIdx) => {
    const pubs = publishedLexiconsRef.current;
    const currentLexicon = lexiconRef.current;
    const roll = Math.random();
    const animId = Date.now() + monkeyIdx;
    const findChance = 0.1 + (permUpgradeLevels["monkey_intuition"] || 0) * 0.01;

    if (roll < findChance && pubs.length > 0) {
      const allWords = pubs.flatMap(l => l.entries.map(e => e.word));
      const currentSet = new Set(currentLexicon.map(e => e.word));
      const available = allWords.filter(w => !currentSet.has(w));
      if (available.length > 0) {
        const word = available[Math.floor(Math.random() * available.length)];
        const tileChance = (permUpgradeLevels["monkey_tile_chance"] || 0) * 0.001;
        const tileLimit  = 1 + (permUpgradeLevels["monkey_tile_limit"]  || 0);
        const { score, letters } = applyMonkeyTileBonuses(word, tileChance, tileLimit);
        setLexicon(lex => lex.some(e => e.word === word) ? lex : [...lex, { word, score, letters }]);
        if (activeTab === "lexicon") setMonkeyAnims(a => [...a, { id: animId, type: "success", word, monkeyIdx }]);
        return;
      }
    }
    if (activeTab === "lexicon") {
      const fakeWord = generateNonWord();
      setMonkeyAnims(a => [...a, { id: animId, type: "fail", word: fakeWord, monkeyIdx }]);
    }
  };

  const clearMonkeyAnim = useCallback((id) => {
    setMonkeyAnims(a => a.filter(x => x.id !== id));
  }, []);

  const advanceMissions = useCallback((type, amount = 1, opts = {}) => {
    setMissions(prev => advanceProgress(prev, type, amount, opts));
  }, []);

  const claimMission = useCallback((id) => {
    setMissions(prev => {
      const m = prev.find(m => m.id === id);
      if (!m || m.claimed || m.progress < m.target) return prev;
      setGoldenNotebooks(n => n + m.reward);
      advanceAchievement("golden_notebooks_earned", m.reward);
      return prev.map(m2 => m2.id === id ? { ...m2, claimed: true } : m2);
    });
  }, []);

  const advanceAchievement = useCallback((id, amount) => {
    setAchievementProgress(prev => ({ ...prev, [id]: (prev[id] ?? 0) + amount }));
  }, []);

  const claimAchievement = useCallback((id) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return;
    setAchievementLevels(prevLevels => {
      const claimedCount = prevLevels[id] ?? 0;
      if (claimedCount >= achievement.levels.length) return prevLevels;
      setAchievementProgress(prevProgress => {
        const progress = prevProgress[id] ?? 0;
        const level = achievement.levels[claimedCount];
        if (progress < level.threshold) return prevProgress;
        setGoldenNotebooks(n => n + level.reward);
        return { ...prevProgress, golden_notebooks_earned: (prevProgress.golden_notebooks_earned ?? 0) + level.reward };
      });
      return { ...prevLevels, [id]: claimedCount + 1 };
    });
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem('lexTutorialDone', 'true');
    setTutorialStep(-1);
    setTutorialActive(false);
  }, []);
  const skipTutorial    = useCallback(() => { completeTutorial(); }, [completeTutorial]);
  const advanceTutorial = useCallback(() => {
    setTutorialStep(prev => {
      if (prev >= 7) { completeTutorial(); return -1; }
      return prev + 1;
    });
  }, [completeTutorial]);

  // --- AUTH: apply server state to local React state ---
  const applyServerState = useCallback((state) => {
    suppressSyncRef.current = true;
    setQuills(state.quills ?? 0);
    setGoldenNotebooks(state.goldenNotebooks ?? 0);
    setPublishedLexicons(state.publishedLexicons ?? []);
    setOwnedCovers(state.ownedCovers ?? ['classic']);
    setOwnedPages(state.ownedPages ?? ['parchment']);
    setActiveCoverId(state.activeCoverId ?? 'classic');
    setActivePageId(state.activePageId ?? 'parchment');
    setPermUpgradeLevels(state.permUpgradeLevels ?? {});
    setAchievementProgress(state.achievementProgress ?? {});
    setAchievementLevels(state.achievementLevels ?? {});
    const vs = state.volatileState;

    // Compute offline gains using server-restored volatile state + elapsed from mount ref.
    // Server state is synced on beforeunload so it matches the offline snapshot timestamp.
    let offline = null;
    const pending = pendingOfflineRef.current;
    pendingOfflineRef.current = null; // consume — prevents double-apply
    if (pending?.elapsed && vs) {
      const permLevels = state.permUpgradeLevels || {};
      const inkMult  = Math.pow(1.01, permLevels.ink_multiplier || 0);
      const maxLett  = MAX_LETTERS + (permLevels.max_letters || 0) * 10;
      const totLett  = Object.values(vs.letters || {}).reduce((a, b) => a + b, 0) + (vs.specialTiles || []).length;
      const monkeySearchTime = Math.max(30, 300 - (permLevels.monkey_efficiency || 0) * 10);
      const findChance       = 0.1 + (permLevels.monkey_intuition || 0) * 0.01;
      const currentLexWords  = new Set((vs.lexicon || []).map(e => e.word));
      const availableMonkeyWords = (state.publishedLexicons || [])
        .flatMap(l => (l.entries || []).map(e => e.word))
        .filter(w => !currentLexWords.has(w));
      const result   = computeOfflineProgress({
        wells: vs.wells || [],
        wellMgrOwned: vs.wellMgrOwned ?? Array.from({length: vs.wellMgrCount || 0}, () => true),
        wellMgrEnabled: vs.wellMgrEnabled || [],
        wellUpgradeLevels: vs.wellUpgradeLevels || [],
        presses: vs.presses || [],
        pressMgrOwned: vs.pressMgrOwned ?? Array.from({length: vs.pressMgrCount || 0}, () => true),
        pressUpgradeLevels: vs.pressUpgradeLevels || [],
        totalLetters: totLett, effectiveInkMult: inkMult, effectiveMaxLetters: maxLett,
        monkeyTimers: vs.monkeyTimers || [], monkeySearchTime, findChance, availableMonkeyWords,
      }, pending.elapsed);
      if (result.inkEarned > 0 || result.totalNewLetters > 0 || result.monkeyWords?.length > 0) {
        offline = { elapsedSeconds: pending.elapsed, ...result };
      }
    }

    if (vs) {
      // Returning user — restore full game state, fold in pending rewards + offline gains
      const baseLett = { ...(vs.letters ?? {}) };
      if (offline?.newNormals) {
        for (const [l, cnt] of Object.entries(offline.newNormals)) baseLett[l] = (baseLett[l] || 0) + cnt;
      }
      setCollectedInk((vs.collectedInk ?? 0) + (state.inkBoostPending ? 5000 : 0) + (offline?.inkEarned ?? 0));
      setLetters(baseLett);
      setWordTiles(vs.wordTiles ?? []);
      const baseLexicon = vs.lexicon ?? [];
      const existingWords = new Set(baseLexicon.map(e => e.word));
      const monkeyEntries = (offline?.monkeyWords || []).filter(e => !existingWords.has(e.word));
      setLexicon([...baseLexicon, ...monkeyEntries]);
      setWellCount(vs.wellCount ?? 1);
      setWells(vs.wells ?? [{ ink: 50, collecting: false, collectTimer: 10 }]);
      setWellMgrOwned(vs.wellMgrOwned ?? Array.from({length: vs.wellMgrCount || 0}, () => true));
      setWellMgrEnabled(vs.wellMgrEnabled ?? []);
      setPressCount(vs.pressCount ?? 0);
      setPresses(vs.presses ?? []);
      setPressMgrOwned(vs.pressMgrOwned ?? Array.from({length: vs.pressMgrCount || 0}, () => true));
      setSpecialTiles([...(vs.specialTiles ?? []), ...(state.letterPackPending ?? []), ...(offline?.newSpecials ?? [])]);
      setWellUpgradeLevels(vs.wellUpgradeLevels?.length ? vs.wellUpgradeLevels : [mkWellUpg()]);
      setMgrUpgradeLevels(vs.mgrUpgradeLevels ?? []);
      setPressUpgradeLevels(vs.pressUpgradeLevels ?? []);
      setMonkeyTimers(vs.monkeyTimers ?? []);
    } else {
      // New user — no saved game state; keep current local state and apply any pending rewards
      if (state.inkBoostPending) setCollectedInk(p => p + 5000);
      if (state.letterPackPending?.length > 0) setSpecialTiles(prev => [...prev, ...state.letterPackPending]);
    }

    if (offline) setOfflineReward(offline);
    // Unsuppress sync after React has flushed the batch
    setTimeout(() => { suppressSyncRef.current = false; }, 200);
  }, []);

  // --- SYNC STATE REF: keeps a full snapshot of all state for use in sync callbacks ---
  useEffect(() => {
    syncStateRef.current = {
      quills, goldenNotebooks, publishedLexicons, ownedCovers, ownedPages,
      activeCoverId, activePageId, permUpgradeLevels,
      achievementProgress, achievementLevels,
      volatileState: {
        collectedInk, letters, wordTiles, lexicon,
        wellCount, wells, wellMgrOwned, wellMgrEnabled,
        pressCount, presses, pressMgrOwned, specialTiles,
        wellUpgradeLevels, mgrUpgradeLevels, pressUpgradeLevels,
        monkeyTimers,
      },
    };
  }, [quills, goldenNotebooks, publishedLexicons, ownedCovers, ownedPages,
      activeCoverId, activePageId, permUpgradeLevels, achievementProgress, achievementLevels,
      collectedInk, letters, wordTiles, lexicon, wellCount, wells, wellMgrOwned, wellMgrEnabled,
      pressCount, presses, pressMgrOwned, specialTiles,
      wellUpgradeLevels, mgrUpgradeLevels, pressUpgradeLevels, monkeyTimers]);

  // Fire a PUT /api/user/state with the current full snapshot
  const doSync = useCallback(() => {
    const user = currentUserRef.current;
    if (!user || suppressSyncRef.current) return;
    fetch('/api/user/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify(syncStateRef.current),
    }).catch(() => {});
  }, []);

  // Periodic volatile-state sync every 30 seconds
  useEffect(() => {
    const id = setInterval(doSync, 30_000);
    return () => clearInterval(id);
  }, [doSync]);

  // Sync on page close / tab switch away (keepalive lets the request outlive the page)
  useEffect(() => {
    const handler = () => {
      const user = currentUserRef.current;
      if (!user) return;
      fetch('/api/user/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(syncStateRef.current),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // --- AUTH: on-mount — verify stored token, load state, handle IAP return ---
  useEffect(() => {
    const token = localStorage.getItem('lexToken');
    const params = new URLSearchParams(window.location.search);
    const iapSession = params.get('iap_session');
    const resetParam = params.get('reset');
    if (iapSession || resetParam) window.history.replaceState({}, '', window.location.pathname);
    if (resetParam) { setAuthResetToken(resetParam); setShowAuthModal(true); }
    if (!token) return;
    (async () => {
      try {
        const verifyRes = await fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } });
        const { valid, user } = await verifyRes.json();
        if (!valid) { localStorage.removeItem('lexToken'); return; }
        setCurrentUser({ ...user, token });
        const stateRes = await fetch('/api/user/state', { headers: { Authorization: `Bearer ${token}` } });
        if (!stateRes.ok) return;
        let state = await stateRes.json();
        if (iapSession) {
          const fulfillRes = await fetch('/api/payments/fulfill-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ sessionId: iapSession }),
          });
          if (fulfillRes.ok) {
            const data = await fulfillRes.json();
            state = data.state ?? state;
          }
        }
        applyServerState(state);
        // Clear one-time pending flags from server after consuming them
        if (state.inkBoostPending || state.letterPackPending?.length > 0) {
          fetch('/api/user/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...state, inkBoostPending: 0, letterPackPending: [] }),
          }).catch(() => {});
        }
      } catch { /* server not running — play in guest mode */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- AUTH: debounced sync on permanent state changes (2s after last change) ---
  // Volatile state is picked up from syncStateRef.current at fire time — no need in deps.
  useEffect(() => {
    if (!currentUser || suppressSyncRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(doSync, 2000);
    return () => clearTimeout(syncTimerRef.current);
  }, [quills, goldenNotebooks, publishedLexicons, ownedCovers, ownedPages,
      activeCoverId, activePageId, permUpgradeLevels, achievementProgress, achievementLevels,
      currentUser, doSync]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = useCallback(async (user, token) => {
    setCurrentUser({ ...user, token });
    setShowAuthModal(false);
    try {
      const stateRes = await fetch('/api/user/state', { headers: { Authorization: `Bearer ${token}` } });
      if (!stateRes.ok) return;
      const state = await stateRes.json();
      applyServerState(state);
      if (state.inkBoostPending || state.letterPackPending?.length > 0) {
        fetch('/api/user/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...state, inkBoostPending: 0, letterPackPending: [] }),
        }).catch(() => {});
      }
    } catch { /* server unreachable */ }
  }, [applyServerState]);

  const handleLogout = useCallback(() => {
    const user = currentUserRef.current;
    if (user) {
      fetch('/api/user/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(syncStateRef.current),
        keepalive: true,
      }).catch(() => {});
    }
    localStorage.removeItem('lexToken');
    window.location.reload();
  }, []);

  const handleBuyIap = useCallback(async (productId) => {
    if (!currentUserRef.current) { setShowAuthModal(true); return; }
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUserRef.current.token}` },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else showMsg(data.error || 'Could not start checkout');
    } catch {
      showMsg('Server not reachable. Is it running?');
    }
  }, [showMsg]);

  // --- WELL FILL TICK + MANAGER COLLECTION ---
  useEffect(() => {
    const id = setInterval(() => {
      setWells(prev => {
        let earned = 0;
        const next = prev.map((w, i) => {
          const wUpg = wellUpgradeLevels[i] || mkWellUpg();
          const mUpg = mgrUpgradeLevels[i]  || mkMgrUpg();
          const wellFillRate   = UPGRADES_BY_NAME["Well Speed"].valueFormula(wUpg["Well Speed"] ?? 0);
          const wellCapacity   = UPGRADES_BY_NAME["Well Capacity"].valueFormula(wUpg["Well Capacity"] ?? 0);
          const critChance     = UPGRADES_BY_NAME["Crit Chance"].valueFormula(wUpg["Crit Chance"] ?? 0);
          const critMult       = UPGRADES_BY_NAME["Crit Multiplier"].valueFormula(wUpg["Crit Multiplier"] ?? 0);
          const mgrCollectTime = UPGRADES_BY_NAME["Manager Speed"].valueFormula(mUpg["Manager Speed"] ?? 0);
          const isManaged = !!wellMgrOwned[i] && wellMgrEnabled[i];
          if (w.collecting) {
            if (w.collectTimer <= 0.11) {
              const base = w.ink;
              const result = rollCrit(base, critChance, critMult);
              earned += result.amount;
              return { ...w, collecting: false, collectTimer: Math.max(0.1, mgrCollectTime), ink: 0 };
            }
            return { ...w, collectTimer: w.collectTimer - 0.1 };
          }
          const newInk = Math.min(w.ink + wellFillRate * effectiveInkMult * 0.1, wellCapacity);
          if (isManaged && newInk >= wellCapacity) {
            return { ...w, ink: newInk, collecting: true, collectTimer: Math.max(0.1, mgrCollectTime) };
          }
          return { ...w, ink: newInk };
        });
        if (earned > 0) { setCollectedInk(p => p + earned); advanceMissions("ink_collected", earned); advanceAchievement("ink_collected", earned); }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [wellMgrOwned, wellMgrEnabled, wellUpgradeLevels, mgrUpgradeLevels, effectiveInkMult]);

  // --- PRESS TICK (all running presses count down) ---
  useEffect(() => {
    const anyRunning = presses.some(p => p.running);
    if (!anyRunning) return;
    const id = setInterval(() => {
      setPresses(prev => prev.map((p, i) => {
        if (!p.running) return p;
        const pUpg = pressUpgradeLevels[i] || mkPressUpg();
        const pressInterval      = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
        const pressYield         = UPGRADES_BY_NAME["Press Yield"].valueFormula(pUpg["Press Yield"] ?? 0);
        const effectiveTileProbs = computeEffectiveTileProbs(pUpg);
        if (p.timer <= 0.11) {
          if (totalLetters < effectiveMaxLetters) {
            const yieldCount = Math.floor(pressYield);
            const newNormals = {};
            const newSpecials = [];
            const yieldedTiles = [];
            let lastL = null, lastTileType = "normal";
            for (let y = 0; y < yieldCount; y++) {
              const l = randomLetter();
              const tileType = rollTileType(effectiveTileProbs);
              lastL = l; lastTileType = tileType;
              if (tileType === "normal") {
                newNormals[l] = (newNormals[l] || 0) + 1;
              } else if (tileType === "lexicoin") {
                newSpecials.push({ id: nextTileId(), letter: null, type: "lexicoin" });
              } else {
                newSpecials.push({ id: nextTileId(), letter: l, type: tileType });
              }
              yieldedTiles.push({ id: nextTileId(), letter: tileType === "lexicoin" ? null : l, tileType });
            }
            if (Object.keys(newNormals).length > 0)
              setLetters(o => { const n = {...o}; for (const [l, cnt] of Object.entries(newNormals)) n[l] = (n[l] || 0) + cnt; return n; });
            if (newSpecials.length > 0)
              setSpecialTiles(o => [...o, ...newSpecials]);
            return { ...p, running: false, timer: Math.max(0.1, pressInterval), lastLetter: lastL, lastType: lastTileType, yieldId: nextTileId(), lastYieldedTiles: yieldedTiles };
          }
          return { ...p, running: false, timer: Math.max(0.1, pressInterval) };
        }
        return { ...p, timer: p.timer - 0.1 };
      }));
    }, 100);
    return () => clearInterval(id);
  }, [presses, totalLetters, pressUpgradeLevels, effectiveMaxLetters]);

  // --- DETECT PRESS COMPLETIONS → update recentTiles and pressEjects ---
  const prevPressesRef = useRef([]);
  useEffect(() => {
    const prev = prevPressesRef.current;
    const newTiles = [];
    const newEjectsMap = {};
    presses.forEach((p, i) => {
      if (p.yieldId != null && p.yieldId !== prev[i]?.yieldId && p.lastYieldedTiles?.length > 0) {
        newTiles.push(...p.lastYieldedTiles);
        const lastTile = p.lastYieldedTiles[p.lastYieldedTiles.length - 1];
        newEjectsMap[i] = { letter: lastTile.letter, tileType: lastTile.tileType, key: nextTileId() };
      }
    });
    prevPressesRef.current = presses;
    if (newTiles.length > 0) {
      setRecentTiles(prev => [...prev, ...newTiles].slice(-10));
      advanceMissions("letters_collected", newTiles.length);
      advanceAchievement("letters_pressed", newTiles.length);
    }
    if (Object.keys(newEjectsMap).length > 0) setPressEjects(prev => ({ ...prev, ...newEjectsMap }));
  }, [presses, advanceMissions]);

  // --- MANAGER AUTOMATION (press managers only) ---
  useEffect(() => {
    const id = setInterval(() => {
      if (pressMgrOwned.some(Boolean)) {
        setPresses(prev => prev.map((p, i) => {
          if (pressMgrOwned[i] && !p.running && totalLetters < effectiveMaxLetters) {
            const pUpg = pressUpgradeLevels[i] || mkPressUpg();
            const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
            return { ...p, running: true, timer: Math.max(0.1, pressInterval) };
          }
          return p;
        }));
      }
    }, 200);
    return () => clearInterval(id);
  }, [pressMgrOwned, totalLetters, pressUpgradeLevels, effectiveMaxLetters]);

  // --- MONKEY TIMER TICK (1 second) — pure state only ---
  useEffect(() => {
    const id = setInterval(() => {
      setMonkeyTimers(timers => {
        if (timers.length === 0) return timers;
        return timers.map(t => (t > 1 ? t - 1 : 0)); // 0 = just expired
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // --- MONKEY PROC DETECTION (mirrors press completion pattern) ---
  const prevMonkeyTimersRef = useRef([]);
  useEffect(() => {
    const prev = prevMonkeyTimersRef.current;
    const fired = monkeyTimers
      .map((t, i) => ({ t, i }))
      .filter(({ t, i }) => t === 0 && prev[i] !== 0);
    prevMonkeyTimersRef.current = monkeyTimers;
    if (fired.length === 0) return;
    fired.forEach(({ i }) => procMonkeyRef.current(i));
    setMonkeyTimers(prev => prev.map((t, i) =>
      fired.some(f => f.i === i) ? monkeySearchTimeRef.current : t
    ));
  }, [monkeyTimers]);

  // --- TUTORIAL AUTO-ADVANCE ---
  useEffect(() => {
    if (tutorialActive && tutorialStep === 1 && lexicon.length >= 1) advanceTutorial();
  }, [tutorialActive, tutorialStep, lexicon.length, advanceTutorial]);

  useEffect(() => {
    if (tutorialActive && tutorialStep === 2 && wellCount >= 1) advanceTutorial();
  }, [tutorialActive, tutorialStep, wellCount, advanceTutorial]);

  useEffect(() => {
    if (tutorialActive && tutorialStep === 3 && collectedInk >= 57) advanceTutorial();
  }, [tutorialActive, tutorialStep, collectedInk, advanceTutorial]);

  useEffect(() => {
    if (tutorialActive && tutorialStep === 4 && lexicon.length >= 2) advanceTutorial();
  }, [tutorialActive, tutorialStep, lexicon.length, advanceTutorial]);

  useEffect(() => {
    if (tutorialActive && tutorialStep === 5 && lexicon.length >= 3) advanceTutorial();
  }, [tutorialActive, tutorialStep, lexicon.length, advanceTutorial]);

  // --- DAILY MISSIONS: reset + persist ---
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const { date } = loadDailyMissions();
    if (date !== today) {
      const fresh = generateMissions();
      setMissions(fresh);
      saveDailyMissions(fresh, today);
    }
  }, []);

  useEffect(() => {
    saveDailyMissions(missions, new Date().toISOString().slice(0, 10));
  }, [missions]);

  // --- OFFLINE PROGRESS: load saved snapshot at mount ---
  // For guests (no token): apply gains immediately on top of fresh state.
  // For auth users: store elapsed in pendingOfflineRef; applyServerState will consume it.
  useEffect(() => {
    const savedTs   = localStorage.getItem('lexLastSeen');
    const savedSnap = localStorage.getItem('lexOfflineSnapshot');
    localStorage.removeItem('lexLastSeen');
    localStorage.removeItem('lexOfflineSnapshot');
    if (!savedTs) return;
    const elapsed = Math.min(Math.floor((Date.now() - parseInt(savedTs, 10)) / 1000), 8 * 3600);
    if (elapsed < 60) return;
    let snapshot = null;
    try { if (savedSnap) snapshot = JSON.parse(savedSnap); } catch {}
    // Store for auth path (applyServerState will consume this)
    pendingOfflineRef.current = { elapsed, snapshot };
    // Guest path: no token means no applyServerState will run, so apply now
    if (!localStorage.getItem('lexToken') && snapshot) {
      const result = computeOfflineProgress(snapshot, elapsed);
      const hasGains = result.inkEarned > 0 || result.totalNewLetters > 0 || result.monkeyWords?.length > 0;
      if (hasGains) {
        if (result.inkEarned > 0) setCollectedInk(p => p + result.inkEarned);
        if (result.totalNewLetters > 0) {
          setLetters(p => {
            const next = { ...p };
            for (const [l, cnt] of Object.entries(result.newNormals)) next[l] = (next[l] || 0) + cnt;
            return next;
          });
          setSpecialTiles(p => [...p, ...result.newSpecials]);
        }
        if (result.monkeyWords?.length > 0) {
          setLexicon(p => {
            const existing = new Set(p.map(e => e.word));
            return [...p, ...result.monkeyWords.filter(e => !existing.has(e.word))];
          });
        }
        setOfflineReward({ elapsedSeconds: elapsed, ...result });
      }
      pendingOfflineRef.current = null; // consumed
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- OFFLINE PROGRESS: save snapshot on page hide / tab switch ---
  useEffect(() => {
    const save = () => {
      const vs         = syncStateRef.current?.volatileState;
      const permLevels = syncStateRef.current?.permUpgradeLevels || {};
      localStorage.setItem('lexLastSeen', Date.now().toString());
      if (!vs) return;
      const inkMult    = Math.pow(1.01, permLevels.ink_multiplier || 0);
      const maxLett    = MAX_LETTERS + (permLevels.max_letters || 0) * 10;
      const totalLetters = Object.values(vs.letters || {}).reduce((a, b) => a + b, 0) + (vs.specialTiles || []).length;
      const monkeySearchTime = Math.max(30, 300 - (permLevels.monkey_efficiency || 0) * 10);
      const findChance = 0.1 + (permLevels.monkey_intuition || 0) * 0.01;
      const currentLexiconWords = new Set((vs.lexicon || []).map(e => e.word));
      const publishedLexicons = syncStateRef.current?.publishedLexicons || [];
      const availableMonkeyWords = publishedLexicons
        .flatMap(l => (l.entries || []).map(e => e.word))
        .filter(w => !currentLexiconWords.has(w));
      localStorage.setItem('lexOfflineSnapshot', JSON.stringify({
        wells: vs.wells || [],
        wellMgrOwned: vs.wellMgrOwned || [],
        wellMgrEnabled: vs.wellMgrEnabled || [],
        wellUpgradeLevels: vs.wellUpgradeLevels || [],
        presses: vs.presses || [],
        pressMgrOwned: vs.pressMgrOwned || [],
        pressUpgradeLevels: vs.pressUpgradeLevels || [],
        totalLetters, effectiveInkMult: inkMult, effectiveMaxLetters: maxLett,
        monkeyTimers: vs.monkeyTimers || [], monkeySearchTime, findChance, availableMonkeyWords,
      }));
    };
    const visHandler = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      window.removeEventListener('beforeunload', save);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (!e.target.closest("[data-settings-panel]")) setShowSettings(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  // --- ACTIONS ---
  const collectWell = (idx) => {
    const w = wells[idx];
    if (w && w.ink > 0 && !w.collecting) {
      const wUpg = wellUpgradeLevels[idx] || mkWellUpg();
      const critChance = UPGRADES_BY_NAME["Crit Chance"].valueFormula(wUpg["Crit Chance"] ?? 0);
      const critMult   = UPGRADES_BY_NAME["Crit Multiplier"].valueFormula(wUpg["Crit Multiplier"] ?? 0);
      const result = rollCrit(w.ink, critChance, critMult);
      setCollectedInk(p => p + result.amount);
      advanceMissions("ink_collected", result.amount);
      advanceAchievement("ink_collected", result.amount);
      setWellFloats(prev => ({ ...prev, [idx]: { amount: result.amount, isCrit: result.isCrit, key: Date.now() } }));
      if (result.isCrit) {
        const el = wellRefsArr.current[idx];
        if (el) {
          const r = el.getBoundingClientRect();
          gameCanvasRef.current?.playCritBubble(r.left + r.width / 2, r.top, `★ Crit! +${fmt(result.amount)}`);
        }
      }
      setWells(prev => prev.map((ww, i) => i === idx ? { ...ww, ink: 0 } : ww));
    }
  };

  const toggleWellManager = (idx) => {
    setWellMgrEnabled(prev => prev.map((e, i) => i === idx ? !e : e));
  };

  const startPress = (idx) => {
    if (totalLetters >= effectiveMaxLetters) { showMsg("Letter storage full!"); return; }
    const pUpg = pressUpgradeLevels[idx] || mkPressUpg();
    const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
    setPresses(prev => prev.map((p, i) => i === idx && !p.running ? { ...p, running: true, timer: Math.max(0.1, pressInterval) } : p));
  };

  const buyWell = () => {
    if (wellCount >= MAX_WELLS) { showMsg("Maximum wells reached!"); return; }
    const cost = WELL_COSTS[wellCount];
    if (collectedInk < cost) { showMsg(`Need ${fmt(cost)} ink! (have ${fmt(collectedInk)})`); return; }
    setCollectedInk(p => p - cost);
    setWellCount(p => p + 1);
    setWells(prev => [...prev, { ink: 0, collecting: false, collectTimer: 10 }]);
    setWellUpgradeLevels(prev => [...prev, mkWellUpg()]);
    showMsg(`Well ${wellCount + 1} built! (-${fmt(cost)} ink)`);
  };

  const buyPress = () => {
    if (pressCount >= MAX_PRESSES) { showMsg("Maximum presses reached!"); return; }
    const cost = PRESS_COSTS[pressCount];
    if (collectedInk < cost) { showMsg(`Need ${fmt(cost)} ink! (have ${fmt(collectedInk)})`); return; }
    setCollectedInk(p => p - cost);
    setPressCount(p => p + 1);
    setPresses(prev => [...prev, { running: false, timer: LETTER_INTERVAL, lastLetter: null, lastType: null, yieldId: null, lastYieldedTiles: [] }]);
    setPressUpgradeLevels(prev => [...prev, mkPressUpg()]);
    showMsg(`Press ${pressCount + 1} built! (-${fmt(cost)} ink)`);
  };

  const buyWellManager = (wellIdx) => {
    if (wellMgrOwned[wellIdx]) { showMsg("Manager already hired!"); return; }
    const cost = WELL_MGR_COSTS[wellIdx];
    if (collectedInk < cost) { showMsg(`Need ${fmt(cost)} ink! (have ${fmt(collectedInk)})`); return; }
    setCollectedInk(p => p - cost);
    setWellMgrOwned(prev => { const next = [...prev]; next[wellIdx] = true; return next; });
    setWellMgrEnabled(prev => { const next = [...prev]; next[wellIdx] = true; return next; });
    setMgrUpgradeLevels(prev => { const next = [...prev]; next[wellIdx] = mkMgrUpg(); return next; });
    const mgr = WELL_MANAGERS[wellIdx];
    showMsg(`Hired ${mgr.name}, ${mgr.title}! (-${fmt(cost)} ink)`);
  };

  const buyPressManager = (pressIdx) => {
    if (pressMgrOwned[pressIdx]) { showMsg("Manager already hired!"); return; }
    const cost = PRESS_MGR_COSTS[pressIdx];
    if (collectedInk < cost) { showMsg(`Need ${fmt(cost)} ink! (have ${fmt(collectedInk)})`); return; }
    setCollectedInk(p => p - cost);
    setPressMgrOwned(prev => { const next = [...prev]; next[pressIdx] = true; return next; });
    const mgr = PRESS_MANAGERS[pressIdx];
    showMsg(`Hired ${mgr.name}, ${mgr.title}! (-${fmt(cost)} ink)`);
  };

  const createWord = () => {
    const word = wordString.toUpperCase().trim();
    if(word.length<3){showMsg("Words must be at least 3 letters.");return;}
    if(!isValidWord(word)){showMsg(`"${word}" is not a recognized word!`);return;}
    if(lexicon.some(e => e.word === word)){showMsg("Word already in lexicon!");return;}
    const result = assignTilesFromBoard(wordTiles, letters, specialTiles);
    if(!result){showMsg("Not enough letters!");return;}
    if(collectedInk<inkCost){showMsg(`Need ${fmt(inkCost)} ink! (have ${fmt(collectedInk)})`);return;}
    const { assignments, newLetters, usedSpecialIds } = result;
    setCollectedInk(p=>p-inkCost);
    setLetters(newLetters);
    if(usedSpecialIds.size > 0) setSpecialTiles(prev => prev.filter(t => !usedSpecialIds.has(t.id)));
    const { total, goldenCount, details } = scoreWordWithTiles(assignments);
    if(goldenCount > 0) { setGoldenNotebooks(p => p + goldenCount); advanceAchievement("golden_notebooks_earned", goldenCount); }
    const letterEntries = assignments.map(a => ({ letter: a.letter, type: a.type }));
    setLexicon(p=>[...p,{ word, score: total, letters: letterEntries }]);
    setWordTiles([]);
    advanceMissions("words_inscribed", 1);
    advanceMissions("long_word", 1, { wordLength: word.length });
    advanceAchievement("unique_words_found", 1);
    if (assignments.every(a => a.type === "lexicoin")) {
      setAchievementProgress(prev => ({ ...prev, wildcard_word: Math.max(prev.wildcard_word ?? 0, word.length) }));
    }
    const bonus = details.length > 0 ? ` [${details.join(", ")}]` : "";
    const goldenMsg = goldenCount > 0 ? ` +${goldenCount} 📓 Golden Notebook!` : "";
    showMsg(`"${word}" inscribed! (${total} Lexicoins${bonus}${goldenMsg}, cost ${fmt(inkCost)} ink)`);
  };

  const publishLexicon = () => {
    if(lexicon.length < 10){showMsg("Need at least 10 words to publish!");return;}
    const previousWords = new Set(publishedLexicons.flatMap(l => (l.entries || []).map(e => e.word)));
    const bd = calculateQuillsBreakdown(lexicon, coverMult, pageMult, scalingA, scalingB, previousWords);
    setPublishBreakdown(bd);
    setShowPublishPreview(true);
  };

  const confirmPublish = () => {
    if(!publishBreakdown) return;
    setPublishedLexicons(p=>[{ id:Date.now(), entries:[...lexicon], quillsEarned:publishBreakdown.total, date:new Date().toLocaleDateString(), coverId:activeCoverId, pageId:activePageId },...p]);
    setQuills(p=>p+publishBreakdown.total);
    advanceMissions("publish", 1);
    advanceAchievement("lexicons_published", 1);
    setShowPublishPreview(false);
    setShowPublishAnim(true);
    setLexicon([]);
    setWordTiles([]);
    setCollectedInk(0);
    setLetters(() => { const s={}; for(let i=0;i<15;i++){const l=randomLetter();s[l]=(s[l]||0)+1;} return s; });
    setSpecialTiles([]);
    setWellCount(1);
    setWells([{ ink: 50, collecting: false, collectTimer: 10 }]);
    setWellMgrOwned([]);
    setWellMgrEnabled([]);
    setPressCount(0);
    setPresses([]);
    setPressMgrOwned([]);
    setRecentTiles([]);
    setPressEjects({});
    setWellUpgradeLevels([mkWellUpg()]);
    setMgrUpgradeLevels([]);
    setPressUpgradeLevels([]);
  };

  const buyDeviceUpgrade = useCallback((deviceType, deviceIdx, upgrade, count, totalCost) => {
    if (collectedInk < totalCost) return;
    setCollectedInk(p => p - totalCost);
    const apply = (prev) => {
      const next = [...prev];
      next[deviceIdx] = { ...next[deviceIdx], [upgrade.name]: (next[deviceIdx][upgrade.name] ?? 0) + count };
      return next;
    };
    if (deviceType === "well")    setWellUpgradeLevels(apply);
    if (deviceType === "manager") setMgrUpgradeLevels(apply);
    if (deviceType === "press")   setPressUpgradeLevels(apply);
    showMsg(`${upgrade.name} → Lv ${count} (−${fmt(Math.ceil(totalCost))} ink)`);
  }, [collectedInk, showMsg]);

  const clearPressEject = (idx) => setPressEjects(p => { const n = {...p}; delete n[idx]; return n; });

  const buyItem = (type, item) => {
    if(goldenNotebooks < item.cost){showMsg("Not enough golden notebooks!");return;}
    setGoldenNotebooks(p => p - item.cost);
    if(type === "cover"){setOwnedCovers(p=>[...p,item.id]);setActiveCoverId(item.id);showMsg(`Unlocked "${item.name}"!`);}
    else{setOwnedPages(p=>[...p,item.id]);setActivePageId(item.id);showMsg(`Unlocked "${item.name}"!`);}
  };

  const addWordTile = (l, tileType = "normal", insertAt = null) => {
    const doInsert = (p, tile) => {
      if (insertAt === null || insertAt >= p.length) return [...p, tile];
      const next = [...p]; next.splice(insertAt, 0, tile); return next;
    };
    if (tileType === "lexicoin") {
      const usedIds = new Set(wordTiles.filter(t => t.tileType === "lexicoin").map(t => t.sourceTileId));
      const avail = specialTiles.find(t => t.type === "lexicoin" && !usedIds.has(t.id));
      if (!avail) return;
      setWordTiles(p => doInsert(p, { id: nextTileId(), letter: l, tileType: "lexicoin", sourceTileId: avail.id }));
    } else if (canSupplyLetter(letters, specialTiles, wordString, l)) {
      setWordTiles(p => doInsert(p, { id: nextTileId(), letter: l, tileType }));
    }
  };

  const addLexiconPlaceholder = (insertAt = null) => {
    const usedIds = new Set(wordTiles.filter(t => t.tileType === "lexicoin").map(t => t.sourceTileId));
    const avail = specialTiles.find(t => t.type === "lexicoin" && !usedIds.has(t.id));
    if (!avail) return null;
    const id = nextTileId();
    setWordTiles(p => {
      const tile = { id, letter: null, tileType: "lexicoin", sourceTileId: avail.id };
      if (insertAt === null || insertAt >= p.length) return [...p, tile];
      const next = [...p]; next.splice(insertAt, 0, tile); return next;
    });
    return id;
  };

  const assignLexiconLetter = (tileId, letter) => {
    setWordTiles(p => p.map(t => t.id === tileId ? { ...t, letter } : t));
  };
  const removeWordTile   = (slotId) => setWordTiles(p => p.filter(t => t.id !== slotId));
  const clearWord        = () => setWordTiles([]);
  const reorderWordTiles = (fromIdx, toDropZone) => {
    setWordTiles(prev => {
      if (toDropZone === fromIdx || toDropZone === fromIdx + 1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toDropZone > fromIdx ? toDropZone - 1 : toDropZone, 0, moved);
      return next;
    });
  };

  return (
    <div className="lex-app-inner" style={{ color:P.textPrimary, fontFamily:"'Junicode', sans-serif" }}>

      <div style={{ textAlign:"center", padding:"16px 16px 0", position:"relative", zIndex:1 }}>
        <h1 className="lex-title" style={{ fontFamily:"'BLKCHCRY',serif", fontWeight:700, letterSpacing:1, margin:0, color:P.textPrimary }}>Lexicographer</h1>
        <div style={{ width:80, height:1, margin:"6px auto", background:P.border }}/>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:`1px solid ${P.border}`, margin:"0 16px" }}>
        {/* 2×2 currency grid — left */}
        <div style={{ display:"grid", gridTemplateColumns:"auto auto", gap:"3px 20px" }}>
          {[
            { key:"ink",     icon:<Droplet    size={12} strokeWidth={1.5}/>, v:fmt(collectedInk),   c:P.ink },
            { key:"quills",  icon:<Feather    size={12} strokeWidth={1.5}/>, v:fmt(quills),          c:P.quill },
            { key:"letters", icon:<CaseUpper  size={12} strokeWidth={1.5}/>, v:fmt(totalLetters),   c:P.textSecondary },
            { key:"nb",      icon:<BookMarked size={12} strokeWidth={1.5}/>, v:fmt(goldenNotebooks), c:P.quill },
          ].map(s=>(
            <div key={s.key} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ color:s.c, opacity:0.7, display:"flex", alignItems:"center" }}>{s.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:s.c, fontFamily:"'Junicode',sans-serif", lineHeight:1.2 }}>{s.v}</div>
            </div>
          ))}
        </div>
        {/* Action buttons — right */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <AchievementsTrigger onClick={() => setShowAchievements(true)} claimableCount={claimableCount} />
          <MissionsTrigger onClick={() => setShowMissions(true)} unclaimedCount={missions.filter(m => m.progress >= m.target && !m.claimed).length} />
          <div data-settings-panel style={{ position:"relative" }}>
            <div onClick={() => setShowSettings(s => !s)} style={{ display:"flex", alignItems:"center", cursor:"pointer", color:P.textSecondary, opacity:showSettings?1:0.65, transition:"opacity 0.2s" }} title="Settings">
              <Settings size={18} strokeWidth={1.5}/>
            </div>
            {showSettings && (
              <div data-settings-panel style={{ position:"absolute", right:0, top:"calc(100% + 8px)", minWidth:130, background:"#fff", border:`1px solid ${P.border}`, borderRadius:6, overflow:"hidden", zIndex:200, boxShadow:"0 4px 16px rgba(0,0,0,0.18)" }}>
                <div onClick={() => { setShowStats(true); setShowSettings(false); }} style={{ padding:"9px 14px", cursor:"pointer", fontSize:11, fontFamily:"'Junicode',sans-serif", color:P.textSecondary, borderBottom:`1px solid ${P.borderLight}` }}>
                  Stats
                </div>
                <div onClick={() => { setShowDebug(d => !d); setShowSettings(false); }} style={{ padding:"9px 14px", cursor:"pointer", fontSize:11, fontFamily:"'Junicode',sans-serif", color:showDebug ? P.ink : P.textSecondary, borderBottom:`1px solid ${P.borderLight}` }}>
                  {showDebug ? "✓ " : ""}Debug
                </div>
                {currentUser && (
                  <div onClick={() => { setShowAccountModal(true); setShowSettings(false); }} style={{ padding:"9px 14px", cursor:"pointer", fontSize:11, fontFamily:"'Junicode',sans-serif", color:P.textSecondary, borderBottom:`1px solid ${P.borderLight}` }}>Account</div>
                )}
                {currentUser
                  ? <div onClick={() => { handleLogout(); setShowSettings(false); }} style={{ padding:"9px 14px", cursor:"pointer", fontSize:11, fontFamily:"'Junicode',sans-serif", color:P.textSecondary }}>Sign out</div>
                  : <div onClick={() => { setShowAuthModal(true); setShowSettings(false); }} style={{ padding:"9px 14px", cursor:"pointer", fontSize:11, fontFamily:"'Junicode',sans-serif", color:P.textSecondary }}>Sign in</div>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", margin:"0 16px", borderBottom:`1px solid ${P.border}`, position:"relative", zIndex:1 }}>
        {TABS.map(tab => {
          const isHinted = tutorialActive && TUTORIAL_TAB_HINTS[tutorialStep] === tab.id && activeTab !== tab.id;
          return (
            <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)} className="lex-tab-btn"
              animate={isHinted ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={isHinted ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : {}}
              style={{
                flex:1, padding:"12px 4px", background:"none", border:"none",
                borderBottom: activeTab===tab.id ? `2px solid ${P.ink}` : "2px solid transparent",
                color: activeTab===tab.id ? P.textPrimary : isHinted ? P.ink : P.textMuted,
                cursor:"pointer",
                fontFamily:"'BLKCHCRY',serif", fontSize:12,
                fontWeight: activeTab===tab.id ? 700 : isHinted ? 700 : 400,
                transition:"all 0.2s",
              }}>{tab.label}</motion.button>
          );
        })}
      </div>

      <div className="lex-tab-content" style={{ flex:1, padding:16, position:"relative", zIndex:1 }}>
        {showDebug && <DebugPanel
          collectedInk={collectedInk} setCollectedInk={setCollectedInk}
          letters={letters} setLetters={setLetters}
          setLexicon={setLexicon} setQuills={setQuills} setWells={setWells}
          setSpecialTiles={setSpecialTiles} setGoldenNotebooks={setGoldenNotebooks}
          showMsg={showMsg}
          scalingA={scalingA} setScalingA={setScalingA}
          scalingB={scalingB} setScalingB={setScalingB}
          onClose={() => setShowDebug(false)}
        />}

        {activeTab==="lexicon" && <LexiconTab
          letters={letters} specialTiles={specialTiles} totalLetters={totalLetters}
          collectedInk={collectedInk} lexicon={lexicon} inkCost={inkCost}
          wordTiles={wordTiles} wordString={wordString}
          addWordTile={addWordTile} addLexiconPlaceholder={addLexiconPlaceholder}
          assignLexiconLetter={assignLexiconLetter}
          removeWordTile={removeWordTile} clearWord={clearWord} reorderWordTiles={reorderWordTiles}
          createWord={createWord} publishLexicon={publishLexicon} isValidWord={isValidWord}
          activeCover={activeCover} activePageStyle={activePageStyle}
          coverMult={coverMult} pageMult={pageMult}
          maxLetters={effectiveMaxLetters}
          scalingA={scalingA} scalingB={scalingB}
          monkeyCount={permUpgradeLevels["monkey_typewriter"] || 0}
          monkeyTimers={monkeyTimers}
          monkeyAnims={monkeyAnims}
          clearMonkeyAnim={clearMonkeyAnim}
          volumeNumber={publishedLexicons.length + 1}
        />}

        {activeTab==="inkwell" && <InkWellTab
          wells={wells} wellCount={wellCount} wellMgrOwned={wellMgrOwned}
          wellMgrEnabled={wellMgrEnabled} collectedInk={collectedInk}
          collectWell={collectWell} buyWell={buyWell} buyWellManager={buyWellManager}
          toggleWellManager={toggleWellManager}
          wellUpgradeLevels={wellUpgradeLevels} mgrUpgradeLevels={mgrUpgradeLevels}
          buyDeviceUpgrade={buyDeviceUpgrade}
          wellRefs={wellRefsArr} wellFloats={wellFloats}
          tutorialStep={tutorialStep} unlockedQtys={unlockedQtys} inkMult={effectiveInkMult}
        />}

        {activeTab==="press" && <LetterPressTab
          presses={presses} pressCount={pressCount} pressMgrOwned={pressMgrOwned}
          startPress={startPress} buyPress={buyPress} buyPressManager={buyPressManager}
          totalLetters={totalLetters} letters={letters} specialTiles={specialTiles}
          collectedInk={collectedInk} pressUpgradeLevels={pressUpgradeLevels}
          buyDeviceUpgrade={buyDeviceUpgrade}
          recentTiles={recentTiles} pressEjects={pressEjects} clearPressEject={clearPressEject}
          unlockedQtys={unlockedQtys} maxLetters={effectiveMaxLetters}
        />}

        {activeTab==="shop" && <ShopTab
          quills={quills} goldenNotebooks={goldenNotebooks}
          ownedCovers={ownedCovers} ownedPages={ownedPages}
          activeCoverId={activeCoverId} activePageId={activePageId}
          setActiveCoverId={setActiveCoverId} setActivePageId={setActivePageId}
          buyItem={buyItem} showMsg={showMsg}
          permUpgradeLevels={permUpgradeLevels} buyPermUpgrade={buyPermUpgrade}
          unlockedQtys={unlockedQtys}
          currentUser={currentUser} onShowAuth={() => setShowAuthModal(true)}
          onBuyIap={handleBuyIap} onLogout={handleLogout}
        />}

        {activeTab==="published" && <LibraryTab
          publishedLexicons={publishedLexicons} quills={quills} goldenNotebooks={goldenNotebooks}
        />}
      </div>

      {/* Achievements popup */}
      {showAchievements && (
        <AchievementsPanel
          achievements={ACHIEVEMENTS}
          achievementProgress={achievementProgress}
          achievementLevels={achievementLevels}
          onClaim={claimAchievement}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* Stats modal */}
      {showStats && (
        <StatsModal
          publishedLexicons={publishedLexicons}
          achievementProgress={achievementProgress}
          achievementLevels={achievementLevels}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* Daily missions popup */}
      {showMissions && (
        <MissionsPanel
          missions={missions}
          onClaim={claimMission}
          onClose={() => setShowMissions(false)}
        />
      )}

      {/* Pre-publish confirmation popup */}
      {showPublishPreview && publishBreakdown && (
        <motion.div onClick={() => setShowPublishPreview(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
          style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(44,36,32,0.55)", zIndex:100 }}>
          <div style={{ background:P.panelBg, border:`1px solid ${P.border}`, borderRadius:12, padding:"28px 28px", maxWidth:380, width:"90%", boxShadow:"0 8px 32px rgba(44,36,32,0.15)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:"center", fontFamily:"'BLKCHCRY',serif", fontSize:20, fontWeight:700, color:P.textPrimary, letterSpacing:1, marginBottom:4 }}>Publish Lexicon?</div>
            <div style={{ textAlign:"center", fontSize:11, color:P.textMuted, fontFamily:"'Junicode',sans-serif", marginBottom:18 }}>This will reset your current round.</div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>{publishBreakdown.wordCount} new words × {publishBreakdown.A}</span>
                <span style={{ fontSize:14, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>{fmt(publishBreakdown.wordBonus)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif", display:"inline-flex", alignItems:"center", gap:3 }}><Aperture size={11}/>{publishBreakdown.totalLexicoins} Lexicoins × {publishBreakdown.B}</span>
                <span style={{ fontSize:14, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>+{fmt(publishBreakdown.lexicoinBonus)}</span>
              </div>
              {publishBreakdown.top10.length > 0 && (
                <div style={{ fontSize:11, color:P.textMuted, fontFamily:"'Junicode',sans-serif", display:"flex", alignItems:"center", gap:2 }}>
                  <Aperture size={10}/>{fmt(publishBreakdown.top10Total)} → ×{publishBreakdown.highMult.toFixed(2)} word bonus
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>Design bonus</span>
                <span style={{ fontSize:14, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>×{publishBreakdown.designMult.toFixed(2)}</span>
              </div>
              <div style={{ height:1, background:P.border }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>Quills earned</span>
                <span style={{ fontSize:18, color:P.quill, fontFamily:"'Junicode',sans-serif", fontWeight:700, display:"inline-flex", alignItems:"center", gap:4 }}><Feather size={15}/> {fmt(publishBreakdown.total)}</span>
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowPublishPreview(false)} style={{ ...st.btn(false), flex:1, cursor:"pointer" }}>Cancel</button>
              <button onClick={confirmPublish} style={{ ...st.btn(true), flex:2 }}>Confirm Publish</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Publish breakdown overlay */}
      {showPublishAnim && publishBreakdown && (
        <motion.div onClick={()=>{setShowPublishAnim(false);setPublishBreakdown(null);showMsg(`Published! Earned ✦${fmt(publishBreakdown.total)} quills!`);}}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
          style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(44,36,32,0.55)", zIndex:100, cursor:"pointer" }}>
          <div style={{ background:P.panelBg, border:`1px solid ${P.border}`, borderRadius:12, padding:"28px 28px", maxWidth:380, width:"90%", boxShadow:"0 8px 32px rgba(44,36,32,0.15)" }}>
            <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.5 }}
              style={{ textAlign:"center", fontFamily:"'BLKCHCRY',serif", fontSize:20, fontWeight:700, color:P.textPrimary, letterSpacing:1, marginBottom:18 }}>Lexicon Published</motion.div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.2 }}
                style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>{publishBreakdown.wordCount} new words × {publishBreakdown.A}</span>
                <span style={{ fontSize:14, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>{fmt(publishBreakdown.wordBonus)}</span>
              </motion.div>
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.35 }}
                style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif", display:"inline-flex", alignItems:"center", gap:3 }}><Aperture size={11}/>{publishBreakdown.totalLexicoins} Lexicoins × {publishBreakdown.B}</span>
                <span style={{ fontSize:14, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>+{fmt(publishBreakdown.lexicoinBonus)}</span>
              </motion.div>
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.45 }}
                style={{ height:1, background:P.border }}/>
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.5 }}
                style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>Base</span>
                <span style={{ fontSize:15, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>{fmt(publishBreakdown.base)}</span>
              </motion.div>

              {publishBreakdown.top10.length > 0 && (
                <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.6 }}>
                  <div style={{ fontSize:11, color:P.textMuted, fontFamily:"'Junicode',sans-serif", marginBottom:4 }}>Top scoring words:</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:4 }}>
                    {publishBreakdown.top10.map((item,i)=>(
                      <span key={i} style={{ padding:"2px 6px", background:P.surfaceBg, border:`1px solid ${P.border}`, borderRadius:3, fontSize:10, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>
                        {item.word.toLowerCase()} <span style={{ color:P.quill, display:"inline-flex", alignItems:"center", gap:2 }}><Aperture size={9}/>{fmt(item.score)}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:P.textMuted, fontFamily:"'Junicode',sans-serif", display:"flex", alignItems:"center", gap:2 }}><Aperture size={10}/>{fmt(publishBreakdown.top10Total)} → ×{publishBreakdown.highMult.toFixed(2)} word bonus</div>
                </motion.div>
              )}

              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.75 }}
                style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>Design bonus</span>
                <span style={{ fontSize:14, color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>×{publishBreakdown.designMult.toFixed(2)}</span>
              </motion.div>
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.85 }}
                style={{ height:1, background:P.border, margin:"4px 0" }}/>
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.95 }}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, color:P.textSecondary, fontFamily:"'Junicode',sans-serif" }}>Quills earned</span>
                <span style={{ fontSize:18, color:P.quill, fontFamily:"'Junicode',sans-serif", fontWeight:700, display:"inline-flex", alignItems:"center", gap:4 }}><Feather size={15}/> {fmt(publishBreakdown.total)}</span>
              </motion.div>
            </div>

            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:1.1 }}
              style={{ textAlign:"center", fontSize:10, color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>tap anywhere to continue</motion.div>
          </div>
        </motion.div>
      )}

      {showAccountModal && (
        <AccountModal
          currentUser={currentUser}
          quills={quills}
          goldenNotebooks={goldenNotebooks}
          publishedLexicons={publishedLexicons}
          onClose={() => setShowAccountModal(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onLogin={handleLogin}
          onClose={() => { setShowAuthModal(false); setAuthResetToken(null); }}
          resetToken={authResetToken}
        />
      )}

      {offlineReward && (
        <OfflineRewardModal reward={offlineReward} onClose={() => setOfflineReward(null)} />
      )}

      {tutorialActive && tutorialStep === 0 && (
        <TutorialWelcomeModal onStart={advanceTutorial} onSkip={skipTutorial} />
      )}
      {tutorialActive && tutorialStep >= 1 && tutorialStep <= 7 && (
        <TutorialCard
          step={tutorialStep}
          onNext={tutorialStep === 7 ? completeTutorial : advanceTutorial}
          onSkip={skipTutorial}
          setActiveTab={setActiveTab}
        />
      )}

      <GameCanvas ref={gameCanvasRef} />
    </div>
  );
}
