const { query, pool } = require('./pool');

async function createAdmin() {
  try {
    await query(
      'INSERT INTO users (email, username, display_name, auth_provider, auth_uid) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      ['admin@recipemarket.com', 'recipemarket', 'RecipeMarket Team', 'email', 'admin-001']
    );
    console.log('Admin user created!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();