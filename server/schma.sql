-- ==========================================================
-- schema.sql — Oakline Furniture database
-- Run once in the Neon SQL Editor
-- ==========================================================

-- ---------- Products ----------
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  price       INTEGER      NOT NULL CHECK (price > 0),
  image       TEXT         NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  featured    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- ---------- Admins ----------
-- password_hash holds a scrambled password, never the real one
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- Orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  reference      VARCHAR(30)  NOT NULL UNIQUE,
  full_name      VARCHAR(120) NOT NULL,
  phone          VARCHAR(30)  NOT NULL,
  email          VARCHAR(255) NOT NULL DEFAULT '',
  address        TEXT         NOT NULL,
  city           VARCHAR(80)  NOT NULL,
  state          VARCHAR(80)  NOT NULL,
  notes          TEXT         NOT NULL DEFAULT '',
  payment_method VARCHAR(40)  NOT NULL DEFAULT 'Pay on Delivery',
  total          INTEGER      NOT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- Order items ----------
-- name and price are copied at purchase time, so old orders stay
-- correct even if the product is edited or deleted later
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products (id) ON DELETE SET NULL,
  name       VARCHAR(120) NOT NULL,
  price      INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- ---------- Starter products (the same 8 you've been testing with) ----------
INSERT INTO products (name, category, price, image, description, featured) VALUES
  ('Cloud Comfort Sofa',     'Sofas',  450000, 'https://placehold.co/600x450/e8dccb/6f4a2d?text=Sofa',         'A deep, soft 3-seater sofa.',                TRUE),
  ('Nordic Platform Bed',    'Beds',   380000, 'https://placehold.co/600x450/d9c7ae/6f4a2d?text=Bed',          'Solid wood queen-size bed frame.',           TRUE),
  ('Oak Dining Table',       'Tables', 295000, 'https://placehold.co/600x450/cdb89c/6f4a2d?text=Table',        'Seats six, finished in natural oak.',        TRUE),
  ('Velvet Accent Chair',    'Chairs', 120000, 'https://placehold.co/600x450/e2d3bd/6f4a2d?text=Chair',        'Elegant velvet chair with gold legs.',       TRUE),
  ('Corner L-Shape Sofa',    'Sofas',  620000, 'https://placehold.co/600x450/d3c0a5/6f4a2d?text=Corner+Sofa',  'Spacious sectional for large living rooms.', FALSE),
  ('Minimal Coffee Table',   'Tables',  85000, 'https://placehold.co/600x450/e8dccb/6f4a2d?text=Coffee+Table', 'Round table with a marble top.',              FALSE),
  ('King Storage Bed',       'Beds',   520000, 'https://placehold.co/600x450/d9c7ae/6f4a2d?text=King+Bed',     'King bed with built-in drawers.',            FALSE),
  ('Ergonomic Office Chair', 'Chairs', 145000, 'https://placehold.co/600x450/cdb89c/6f4a2d?text=Office+Chair', 'Breathable mesh with lumbar support.',        FALSE);