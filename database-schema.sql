-- 餐廳管理系統資料庫 Schema

-- 大分類表
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 小分類表
CREATE TABLE subcategories (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- 商品比對表
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  original_name VARCHAR(200) NOT NULL UNIQUE,
  new_name VARCHAR(200),
  category_id BIGINT REFERENCES categories(id),
  subcategory_id BIGINT REFERENCES subcategories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 訂單主表
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(100),
  external_order_number VARCHAR(100),
  invoice_number VARCHAR(100),
  carrier_code VARCHAR(100),
  checkout_time TIMESTAMP,
  order_source VARCHAR(50),
  order_type VARCHAR(50),
  table_number VARCHAR(20),
  service_fee DECIMAL(10,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  invoice_amount DECIMAL(10,2) NOT NULL,
  payment_module VARCHAR(50),
  payment_info TEXT,
  payment_note TEXT,
  current_status VARCHAR(50),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(50),
  order_note TEXT,
  items TEXT,
  orderer VARCHAR(100),
  orderer_phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 商品銷售明細表
CREATE TABLE product_sales (
  id BIGSERIAL PRIMARY KEY,
  product_original_name VARCHAR(200) NOT NULL,
  invoice_number VARCHAR(100),
  carrier_code VARCHAR(100),
  checkout_time TIMESTAMP,
  order_number VARCHAR(100),
  external_order_number VARCHAR(100),
  order_source VARCHAR(50),
  order_type VARCHAR(50),
  table_number VARCHAR(20),
  invoice_amount DECIMAL(10,2) NOT NULL,
  current_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_orders_checkout_time ON orders(checkout_time);
CREATE INDEX idx_orders_invoice_number ON orders(invoice_number);
CREATE INDEX idx_product_sales_checkout_time ON product_sales(checkout_time);
CREATE INDEX idx_product_sales_product_name ON product_sales(product_original_name);
CREATE INDEX idx_products_original_name ON products(original_name);