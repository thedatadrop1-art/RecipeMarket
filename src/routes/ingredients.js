const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { searchStores } = require('../services/storeSearch');

// ── GET /api/ingredients/lists  — get user's lists ────────────────
router.get('/lists', authenticate, async (req, res, next) => {
  try {
    const { rows: lists } = await query(`
      SELECT il.*, r.title AS recipe_title, r.cover_image AS recipe_image,
             COUNT(ili.id) AS item_count,
             COUNT(ili.id) FILTER (WHERE ili.is_checked) AS checked_count
      FROM ingredient_lists il
      LEFT JOIN recipes r ON il.recipe_id = r.id
      LEFT JOIN ingredient_list_items ili ON il.id = ili.list_id
      WHERE il.user_id = $1
      GROUP BY il.id, r.title, r.cover_image
      ORDER BY il.updated_at DESC
    `, [req.user.id]);

    res.json({ lists });
  } catch (err) { next(err); }
});

// ── POST /api/ingredients/lists  — create a new list ─────────────
router.post('/lists', authenticate, [
  body('name').optional().trim().isLength({ max: 100 }),
  body('recipe_id').optional().isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.name').trim().isLength({ min: 1, max: 200 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name = 'My list', recipe_id, items } = req.body;

    const list = await withTransaction(async (client) => {
      const { rows: [list] } = await client.query(`
        INSERT INTO ingredient_lists (user_id, recipe_id, name)
        VALUES ($1, $2, $3) RETURNING *
      `, [req.user.id, recipe_id || null, name]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(`
          INSERT INTO ingredient_list_items (list_id, name, quantity, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [list.id, item.name, item.quantity || null, i]);
      }

      return list;
    });

    // Fetch the full list with items
    const { rows: listItems } = await query(
      'SELECT * FROM ingredient_list_items WHERE list_id=$1 ORDER BY sort_order',
      [list.id]
    );

    res.status(201).json({ list: { ...list, items: listItems } });
  } catch (err) { next(err); }
});

// ── GET /api/ingredients/lists/:id  — get list with items ─────────
router.get('/lists/:id', authenticate, async (req, res, next) => {
  try {
    const { rows: [list] } = await query(
      'SELECT * FROM ingredient_lists WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!list) return res.status(404).json({ error: 'List not found' });

    const { rows: items } = await query(
      'SELECT * FROM ingredient_list_items WHERE list_id=$1 ORDER BY sort_order',
      [list.id]
    );

    res.json({ list: { ...list, items } });
  } catch (err) { next(err); }
});

// ── PATCH /api/ingredients/lists/:listId/items/:itemId  — check/uncheck
router.patch('/lists/:listId/items/:itemId', authenticate, async (req, res, next) => {
  try {
    const { listId, itemId } = req.params;
    const { is_checked } = req.body;

    // Verify ownership
    const { rows: [list] } = await query(
      'SELECT id FROM ingredient_lists WHERE id=$1 AND user_id=$2',
      [listId, req.user.id]
    );
    if (!list) return res.status(403).json({ error: 'Unauthorized' });

    const { rows: [item] } = await query(
      'UPDATE ingredient_list_items SET is_checked=$1 WHERE id=$2 AND list_id=$3 RETURNING *',
      [is_checked, itemId, listId]
    );

    res.json({ item });
  } catch (err) { next(err); }
});

// ── POST /api/ingredients/lists/:id/add  — add item to list ───────
router.post('/lists/:id/add', authenticate, [
  body('name').trim().isLength({ min: 1, max: 200 }),
  body('quantity').optional().isString(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { rows: [list] } = await query(
      'SELECT id FROM ingredient_lists WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!list) return res.status(403).json({ error: 'Unauthorized' });

    const { rows: [maxOrder] } = await query(
      'SELECT COALESCE(MAX(sort_order),0) AS max FROM ingredient_list_items WHERE list_id=$1',
      [req.params.id]
    );

    const { rows: [item] } = await query(`
      INSERT INTO ingredient_list_items (list_id, name, quantity, sort_order)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [req.params.id, req.body.name, req.body.quantity || null, maxOrder.max + 1]);

    res.status(201).json({ item });
  } catch (err) { next(err); }
});

// ── POST /api/ingredients/search-stores  — the BIG one ────────────
// Finds local stores stocking your ingredient list
router.post('/search-stores', authenticate, [
  body('ingredients').isArray({ min: 1, max: 50 }),
  body('ingredients.*').isString().isLength({ min: 1, max: 200 }),
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('radius_miles').optional().isInt({ min: 1, max: 25 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { ingredients, lat, lng, radius_miles = 10 } = req.body;

    // Check cache first (6-hour TTL)
    const cacheKeys = ingredients.map((_, i) => `$${i + 1}`).join(',');
    const { rows: cached } = await query(`
      SELECT * FROM store_search_cache
      WHERE ingredient IN (${cacheKeys})
        AND store_lat BETWEEN $${ingredients.length + 1} AND $${ingredients.length + 2}
        AND store_lng BETWEEN $${ingredients.length + 3} AND $${ingredients.length + 4}
        AND expires_at > NOW()
    `, [
      ...ingredients.map(i => i.toLowerCase()),
      lat - 0.15, lat + 0.15,
      lng - 0.15, lng + 0.15,
    ]);

    const cachedIngredients = new Set(cached.map(r => r.ingredient));
    const uncachedIngredients = ingredients.filter(
      i => !cachedIngredients.has(i.toLowerCase())
    );

    // Fetch fresh results for uncached items
    let freshResults = [];
    if (uncachedIngredients.length > 0) {
      freshResults = await searchStores({
        ingredients: uncachedIngredients,
        lat, lng,
        radius_miles,
      });

      // Store in cache
      if (freshResults.length > 0) {
        const cacheInserts = freshResults.map(r =>
          query(`
            INSERT INTO store_search_cache
              (ingredient, store_id, store_name, store_address, store_lat, store_lng,
               available, stock_level, price, product_name, product_image, expires_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW() + INTERVAL '6 hours')
            ON CONFLICT DO NOTHING
          `, [
            r.ingredient, r.store_id, r.store_name, r.store_address,
            r.store_lat, r.store_lng, r.available, r.stock_level,
            r.price, r.product_name, r.product_image,
          ])
        );
        await Promise.allSettled(cacheInserts);
      }
    }

    const allResults = [...cached, ...freshResults];

    // Group results by store
    const storeMap = new Map();
    for (const result of allResults) {
      const storeKey = result.store_id;
      if (!storeMap.has(storeKey)) {
        storeMap.set(storeKey, {
          store_id:      result.store_id,
          store_name:    result.store_name,
          store_address: result.store_address,
          store_lat:     result.store_lat,
          store_lng:     result.store_lng,
          distance_miles: calcDistance(lat, lng, result.store_lat, result.store_lng),
          ingredients:   [],
        });
      }
      storeMap.get(storeKey).ingredients.push({
        name:          result.ingredient,
        available:     result.available,
        stock_level:   result.stock_level,
        price:         result.price,
        product_name:  result.product_name,
        product_image: result.product_image,
      });
    }

    // Build response with availability summary per store
    const stores = Array.from(storeMap.values())
      .map(store => {
        const inStock   = store.ingredients.filter(i => i.stock_level === 'in_stock').length;
        const lowStock  = store.ingredients.filter(i => i.stock_level === 'low').length;
        const outStock  = store.ingredients.filter(i => i.stock_level === 'out').length;
        const coverage  = ingredients.length
          ? Math.round(((inStock + lowStock * 0.5) / ingredients.length) * 100)
          : 0;

        return {
          ...store,
          summary: { in_stock: inStock, low_stock: lowStock, out_of_stock: outStock, coverage_pct: coverage },
        };
      })
      .sort((a, b) => {
        // Sort by coverage first, then distance
        if (b.summary.coverage_pct !== a.summary.coverage_pct) {
          return b.summary.coverage_pct - a.summary.coverage_pct;
        }
        return a.distance_miles - b.distance_miles;
      });

    res.json({ stores, ingredient_count: ingredients.length });
  } catch (err) { next(err); }
});

// Haversine formula — distance in miles between two lat/lng points
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
const toRad = (deg) => (deg * Math.PI) / 180;

module.exports = router;
