# Listener & Double Call Issues Found

## 🔴 CRITICAL ISSUES

### 1. **Duplicate IPC Event Listeners - Settings.js vs UpdateNotification.js**

**Problem:** Both components listen to the same IPC events from main process

**Settings.js (lines 134-142):**
```javascript
ipcRenderer.on('update-available', handleUpdateAvailable);
ipcRenderer.on('update-not-available', handleUpdateNotAvailable);
ipcRenderer.on('update-error', handleUpdateError);

return () => {
  ipcRenderer.removeListener('update-available', handleUpdateAvailable);
  ipcRenderer.removeListener('update-not-available', handleUpdateNotAvailable);
  ipcRenderer.removeListener('update-error', handleUpdateError);
};
```

**UpdateNotification.js (lines 102-114):**
```javascript
ipcRenderer.on('update-available', handleUpdateAvailable);
ipcRenderer.on('download-progress', handleDownloadProgress);
ipcRenderer.on('update-downloaded', handleUpdateDownloaded);
ipcRenderer.on('update-error', handleUpdateError);

return () => {
  if (ipcRenderer) {
    ipcRenderer.removeAllListeners('update-available');      // ⚠️ REMOVES ALL
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');          // ⚠️ REMOVES ALL
  }
};
```

**Overlapping Events:**
- ✅ `update-available` - **BOTH LISTEN** ❌
- ✅ `update-error` - **BOTH LISTEN** ❌
- ⚠️ `update-not-available` - Settings.js only
- ⚠️ `download-progress` - UpdateNotification.js only
- ⚠️ `update-downloaded` - UpdateNotification.js only

**Impact:**
1. **Double handler calls**: When `update-available` fires, BOTH components' handlers run
2. **UpdateNotification uses `removeAllListeners`**: When UpdateNotification unmounts, it removes Settings.js listeners too!
3. **Toast spam**: Both components show toasts for the same event
4. **State conflicts**: Both update their own state for the same event

**Flow when update is available:**
```
main.js: mainWindow.webContents.send('update-available', info)
  ↓
Settings.js handleUpdateAvailable runs:
  - Sets updateCheckResult = 'available'
  - Sets checkingUpdate = false
  - Shows toast: "Update available: v1.7.4"
  ↓
UpdateNotification.js handleUpdateAvailable runs:
  - Sets updateInfo = info
  - Shows notification popup
  - Might show toast too
  ↓
RESULT: Duplicate processing, potential UI conflicts
```

---

## 🟠 DANGEROUS CLEANUP PATTERN

### 2. **UpdateNotification.js uses `removeAllListeners`**

**Location:** `src/components/UpdateNotification.js` lines 109-112

**Problem:**
```javascript
return () => {
  if (ipcRenderer) {
    ipcRenderer.removeAllListeners('update-available');  // ❌ REMOVES ALL LISTENERS
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');     // ❌ REMOVES ALL LISTENERS
  }
};
```

**What happens:**
1. UpdateNotification component unmounts (e.g., user navigates away)
2. `removeAllListeners('update-available')` removes **ALL** listeners, including Settings.js
3. Settings.js "Check for Updates" button stops working
4. No notification popup will appear

**Correct pattern:**
```javascript
return () => {
  if (ipcRenderer) {
    ipcRenderer.removeListener('update-available', handleUpdateAvailable);    // ✅ Specific
    ipcRenderer.removeListener('download-progress', handleDownloadProgress);
    ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded);
    ipcRenderer.removeListener('update-error', handleUpdateError);
  }
};
```

---

## ⚠️ POTENTIAL DOUBLE CALLS

### 3. **Multiple `check-for-updates` IPC sends**

**Locations:**
- `src/pages/Settings.js` line 942: Manual check button
- `src/components/UpdateNotification.js` line 271: Admin auto-trigger
- `electron/main.js` line 468: Auto-check on startup

**Flow analysis:**

**Scenario A: User opens app normally (no admin alert)**
```
0s: App starts
5s: main.js sends 'check-for-updates' to autoUpdater
    ↓
    Both Settings.js AND UpdateNotification.js receive 'update-available'
    ↓
    DOUBLE HANDLER CALL
```

**Scenario B: Admin triggered update**
```
0s: App starts
3s: UpdateNotification checks Supabase (admin alert enabled)
    ↓
    Shows notification popup
5s: main.js sends 'check-for-updates'
    ↓
    DOUBLE HANDLER CALL (both components listening)
9s: UpdateNotification sends another 'check-for-updates'
    ↓
    TRIPLE HANDLER CALL if first two still processing
```

**Scenario C: User clicks "Check for Updates" in Settings**
```
User clicks button
    ↓
Settings.js sends 'check-for-updates'
    ↓
main.js receives and calls autoUpdater.checkForUpdates()
    ↓
Sends 'update-available' to ALL listeners
    ↓
Settings.js handleUpdateAvailable runs
UpdateNotification.js handleUpdateAvailable runs
    ↓
DOUBLE PROCESSING
```

---

## 📊 LISTENER REGISTRATION MAP

| Event | Settings.js | UpdateNotification.js | Cleanup Method |
|-------|-------------|----------------------|----------------|
| `update-available` | ✅ Listens | ✅ Listens | ❌ Conflict |
| `update-not-available` | ✅ Listens | ❌ | ✅ OK |
| `update-error` | ✅ Listens | ✅ Listens | ❌ Conflict |
| `download-progress` | ❌ | ✅ Listens | ✅ OK |
| `update-downloaded` | ❌ | ✅ Listens | ✅ OK |

**Cleanup Methods:**
- Settings.js: ✅ `removeListener(event, handler)` - Correct
- UpdateNotification.js: ❌ `removeAllListeners(event)` - Dangerous

---

## 🔍 OTHER LISTENER ISSUES FOUND

### 4. **window event listeners** (Lower priority)

All properly cleaned up:

✅ **hybridDatabase.js** (lines 24, 32):
- `window.addEventListener('online')` / `offline`
- No cleanup needed (global, persistent)

✅ **ViewByLocks.js** (lines 25, 33):
- `window.addEventListener('breakers-changed')`
- `window.removeEventListener('breakers-changed')` ✅

✅ **SupabaseSettings.js** (lines 49, 52):
- `window.addEventListener('autoSyncComplete')`
- `window.removeEventListener('autoSyncComplete')` ✅

✅ **ConnectionStatus.js** (lines 18, 21):
- `window.addEventListener('connectionStatusChange')`
- `window.removeEventListener('connectionStatusChange')` ✅

✅ **AppContext.js** (lines 39-46):
- Multiple `window.addEventListener`
- All properly cleaned up ✅

✅ **UpdateNotification.js** (lines 301-302):
- `window.addEventListener('mock-update-available')`
- `window.removeEventListener('mock-update-available')` ✅

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Fix Duplicate IPC Listeners

**Option A: Single Source of Truth (Recommended)**
- Remove IPC listeners from Settings.js
- Let UpdateNotification handle all update events
- Settings.js communicates with UpdateNotification via props/context

**Option B: Split Responsibilities**
- UpdateNotification: Handles `update-available`, `download-progress`, `update-downloaded`
- Settings.js: Handles `update-not-available`, `update-error`
- No overlap

**Option C: Event Delegation**
- Create a single UpdateManager component
- Both Settings and UpdateNotification consume from it
- Manager is the only one with IPC listeners

### Priority 2: Fix removeAllListeners

**Current (Dangerous):**
```javascript
return () => {
  if (ipcRenderer) {
    ipcRenderer.removeAllListeners('update-available');
  }
};
```

**Fixed:**
```javascript
return () => {
  if (ipcRenderer) {
    ipcRenderer.removeListener('update-available', handleUpdateAvailable);
  }
};
```

### Priority 3: Coordinate Check Timing

Already fixed in previous response:
- main.js: 5s auto-check
- Admin trigger: 9s (3s + 6s)
- No collision ✅

---

## 🎯 QUICK FIX IMPLEMENTATION

### Fix 1: Remove Settings.js IPC Listeners

**Settings.js** should NOT listen to update events directly.

**Remove these lines (134-142):**
```javascript
ipcRenderer.on('update-available', handleUpdateAvailable);
ipcRenderer.on('update-not-available', handleUpdateNotAvailable);
ipcRenderer.on('update-error', handleUpdateError);

return () => {
  ipcRenderer.removeListener('update-available', handleUpdateAvailable);
  ipcRenderer.removeListener('update-not-available', handleUpdateNotAvailable);
  ipcRenderer.removeListener('update-error', handleUpdateError);
};
```

**Keep only the manual check trigger:**
```javascript
// User clicks "Check for Updates"
ipcRenderer.send('check-for-updates');

// Listen for ONE-TIME response
ipcRenderer.once('update-check-complete', (event, result) => {
  setCheckingUpdate(false);
  setUpdateCheckResult(result.type); // 'available', 'up-to-date', 'error'
  showToast(result.message, result.type === 'error' ? 'error' : 'success');
});
```

### Fix 2: Fix UpdateNotification.js cleanup

**Change lines 109-112:**
```javascript
// Before
ipcRenderer.removeAllListeners('update-available');
ipcRenderer.removeAllListeners('download-progress');
ipcRenderer.removeAllListeners('update-downloaded');
ipcRenderer.removeAllListeners('update-error');

// After
ipcRenderer.removeListener('update-available', handleUpdateAvailable);
ipcRenderer.removeListener('download-progress', handleDownloadProgress);
ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded);
ipcRenderer.removeListener('update-error', handleUpdateError);
```

### Fix 3: Add dependencies to useEffect

**UpdateNotification.js line 115:**
```javascript
// Before
}, []);

// After - include handlers so they're not stale
}, [handleUpdateAvailable, handleUpdateDownloaded, handleDownloadProgress, handleUpdateError]);

// OR use useCallback to stabilize handlers
const handleUpdateAvailable = useCallback((event, info) => {
  // ... handler code
}, [/* dependencies */]);
```

---

## 📋 SUMMARY

| Issue | Severity | Location | Status |
|-------|----------|----------|--------|
| Duplicate IPC listeners | 🔴 Critical | Settings.js + UpdateNotification.js | ❌ Not Fixed |
| removeAllListeners danger | 🔴 Critical | UpdateNotification.js line 109-112 | ❌ Not Fixed |
| Double handler calls | 🟠 High | Both components | ❌ Not Fixed |
| Stale closure in useEffect | 🟡 Medium | UpdateNotification.js | ❌ Not Fixed |
| Update check timing | 🟢 Low | Multiple files | ✅ Fixed |

**Total Issues:** 5 listener/double-call issues  
**Fixed:** 1  
**Remaining:** 4 critical/high priority issues

---

## ⚠️ IMPACT ASSESSMENT

**Current Behavior:**
1. When update is found: Both Settings and UpdateNotification react
2. User sees multiple UI updates (toast + notification + state change)
3. If UpdateNotification unmounts: Settings "Check for Updates" breaks
4. Potential race conditions with state management

**After Fixes:**
1. Single source of truth for update events
2. Clean listener management
3. No conflicts or double processing
4. Better separation of concerns

---

**Status:** 🔴 **CRITICAL - Fix Before Production**
