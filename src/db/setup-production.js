const { query, pool } = require('./db/pool');

async function setup() {
  console.log('Setting up production database...');
  
  // Add cuisines
  const cuisines = ['Italian','Japanese','Mexican','Soul Food','Cajun','Indian','Chinese','Caribbean','Baking','American','French','Greek','Korean','Thai','Moroccan','Vietnamese','Lebanese','West African','Brazilian','Breakfast','Mediterranean','Spanish','Peruvian','Ethiopian'];
  
  for (const name of cuisines) {
    await query('INSERT INTO cuisines (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    console.log('Added cuisine:', name);
  }
  
  console.log('Done!');
  await pool.end();
}

setup().catch(console.error);