# Auto-Update System Fixes - v1.7.2

## Issues Fixed

### 1. ✅ Update Check UI Stuck in "Checking" State
**Problem:** When clicking "Check for Updates" in Settings, the UI stayed in "Checking..." state forever even when update check completed.

**Root Cause:** The `update-not-available` event was not being sent from main process to renderer process.

**Fix:** Added `mainWindow.webContents.send('update-not-available', info)` in `electron/main.js`

```javascript
// electron/main.js line 375-380
autoUpdater.on('update-not-available', (info) => {
  console.log('✅ App is up to date:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});
```

### 2. ✅ Supabase Configuration Error in Admin Update Control
**Problem:** Clicking "Alert Users" button showed error: "Supabase not configured"

**Root Cause:** The code was checking `config?.SUPABASE_URL` which was null/undefined, but `formData` had the default Supabase credentials.

**Fix:** Modified 3 functions in `src/pages/Settings.js` to use `formData` with fallback to `config`:

```javascript
// Use formData which has defaults, not config
const supabaseUrl = formData.SUPABASE_URL || config?.SUPABASE_URL;
const supabaseKey = formData.SUPABASE_KEY || config?.SUPABASE_KEY;
```

**Functions Fixed:**
- `loadUpdateControlState()` - line 133
- `enableUpdateControl()` - line 171  
- `disableUpdateControl()` - line 238

### 3. ✅ Version Downgrade for Testing
**Problem:** Need to test auto-update from v1.7.2 → v1.7.4

**Fix:** Downgraded version in 3 files:
- `package.json` → `"version": "1.7.2"`
- `electron/main.js` → fallback: `'1.7.2'`
- `latest.yml` → all references: `1.7.2`

---

## Testing Steps

### Step 1: Check Supabase Update Control Table

Run this SQL in Supabase SQL Editor:

```sql
-- Check the actual ID in your table
SELECT 
  id,
  is_update_available,
  version_number,
  created_at,
  updated_at
FROM update_control
ORDER BY created_at DESC;
```

**Copy the actual `id` from the result!**

### Step 2: Rebuild App with v1.7.2

Open **Command Prompt** (not PowerShell):

```cmd
cd "c:\Users\HSE-SGTM\Desktop\LOTO APP\Claude 5"
npm run build
npm run dist
```

This creates: `dist\LOTO Key Management Setup 1.7.2.exe`

### Step 3: Install v1.7.2

1. Uninstall current version
2. Install `LOTO Key Management Setup 1.7.2.exe`
3. Launch the app
4. Log in as Admin Editor (code: 010203)
5. Go to Settings

### Step 4: Enable Update Notification via UI

1. In Settings → Software Updates section
2. Click **"Alert Users"** button
3. Enter version: `1.7.4`
4. Click **"Enable Alert"**
5. Should see: ✅ "Update notification enabled for v1.7.4"

**OR** manually via SQL (using the correct ID from Step 1):

```sql
UPDATE update_control
SET 
  is_update_available = true,
  version_number = '1.7.4',
  updated_at = NOW()
WHERE id = 'YOUR_ACTUAL_ID_HERE';
```

### Step 5: Test Auto-Update Notification

1. **Restart the app completely** (close and reopen)
2. Within 3 seconds of launch, you should see the update notification popup
3. Click "Update Now"
4. Should download from GitHub and install v1.7.4

### Step 6: Test Manual Update Check

1. In Settings → Software Updates
2. Click **"Check for Updates"**
3. Should show:
   - Checking... (with spinner)
   - Then either "Update available" or "Up to date"
4. UI should NOT stay stuck in "Checking" state

---

## Expected Behaviors

### ✅ Update Check (Working Now)

```
User clicks "Check for Updates"
  ↓
Shows "Checking..." with spinner
  ↓
After 2-5 seconds:
  ✓ "Update available" → Show update notification
  ✓ "Up to date" → Show green badge
  ✓ "Check failed" → Show red badge with error
```

### ✅ Admin Update Control (Working Now)

```
Admin clicks "Alert Users"
  ↓
Modal opens: Enter version number
  ↓
Admin enters "1.7.4" → Click "Enable Alert"
  ↓
Updates Supabase: is_update_available = true
  ↓
All users get notification on next app launch
```

### ✅ Background Check (Already Working)

```
App launches
  ↓
After 5 seconds (silent background check)
  ↓
If update available → Show notification popup
If up to date → No notification
```

---

## Remaining Enhancements (Future Work)

### 1. Header Update Indicator
Add a persistent header badge when update is available:

```
┌─────────────────────────────────┐
│ LOTO KMS  [🔔 Update: v1.7.4]  │
└─────────────────────────────────┘
```

### 2. Non-Blocking Background Check
Current: 5 second delay after launch
Better: Immediate async check without blocking UI

### 3. Better Error Messages
- Network errors: "No internet connection"
- GitHub rate limit: "Too many requests, try later"
- Parse errors: "Update server unreachable"

---

## Logs to Monitor

### Main Process (Electron)
Location: `C:\Users\HSE-SGTM\AppData\Roaming\loto-key-management\app-debug.log`

```
[2025-11-07T10:21:52.226] [info] Checking for update
[2025-11-07T10:21:53.795] [info] Found version 1.7.4 (url: LOTO-Key-Management-Setup-1.7.4.exe)
```

### Renderer Process (Browser Console)
- F12 → Console tab
- Look for: "🔔 Update available" or "✅ App is up to date"

---

## Troubleshooting

### Problem: SQL UPDATE doesn't work
**Solution:** Use the SQL query in Step 1 to get the actual `id` value from your table.

### Problem: "Supabase not configured" error
**Solution:** 
1. Check Settings → Supabase Configuration
2. Verify URL: `https://qrjkgvglorotucerfspt.supabase.co`
3. Verify Key is filled in
4. Click "Save Configuration"

### Problem: Update check times out after 15 seconds
**Solution:**
1. Check internet connection
2. Verify GitHub repo is accessible: https://github.com/HatimRg/loto-key-management/releases
3. Check if v1.7.4 release exists with `LOTO-Key-Management-Setup-1.7.4.exe`

### Problem: Download fails
**Solution:**
1. Ensure v1.7.4 is published on GitHub releases
2. Ensure `latest.yml` exists in the release assets
3. Check file naming matches: `LOTO-Key-Management-Setup-1.7.4.exe` (not `LOTO Key Management Setup 1.7.4.exe`)

---

## Files Modified

1. `electron/main.js` - Fixed update-not-available event
2. `src/pages/Settings.js` - Fixed Supabase config checks (3 functions)
3. `package.json` - Version downgrade to 1.7.2
4. `latest.yml` - Version downgrade to 1.7.2

## Files Created

1. `check-update-control-id.sql` - Helper to find correct UUID
2. `AUTO_UPDATE_FIXES.md` - This document

---

**Status:** ✅ Ready for Testing
**Next:** Rebuild with `npm run build && npm run dist`
