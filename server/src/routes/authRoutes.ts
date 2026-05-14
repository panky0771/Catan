import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query, queryOne } from '../config/database';
import { signToken, authenticateToken } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// =============================================
// POST /api/auth/register
// =============================================
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 32 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      // Check existing
      const existing = await queryOne(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );
      if (existing) {
        return res.status(409).json({ error: 'Username or email already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const [user] = await query<{ id: string; username: string; email: string }>(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
        [username, email, passwordHash]
      );

      const token = signToken({ userId: user.id, username: user.username, email: user.email });
      return res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// =============================================
// POST /api/auth/login
// =============================================
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await queryOne<{
        id: string;
        username: string;
        email: string;
        password_hash: string;
      }>('SELECT id, username, email, password_hash FROM users WHERE email = $1', [email]);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      const token = signToken({ userId: user.id, username: user.username, email: user.email });
      return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// =============================================
// POST /api/auth/guest - create guest account
// =============================================
router.post('/guest', async (req: Request, res: Response) => {
  const { username } = req.body;
  const guestName = (username as string)?.trim().slice(0, 20) || `Guest${Math.floor(Math.random() * 9999)}`;

  try {
    const guestId = uuidv4();
    const guestEmail = `guest_${guestId}@catan.local`;

    const [user] = await query<{ id: string; username: string; email: string }>(
      'INSERT INTO users (id, username, email, is_guest) VALUES ($1, $2, $3, true) RETURNING id, username, email',
      [guestId, guestName, guestEmail]
    );

    const token = signToken({ userId: user.id, username: user.username, email: user.email });
    return res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, isGuest: true } });
  } catch (err) {
    console.error('Guest create error:', err);
    return res.status(500).json({ error: 'Failed to create guest account' });
  }
});

// =============================================
// GET /api/auth/me - get current user
// =============================================
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: { userId: string } }).user;
  try {
    const user = await queryOne<{ id: string; username: string; email: string; avatar_url: string; is_guest: boolean }>(
      'SELECT id, username, email, avatar_url, is_guest FROM users WHERE id = $1',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// =============================================
// GET /api/auth/leaderboard
// =============================================
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const rows = await query(
      'SELECT * FROM leaderboard LIMIT 50'
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
