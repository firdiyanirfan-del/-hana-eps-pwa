import { Router } from 'express';
import { init, get, run } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const DAILY_LIMIT = 10000;

async function ensureDb() {
  if (!global.dbInitialized) {
    await init();
    global.dbInitialized = true;
  }
}

router.post('/', async (req, res) => {
  try {
    const { messages, model: clientModel, temperature = 0.7, max_tokens = 2048 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Check JWT
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Login required' });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded) {
      return res.status(401).json({ error: 'Login required' });
    }

    const userId = decoded.userId;

    // Check user & limit
    await ensureDb();
    const user = await get('SELECT chat_tokens, chat_date, is_premium FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    let tokensUsed = user.chat_tokens || 0;

    if (user.chat_date !== today) {
      tokensUsed = 0;
    }

    if (!user.is_premium && tokensUsed >= DAILY_LIMIT) {
      return res.status(429).json({ error: 'Daily limit reached', limit: DAILY_LIMIT, used: tokensUsed });
    }

    // Call Cerebras
    const apiKey = process.env.CEREBRAS_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI API key not configured' });
    }

    const model = clientModel || 'gpt-oss-120b';

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Cerebras API error:', response.status, err);
      return res.status(response.status).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();

    // Update token usage
    const tokens = data?.usage?.total_tokens || 0;
    if (!user.is_premium) {
      await run(
        'UPDATE users SET chat_tokens = $1, chat_date = $2 WHERE id = $3',
        [tokensUsed + tokens, today, userId]
      );
    }

    // Return response with remaining tokens info
    const remaining = user.is_premium ? -1 : Math.max(0, DAILY_LIMIT - (tokensUsed + tokens));
    res.json({ ...data, remaining_tokens: remaining });
  } catch (err) {
    console.error('Chat proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;