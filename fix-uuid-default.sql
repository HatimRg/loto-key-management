-- =====================================================
-- FIX: Update Control Table UUID Default
-- =====================================================
-- This fixes the hardcoded UUID default to use proper random generation
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Remove the incorrect hardcoded UUID default and set it to generate random UUIDs
ALTER TABLE update_control 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
SELECT 
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'update_control' 
  AND column_name = 'id';

-- =====================================================
-- Expected result should show:
-- column_name: id
-- column_default: gen_random_uuid()
-- data_type: uuid
-- =====================================================
