const { query, pool } = require('./pool');

async function seed() {
  console.log('Seeding recipes...');
  
  const { rows: [user] } = await query('SELECT id FROM users LIMIT 1');
  if (!user) { console.log('No user found!'); return; }
  
  const cuisines = {};
  const { rows: cRows } = await query('SELECT id, name FROM cuisines');
  cRows.forEach(c => cuisines[c.name] = c.id);
  console.log('Found cuisines:', Object.keys(cuisines).join(', '));
  
  const recipes = [
    { title: "Grandma's Sunday Bolognese", cuisine: 'Italian', cook_time: '2h', desc: 'Rich slow-cooked meat sauce passed down three generations.' },
    { title: 'Southern Fried Chicken', cuisine: 'Soul Food', cook_time: '1h', desc: 'Crispy, juicy, seasoned to the bone.' },
    { title: "Classic Shrimp Etouffee", cuisine: 'Cajun', cook_time: '45m', desc: 'Butter, trinity, and Gulf shrimp done right.' },
    { title: 'Butter Chicken from Scratch', cuisine: 'Indian', cook_time: '1h', desc: 'Fragrant, creamy tomato sauce - no shortcuts.' },
    { title: 'Pork and Chive Dumplings', cuisine: 'Chinese', cook_time: '1h', desc: 'Hand-folded with a ginger-sesame dipping sauce.' },
    { title: 'Jamaican Oxtail Stew', cuisine: 'Caribbean', cook_time: '3h', desc: 'Fall-off-the-bone rich, with butter beans.' },
    { title: 'Slow-Cooker Birria Tacos', cuisine: 'Mexican', cook_time: '4h', desc: 'Deeply savory braised beef with rich consomme.' },
    { title: 'Brown Butter Chocolate Cake', cuisine: 'Baking', cook_time: '1h', desc: 'Nuttiness from brown butter elevates a classic.' },
  ];

  for (const r of recipes) {
    try {
      const cuisineId = cuisines[r.cuisine];
      await query(
        'INSERT INTO recipes (author_id, cuisine_id, title, description, cook_time, is_published) VALUES ($1, $2, $3, $4, $5, TRUE)',
        [user.id, cuisineId, r.title, r.desc, r.cook_time]
      );
      console.log('Added:', r.title);
    } catch (err) {
      console.error('Error adding', r.title, ':', err.message);
    }
  }

  console.log('Done!');
  await pool.end();
}

seed().catch(console.error);