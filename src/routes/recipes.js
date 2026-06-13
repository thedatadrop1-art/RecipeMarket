const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../services/cloudinary');
const { body, query: qv, validationResult } = require('express-validator');

// ── GET /api/recipes  — list & search ─────────────────────────────
router.get('/', optionalAuth, [
  qv('cuisine').optional().isString(),
  qv('tag').optional().isString(),
  qv('q').optional().isString().isLength({ max: 100 }),
  qv('sort').optional().isIn(['newest', 'rating', 'popular']),
  qv('limit').optional().isInt({ min: 1, max: 50 }),
  qv('offset').optional().isInt({ min: 0 }),
], async (req, res, next) => {
  try {
    const { cuisine, tag, q, sort = 'newest', limit = 20, offset = 0 } = req.query;

    let whereClause = ['r.is_published = TRUE'];
    const params = [];
    let paramIndex = 1;

    if (cuisine) {
      params.push(cuisine);
      whereClause.push(`c.name ILIKE $${paramIndex++}`);
    }
    if (q) {
      params.push(`%${q}%`);
      whereClause.push(`(r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
      paramIndex++;
    }
    if (tag) {
      params.push(tag);
      whereClause.push(`EXISTS (
        SELECT 1 FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = r.id AND t.name ILIKE $${paramIndex++}
      )`);
    }

    const orderMap = {
      newest:  'r.created_at DESC',
      rating:  'r.avg_rating DESC, r.rating_count DESC',
      popular: 'r.view_count DESC',
    };

    params.push(Number(limit), Number(offset));

    const sql = `
      SELECT
        r.id, r.title, r.description, r.cover_image, r.cook_time,
        r.avg_rating, r.rating_count, r.view_count, r.save_count,
        r.created_at,
        c.name AS cuisine, c.emoji AS cuisine_emoji,
        u.id AS author_id, u.display_name AS author_name, u.avatar_url AS author_avatar,
        ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS tags,
        ${req.user ? `EXISTS (SELECT 1 FROM recipe_saves rs WHERE rs.user_id = '${req.user.id}' AND rs.recipe_id = r.id) AS is_saved,` : 'FALSE AS is_saved,'}
        COUNT(*) OVER() AS total_count
      FROM recipes r
      JOIN users u ON r.author_id = u.id
      LEFT JOIN cuisines c ON r.cuisine_id = c.id
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE ${whereClause.join(' AND ')}
      GROUP BY r.id, c.name, c.emoji, u.id, u.display_name, u.avatar_url
      ORDER BY ${orderMap[sort]}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const { rows } = await query(sql, params);
    const total = rows[0]?.total_count || 0;

    res.json({
      recipes: rows.map(r => ({ ...r, total_count: undefined })),
      total: Number(total),
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) { next(err); }
});

// ── GET /api/recipes/:id  — single recipe with ingredients & steps ─
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [recipeRes, ingredientsRes, stepsRes] = await Promise.all([
      query(`
        SELECT
          r.*, c.name AS cuisine, c.emoji AS cuisine_emoji,
          u.id AS author_id, u.display_name AS author_name,
          u.avatar_url AS author_avatar, u.bio AS author_bio,
          ${req.user ? `EXISTS (SELECT 1 FROM recipe_saves WHERE user_id='${req.user.id}' AND recipe_id=r.id) AS is_saved,
          (SELECT rating FROM recipe_ratings WHERE user_id='${req.user.id}' AND recipe_id=r.id) AS user_rating,` : 'FALSE AS is_saved, NULL AS user_rating,'}
          ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS tags
        FROM recipes r
        JOIN users u ON r.author_id = u.id
        LEFT JOIN cuisines c ON r.cuisine_id = c.id
        LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        WHERE r.id = $1 AND r.is_published = TRUE
        GROUP BY r.id, c.name, c.emoji, u.id, u.display_name, u.avatar_url, u.bio
      `, [id]),
      query('SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order', [id]),
      query('SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number', [id]),
    ]);

    if (!recipeRes.rows.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Bump view count async (fire & forget)
    query('UPDATE recipes SET view_count = view_count + 1 WHERE id = $1', [id]).catch(() => {});

    res.json({
      ...recipeRes.rows[0],
      ingredients: ingredientsRes.rows,
      steps: stepsRes.rows,
    });
  } catch (err) { next(err); }
});

// ── POST /api/recipes  — create ────────────────────────────────────
router.post('/', authenticate, upload.single('cover_image'), [
  body('title').trim().isLength({ min: 3, max: 120 }),
  body('description').trim().isLength({ min: 10, max: 1000 }),
  body('cuisine_id').isInt(),
  body('cook_time').optional().isString(),
  body('ingredients').isArray({ min: 1 }),
  body('steps').isArray({ min: 1 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, cuisine_id, cook_time, prep_time, servings,
            difficulty, tags = [], ingredients, steps } = req.body;

    let cover_image = null;
    if (req.file) {
      cover_image = await uploadToCloudinary(req.file, 'recipes');
    }

    const recipe = await withTransaction(async (client) => {
      // Create recipe
      const { rows: [recipe] } = await client.query(`
        INSERT INTO recipes (author_id, cuisine_id, title, description, cover_image,
          cook_time, prep_time, servings, difficulty, is_published)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
        RETURNING *
      `, [req.user.id, cuisine_id, title, description, cover_image,
          cook_time, prep_time, servings, difficulty || 'medium']);

      // Insert ingredients
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await client.query(`
          INSERT INTO ingredients (recipe_id, name, quantity, unit, notes, sort_order, search_term)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [recipe.id, ing.name, ing.quantity, ing.unit, ing.notes, i,
            ing.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()]);
      }

      // Insert steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await client.query(`
          INSERT INTO recipe_steps (recipe_id, step_number, title, body, timer_mins)
          VALUES ($1,$2,$3,$4,$5)
        `, [recipe.id, i + 1, step.title, step.body, step.timer_mins]);
      }

      // Insert tags
      for (const tagName of tags) {
        const { rows: [tag] } = await client.query(
          'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
          [tagName.toLowerCase().trim()]
        );
        await client.query(
          'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [recipe.id, tag.id]
        );
      }

      return recipe;
    });

    res.status(201).json({ recipe });
  } catch (err) { next(err); }
});

// ── POST /api/recipes/:id/save  — save/unsave ─────────────────────
router.post('/:id/save', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await query(
      'SELECT 1 FROM recipe_saves WHERE user_id=$1 AND recipe_id=$2',
      [userId, id]
    );

    if (existing.rows.length) {
      await query('DELETE FROM recipe_saves WHERE user_id=$1 AND recipe_id=$2', [userId, id]);
      await query('UPDATE recipes SET save_count = save_count - 1 WHERE id=$1', [id]);
      return res.json({ saved: false });
    } else {
      await query('INSERT INTO recipe_saves (user_id, recipe_id) VALUES ($1,$2)', [userId, id]);
      await query('UPDATE recipes SET save_count = save_count + 1 WHERE id=$1', [id]);
      return res.json({ saved: true });
    }
  } catch (err) { next(err); }
});

// ── POST /api/recipes/:id/rate  — rate a recipe ───────────────────
router.post('/:id/rate', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { rating } = req.body;

    await query(`
      INSERT INTO recipe_ratings (user_id, recipe_id, rating)
      VALUES ($1,$2,$3)
      ON CONFLICT (user_id, recipe_id) DO UPDATE SET rating=$3, updated_at=NOW()
    `, [req.user.id, id, rating]);

    const { rows: [updated] } = await query(
      'SELECT avg_rating, rating_count FROM recipes WHERE id=$1',
      [id]
    );

    res.json({ rating, ...updated });
  } catch (err) { next(err); }
});

// ── GET /api/recipes/:id/saved  — list of saves ───────────────────
router.get('/user/saved', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT r.id, r.title, r.cover_image, r.avg_rating, r.cook_time,
             c.name AS cuisine, u.display_name AS author_name
      FROM recipe_saves rs
      JOIN recipes r ON rs.recipe_id = r.id
      JOIN users u ON r.author_id = u.id
      LEFT JOIN cuisines c ON r.cuisine_id = c.id
      WHERE rs.user_id = $1
      ORDER BY rs.created_at DESC
    `, [req.user.id]);

    res.json({ recipes: rows });
  } catch (err) { next(err); }
});

module.exports = router;
