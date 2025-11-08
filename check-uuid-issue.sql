-- =====================================================
-- DIAGNOSTIC: Check Update Control Table UUID Issue
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose the problem
-- =====================================================

-- 1. Check current table definition
SELECT 
  column_name,
  column_default,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'update_control'
ORDER BY ordinal_position;

-- 2. Check if there are any existing rows
SELECT * FROM update_control;

-- 3. Check specifically for the hardcoded UUID
SELECT * FROM update_control 
WHERE id = '6ac02950-7a6f-4108-a3bc-e08f84391299';

-- =====================================================
-- If the column_default shows the hardcoded UUID instead
-- of 'gen_random_uuid()', then run the fix-uuid-default.sql
-- =====================================================
