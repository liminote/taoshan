-- 客人需求確認主表
CREATE TABLE guest_confirmations (
  id BIGSERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  adult_count INTEGER DEFAULT 0,
  child_count INTEGER DEFAULT 0,
  dining_type VARCHAR(50), -- 單點 / 配菜 / 無菜單 / 其他
  dining_purpose VARCHAR(50), -- 家庭聚會 / 朋友聚餐 / 公司聚餐 / 情侶聚餐
  alcohol_allowed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 客人個別需求表
CREATE TABLE guest_details (
  id BIGSERIAL PRIMARY KEY,
  confirmation_id BIGINT REFERENCES guest_confirmations(id) ON DELETE CASCADE,
  guest_index INTEGER NOT NULL, -- 第幾位客人
  requirements TEXT[], -- 需求列表 (e.g., ["不吃生食", "不吃牛肉"])
  other_requirement TEXT, -- 其他需求補充
  created_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_guest_confirmations_created_at ON guest_confirmations(created_at);
CREATE INDEX idx_guest_details_confirmation_id ON guest_details(confirmation_id);
