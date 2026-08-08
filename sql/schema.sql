-- Kisan Mall PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ USERS ============

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(150),
  is_location_set BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'store_manager',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('packer', 'delivery_boy')),
  is_online BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(30) DEFAULT 'login',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CATALOG ============

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  image VARCHAR(20),
  sort_order INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  subcategories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(20),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(50),
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory VARCHAR(100),
  brand_id VARCHAR(50) REFERENCES brands(id),
  mrp NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(5,2) DEFAULT 0,
  unit VARCHAR(20),
  weight VARCHAR(50),
  description TEXT,
  stock INT DEFAULT 0,
  low_stock_limit INT DEFAULT 10,
  status VARCHAR(20) DEFAULT 'active',
  rack VARCHAR(20),
  shelf VARCHAR(20),
  bin VARCHAR(20),
  emoji VARCHAR(10),
  rating NUMERIC(3,1) DEFAULT 4.5,
  popular BOOLEAN DEFAULT FALSE,
  deal BOOLEAN DEFAULT FALSE,
  variants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ADDRESSES & LOCATION ============

CREATE TABLE IF NOT EXISTS serviceable_pincodes (
  pincode VARCHAR(10) PRIMARY KEY,
  city VARCHAR(100),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50),
  name VARCHAR(100),
  mobile VARCHAR(15),
  house VARCHAR(200),
  area VARCHAR(200),
  landmark VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PROMOTIONS ============

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  start_date DATE,
  end_date DATE,
  usage_limit INT DEFAULT 1000,
  used_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(30) NOT NULL,
  value NUMERIC(10,2) DEFAULT 0,
  target VARCHAR(30) DEFAULT 'all',
  target_id VARCHAR(50),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image VARCHAR(20),
  link_type VARCHAR(30),
  link_id VARCHAR(50),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_slots (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_orders INT DEFAULT 30,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ORDERS ============

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id),
  customer_name VARCHAR(100),
  customer_mobile VARCHAR(15),
  address_text TEXT,
  address_id VARCHAR(50),
  slot_id VARCHAR(50) REFERENCES delivery_slots(id),
  slot_label VARCHAR(50),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  coupon_code VARCHAR(50),
  delivery_fee NUMERIC(10,2) DEFAULT 30,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  status VARCHAR(30) NOT NULL DEFAULT 'placed',
  packer_status VARCHAR(20),
  delivery_status VARCHAR(30),
  assigned_packer_id VARCHAR(50) REFERENCES staff_users(id),
  assigned_delivery_id VARCHAR(50) REFERENCES staff_users(id),
  delivery_otp VARCHAR(10),
  cod_collected BOOLEAN DEFAULT FALSE,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) REFERENCES products(id),
  variant_id VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50),
  barcode VARCHAR(50),
  emoji VARCHAR(10),
  qty INT NOT NULL DEFAULT 1,
  picked_qty INT DEFAULT 0,
  price NUMERIC(10,2) NOT NULL,
  rack VARCHAR(20),
  shelf VARCHAR(20),
  bin VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS order_status_log (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  note TEXT,
  changed_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PAYMENTS & REFUNDS ============

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id),
  customer_name VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  method VARCHAR(30),
  status VARCHAR(20) DEFAULT 'pending',
  txn_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id),
  customer_name VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SUPPORT & REVIEWS ============

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id),
  customer_name VARCHAR(100),
  order_id VARCHAR(50),
  issue TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id),
  customer_name VARCHAR(100),
  product_id VARCHAR(50) REFERENCES products(id),
  product_name VARCHAR(200),
  order_id VARCHAR(50) REFERENCES orders(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_reviews (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
  customer_id VARCHAR(50) REFERENCES customers(id),
  order_rating INT CHECK (order_rating BETWEEN 1 AND 5),
  product_ratings JSONB DEFAULT '[]'::jsonb,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CUSTOMER FEATURES ============

CREATE TABLE IF NOT EXISTS wishlist (
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
  product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(30) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INVENTORY ============

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR(50) PRIMARY KEY,
  product_id VARCHAR(50) REFERENCES products(id),
  product_name VARCHAR(200),
  type VARCHAR(30) NOT NULL,
  old_stock INT,
  new_stock INT,
  reason TEXT,
  changed_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SETTINGS ============

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_packer_status ON orders(packer_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_delivery ON orders(assigned_delivery_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
