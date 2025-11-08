-- DELETE OLD TABLE AND CREATE NEW ONE
-- Just copy everything below and paste into Supabase SQL Editor, then click RUN

-- Delete old table
DROP TABLE IF EXISTS update_control CASCADE;

-- Create new table
CREATE TABLE update_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_update_available BOOLEAN DEFAULT false NOT NULL,
  version_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Allow everyone to read it
ALTER TABLE update_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON update_control FOR SELECT USING (true);
CREATE POLICY "write" ON update_control FOR INSERT WITH CHECK (true);
CREATE POLICY "edit" ON update_control FOR UPDATE USING (true);

-- Add one row
INSERT INTO update_control (is_update_available, version_number)
VALUES (false, NULL);

-- Show what we created
SELECT * FROM update_control;
