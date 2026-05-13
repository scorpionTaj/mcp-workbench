-- Create SearchHistory table for tracking user searches
CREATE TABLE IF NOT EXISTS "SearchHistory" (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  filters TEXT,
  resultsCount INTEGER DEFAULT 0,
  selectedResult TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS "SearchHistory_createdAt_idx" ON "SearchHistory"(createdAt);
CREATE INDEX IF NOT EXISTS "SearchHistory_query_idx" ON "SearchHistory"(query);

-- Optional: Create a GiST index for full-text search (PostgreSQL specific)
-- This requires the pg_trgm extension
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX "SearchHistory_query_gin_idx" ON "SearchHistory" USING GIN (query gin_trgm_ops);
