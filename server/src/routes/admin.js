import { Router } from 'express';
import { init, get, all, run } from '../db.js';
import { adminMiddleware, isAdmin as checkAdmin } from '../middleware/admin.js';
import { authMiddleware } from '../middleware/auth.js';

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
        'SELECT u.id, u.email, u.name, u.avatar, u.is_premium, u.created_at, p.xp, p.streak FROM users u LEFT JOIN progress p ON u.id = p.user_id WHERE u.name ILIKE $1 OR u.email ILIKE $1 ORDER BY u.created_at DESC LIMIT $2 OFFSET $3',
        [s, limit, offset]
      );
      total = await get('SELECT COUNT(*)::int as count FROM users WHERE name ILIKE $1 OR email ILIKE $1', [s]);
    } else {
      users = await all(
        'SELECT u.id, u.email, u.name, u.avatar, u.is_premium, u.created_at, p.xp, p.streak FROM users u LEFT JOIN progress p ON u.id = p.user_id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2',
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

router.put('/users/:id/premium', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const user = await get('SELECT is_premium FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = !user.is_premium;
    await run('UPDATE users SET is_premium = $1 WHERE id = $2', [newStatus, req.params.id]);
    res.json({ success: true, is_premium: newStatus });
  } catch (err) {
    console.error('Admin toggle premium error:', err);
    res.status(500).json({ error: 'Failed to toggle premium' });
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
      'SELECT f.id, f.type, f.message, f.status, f.admin_reply, f.created_at, u.email, u.name FROM feedback f LEFT JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC LIMIT 50'
    );
    res.json({ feedback });
  } catch (err) {
    console.error('Admin feedback error:', err);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

router.get('/feedback/unread-count', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const result = await get("SELECT COUNT(*)::int as count FROM feedback WHERE status = 'baru'");
    res.json({ count: result.count });
  } catch (err) {
    console.error('Admin unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

router.put('/feedback/:id/status', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const { status } = req.body;
    if (!['baru', 'dibaca', 'selesai'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await run('UPDATE feedback SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin feedback status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.put('/feedback/:id/reply', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const { reply } = req.body;
    await run('UPDATE feedback SET admin_reply = $1, status = $2 WHERE id = $3', [reply, 'selesai', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin feedback reply error:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// ===================== ANALYTICS ENDPOINTS =====================

router.get('/analytics/premium', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const result = await get(`
      SELECT 
        COUNT(*) FILTER (WHERE is_premium = true)::int as totalPremium,
        COUNT(*) FILTER (WHERE is_premium = false)::int as totalFree,
        ROUND(COUNT(*) FILTER (WHERE is_premium = true)::decimal / NULLIF(COUNT(*), 0) * 100, 1) as conversionRate
      FROM users
    `);
    res.json(result);
  } catch (err) {
    console.error('Admin premium analytics error:', err);
    res.status(500).json({ error: 'Failed to load premium analytics' });
  }
});

router.get('/analytics/users', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const days = parseInt(req.query.days) || 30;
    const data = await all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as count
      FROM users 
      WHERE created_at >= CURRENT_DATE - $1::interval
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [`${days} days`]);
    res.json({ data, days });
  } catch (err) {
    console.error('Admin user analytics error:', err);
    res.status(500).json({ error: 'Failed to load user analytics' });
  }
});

router.get('/analytics/engagement', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const data = await all(`
      SELECT
        CASE WHEN u.is_premium THEN 'premium' ELSE 'free' END as group_name,
        COUNT(DISTINCT u.id)::int as userCount,
        COALESCE(AVG(p.xp), 0)::int as avgXp,
        ROUND(COALESCE(AVG(p.streak), 0), 1) as avgStreak,
        COALESCE(AVG(u.chat_tokens), 0)::int as avgChatTokens
      FROM users u
      LEFT JOIN progress p ON u.id = p.user_id
      GROUP BY u.is_premium
    `);
    res.json({ data });
  } catch (err) {
    console.error('Admin engagement analytics error:', err);
    res.status(500).json({ error: 'Failed to load engagement analytics' });
  }
});

router.get('/analytics/quiz', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const quizCompletions = await get(`
      SELECT COALESCE(SUM(COALESCE(jsonb_array_length(quiz_history::jsonb), 0)), 0)::int as totalQuizCompletions
      FROM progress
    `);
    const activeUsers = await get(`
      SELECT COUNT(*)::int as count FROM progress WHERE quiz_history IS NOT NULL AND quiz_history != '[]'
    `);
    const lifetimeStats = await get(`
      SELECT 
        COALESCE(SUM(COALESCE(NULLIF(lifetime_stats::jsonb->>'readTotal', '')::int, 0)), 0)::int as totalReadQuestions,
        COALESCE(SUM(COALESCE(NULLIF(lifetime_stats::jsonb->>'listTotal', '')::int, 0)), 0)::int as totalListenQuestions,
        COALESCE(SUM(COALESCE(NULLIF(lifetime_stats::jsonb->>'readCorrect', '')::int, 0)), 0)::int as totalReadCorrect,
        COALESCE(SUM(COALESCE(NULLIF(lifetime_stats::jsonb->>'listCorrect', '')::int, 0)), 0)::int as totalListenCorrect
      FROM progress
      WHERE lifetime_stats IS NOT NULL AND lifetime_stats != '{}'
    `);
    res.json({
      totalQuizCompletions: quizCompletions.totalQuizCompletions,
      activeQuizUsers: activeUsers.count,
      ...lifetimeStats
    });
  } catch (err) {
    console.error('Admin quiz analytics error:', err);
    res.status(500).json({ error: 'Failed to load quiz analytics' });
  }
});

router.get('/analytics/wrong-answers', adminMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const data = await all(`
      SELECT 
        question_id,
        level,
        type,
        SUM(count)::int as totalWrong,
        COUNT(DISTINCT user_id)::int as affectedUsers
      FROM wrong_answers
      GROUP BY question_id, level, type
      ORDER BY totalWrong DESC
      LIMIT 50
    `);
    res.json({ data });
  } catch (err) {
    console.error('Admin wrong answers error:', err);
    res.status(500).json({ error: 'Failed to load wrong answers' });
  }
});

router.get('/check', authMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const user = await get('SELECT email FROM users WHERE id = $1', [req.userId]);
    res.json({ isAdmin: !!(user && checkAdmin(user.email)) });
  } catch (err) {
    res.json({ isAdmin: false });
  }
});

export default router;