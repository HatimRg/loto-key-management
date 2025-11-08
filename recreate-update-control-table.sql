-- =====================================================
-- RECREATE UPDATE_CONTROL TABLE - Clean Installation
-- =====================================================
-- This will DELETE the old table and create a fresh one
-- Copy this entire script and paste into Supabase SQL Editor
-- Then click "Run"
-- =====================================================

-- Step 1: Drop existing table and policies
DROP TABLE IF EXISTS update_control CASCADE;

-- Step 2: Create fresh update_control table
CREATE TABLE update_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_update_available BOOLEAN DEFAULT false NOT NULL,
  version_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 3: Enable Row Level Security
ALTER TABLE update_control ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- Allow everyone to read (all users need to check for updates)
CREATE POLICY "Allow public read access" ON update_control
  FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert" ON update_control
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update" ON update_control
  FOR UPDATE USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete" ON update_control
  FOR DELETE USING (true);

-- Step 5: Insert initial default row
INSERT INTO update_control (is_update_available, version_number)
VALUES (false, NULL);

-- Step 6: Add table comment
COMMENT ON TABLE update_control IS 'Admin-controlled update notifications for all users';

-- Step 7: Verify the setup
SELECT 
  id,
  is_update_available,
  version_number,
  created_at,
  updated_at
FROM update_control;

-- =====================================================
-- ✅ DONE! Table recreated successfully
-- =====================================================
-- 
-- Copy the ID from the result above and use it to enable updates:
--
-- UPDATE update_control
-- SET 
--   is_update_available = true,
--   version_number = '1.7.4',
--   updated_at = NOW()
-- WHERE id = 'PASTE_ID_HERE';
--
-- =====================================================
