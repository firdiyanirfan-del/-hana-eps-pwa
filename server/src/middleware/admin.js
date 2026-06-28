import jwt from 'jsonwebtoken';
import { get } from '../db.js';

const ADMIN_EMAILS = ['1tumbal21@gmail.com'];

export async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await get('SELECT email FROM users WHERE id = $1', [decoded.userId]);
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function isAdmin(email) {
  return ADMIN_EMAILS.includes(email);
}