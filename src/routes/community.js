const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/threads', optionalAuth, async (req, res, next) => {
  try {
    const { category } = req.query;
    let sql = `SELECT t.*, u.display_name AS author_name, u.avatar_url AS author_avatar
               FROM threads t JOIN users u ON t.author_id = u.id`;
    const params = [];
    if (category) { sql += ` WHERE t.category = $1`; params.push(category); }
    sql += ` ORDER BY t.created_at DESC LIMIT 50`;
    const { rows } = await query(sql, params);
    res.json({ threads: rows });
  } catch (err) { next(err); }
});

router.get('/threads/:id', optionalAuth, async (req, res, next) => {
  try {
    const { rows: [thread] } = await query(
      `SELECT t.*, u.display_name AS author_name FROM threads t
       JOIN users u ON t.author_id = u.id WHERE t.id = $1`, [req.params.id]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const { rows: replies } = await query(
      `SELECT r.*, u.display_name AS author_name FROM thread_replies r
       JOIN users u ON r.author_id = u.id WHERE r.thread_id = $1
       ORDER BY r.created_at ASC`, [req.params.id]);
    res.json({ thread: { ...thread, replies } });
  } catch (err) { next(err); }
});

router.post('/threads', authenticate, async (req, res, next) => {
  try {
    const { category, title, body } = req.body;
    const { rows: [thread] } = await query(
      `INSERT INTO threads (author_id, category, title, body)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, category, title, body]);
    res.status(201).json({ thread });
  } catch (err) { next(err); }
});

router.post('/threads/:id/reply', authenticate, async (req, res, next) => {
  try {
    const { body } = req.body;
    const { rows: [reply] } = await query(
      `INSERT INTO thread_replies (thread_id, author_id, body)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, body]);
    await query(`UPDATE threads SET reply_count = reply_count + 1 WHERE id = $1`, [req.params.id]);
    res.status(201).json({ reply });
  } catch (err) { next(err); }
});

router.post('/threads/:id/like', authenticate, async (req, res, next) => {
  try {
    await query(
      `INSERT INTO thread_likes (user_id, thread_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]);
    await query(`UPDATE threads SET like_count = like_count + 1 WHERE id = $1`, [req.params.id]);
    res.json({ liked: true });
  } catch (err) { next(err); }
});

module.exports = router;