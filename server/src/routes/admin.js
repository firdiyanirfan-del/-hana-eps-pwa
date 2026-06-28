import { Router } from 'express';
import { init, get, all, run } from '../db.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();

async function ensureDb() {
  if (!global.dbInitialized) {
    await init();
    global.dbInitialized = true;
  }
}

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const totalUsers = await get('SELECT COUNT(*)::int as count FROM users');
    const totalFeedback = await get('SELECT COUNT(*)::int as count FROM feedback');
    const totalXp = await get('SELECT COALESCE(SUM(xp),0)::int as total FROM progress');
    const recentUsers = await all('SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5');

    res.json({
      totalUsers: totalUsers.count,
      totalFeedback: totalFeedback.count,
      totalXp: totalXp.total,
      recentUsers
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let users, total;
    if (search) {
      const s = `%${search}%`;
      users = await all(
        'SELECT u.id, u.email, u.name, u.avatar, u.created_at, p.xp, p.streak FROM users u LEFT JOIN progress p ON u.id = p.user_id WHERE u.name ILIKE $1 OR u.email ILIKE $1 ORDER BY u.created_at DESC LIMIT $2 OFFSET $3',
        [s, limit, offset]
      );
      total = await get('SELECT COUNT(*)::int as count FROM users WHERE name ILIKE $1 OR email ILIKE $1', [s]);
    } else {
      users = await all(
        'SELECT u.id, u.email, u.name, u.avatar, u.created_at, p.xp, p.streak FROM users u LEFT JOIN progress p ON u.id = p.user_id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      total = await get('SELECT COUNT(*)::int as count FROM users');
    }

    res.json({
      users,
      total: total.count,
      page,
      totalPages: Math.ceil(total.count / limit)
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    await run('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/feedback', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const feedback = await all(
      'SELECT f.id, f.type, f.message, f.created_at, u.email, u.name FROM feedback f LEFT JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC LIMIT 50'
    );
    res.json({ feedback });
  } catch (err) {
    console.error('Admin feedback error:', err);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

export default router;