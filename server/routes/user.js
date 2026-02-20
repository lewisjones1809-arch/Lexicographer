import { Router } from 'express';
import { getUserState, saveUserState } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();

// GET /api/user/state
router.get('/state', requireAuth, (req, res) => {
  const state = getUserState(req.userId);
  if (!state) return res.status(404).json({ error: 'User state not found' });
  res.json(state);
});

// PUT /api/user/state
router.put('/state', requireAuth, (req, res) => {
  const { quills, goldenNotebooks, publishedLexicons, ownedCovers, ownedPages,
          activeCoverId, activePageId, permUpgradeLevels,
          achievementProgress, achievementLevels, volatileState } = req.body;
  try {
    saveUserState(req.userId, {
      quills, goldenNotebooks, publishedLexicons, ownedCovers, ownedPages,
      activeCoverId, activePageId, permUpgradeLevels,
      achievementProgress, achievementLevels, volatileState,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Save state error:', err.message);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

export default router;
