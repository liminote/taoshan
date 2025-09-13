-- Create analysis_archives table for Supabase
CREATE TABLE IF NOT EXISTS analysis_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_analysis_archives_title ON analysis_archives(title);
CREATE INDEX IF NOT EXISTS idx_analysis_archives_created_at ON analysis_archives(created_at);

-- Create full text search index for content and title
CREATE INDEX IF NOT EXISTS idx_analysis_archives_search ON analysis_archives USING gin(to_tsvector('english', title || ' ' || content));