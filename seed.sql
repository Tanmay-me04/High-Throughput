-- Creates the products table with 100,000 rows
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  category    TEXT,
  price       NUMERIC(10,2),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO products (name, category, price, description)
SELECT 'Product ' || g,
       'cat' || (g % 50),
       (random() * 1000)::numeric(10,2),
       repeat('lorem ipsum ', 20)
FROM generate_series(1, 100000) g;

ANALYZE products;
