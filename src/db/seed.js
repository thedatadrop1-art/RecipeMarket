const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/recipemarket',
  ssl: false,
});

const recipes = [
  {
    title: "Grandma's Sunday Bolognese",
    description: "Rich slow-cooked meat sauce passed down three generations. The secret is a splash of whole milk and patience.",
    cuisine: "Italian",
    cook_time: "2h",
    prep_time: "20 min",
    servings: 6,
    difficulty: "medium",
    ingredients: [
      { name: "Ground beef", quantity: "1", unit: "lb" },
      { name: "Pork sausage", quantity: "0.5", unit: "lb" },
      { name: "Whole milk", quantity: "0.5", unit: "cup" },
      { name: "San Marzano tomatoes", quantity: "28", unit: "oz" },
      { name: "Yellow onion", quantity: "1", unit: "large" },
      { name: "Carrots", quantity: "2", unit: "medium" },
      { name: "Celery stalks", quantity: "3", unit: "" },
      { name: "Garlic cloves", quantity: "4", unit: "" },
      { name: "Dry white wine", quantity: "0.5", unit: "cup" },
      { name: "Fresh tagliatelle", quantity: "1", unit: "lb" },
      { name: "Parmigiano Reggiano", quantity: "1", unit: "cup" },
      { name: "Olive oil", quantity: "3", unit: "tbsp" },
    ],
    steps: [
      { title: "Prep the vegetables", body: "Finely dice the onion, carrots, and celery into small even pieces. Mince the garlic cloves. This soffritto is the flavor base of the whole sauce so take your time." },
      { title: "Cook the soffritto", body: "Heat olive oil in a large heavy pot over medium heat. Add the onion, carrot, and celery. Cook for 10 minutes stirring often until soft and golden. Add garlic and cook 2 more minutes." },
      { title: "Brown the meat", body: "Add ground beef and pork sausage. Break it up with a wooden spoon. Cook until no pink remains, about 8 minutes. Season with salt and pepper." },
      { title: "Add wine", body: "Pour in the white wine. Stir and let it bubble away completely, about 3 minutes. This deglazes all the browned bits from the bottom." },
      { title: "Add milk", body: "Pour in the whole milk. This is grandma's secret — it tenderizes the meat and adds richness. Let it absorb completely before adding tomatoes." },
      { title: "Add tomatoes and simmer", body: "Crush the San Marzano tomatoes by hand and add them to the pot. Stir everything together. Bring to a gentle simmer then reduce heat to low. Cook uncovered for 1.5 hours stirring every 20 minutes." },
      { title: "Cook pasta and serve", body: "Cook fresh tagliatelle in salted boiling water for 2-3 minutes. Toss with the bolognese, adding a splash of pasta water. Serve with generous Parmigiano Reggiano." },
    ],
    tags: ["pasta", "comfort", "slow-cook", "italian"],
  },
  {
    title: "Southern Fried Chicken",
    description: "Crispy, juicy, seasoned to the bone. Double dredged in seasoned flour and fried to golden perfection.",
    cuisine: "Soul Food",
    cook_time: "1h",
    prep_time: "30 min",
    servings: 4,
    difficulty: "medium",
    ingredients: [
      { name: "Whole chicken pieces", quantity: "3", unit: "lb" },
      { name: "Buttermilk", quantity: "2", unit: "cups" },
      { name: "Hot sauce", quantity: "2", unit: "tbsp" },
      { name: "All-purpose flour", quantity: "2", unit: "cups" },
      { name: "Paprika", quantity: "2", unit: "tsp" },
      { name: "Garlic powder", quantity: "1", unit: "tsp" },
      { name: "Onion powder", quantity: "1", unit: "tsp" },
      { name: "Cayenne pepper", quantity: "0.5", unit: "tsp" },
      { name: "Salt", quantity: "2", unit: "tsp" },
      { name: "Black pepper", quantity: "1", unit: "tsp" },
      { name: "Peanut oil", quantity: "4", unit: "cups" },
    ],
    steps: [
      { title: "Marinate the chicken", body: "Mix buttermilk and hot sauce in a large bowl. Add chicken pieces making sure they're fully submerged. Cover and refrigerate for at least 4 hours or overnight. The longer the better." },
      { title: "Make the seasoned flour", body: "In a large shallow dish combine flour, paprika, garlic powder, onion powder, cayenne, salt, and pepper. Mix well. This is your dredging mixture." },
      { title: "Double dredge", body: "Remove chicken from buttermilk letting excess drip off. Dredge in seasoned flour pressing firmly. Dip back in buttermilk then dredge in flour again. This double coat is the secret to extra crispy chicken." },
      { title: "Rest the chicken", body: "Place dredged chicken on a wire rack and let it rest for 10 minutes. This helps the coating stick and fry up crispier." },
      { title: "Heat the oil", body: "Heat peanut oil in a large cast iron skillet or Dutch oven to 325°F. Use a thermometer — temperature control is everything for fried chicken." },
      { title: "Fry the chicken", body: "Fry chicken in batches without crowding. Dark meat takes 12-14 minutes, white meat 10-12 minutes. Turn once halfway through. Internal temperature should reach 165°F." },
      { title: "Drain and rest", body: "Transfer to a wire rack over paper towels. Never put fried chicken directly on paper towels — it steams and goes soggy. Rest 5 minutes before serving." },
    ],
    tags: ["chicken", "fried", "southern", "comfort"],
  },
  {
    title: "Classic Shrimp Étouffée",
    description: "Butter, the holy trinity, and Gulf shrimp smothered in a rich Cajun sauce over white rice.",
    cuisine: "Cajun",
    cook_time: "45m",
    prep_time: "15 min",
    servings: 4,
    difficulty: "medium",
    ingredients: [
      { name: "Large shrimp peeled", quantity: "2", unit: "lb" },
      { name: "Unsalted butter", quantity: "0.5", unit: "cup" },
      { name: "Yellow onion", quantity: "1", unit: "large" },
      { name: "Celery stalks", quantity: "3", unit: "" },
      { name: "Green bell pepper", quantity: "1", unit: "" },
      { name: "Garlic cloves", quantity: "4", unit: "" },
      { name: "Shrimp stock", quantity: "2", unit: "cups" },
      { name: "Tomato paste", quantity: "2", unit: "tbsp" },
      { name: "Cajun seasoning", quantity: "2", unit: "tsp" },
      { name: "Green onions", quantity: "4", unit: "" },
      { name: "Cooked white rice", quantity: "4", unit: "cups" },
    ],
    steps: [
      { title: "Prep the holy trinity", body: "Dice the onion, celery, and bell pepper into small even pieces. This combination is the foundation of all Cajun cooking — never skip any of the three." },
      { title: "Make a roux", body: "Melt butter in a large heavy skillet over medium heat. Add flour and stir constantly for 5-7 minutes until it turns a light peanut butter color. Don't stop stirring or it will burn." },
      { title: "Cook the trinity", body: "Add the onion, celery, and bell pepper to the roux. Cook for 8-10 minutes stirring frequently until very soft. Add garlic and cook 2 more minutes." },
      { title: "Build the sauce", body: "Stir in tomato paste and Cajun seasoning. Slowly add shrimp stock a little at a time stirring constantly to prevent lumps. Bring to a simmer and cook 10 minutes until slightly thickened." },
      { title: "Add the shrimp", body: "Season shrimp with salt and pepper. Add to the sauce and cook just 3-4 minutes until pink and cooked through. Do not overcook — shrimp goes rubbery fast." },
      { title: "Finish and serve", body: "Taste and adjust seasoning. Stir in sliced green onions. Serve immediately over white rice with French bread on the side to soak up all that sauce." },
    ],
    tags: ["shrimp", "cajun", "seafood", "comfort"],
  },
  {
    title: "Butter Chicken from Scratch",
    description: "Fragrant, creamy tomato sauce with tender chicken — no jarred shortcuts. This is the real thing.",
    cuisine: "Indian",
    cook_time: "1h",
    prep_time: "20 min",
    servings: 4,
    difficulty: "medium",
    ingredients: [
      { name: "Chicken thighs boneless", quantity: "2", unit: "lb" },
      { name: "Plain yogurt", quantity: "0.5", unit: "cup" },
      { name: "Garam masala", quantity: "2", unit: "tsp" },
      { name: "Turmeric", quantity: "1", unit: "tsp" },
      { name: "Cumin", quantity: "1", unit: "tsp" },
      { name: "Butter", quantity: "4", unit: "tbsp" },
      { name: "Yellow onion", quantity: "1", unit: "large" },
      { name: "Garlic cloves", quantity: "5", unit: "" },
      { name: "Fresh ginger", quantity: "2", unit: "inch piece" },
      { name: "Crushed tomatoes", quantity: "28", unit: "oz" },
      { name: "Heavy cream", quantity: "0.5", unit: "cup" },
      { name: "Kashmiri chili powder", quantity: "1", unit: "tsp" },
    ],
    steps: [
      { title: "Marinate the chicken", body: "Mix yogurt with half the garam masala, turmeric, cumin, and salt. Add chicken and coat well. Marinate at least 1 hour or overnight in the fridge." },
      { title: "Char the chicken", body: "Cook marinated chicken in a hot skillet or under the broiler until charred in spots, about 5 minutes per side. It doesn't need to be fully cooked through. Set aside." },
      { title: "Make the sauce base", body: "Melt butter in a large pan. Add diced onion and cook 10 minutes until deeply golden. Add minced garlic and grated ginger. Cook 3 more minutes until fragrant." },
      { title: "Add spices and tomatoes", body: "Add remaining garam masala, kashmiri chili powder, and a pinch of salt. Toast spices for 1 minute. Add crushed tomatoes. Simmer 20 minutes stirring occasionally." },
      { title: "Blend the sauce", body: "Use an immersion blender to blend the sauce until completely smooth. This step makes the silky restaurant-quality texture. Return to heat." },
      { title: "Add chicken and cream", body: "Cut charred chicken into bite-sized pieces. Add to the smooth sauce. Simmer 10 minutes. Stir in heavy cream and taste for seasoning. Simmer 5 more minutes." },
      { title: "Serve", body: "Serve over basmati rice with warm naan bread. Garnish with a swirl of cream and fresh cilantro." },
    ],
    tags: ["curry", "chicken", "indian", "comfort"],
  },
  {
    title: "Pork & Chive Dumplings",
    description: "Hand-folded dumplings with juicy pork filling and a ginger-sesame dipping sauce you'll want to drink.",
    cuisine: "Chinese",
    cook_time: "1h",
    prep_time: "45 min",
    servings: 4,
    difficulty: "hard",
    ingredients: [
      { name: "Ground pork", quantity: "1", unit: "lb" },
      { name: "Fresh chives", quantity: "1", unit: "bunch" },
      { name: "Soy sauce", quantity: "3", unit: "tbsp" },
      { name: "Sesame oil", quantity: "2", unit: "tsp" },
      { name: "Fresh ginger", quantity: "1", unit: "tbsp" },
      { name: "Garlic cloves", quantity: "3", unit: "" },
      { name: "Dumpling wrappers", quantity: "40", unit: "" },
      { name: "Rice vinegar", quantity: "3", unit: "tbsp" },
      { name: "Chili oil", quantity: "1", unit: "tbsp" },
      { name: "Green onions", quantity: "3", unit: "" },
    ],
    steps: [
      { title: "Make the filling", body: "Mix ground pork with chopped chives, soy sauce, sesame oil, minced ginger, and minced garlic. Stir in one direction for 2 minutes until the mixture becomes sticky and cohesive. This develops the texture." },
      { title: "Taste test the filling", body: "Cook a small spoonful of filling in a pan. Taste and adjust seasoning before filling all the dumplings. This step saves you from 40 under-seasoned dumplings." },
      { title: "Fold the dumplings", body: "Place 1 teaspoon of filling in the center of a wrapper. Wet the edges with water. Fold in half and pinch the center. Make 3 pleats on each side working toward the center. Press firmly to seal." },
      { title: "Make dipping sauce", body: "Mix soy sauce, rice vinegar, chili oil, minced ginger, and sliced green onions. This sauce is so good you'll want to put it on everything." },
      { title: "Pan fry the dumplings", body: "Heat oil in a non-stick pan over medium-high heat. Add dumplings flat side down. Cook 2 minutes until golden on the bottom. Add 1/3 cup water and immediately cover. Steam 6 minutes." },
      { title: "Crisp them up", body: "Remove the lid and let the water evaporate completely. Cook another 2 minutes until the bottoms are crispy again. The potsticker effect — crispy bottom, steamed top." },
    ],
    tags: ["dumplings", "pork", "chinese", "dim sum"],
  },
  {
    title: "Jamaican Oxtail Stew",
    description: "Fall-off-the-bone rich oxtail with butter beans, allspice, and scotch bonnet. Low and slow is the only way.",
    cuisine: "Caribbean",
    cook_time: "3h",
    prep_time: "20 min",
    servings: 6,
    difficulty: "medium",
    ingredients: [
      { name: "Oxtail pieces", quantity: "3", unit: "lb" },
      { name: "Butter beans", quantity: "15", unit: "oz can" },
      { name: "Yellow onion", quantity: "1", unit: "large" },
      { name: "Garlic cloves", quantity: "5", unit: "" },
      { name: "Scotch bonnet pepper", quantity: "1", unit: "" },
      { name: "Allspice berries", quantity: "1", unit: "tsp" },
      { name: "Fresh thyme", quantity: "4", unit: "sprigs" },
      { name: "Soy sauce", quantity: "3", unit: "tbsp" },
      { name: "Brown sugar", quantity: "1", unit: "tbsp" },
      { name: "Beef broth", quantity: "2", unit: "cups" },
      { name: "Green onions", quantity: "4", unit: "" },
    ],
    steps: [
      { title: "Season and marinate", body: "Season oxtail generously with salt, pepper, allspice, soy sauce, and brown sugar. Add sliced onion, smashed garlic, and fresh thyme. Marinate overnight for best results — minimum 2 hours." },
      { title: "Brown the oxtail", body: "Heat oil in a large heavy pot over high heat. Brown oxtail pieces in batches without crowding, about 4 minutes per side. Deep browning equals deep flavor. Don't rush this step." },
      { title: "Build the braise", body: "Remove oxtail and cook the onions and garlic in the same pot for 5 minutes. Add beef broth and scrape all the browned bits from the bottom. Those bits are pure flavor." },
      { title: "Low and slow", body: "Return oxtail to the pot. Add whole scotch bonnet pepper, thyme, and allspice. Bring to a boil then reduce to the lowest simmer. Cover and cook 2.5 to 3 hours until meat is completely tender." },
      { title: "Add butter beans", body: "Drain and rinse butter beans. Add them in the last 30 minutes of cooking so they hold their shape. Remove the scotch bonnet if you don't want extra heat." },
      { title: "Finish and serve", body: "Remove thyme stems. Taste and adjust seasoning. Skim excess fat from the surface. Serve over white rice with fried plantains on the side. Garnish with sliced green onions." },
    ],
    tags: ["oxtail", "stew", "caribbean", "comfort"],
  },
  {
    title: "Slow-Cooker Birria Tacos",
    description: "Deeply savory braised beef, crispy griddled tortillas, and a rich consommé for dipping. Worth every minute.",
    cuisine: "Mexican",
    cook_time: "4h",
    prep_time: "30 min",
    servings: 8,
    difficulty: "medium",
    ingredients: [
      { name: "Beef chuck roast", quantity: "3", unit: "lb" },
      { name: "Guajillo chiles dried", quantity: "6", unit: "" },
      { name: "Ancho chiles dried", quantity: "3", unit: "" },
      { name: "Chipotle in adobo", quantity: "2", unit: "" },
      { name: "Beef broth", quantity: "2", unit: "cups" },
      { name: "White onion", quantity: "1", unit: "" },
      { name: "Garlic cloves", quantity: "6", unit: "" },
      { name: "Roma tomatoes", quantity: "3", unit: "" },
      { name: "Mexican oregano", quantity: "1", unit: "tsp" },
      { name: "Cumin", quantity: "1", unit: "tsp" },
      { name: "Corn tortillas", quantity: "16", unit: "" },
      { name: "Oaxaca cheese", quantity: "2", unit: "cups" },
    ],
    steps: [
      { title: "Toast and rehydrate chiles", body: "Remove stems and seeds from guajillo and ancho chiles. Toast in a dry pan 30 seconds per side until fragrant. Soak in hot water for 20 minutes until softened." },
      { title: "Make the chile sauce", body: "Blend soaked chiles with chipotle, tomatoes, half the onion, garlic, oregano, cumin, and 1 cup of beef broth. Blend until completely smooth." },
      { title: "Sear the beef", body: "Season chuck roast generously with salt. Sear in hot oil on all sides until deep brown, about 3-4 minutes per side. This builds the flavor of your consommé." },
      { title: "Slow cook", body: "Place seared beef in slow cooker. Pour chile sauce and remaining broth over it. Add remaining onion. Cook on high 4 hours or low 8 hours until beef shreds easily." },
      { title: "Shred and make consommé", body: "Remove beef and shred with two forks. Strain the cooking liquid — this is your consommé for dipping. Season with salt. Mix some consommé back into the shredded meat." },
      { title: "Griddle the tacos", body: "Dip corn tortillas in the consommé. Place on a hot griddle. Add shredded beef and oaxaca cheese. Fold and press. Cook until crispy on both sides, about 2 minutes per side." },
      { title: "Serve with consommé", body: "Serve tacos immediately with a cup of hot consommé for dipping. Top with diced white onion, cilantro, lime juice, and salsa." },
    ],
    tags: ["tacos", "beef", "mexican", "slow-cook"],
  },
  {
    title: "Brown Butter Chocolate Cake",
    description: "Nuttiness from brown butter elevates a classic chocolate cake. The best cake you will ever make.",
    cuisine: "Baking",
    cook_time: "1h",
    prep_time: "30 min",
    servings: 12,
    difficulty: "medium",
    ingredients: [
      { name: "Unsalted butter", quantity: "1", unit: "cup" },
      { name: "Dark chocolate", quantity: "8", unit: "oz" },
      { name: "Granulated sugar", quantity: "2", unit: "cups" },
      { name: "Eggs", quantity: "4", unit: "large" },
      { name: "All-purpose flour", quantity: "1.75", unit: "cups" },
      { name: "Cocoa powder", quantity: "0.75", unit: "cup" },
      { name: "Baking soda", quantity: "1.5", unit: "tsp" },
      { name: "Whole milk", quantity: "1", unit: "cup" },
      { name: "Vanilla extract", quantity: "2", unit: "tsp" },
      { name: "Hot coffee", quantity: "1", unit: "cup" },
      { name: "Salt", quantity: "1", unit: "tsp" },
    ],
    steps: [
      { title: "Brown the butter", body: "Melt butter in a light-colored saucepan over medium heat. Swirl the pan constantly. After about 5 minutes it will foam, then turn golden, then smell nutty. Remove immediately when you see brown bits at the bottom. Cool 15 minutes." },
      { title: "Melt the chocolate", body: "Chop dark chocolate and melt in a double boiler or in 30-second microwave bursts stirring between each. Let cool slightly." },
      { title: "Mix wet ingredients", body: "Whisk brown butter and sugar together. Add eggs one at a time whisking well after each. Add vanilla and melted chocolate. The batter will be thick and glossy." },
      { title: "Add dry ingredients", body: "Sift flour, cocoa powder, baking soda, and salt together. Add to the chocolate mixture alternating with milk, starting and ending with flour. Do not overmix." },
      { title: "Add hot coffee", body: "Stir in hot coffee. The batter will become very thin — this is correct. Coffee intensifies the chocolate flavor without tasting like coffee." },
      { title: "Bake", body: "Pour into two greased 9-inch cake pans. Bake at 350°F for 30-35 minutes until a toothpick comes out with just a few moist crumbs. Do not overbake — this cake should be fudgy." },
      { title: "Cool and frost", body: "Cool completely before frosting — at least 1 hour. Frost with chocolate ganache or your favorite buttercream. The cake gets better on day 2 as the brown butter flavor develops." },
    ],
    tags: ["cake", "chocolate", "baking", "dessert"],
  },
];

async function seed() {
  console.log('🌱 Seeding recipes...');

  for (const recipe of recipes) {
    try {
      const cuisineRes = await pool.query(
        'SELECT id FROM cuisines WHERE name = $1',
        [recipe.cuisine]
      );
      const cuisineId = cuisineRes.rows[0]?.id;

      const userRes = await pool.query(
        'SELECT id FROM users LIMIT 1'
      );

      let authorId;
      if (userRes.rows.length === 0) {
        const newUser = await pool.query(`
          INSERT INTO users (email, username, display_name, auth_provider, auth_uid)
          VALUES ('admin@recipemarket.com', 'recipemarket', 'RecipeMarket Team', 'email', 'admin-001')
          ON CONFLICT (auth_uid) DO UPDATE SET email=EXCLUDED.email
          RETURNING id
        `);
        authorId = newUser.rows[0].id;
      } else {
        authorId = userRes.rows[0].id;
      }

      const recipeRes = await pool.query(`
        INSERT INTO recipes (author_id, cuisine_id, title, description, cook_time, prep_time, servings, difficulty, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
        RETURNING id
      `, [authorId, cuisineId, recipe.title, recipe.description, recipe.cook_time, recipe.prep_time, recipe.servings, recipe.difficulty]);

      const recipeId = recipeRes.rows[0].id;

      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i];
        await pool.query(`
          INSERT INTO ingredients (recipe_id, name, quantity, unit, sort_order)
          VALUES ($1, $2, $3, $4, $5)
        `, [recipeId, ing.name, ing.quantity, ing.unit, i]);
      }

      for (let i = 0; i < recipe.steps.length; i++) {
        const step = recipe.steps[i];
        await pool.query(`
          INSERT INTO recipe_steps (recipe_id, step_number, title, body)
          VALUES ($1, $2, $3, $4)
        `, [recipeId, i + 1, step.title, step.body]);
      }

      for (const tagName of recipe.tags) {
        const tagRes = await pool.query(
          'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
          [tagName]
        );
        await pool.query(
          'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [recipeId, tagRes.rows[0].id]
        );
      }

      console.log(`✅ Added: ${recipe.title}`);
    } catch (err) {
      console.error(`❌ Error adding ${recipe.title}:`, err.message);
    }
  }

  console.log('🎉 Seeding complete!');
  await pool.end();
}

seed();