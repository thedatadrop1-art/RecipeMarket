require('dotenv').config();
const express = require('express');
const { pool } = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ 
      status: 'error', 
      error: err.message,
      code: err.code
    });
  }
});

app.listen(PORT, () => {
  console.log(`🍽️  RecipeMarket API running on port ${PORT}`);
});

module.exports = app;