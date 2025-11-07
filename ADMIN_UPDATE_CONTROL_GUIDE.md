# Admin Update Control Feature Guide

## Overview

The Admin Update Control feature allows administrators to force update notifications to all users, regardless of whether a real update is available. This is useful for:

- Alerting users about critical updates they need to install
- Announcing maintenance windows
- Ensuring all users are aware of important changes
- Testing the update notification system

## Setup

### 1. Create the Database Table

1. Open the file `supabase-update-control.sql` in the project root
2. Copy the entire SQL script
3. Open your Supabase project dashboard
4. Go to **SQL Editor** in the left sidebar
5. Paste the SQL and click **Run**

### 2. Verify Table Creation

Check that the table was created successfully:
- Go to **Table Editor**
- Look for `update_control` table
- Should have one row with `is_update_available = false`

## How to Use

### For Admins: Enable Update Alert

1. **Login as Admin Editor**
2. **Go to Settings page**
3. **Find "Software Updates" section**
4. **Click "Alert Users" button** (orange/amber gradient)
5. **Enter version number** in the modal
   - Can be any format: `1.8.0`, `2.0.0-beta`, `Next Release`, etc.
   - No strict validation - enter what makes sense
6. **Click "Enable Alert"**
7. **Confirmation:** Toast message appears and button turns green

### For Admins: Disable Update Alert

1. **Go to Settings page**
2. **Click "Disable Alert" button** (green gradient)
3. **Confirmation:** Toast message appears and button returns to orange

### For All Users: Receiving Alerts

When an admin enables an update alert:

1. **On next app launch** (3 seconds after startup):
   - Update notification appears automatically
   - Shows the version number admin specified
   - Message: "An important update is available. Please check for updates."
   
2. **Users can:**
   - Click "Update Now" to download (if real update exists)
   - Click "Remind Me Later" to snooze for 4 hours
   - Close the notification (but will appear on next launch if alert still active)

3. **Automatic update check:**
   - App automatically checks GitHub for updates
   - If real update exists, normal download flow proceeds
   - If no real update, notification remains visible for awareness

## Admin Button States

| State | Color | Icon | Meaning |
|-------|-------|------|---------|
| **Alert Users** | Orange/Amber | BellOff | Update alert is currently disabled |
| **Disable Alert** | Green/Emerald | Bell | Update alert is currently active |
| **Loading...** | Gray | - | Processing request |

## Technical Details

### Database Table Structure

```sql
update_control:
  - id: UUID (primary key)
  - is_update_available: boolean (default false)
  - version_number: text (nullable)
  - created_at: timestamp
  - updated_at: timestamp
```

### How It Works

1. **Admin Action:**
   - Admin toggles "Alert Users" in Settings
   - App writes to Supabase `update_control` table
   - Sets `is_update_available = true` and stores version number

2. **User Launch:**
   - App checks `update_control` table 3 seconds after launch
   - If `is_update_available = true`, shows notification
   - Clears localStorage snooze to force display
   - Triggers automatic update check in background

3. **Snooze Behavior:**
   - Admin alert bypasses snooze on first launch
   - Users can still snooze after initial notification
   - Snooze lasts 4 hours
   - Next launch after snooze shows notification again

### Logging

All admin actions are logged:
```javascript
logger.log('Admin enabled update control', {
  version: '1.8.0',
  timestamp: '2025-01-08T12:00:00Z'
});
```

## Testing

### Test Admin Control

1. **Run the SQL script** `supabase-update-control.sql` in Supabase first
2. **Enable alert** with version "TEST-1.0"
3. **Check Settings** - button should be green
4. **Restart app**
5. **Verify notification** appears with "TEST-1.0"

### Test Debug Mode (Admin Only)

1. **Go to Settings**
2. **Hold Ctrl+Shift** and click "Check for Updates"
3. **Verify CMD installer** opens with mock data
4. **Watch countdown** complete without actual restart

## Troubleshooting

### Alert Not Showing

**Check:**
- Supabase connection is active (online indicator)
- `update_control` table exists
- RLS policies are configured correctly
- Console for error messages

**Solution:**
- Verify Supabase credentials in Settings
- Re-run the SQL script `supabase-update-control.sql`
- Check browser console for errors

### Button Not Changing State

**Check:**
- Supabase credentials configured
- Network connection active
- Console for API errors

**Solution:**
- Verify SUPABASE_URL and SUPABASE_KEY in Settings
- Check Supabase project status
- Refresh app and try again

### Users Not Seeing Alert

**Check:**
- Alert is enabled in admin Settings
- Users have Supabase credentials configured
- 3-second startup delay has passed

**Solution:**
- Verify `is_update_available = true` in database
- Ensure all users are online
- Have users restart the app

## Best Practices

1. **Use descriptive version numbers**
   - Good: "1.8.0 - Critical Security Update"
   - Good: "2.0.0 Beta - Test Release"
   - Avoid: "123" or random strings

2. **Communicate with users**
   - Let users know an alert is coming
   - Explain why update is important
   - Provide update instructions if needed

3. **Disable after update window**
   - Don't leave alerts active indefinitely
   - Disable once most users have updated
   - Re-enable for future critical updates

4. **Test before production**
   - Use debug mode to preview UI
   - Test with small user group first
   - Verify disable functionality works

## Security Considerations

Current RLS policies allow:
- **Everyone can read** - needed for update checks
- **Authenticated users can write** - allows admin control

### Recommended Improvements

For production, consider restricting write access:

```sql
-- Replace the insert/update policies with role-based policies
DROP POLICY "Allow authenticated users to insert" ON update_control;
DROP POLICY "Allow authenticated users to update" ON update_control;

-- Add admin-only policies (requires auth with custom claims)
CREATE POLICY "Allow admin users to insert" ON update_control
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow admin users to update" ON update_control
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
```

## Future Enhancements

Possible improvements:
- Schedule alerts for specific date/time
- Different messages for different user roles
- Alert history and audit log
- Email notifications when alert enabled
- Multiple alert types (critical, maintenance, feature)
- Auto-disable after X days

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify Supabase connection
3. Review migration SQL execution
4. Test with debug mode first
5. Check CHANGELOG.md for known issues
