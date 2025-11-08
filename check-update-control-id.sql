-- Check the actual ID in update_control table
SELECT 
  id,
  is_update_available,
  version_number,
  created_at,
  updated_at
FROM update_control
ORDER BY created_at DESC;

-- If you need to update, use the correct ID from the result above:
-- UPDATE update_control
-- SET 
--   is_update_available = true,
--   version_number = '1.7.4',
--   updated_at = NOW()
-- WHERE id = 'PUT_ACTUAL_ID_HERE';
