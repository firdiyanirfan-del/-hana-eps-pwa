import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { init, get, run } from '../db.js';
import { generateToken } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

function getGoogleClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function ensureDb() {
  if (!global.dbInitialized) {
    await init();
    global.dbInitialized = true;
  }
}

router.get('/google', (req, res) => {
  const client = getGoogleClient();
  const state = req.query.state || '';
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent',
    state
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    await ensureDb();
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await get('SELECT id FROM users WHERE google_id = $1', [googleId]);

    if (!user) {
      const result = await run(
        'INSERT INTO users (google_id, email, name, avatar) VALUES ($1, $2, $3, $4) RETURNING id',
        [googleId, email, name, picture]
      );
      user = { id: result.rows[0].id };

      await run('INSERT INTO progress (user_id) VALUES ($1)', [user.id]);
      await run('INSERT INTO settings (user_id) VALUES ($1)', [user.id]);
    } else {
      await run(
        'UPDATE users SET name = $1, avatar = $2, updated_at = CURRENT_TIMESTAMP WHERE google_id = $3',
        [name, picture, googleId]
      );
    }

    const token = generateToken(user.id);
    const state = req.query.state || '';
    const redirectPath = state ? `/${state}` : '';
    res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?token=${token}`);
  } catch (err) {
    console.error('OAuth error:', err);
    const state = req.query.state || '';
    const redirectPath = state ? `/${state}` : '';
    res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?error=oauth_failed`);
  }
});

router.post('/verify', async (req, res) => {
  try {
    await ensureDb();
    const { token: idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'ID token required' });
    }

    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await get('SELECT id FROM users WHERE google_id = $1', [googleId]);

    if (!user) {
      const result = await run(
        'INSERT INTO users (google_id, email, name, avatar) VALUES ($1, $2, $3, $4) RETURNING id',
        [googleId, email, name, picture]
      );
      user = { id: result.rows[0].id };

      await run('INSERT INTO progress (user_id) VALUES ($1)', [user.id]);
      await run('INSERT INTO settings (user_id) VALUES ($1)', [user.id]);
    }

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, email, name, picture } });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(401).json({ error: 'Invalid ID token' });
  }
});

router.get('/me', async (req, res) => {
  try {
    await ensureDb();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await get('SELECT id, email, name, avatar FROM users WHERE id = $1', [decoded.userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;