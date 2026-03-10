-- ============================================================
-- Open Brain: Multi-user migration
-- Adds user_id to existing tables, creates new tables,
-- enables RLS, adds hybrid search functions.
-- ============================================================

-- ----- New tables -----

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  llm_provider TEXT DEFAULT 'openrouter',
  llm_api_key_encrypted TEXT,
  llm_model TEXT DEFAULT 'google/gemini-2.5-flash',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_used JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for chat tables
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_user_idx ON chat_sessions(user_id);

-- Trigger: auto-set chat_messages.user_id from session
CREATE OR REPLACE FUNCTION set_chat_message_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := (SELECT user_id FROM chat_sessions WHERE id = NEW.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_chat_message_user_id ON chat_messages;
CREATE TRIGGER trg_set_chat_message_user_id
  BEFORE INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION set_chat_message_user_id();

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----- Modify existing tables: add user_id -----
-- NOTE: Run Step 2 (backfill) separately after first owner signup

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'thoughts' AND column_name = 'user_id') THEN
    ALTER TABLE thoughts ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id') THEN
    ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chunks' AND column_name = 'user_id') THEN
    ALTER TABLE chunks ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'user_id') THEN
    ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ----- Full-text search columns -----

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'thoughts' AND column_name = 'fts') THEN
    ALTER TABLE thoughts ADD COLUMN fts tsvector
      GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'fts') THEN
    ALTER TABLE documents ADD COLUMN fts tsvector
      GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,''))) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS thoughts_fts_idx ON thoughts USING gin(fts);
CREATE INDEX IF NOT EXISTS documents_fts_idx ON documents USING gin(fts);
CREATE INDEX IF NOT EXISTS thoughts_user_idx ON thoughts(user_id);
CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS chunks_user_idx ON chunks(user_id);

-- ----- Hybrid search functions -----

CREATE OR REPLACE FUNCTION hybrid_search_thoughts(
  query_text TEXT,
  query_embedding VECTOR(1024),
  user_id_filter UUID,
  match_count INT DEFAULT 10
) RETURNS TABLE(id UUID, content TEXT, metadata JSONB, score FLOAT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH semantic AS (
    SELECT t.id, t.content, t.metadata,
           1 - (t.embedding <=> query_embedding) AS similarity,
           ROW_NUMBER() OVER (ORDER BY t.embedding <=> query_embedding) AS rank
    FROM thoughts t
    WHERE t.user_id = user_id_filter
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fulltext AS (
    SELECT t.id, t.content, t.metadata,
           ts_rank(t.fts, websearch_to_tsquery('english', query_text)) AS similarity,
           ROW_NUMBER() OVER (ORDER BY ts_rank(t.fts, websearch_to_tsquery('english', query_text)) DESC) AS rank
    FROM thoughts t
    WHERE t.user_id = user_id_filter AND t.fts @@ websearch_to_tsquery('english', query_text)
    LIMIT match_count * 2
  )
  SELECT COALESCE(s.id, f.id) AS id,
         COALESCE(s.content, f.content) AS content,
         COALESCE(s.metadata, f.metadata) AS metadata,
         (COALESCE(1.0/(60 + s.rank), 0) + COALESCE(1.0/(60 + f.rank), 0))::FLOAT AS score
  FROM semantic s FULL OUTER JOIN fulltext f ON s.id = f.id
  ORDER BY score DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION hybrid_search_documents(
  query_text TEXT,
  query_embedding VECTOR(1024),
  user_id_filter UUID,
  match_count INT DEFAULT 10
) RETURNS TABLE(id UUID, title TEXT, summary TEXT, file_type TEXT, metadata JSONB, score FLOAT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH semantic AS (
    SELECT d.id, d.title, d.summary, d.file_type, d.metadata,
           1 - (d.embedding <=> query_embedding) AS similarity,
           ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS rank
    FROM documents d
    WHERE d.user_id = user_id_filter
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fulltext AS (
    SELECT d.id, d.title, d.summary, d.file_type, d.metadata,
           ts_rank(d.fts, websearch_to_tsquery('english', query_text)) AS similarity,
           ROW_NUMBER() OVER (ORDER BY ts_rank(d.fts, websearch_to_tsquery('english', query_text)) DESC) AS rank
    FROM documents d
    WHERE d.user_id = user_id_filter AND d.fts @@ websearch_to_tsquery('english', query_text)
    LIMIT match_count * 2
  )
  SELECT COALESCE(s.id, f.id) AS id,
         COALESCE(s.title, f.title) AS title,
         COALESCE(s.summary, f.summary) AS summary,
         COALESCE(s.file_type, f.file_type) AS file_type,
         COALESCE(s.metadata, f.metadata) AS metadata,
         (COALESCE(1.0/(60 + s.rank), 0) + COALESCE(1.0/(60 + f.rank), 0))::FLOAT AS score
  FROM semantic s FULL OUTER JOIN fulltext f ON s.id = f.id
  ORDER BY score DESC
  LIMIT match_count;
$$;

-- ----- RLS Policies -----

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles FOR ALL USING (id = auth.uid());

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sessions" ON chat_sessions FOR ALL USING (user_id = auth.uid());

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_messages" ON chat_messages FOR ALL USING (user_id = auth.uid());

-- RLS on existing tables (only if user_id column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'thoughts' AND column_name = 'user_id') THEN
    ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'thoughts' AND policyname = 'own_thoughts') THEN
      CREATE POLICY "own_thoughts" ON thoughts FOR ALL USING (user_id = auth.uid());
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'own_documents') THEN
      CREATE POLICY "own_documents" ON documents FOR ALL USING (user_id = auth.uid());
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chunks' AND column_name = 'user_id') THEN
    ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chunks' AND policyname = 'own_chunks') THEN
      CREATE POLICY "own_chunks" ON chunks FOR ALL USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;
