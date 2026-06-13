const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// ── GET /api/notifications  — get user notifications ──────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit = 30, offset = 0 } = req.query;

    const { rows } = await query(`
      SELECT
        n.*,
        actor.display_name AS actor_name,
        actor.avatar_url   AS actor_avatar,
        r.title            AS recipe_title,
        r.cover_image      AS recipe_image
      FROM notifications n
      LEFT JOIN users actor ON n.actor_id = actor.id
      LEFT JOIN recipes r   ON n.recipe_id = r.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, Number(limit), Number(offset)]);

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE',
      [req.user.id]
    );

    res.json({ notifications: rows, unread_count: Number(count) });
  } catch (err) { next(err); }
});

// ── PATCH /api/notifications/read  — mark as read ─────────────────
router.patch('/read', authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body; // array of notification IDs, or omit for all

    if (ids?.length) {
      await query(
        'UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND id=ANY($2::uuid[])',
        [req.user.id, ids]
      );
    } else {
      await query(
        'UPDATE notifications SET is_read=TRUE WHERE user_id=$1',
        [req.user.id]
      );
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Helper: create a notification (used by other routes) ──────────
const createNotification = async ({ userId, type, actorId, recipeId, postId, threadId, message }) => {
  if (userId === actorId) return; // don't notify yourself
  try {
    await query(`
      INSERT INTO notifications (user_id, type, actor_id, recipe_id, post_id, thread_id, message)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [userId, type, actorId, recipeId, postId, threadId, message]);
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
