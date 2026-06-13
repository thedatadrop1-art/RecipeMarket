require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool } = require('./db/pool');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recipeRoutes = require('./routes/recipes');
const communityRoutes = require('./routes/community');
const showcaseRoutes = require('./routes/showcase');
const ingredientRoutes = require('./routes/ingredients');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const purchaseRoutes = require('./routes/purchases');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({ origin: '*', credentials: false }));
app.use('/api/purchases/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message, code: err.code });
  }
});

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/recipes',       recipeRoutes);
app.use('/api/community',     communityRoutes);
app.use('/api/showcase',      showcaseRoutes);
app.use('/api/ingredients',   ingredientRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/purchases',     purchaseRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🍽️  RecipeMarket API running on port ${PORT}`);
});

module.exports = app;