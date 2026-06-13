const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// GET /api/users/:id - get a user profile
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [user] } = await query(`
      SELECT
        u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id  = u.id) AS following_count,
        (SELECT COUNT(*) FROM recipes WHERE author_id = u.id AND is_published=TRUE) AS recipe_count
      FROM users u WHERE u.id = $1
    `, [req.params.id]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

// POST /api/users/:id/follow
router.post('/:id/follow', authenticate, async (req, res, next) => {
  try {
    await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ following: true });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id/follow
router.delete('/:id/follow', authenticate, async (req, res, next) => {
  try {
    await query(
      'DELETE FROM follows WHERE follower_id=$1 AND following_id=$2',
      [req.user.id, req.params.id]
    );
    res.json({ following: false });
  } catch (err) { next(err); }
});

module.exports = router;