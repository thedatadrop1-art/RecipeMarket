const { query, pool } = require('./pool');

async function debug() {
  try {
    const users = await query('SELECT id, email FROM users');
    console.log('Users:', JSON.stringify(users.rows));
    const cuisines = await query('SELECT id, name FROM cuisines LIMIT 5');
    console.log('Cuisines:', JSON.stringify(cuisines.rows));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

debug();