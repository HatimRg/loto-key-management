# Emergency Auto-Update Fix - Manual Method

## If Automatic Publish Fails

### Step 1: Build Locally
```powershell
npm run build
npm run dist
```

### Step 2: Find These Files
```
dist/
├── LOTO Key Management Setup 1.7.2.exe
└── latest.yml
```

### Step 3: Upload to GitHub Manually

1. **Go to:** https://github.com/HatimRg/loto-key-management/releases/new

2. **Fill in:**
   - Tag version: `v1.7.2`
   - Release title: `Version 1.7.2`
   - Description: Copy from CHANGELOG.md (version 1.7.2 section)

3. **Upload Files:**
   - Drag `LOTO Key Management Setup 1.7.2.exe` into assets
   - Drag `latest.yml` into assets

4. **Publish:**
   - Click "Publish release"

### Step 4: Test
1. Install old version (1.6.19) on another PC
2. Launch it
3. After 5 seconds, update notification should appear
4. Click "Update Now" → Downloads 1.7.2 → Installs

## Done! 
Auto-updates will work for all future users installing 1.7.2.

---

## Alternative: Disable Auto-Updates for v1.7.2

If absolutely no time, you can:
1. Comment out auto-update check in main.js (lines 437-471)
2. Rebuild and distribute
3. Fix properly after launch

But I recommend getting it working properly tonight!
