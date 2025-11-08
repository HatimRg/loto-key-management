-- SIMPLEST VERSION - No UUID needed, just one row with ID = 1
-- Copy everything and paste into Supabase SQL Editor, then click RUN

-- Delete old table
DROP TABLE IF EXISTS update_control CASCADE;

-- Create new table with fixed ID = 1 (only one row ever exists)
CREATE TABLE update_control (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_update_available BOOLEAN DEFAULT false NOT NULL,
  version_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Allow everyone to read and write
ALTER TABLE update_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON update_control FOR SELECT USING (true);
CREATE POLICY "write" ON update_control FOR INSERT WITH CHECK (true);
CREATE POLICY "edit" ON update_control FOR UPDATE USING (true);

-- Add the one and only row (ID will always be 1)
INSERT INTO update_control (is_update_available, version_number)
VALUES (false, NULL);

-- Show what we created
SELECT * FROM update_control;
