-- Approximate-nearest-neighbour indexes for knowledge search. The embedding column has no fixed
-- size (each knowledge base picks its model), so there is one partial expression index per common
-- size; lib/knowledge.ts casts to the same type when searching so the planner can use them.
-- HNSW on `vector` is limited to 2000 dimensions; 3072 (e.g. text-embedding-3-large) uses halfvec,
-- which needs pgvector 0.7+.
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_384_hnsw" ON "KnowledgeChunk" USING hnsw (("embedding"::vector(384)) vector_cosine_ops) WHERE vector_dims("embedding") = 384;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_768_hnsw" ON "KnowledgeChunk" USING hnsw (("embedding"::vector(768)) vector_cosine_ops) WHERE vector_dims("embedding") = 768;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_1024_hnsw" ON "KnowledgeChunk" USING hnsw (("embedding"::vector(1024)) vector_cosine_ops) WHERE vector_dims("embedding") = 1024;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_1536_hnsw" ON "KnowledgeChunk" USING hnsw (("embedding"::vector(1536)) vector_cosine_ops) WHERE vector_dims("embedding") = 1536;--> statement-breakpoint
DO $$
BEGIN
  IF to_regtype('halfvec') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_3072_hnsw" ON "KnowledgeChunk" USING hnsw (("embedding"::halfvec(3072)) halfvec_cosine_ops) WHERE vector_dims("embedding") = 3072';
  END IF;
END $$;
