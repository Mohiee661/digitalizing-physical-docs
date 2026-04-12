-- ============================================================
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable the vector extension (if not already enabled)
create extension if not exists vector with schema extensions;

-- Drop the old function first (required because return type changed)
drop function if exists match_chunks(vector, integer, uuid);

-- Recreate the match_chunks function for semantic search
create or replace function match_chunks(
  query_embedding vector(384),
  match_count int default 10,
  p_project_id uuid default null
)
returns table (
  record_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    rc.record_id,
    rc.chunk_index,
    rc.content,
    1 - (rc.embedding <=> query_embedding) as similarity
  from record_chunks rc
  where (p_project_id is null or rc.project_id = p_project_id)
  order by rc.embedding <=> query_embedding
  limit match_count;
end;
$$;
