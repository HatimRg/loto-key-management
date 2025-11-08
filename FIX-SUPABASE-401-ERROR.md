# Fix Supabase 401 Unauthorized Error

## 🔴 Problem

```
Failed to load resource: the server responded with a status of 401 ()
Error: {message: 'Invalid API key', hint: 'Double check your Supabase `anon` or `service_role` API key.'}
```

**Location:** When clicking "Alert Users" in Settings

---

## ✅ Solution: Get Correct Supabase Keys

### Step 1: Get Your Real Supabase Keys

1. Go to: https://supabase.com/dashboard/project/qrjkgvglorotucerfspt/settings/api

2. Find these two keys:
   - **Project URL**: `https://qrjkgvglorotucerfspt.supabase.co`
   - **anon public** key: `eyJhbG...` (long JWT token)

3. Copy both values

---

### Step 2: Update Files with Correct Keys

**File 1: `src/pages/Settings.js`**

Find and replace in **3 locations**:

**Location 1 - loadUpdateControlState() (line ~150):**
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'YOUR_REAL_ANON_KEY_HERE';  // ← Replace this
```

**Location 2 - enableUpdateControl() (line ~191):**
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'YOUR_REAL_ANON_KEY_HERE';  // ← Replace this
```

**Location 3 - disableUpdateControl() (line ~234):**
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'YOUR_REAL_ANON_KEY_HERE';  // ← Replace this
```

---

**File 2: `src/components/UpdateNotification.js`**

**Location: checkAdminUpdateControl() (line ~231):**
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'YOUR_REAL_ANON_KEY_HERE';  // ← Replace this
```

---

### Step 3: Check Supabase RLS Policies

The `anon` key needs permission to **UPDATE** the `update_control` table.

1. Go to: https://supabase.com/dashboard/project/qrjkgvglorotucerfspt/auth/policies

2. Look for `update_control` table

3. You should have these policies:

**Policy 1: Enable read access for everyone**
```sql
CREATE POLICY "Enable read access for everyone" ON "public"."update_control"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
```

**Policy 2: Enable write access for everyone (for testing)**
```sql
CREATE POLICY "Enable write access for everyone" ON "public"."update_control"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

⚠️ **Note:** For production, you should restrict write access to authenticated admins only. But for testing, allow all.

---

### Step 4: Alternative - Use Service Role Key (Admin Only)

If you want only admins to update, use the **service_role** key instead of **anon** key:

1. Get **service_role** key from: https://supabase.com/dashboard/project/qrjkgvglorotucerfspt/settings/api

⚠️ **WARNING:** Service role key bypasses ALL RLS. Keep it secret!

2. Update only the **enableUpdateControl** and **disableUpdateControl** functions in `Settings.js`:

```javascript
const enableUpdateControl = async () => {
  // Use service_role key for admin operations
  const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
  const supabaseKey = 'YOUR_SERVICE_ROLE_KEY_HERE';  // ← Service role key
  
  // ... rest of function
};
```

3. Keep **anon** key in:
   - `loadUpdateControlState()` - for reading
   - `UpdateNotification.js` - for users reading

---

## 🧪 Test After Fix

1. **Rebuild app:**
   ```cmd
   npm run build
   npm run dist
   ```

2. **Test "Alert Users":**
   - Go to Settings
   - Enter version: `1.7.4`
   - Click "Alert Users"
   - Should show: ✅ "Update notification enabled"

3. **Test update check:**
   - Click "Check for Updates"
   - Should show either:
     - ✅ "Update available: v1.7.4" (if 1.7.4 exists on GitHub)
     - ✅ "You are running the latest version"

---

## 🔍 Current Hardcoded Key (INVALID)

The key currently in your code:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4OTk5MzUsImV4cCI6MjA0NjQ3NTkzNX0.yhFF482jyte_YkVmEodTS2G-TnrCkto_a9v4mjNDMiQ
```

**This key is returning 401 error** - it's either:
- ❌ Wrong/expired
- ❌ From a different Supabase project
- ❌ Missing UPDATE permissions

**You MUST get the real key from your Supabase dashboard.**

---

## 📊 How to Verify Key is Correct

**Test in browser console:**

```javascript
// Replace with your real key
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'YOUR_REAL_KEY_HERE';

fetch(`${supabaseUrl}/rest/v1/update_control?id=eq.1`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected result:**
- ✅ `[{id: 1, is_update_available: false, ...}]` - Key works!
- ❌ `{message: 'Invalid API key'}` - Key is wrong

---

## 🎯 Quick Fix Checklist

- [ ] Get real anon key from Supabase dashboard
- [ ] Replace key in `Settings.js` (3 places)
- [ ] Replace key in `UpdateNotification.js` (1 place)
- [ ] Check RLS policies allow UPDATE
- [ ] Rebuild app: `npm run build && npm run dist`
- [ ] Test "Alert Users" button
- [ ] Test "Check for Updates" button

---

**After fixing the Supabase key, both issues will be resolved!** ✅
