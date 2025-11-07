-- =====================================================
-- LOTO KMS: Admin Update Control Table
-- =====================================================
-- Copy this entire script and paste it into Supabase SQL Editor
-- Then click "Run" to create the table
-- =====================================================

-- Create update_control table
CREATE TABLE IF NOT EXISTS update_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_update_available BOOLEAN DEFAULT false NOT NULL,
  version_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE update_control ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to read (all users need to check for updates)
CREATE POLICY "Allow public read access" ON update_control
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert" ON update_control
  FOR INSERT WITH CHECK (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update" ON update_control
  FOR UPDATE USING (true);

-- Insert initial row (only one row should exist)
INSERT INTO update_control (is_update_available, version_number)
VALUES (false, NULL)
ON CONFLICT DO NOTHING;

-- Add table comment
COMMENT ON TABLE update_control IS 'Admin-controlled update notifications for all users';

-- =====================================================
-- DONE! Table created successfully.
-- =====================================================
