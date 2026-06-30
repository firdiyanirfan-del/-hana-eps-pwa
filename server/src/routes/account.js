import { Router } from 'express';
import { init, run } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

async function ensureDb() {
  if (!global.dbInitialized) {
    await init();
    global.dbInitialized = true;
  }
}

router.delete('/', authMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const userId = req.userId;
    await run('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
