const { query } = require('../db/pool');

const authenticate = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const { rows } = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  next();
};

const requirePremium = (req, res, next) => {
  if (!req.user?.is_premium) {
    return res.status(403).json({ error: 'Premium required' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, requirePremium };