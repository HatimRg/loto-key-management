-- LOTO Key Management System - Supabase Setup
-- Run this SQL in your Supabase SQL Editor

-- Breakers table
CREATE TABLE IF NOT EXISTS breakers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  location TEXT NOT NULL,
  state TEXT DEFAULT 'Off' CHECK(state IN ('On', 'Off', 'Closed')),
  lock_key TEXT,
  general_breaker TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Locks table
CREATE TABLE IF NOT EXISTS locks (
  id BIGSERIAL PRIMARY KEY,
  key_number TEXT UNIQUE NOT NULL,
  zone TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  assigned_to TEXT,
  remarks TEXT
);

-- Personnel table
CREATE TABLE IF NOT EXISTS personnel (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  lastname TEXT NOT NULL,
  id_card TEXT UNIQUE NOT NULL,
  company TEXT,
  habilitation TEXT,
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- History table
CREATE TABLE IF NOT EXISTS history (
  id BIGSERIAL PRIMARY KEY,
  breaker_id BIGINT REFERENCES breakers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  user_mode TEXT NOT NULL CHECK(user_mode IN ('Editor', 'Visitor')),
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_breakers_zone ON breakers(zone);
CREATE INDEX IF NOT EXISTS idx_breakers_location ON breakers(location);
CREATE INDEX IF NOT EXISTS idx_breakers_state ON breakers(state);
CREATE INDEX IF NOT EXISTS idx_locks_zone ON locks(zone);
CREATE INDEX IF NOT EXISTS idx_locks_used ON locks(used);
CREATE INDEX IF NOT EXISTS idx_personnel_id_card ON personnel(id_card);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);

-- Enable Row Level Security (Optional - for production)
ALTER TABLE breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for anon key - adjust for production)
CREATE POLICY "Enable read access for all users" ON breakers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON breakers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON breakers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON breakers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON locks FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON locks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON locks FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON locks FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON personnel FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON personnel FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON personnel FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON personnel FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON plans FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON plans FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON plans FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON history FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON history FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON history FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON history FOR DELETE USING (true);

-- After running this SQL:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "loto_pdfs"
-- 3. Set it to public or private based on your needs
-- 4. Add your Supabase URL and anon key to the app settings

-- Done! Your Supabase backend is ready.
