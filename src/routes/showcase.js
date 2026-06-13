const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/posts', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.display_name AS author_name, u.avatar_url AS author_avatar
       FROM food_posts p JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC LIMIT 50`);
    res.json({ posts: rows });
  } catch (err) { next(err); }
});

router.post('/posts', authenticate, async (req, res, next) => {
  try {
    const { dish_name, body, recipe_id } = req.body;
    const { rows: [post] } = await query(
      `INSERT INTO food_posts (author_id, dish_name, body, recipe_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, dish_name, body, recipe_id || null]);
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

router.post('/posts/:id/rate', authenticate, async (req, res, next) => {
  try {
    const { rating } = req.body;
    await query(
      `INSERT INTO food_post_ratings (user_id, post_id, rating)
       VALUES ($1,$2,$3) ON CONFLICT (user_id, post_id) DO UPDATE SET rating=$3`,
      [req.user.id, req.params.id, rating]);
    const { rows: [updated] } = await query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count
       FROM food_post_ratings WHERE post_id=$1`, [req.params.id]);
    await query(
      `UPDATE food_posts SET avg_rating=$1, rating_count=$2 WHERE id=$3`,
      [updated.avg_rating, updated.rating_count, req.params.id]);
    res.json({ rating, avg_rating: updated.avg_rating });
  } catch (err) { next(err); }
});

router.post('/posts/:id/like', authenticate, async (req, res, next) => {
  try {
    await query(
      `INSERT INTO food_post_likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]);
    await query(
      `UPDATE food_posts SET like_count = like_count + 1 WHERE id=$1`,
      [req.params.id]);
    res.json({ liked: true });
  } catch (err) { next(err); }
});

module.exports = router;