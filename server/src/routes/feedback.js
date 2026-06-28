import { Router } from 'express';
import { init, run } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

async function ensureDb() {
  if (!global.dbInitialized) {
    await init();
    global.dbInitialized = true;
  }
}

router.post('/', async (req, res) => {
  try {
    await ensureDb();
    const { type, message } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message required' });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch {}
    }

    await run(
      'INSERT INTO feedback (user_id, type, message) VALUES ($1, $2, $3)',
      [userId, type, message]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

export default router;