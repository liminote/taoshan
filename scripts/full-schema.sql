-- 1. Core Schema (from database-schema.sql)
-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  original_name VARCHAR(200) NOT NULL UNIQUE,
  new_name VARCHAR(200),
  category_id BIGINT REFERENCES categories(id),
  subcategory_id BIGINT REFERENCES subcategories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
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

-- Product Sales
CREATE TABLE IF NOT EXISTS product_sales (
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

-- Meeting Records
CREATE TABLE IF NOT EXISTS meeting_records (
  id BIGSERIAL PRIMARY KEY,
  meeting_date DATE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT false
);

-- Indexes from database-schema.sql
CREATE INDEX IF NOT EXISTS idx_orders_checkout_time ON orders(checkout_time);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_product_sales_checkout_time ON product_sales(checkout_time);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_name ON product_sales(product_original_name);
CREATE INDEX IF NOT EXISTS idx_products_original_name ON products(original_name);
CREATE INDEX IF NOT EXISTS idx_meeting_records_meeting_date ON meeting_records(meeting_date);


-- 2. Important Items (from sql/important_items.sql)
CREATE TABLE IF NOT EXISTS important_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  assignee VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_important_items_date ON important_items(date);
CREATE INDEX IF NOT EXISTS idx_important_items_assignee ON important_items(assignee);
CREATE INDEX IF NOT EXISTS idx_important_items_completed ON important_items(completed);


-- 3. Guest Confirmations (from sql/guest_confirmations.sql)
CREATE TABLE IF NOT EXISTS guest_confirmations (
  id BIGSERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  adult_count INTEGER DEFAULT 0,
  child_count INTEGER DEFAULT 0,
  dining_type VARCHAR(50), 
  dining_purpose VARCHAR(50), 
  alcohol_allowed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guest_details (
  id BIGSERIAL PRIMARY KEY,
  confirmation_id BIGINT REFERENCES guest_confirmations(id) ON DELETE CASCADE,
  guest_index INTEGER NOT NULL,
  requirements TEXT[], 
  other_requirement TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_confirmations_created_at ON guest_confirmations(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_details_confirmation_id ON guest_details(confirmation_id);


-- 4. Analysis Archives (from sql/analysis_archives.sql)
CREATE TABLE IF NOT EXISTS analysis_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_archives_title ON analysis_archives(title);
CREATE INDEX IF NOT EXISTS idx_analysis_archives_created_at ON analysis_archives(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_archives_search ON analysis_archives USING gin(to_tsvector('english', title || ' ' || content));


-- 5. RLS Policies (from sql/meeting_records.sql)
ALTER TABLE meeting_records ENABLE ROW LEVEL SECURITY;

-- Note: Adjust this policy for production as needed
CREATE POLICY "Allow all operations for anon users"
ON meeting_records
FOR ALL
USING (true)
WITH CHECK (true);
