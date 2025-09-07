-- Create important_items table for Supabase
CREATE TABLE IF NOT EXISTS important_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  assignee VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_important_items_date ON important_items(date);
CREATE INDEX IF NOT EXISTS idx_important_items_assignee ON important_items(assignee);
CREATE INDEX IF NOT EXISTS idx_important_items_completed ON important_items(completed);