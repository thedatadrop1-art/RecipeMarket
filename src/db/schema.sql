-- ============================================================
-- RecipeMarket Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy ingredient search

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email', -- 'email' | 'google' | 'apple'
  auth_uid      TEXT UNIQUE,                   -- Firebase UID
  is_verified   BOOLEAN DEFAULT FALSE,
  is_premium    BOOLEAN DEFAULT FALSE,          -- paid the $2.99
  purchase_date TIMESTAMPTZ,
  location_city TEXT,
  location_state TEXT,
  location_lat  DECIMAL(9,6),
  location_lng  DECIMAL(9,6),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_username  ON users(username);
CREATE INDEX idx_users_auth_uid  ON users(auth_uid);

-- ============================================================
-- FOLLOWS
-- ============================================================

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_follower  ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- CUISINES
-- ============================================================

CREATE TABLE cuisines (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  emoji       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECIPES
-- ============================================================

CREATE TABLE recipes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cuisine_id   INTEGER REFERENCES cuisines(id),
  title        TEXT NOT NULL,
  description  TEXT,
  cover_image  TEXT,                       -- Cloudinary URL
  cook_time    TEXT,                       -- e.g. "1h 30m"
  prep_time    TEXT,
  servings     INTEGER,
  difficulty   TEXT DEFAULT 'medium',      -- 'easy' | 'medium' | 'hard'
  is_published BOOLEAN DEFAULT FALSE,
  view_count   INTEGER DEFAULT 0,
  save_count   INTEGER DEFAULT 0,
  avg_rating   DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_author    ON recipes(author_id);
CREATE INDEX idx_recipes_cuisine   ON recipes(cuisine_id);
CREATE INDEX idx_recipes_published ON recipes(is_published);
CREATE INDEX idx_recipes_rating    ON recipes(avg_rating DESC);
CREATE INDEX idx_recipes_title_trgm ON recipes USING GIN (title gin_trgm_ops);

-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================

CREATE TABLE ingredients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,              -- "San Marzano tomatoes"
  quantity      TEXT,                       -- "28 oz"
  unit          TEXT,                       -- "can"
  notes         TEXT,                       -- "crushed by hand"
  sort_order    INTEGER DEFAULT 0,
  search_term   TEXT,                       -- normalized for store search
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);
CREATE INDEX idx_ingredients_name_trgm ON ingredients USING GIN (name gin_trgm_ops);

-- ============================================================
-- RECIPE STEPS
-- ============================================================

CREATE TABLE recipe_steps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title       TEXT,
  body        TEXT NOT NULL,
  image_url   TEXT,
  timer_mins  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_steps_recipe ON recipe_steps(recipe_id, step_number);

-- ============================================================
-- RECIPE TAGS
-- ============================================================

CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE recipe_tags (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

-- ============================================================
-- RECIPE SAVES (bookmarks)
-- ============================================================

CREATE TABLE recipe_saves (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX idx_saves_user   ON recipe_saves(user_id);
CREATE INDEX idx_saves_recipe ON recipe_saves(recipe_id);

-- ============================================================
-- RECIPE RATINGS
-- ============================================================

CREATE TABLE recipe_ratings (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX idx_ratings_recipe ON recipe_ratings(recipe_id);

-- Auto-update avg_rating on recipes
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE recipes SET
    avg_rating   = (SELECT AVG(rating) FROM recipe_ratings WHERE recipe_id = NEW.recipe_id),
    rating_count = (SELECT COUNT(*)    FROM recipe_ratings WHERE recipe_id = NEW.recipe_id),
    updated_at   = NOW()
  WHERE id = NEW.recipe_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_recipe_rating
AFTER INSERT OR UPDATE ON recipe_ratings
FOR EACH ROW EXECUTE FUNCTION update_recipe_rating();

-- ============================================================
-- COMMUNITY THREADS
-- ============================================================

CREATE TABLE threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('tip','idea','help')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  like_count  INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_pinned   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_author   ON threads(author_id);
CREATE INDEX idx_threads_category ON threads(category);
CREATE INDEX idx_threads_created  ON threads(created_at DESC);

CREATE TABLE thread_replies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id  UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_thread ON thread_replies(thread_id);

CREATE TABLE thread_likes (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id  UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, thread_id)
);

CREATE TABLE reply_likes (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_id   UUID NOT NULL REFERENCES thread_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, reply_id)
);

-- ============================================================
-- FOOD POSTS (showcase)
-- ============================================================

CREATE TABLE food_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id   UUID REFERENCES recipes(id) ON DELETE SET NULL,
  dish_name   TEXT NOT NULL,
  body        TEXT,
  image_url   TEXT,                         -- Cloudinary URL
  avg_rating  DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  like_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author  ON food_posts(author_id);
CREATE INDEX idx_posts_created ON food_posts(created_at DESC);

CREATE TABLE food_post_ratings (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES food_posts(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE food_post_likes (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES food_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- INGREDIENT TRACKER LISTS
-- ============================================================

CREATE TABLE ingredient_lists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id  UUID REFERENCES recipes(id) ON DELETE SET NULL,
  name       TEXT NOT NULL DEFAULT 'My list',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user ON ingredient_lists(user_id);

CREATE TABLE ingredient_list_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id     UUID NOT NULL REFERENCES ingredient_lists(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    TEXT,
  is_checked  BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_list_items_list ON ingredient_list_items(list_id);

-- ============================================================
-- STORE SEARCH CACHE
-- ============================================================

CREATE TABLE store_search_cache (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient    TEXT NOT NULL,
  store_id      TEXT NOT NULL,              -- e.g. 'kroger_12345'
  store_name    TEXT NOT NULL,
  store_address TEXT,
  store_lat     DECIMAL(9,6),
  store_lng     DECIMAL(9,6),
  available     BOOLEAN,
  stock_level   TEXT,                       -- 'in_stock' | 'low' | 'out'
  price         DECIMAL(6,2),
  product_name  TEXT,
  product_image TEXT,
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '6 hours',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_cache_ingredient ON store_search_cache(ingredient, store_id);
CREATE INDEX idx_store_cache_expires    ON store_search_cache(expires_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'like' | 'reply' | 'follow' | 'rating' | 'save' | 'store_deal'
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  recipe_id   UUID REFERENCES recipes(id) ON DELETE SET NULL,
  post_id     UUID REFERENCES food_posts(id) ON DELETE SET NULL,
  thread_id   UUID REFERENCES threads(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifs_user    ON notifications(user_id, is_read);
CREATE INDEX idx_notifs_created ON notifications(created_at DESC);

-- ============================================================
-- PAGE ANALYTICS
-- ============================================================

CREATE TABLE page_views (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  recipe_id  UUID REFERENCES recipes(id) ON DELETE SET NULL,
  page       TEXT NOT NULL,                 -- '/recipe/123' | '/community' | '/browse'
  referrer   TEXT,                          -- 'search' | 'direct' | 'social' | 'community'
  city       TEXT,
  country    TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_views_recipe  ON page_views(recipe_id);
CREATE INDEX idx_views_user    ON page_views(user_id);
CREATE INDEX idx_views_created ON page_views(created_at DESC);

-- ============================================================
-- PURCHASES (one-time $2.99)
-- ============================================================

CREATE TABLE purchases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id   TEXT UNIQUE NOT NULL,
  stripe_customer_id  TEXT,
  amount_cents        INTEGER NOT NULL DEFAULT 299,
  currency            TEXT DEFAULT 'usd',
  status              TEXT DEFAULT 'completed',
  platform            TEXT,               -- 'ios' | 'android' | 'web'
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_user   ON purchases(user_id);
CREATE INDEX idx_purchases_stripe ON purchases(stripe_payment_id);

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated        BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_recipes_updated      BEFORE UPDATE ON recipes         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_threads_updated      BEFORE UPDATE ON threads         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_replies_updated      BEFORE UPDATE ON thread_replies  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_posts_updated        BEFORE UPDATE ON food_posts      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lists_updated        BEFORE UPDATE ON ingredient_lists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Cuisines
-- ============================================================

INSERT INTO cuisines (name, emoji, description) VALUES
  ('Chinese',       '🥡', 'Dumplings, stir-fries, dim sum & more'),
  ('Japanese',      '🍱', 'Ramen, sushi, tempura & izakaya classics'),
  ('Mexican',       '🌮', 'Tacos, mole, tamales & street food'),
  ('Soul Food',     '🍗', 'Fried chicken, collards, mac & cheese'),
  ('Cajun',         '🦞', 'Étouffée, jambalaya, gumbo & po''boys'),
  ('Indian',        '🍛', 'Curries, biryanis, dals & tandoor dishes'),
  ('Italian',       '🍝', 'Pasta, risotto, pizza & antipasti'),
  ('Korean',        '🥩', 'BBQ, kimchi jjigae, bibimbap & banchan'),
  ('Caribbean',     '🍲', 'Jerk, oxtail, curry goat & rice dishes'),
  ('Thai',          '🍜', 'Curries, pad thai, larb & street noodles'),
  ('French',        '🥐', 'Bistro classics, pastry & sauces'),
  ('Ethiopian',     '🫓', 'Injera, wats, tibs & spiced stews'),
  ('Greek',         '🥗', 'Mezze, souvlaki, spanakopita & seafood'),
  ('Vietnamese',    '🍜', 'Pho, bánh mì, fresh rolls & bun dishes'),
  ('American',      '🍔', 'BBQ, burgers, biscuits & comfort food'),
  ('Moroccan',      '🥘', 'Tagines, couscous, chermoula & pastilla'),
  ('Peruvian',      '🍋', 'Ceviche, lomo saltado & aji amarillo dishes'),
  ('Lebanese',      '🧆', 'Mezze, shawarma, kibbeh & fattoush'),
  ('West African',  '🍲', 'Jollof, egusi, fufu & suya'),
  ('Baking',        '🍰', 'Breads, cakes, pastry & desserts'),
  ('Mediterranean', '🫒', 'Seafood, olive oil dishes & mezze'),
  ('Spanish',       '🥘', 'Paella, tapas, gazpacho & tortilla'),
  ('Brazilian',     '🥩', 'Churrasco, feijoada, pão de queijo'),
  ('Breakfast',     '🥞', 'Pancakes, eggs, biscuits & morning bakes');
