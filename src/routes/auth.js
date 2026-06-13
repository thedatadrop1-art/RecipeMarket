const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { query } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// ── POST /api/auth/register  — create user after Firebase signup ──
router.post('/register', [
  body('display_name').trim().isLength({ min: 2, max: 60 }),
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_]+$/i),
  body('firebase_token').notEmpty(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { display_name, username, firebase_token } = req.body;

    // Verify the Firebase token
    const decoded = await admin.auth().verifyIdToken(firebase_token);

    // Check username availability
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE username ILIKE $1', [username]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create user
    const { rows: [user] } = await query(`
      INSERT INTO users (email, username, display_name, auth_provider, auth_uid)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (auth_uid) DO UPDATE SET email=EXCLUDED.email
      RETURNING id, email, username, display_name, is_premium, created_at
    `, [
      decoded.email,
      username.toLowerCase(),
      display_name,
      decoded.firebase?.sign_in_provider?.split('.')[0] || 'email',
      decoded.uid,
    ]);

    // Send welcome notification
    await query(`
      INSERT INTO notifications (user_id, type, message)
      VALUES ($1, 'system', '👋 Welcome to RecipeMarket! Browse free recipes, join the community, and track ingredients at local stores.')
    `, [user.id]);

    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Account already exists with this email' });
    }
    next(err);
  }
});

// ── GET /api/auth/me  — get current user ──────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { rows: [user] } = await query(`
    SELECT
      u.id, u.email, u.username, u.display_name, u.bio, u.avatar_url,
      u.is_premium, u.purchase_date, u.location_city, u.location_state, u.created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id  = u.id) AS following_count,
      (SELECT COUNT(*) FROM recipes WHERE author_id = u.id AND is_published=TRUE) AS recipe_count,
      (SELECT ROUND(AVG(avg_rating)::numeric, 2) FROM recipes WHERE author_id = u.id AND avg_rating > 0) AS avg_rating,
      (SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND is_read=FALSE) AS unread_notifications
    FROM users u WHERE u.id = $1
  `, [req.user.id]);

  res.json({ user });
});

// ── PATCH /api/auth/me  — update profile ──────────────────────────
router.patch('/me', authenticate, [
  body('display_name').optional().trim().isLength({ min: 2, max: 60 }),
  body('bio').optional().trim().isLength({ max: 300 }),
  body('location_city').optional().isString(),
  body('location_state').optional().isString(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { display_name, bio, location_city, location_state, location_lat, location_lng } = req.body;

    const { rows: [user] } = await query(`
      UPDATE users SET
        display_name   = COALESCE($1, display_name),
        bio            = COALESCE($2, bio),
        location_city  = COALESCE($3, location_city),
        location_state = COALESCE($4, location_state),
        location_lat   = COALESCE($5, location_lat),
        location_lng   = COALESCE($6, location_lng),
        updated_at     = NOW()
      WHERE id = $7
      RETURNING id, email, username, display_name, bio, avatar_url, is_premium, location_city, location_state
    `, [display_name, bio, location_city, location_state, location_lat, location_lng, req.user.id]);

    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
