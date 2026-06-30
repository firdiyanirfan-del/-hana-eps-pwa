import { Router } from 'express';
import { init, get, run, all } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

async function ensureDb() {
  if (!global.dbInitialized) {
    await init();
    global.dbInitialized = true;
  }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const userId = req.userId;

    const progress = await get(
      'SELECT xp, streak, last_login, badges, quiz_history, daily_stats, lifetime_stats FROM progress WHERE user_id = $1',
      [userId]
    ) || {};

    const wrongAnswers = await all(
      'SELECT question_id, level, type, count, last_wrong FROM wrong_answers WHERE user_id = $1',
      [userId]
    ) || [];

    const userInfo = await get(
      'SELECT is_premium, email, name, avatar FROM users WHERE id = $1',
      [userId]
    ) || {};

    const settings = await get(
      'SELECT font_family, font_size, exam_date, bookmarks, streak_dates FROM settings WHERE user_id = $1',
      [userId]
    ) || {};

    res.json({
      progress: {
        xp: progress.xp || 0,
        streak: progress.streak || 0,
        lastLogin: progress.last_login || '',
        badges: JSON.parse(progress.badges || '{}'),
        quizHistory: JSON.parse(progress.quiz_history || '[]'),
        dailyStats: JSON.parse(progress.daily_stats || '{}'),
        lifetimeStats: JSON.parse(progress.lifetime_stats || '{}')
      },
      wrongAnswers: (wrongAnswers || []).map(w => ({
        questionId: w.question_id,
        level: w.level,
        type: w.type,
        count: w.count,
        lastWrong: w.last_wrong
      })),
      settings: {
        fontFamily: settings.font_family || 'Plus Jakarta Sans',
        fontSize: settings.font_size || 16,
        examDate: settings.exam_date || '',
        bookmarks: JSON.parse(settings.bookmarks || '[]'),
        streakDates: JSON.parse(settings.streak_dates || '[]')
      },
      isPremium: userInfo.is_premium || false,
      user: {
        email: userInfo.email || '',
        name: userInfo.name || '',
        avatar: userInfo.avatar || ''
      }
    });
  } catch (err) {
    console.error('Sync GET error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    await ensureDb();
    const userId = req.userId;
    const { progress, wrongAnswers, settings } = req.body;

    if (progress) {
      await run(`
        UPDATE progress SET
          xp = $1, streak = $2, last_login = $3, badges = $4, quiz_history = $5,
          daily_stats = $6, lifetime_stats = $7, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $8
      `, [
        progress.xp || 0,
        progress.streak || 0,
        progress.lastLogin || null,
        JSON.stringify(progress.badges || {}),
        JSON.stringify(progress.quizHistory || []),
        JSON.stringify(progress.dailyStats || {}),
        JSON.stringify(progress.lifetimeStats || {}),
        userId
      ]);
    }

    if (wrongAnswers && Array.isArray(wrongAnswers)) {
      for (const w of wrongAnswers) {
        await run(`
          INSERT INTO wrong_answers (user_id, question_id, level, type, count, last_wrong)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT(user_id, question_id) DO UPDATE SET
            count = wrong_answers.count + $7,
            last_wrong = CURRENT_TIMESTAMP
        `, [userId, w.questionId, w.level, w.type, w.count || 1, w.lastWrong || new Date().toISOString(), w.count || 1]);
      }
    }

    if (settings) {
      await run(`
        UPDATE settings SET
          font_family = $1, font_size = $2, exam_date = $3,
          bookmarks = $4, streak_dates = $5, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
      `, [
        settings.fontFamily || 'Plus Jakarta Sans',
        settings.fontSize || 16,
        settings.examDate || null,
        JSON.stringify(settings.bookmarks || []),
        JSON.stringify(settings.streakDates || []),
        userId
      ]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Sync PUT error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;