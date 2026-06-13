const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const { rows: [stats] } = await query(`
      SELECT
        COUNT(*) AS total_views,
        COUNT(DISTINCT session_id) AS unique_visitors
      FROM page_views
      WHERE created_at > NOW() - INTERVAL '7 days'`);
    res.json({ stats });
  } catch (err) { next(err); }
});

router.get('/top-pages', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT page, COUNT(*) AS views
      FROM page_views
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY page ORDER BY views DESC LIMIT 10`);
    res.json({ pages: rows });
  } catch (err) { next(err); }
});

router.get('/live', authenticate, async (req, res, next) => {
  try {
    const { rows: [{ count }] } = await query(`
      SELECT COUNT(DISTINCT session_id) AS count FROM page_views
      WHERE created_at > NOW() - INTERVAL '5 minutes'`);
    res.json({ live_count: Number(count) });
  } catch (err) { next(err); }
});

module.exports = router;