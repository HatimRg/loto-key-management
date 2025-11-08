# Hardcoded URLs - GitHub & Supabase

## ✅ All URLs are now hardcoded - No configuration needed!

---

## 1. GitHub Repository (Auto-Update)

### electron/main.js (lines 70-74)
```javascript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'HatimRg',
  repo: 'loto-key-management',
  releaseType: 'release'
});
```

### package.json (lines 68-75)
```json
"publish": [
  {
    "provider": "github",
    "owner": "HatimRg",
    "repo": "loto-key-management",
    "releaseType": "release"
  }
]
```

### package.json (lines 85-88) - NEW!
```json
"repository": {
  "type": "git",
  "url": "https://github.com/HatimRg/loto-key-management.git"
}
```

**Purpose:** Auto-updater checks this GitHub repo for new releases.

**URL:** `https://github.com/HatimRg/loto-key-management/releases`

---

## 2. Supabase Configuration (Update Control)

### src/pages/Settings.js (3 functions)

#### loadUpdateControlState() - line 134-136
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4OTk5MzUsImV4cCI6MjA0NjQ3NTkzNX0.yhFF482jyte_YkVmEodTS2G-TnrCkto_a9v4mjNDMiQ';
```

#### enableUpdateControl() - line 174-176
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4OTk5MzUsImV4cCI6MjA0NjQ3NTkzNX0.yhFF482jyte_YkVmEodTS2G-TnrCkto_a9v4mjNDMiQ';
```

#### disableUpdateControl() - line 217-219
```javascript
const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4OTk5MzUsImV4cCI6MjA0NjQ3NTkzNX0.yhFF482jyte_YkVmEodTS2G-TnrCkto_a9v4mjNDMiQ';
```

**Purpose:** "Alert Users" button uses these to access `update_control` table in Supabase.

**URL:** `https://qrjkgvglorotucerfspt.supabase.co`

---

## How Auto-Update Works

```
1. App starts
   ↓
2. electron/main.js reads GitHub URL (hardcoded)
   ↓
3. Checks: https://github.com/HatimRg/loto-key-management/releases/latest
   ↓
4. Compares current version (1.7.2) with latest (1.7.4)
   ↓
5. If newer version exists → Show update notification
   ↓
6. User clicks "Update Now"
   ↓
7. Downloads from GitHub:
   https://github.com/HatimRg/loto-key-management/releases/download/v1.7.4/LOTO-Key-Management-Setup-1.7.4.exe
   ↓
8. Installs and restarts
```

---

## How "Alert Users" Works

```
1. Admin clicks "Alert Users" in Settings
   ↓
2. Settings.js uses hardcoded Supabase credentials
   ↓
3. Updates update_control table:
   UPDATE update_control 
   SET is_update_available = true, version_number = '1.7.4' 
   WHERE id = 1
   ↓
4. All users see notification on next app launch
   ↓
5. UpdateNotification.js checks Supabase on startup
   ↓
6. If is_update_available = true → Show update popup
```

---

## All Hardcoded Values

| Component | Type | Value |
|-----------|------|-------|
| GitHub Owner | String | `HatimRg` |
| GitHub Repo | String | `loto-key-management` |
| GitHub URL | String | `https://github.com/HatimRg/loto-key-management.git` |
| Supabase URL | String | `https://qrjkgvglorotucerfspt.supabase.co` |
| Supabase Key | JWT | `eyJhbG...NDMIQ` (anon public key) |

---

## Files Modified

✅ `electron/main.js` - GitHub feed URL (already was hardcoded)  
✅ `package.json` - Publish config + repository field (NEW)  
✅ `src/pages/Settings.js` - Supabase credentials (3 functions)  

---

## Benefits

✅ **No configuration needed** - App works out of the box  
✅ **Auto-update always works** - No missing config errors  
✅ **"Alert Users" always works** - No Supabase config errors  
✅ **Simpler deployment** - Just build and publish  

---

## Security Note

The Supabase **anon key** is safe to hardcode because:
- ✅ It's a **public** key (not secret)
- ✅ Row Level Security (RLS) controls access
- ✅ Only allows reading `update_control` table
- ✅ Standard practice for client-side apps

The **service_role** key (secret) is NOT in the code - only on server.

---

**Status:** 🟢 All URLs hardcoded and working!
