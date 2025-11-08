# 🧪 Walkthrough Testing Guide

## Current Implementation Status

### ✅ Completed
- [x] `disableOverlayClose={false}` - Click anywhere to advance
- [x] `spotlightClicks` - Click highlighted element to advance  
- [x] Dark overlay (0.7 opacity)
- [x] Blue glow around elements
- [x] French locale
- [x] Progress indicator
- [x] Skip button
- [x] Back button

### ⚠️ Issues Found
- [ ] Tour is TOO LONG - needs optimization
- [ ] Too many conditional page-specific steps
- [ ] Redundant explanations
- [ ] Not optimized for 1 minute

---

## Testing Checklist

### Before Testing:
1. Install package: `npm install react-joyride`
2. Clear localStorage: `localStorage.removeItem('visitor_walkthrough_completed')`
3. Reload page

### Visitor Mode Tests:
- [ ] Login as Visitor
- [ ] Tour starts automatically after 1 second
- [ ] Welcome screen shows (center)
- [ ] Navigation sidebar highlighted
- [ ] User badge highlighted
- [ ] Click anywhere on page → advances to next step
- [ ] Click highlighted element → advances to next step
- [ ] Click "Suivant" button → advances
- [ ] Click "Retour" button → goes back
- [ ] Click "Passer" button → skips tour
- [ ] Complete tour → localStorage flag set
- [ ] Reload page → tour does NOT start
- [ ] Settings → "Redémarrer la Visite" → reloads and restarts

### RestrictedEditor Mode Tests:
- [ ] Login as RestrictedEditor
- [ ] Tour does NOT start automatically
- [ ] Navigate to Settings
- [ ] Find "Visite Guidée" section
- [ ] Click "Démarrer la Visite" button
- [ ] Toast shows: "Visite guidée démarrée!"
- [ ] Tour starts immediately (no reload)
- [ ] Shows editor-specific steps
- [ ] Navigate to /breakers → shows Add/Import buttons
- [ ] Navigate to /personnel → shows Personnel buttons
- [ ] Click anywhere → advances
- [ ] Complete tour → flag set

### Visual Tests:
- [ ] Dark overlay visible (grey out page)
- [ ] Blue glow around highlighted element
- [ ] Tooltip positioned correctly
- [ ] Tooltip text readable
- [ ] Buttons styled correctly
- [ ] Progress indicator visible
- [ ] Spotlight has rounded corners (8px)
- [ ] Padding around spotlight (8px)

### Multi-Select Tests:
- [ ] Go to ViewByBreakers
- [ ] Double-right-click a row → selects
- [ ] Row turns blue
- [ ] Checkbox appears
- [ ] QuickActionsBar appears
- [ ] Click "Tout sélectionner" → all selected
- [ ] Click "Désélectionner" → all cleared
- [ ] Select 2 rows → click "Supprimer"
- [ ] Confirmation dialog in French
- [ ] Toast notification shows count
- [ ] History logs created
- [ ] Test in ViewByLocks
- [ ] Test in Personnel

---

## Timing Test

**Goal:** ~60 seconds total

### Measure Each Step:
1. Welcome: ~5 seconds
2. Navigation: ~8 seconds
3. User controls: ~8 seconds
4. Tables: ~10 seconds
5. Add button (RE only): ~12 seconds
6. Import process (RE only): ~12 seconds
7. Final tips: ~5 seconds

**Total:**
- Visitor: ~31 seconds ✅
- RestrictedEditor: ~55 seconds ✅

---

## Known Issues to Fix

### High Priority:
1. **Tour too long** - Remove page-specific redundant steps
2. **Click-anywhere** - Verify actually works
3. **Grey out consistency** - Check all steps
4. **Step count** - Reduce to 5-6 for visitor, 7-8 for RE

### Medium Priority:
1. Add data-tour to more buttons
2. Test on different screen sizes
3. Verify mobile responsiveness
4. Test in dark mode

### Low Priority:
1. Add animations
2. Add sound effects (optional)
3. Add video tutorials
4. Multi-language support

---

## Quick Test Script

```javascript
// In browser console:

// 1. Clear tour completion flag
localStorage.removeItem('visitor_walkthrough_completed');

// 2. Check if elements exist
console.log('Nav:', !!document.querySelector('[data-tour="nav-sidebar"]'));
console.log('Badge:', !!document.querySelector('[data-tour="user-mode-badge"]'));
console.log('Stats:', !!document.querySelector('[data-tour="dashboard-stats"]'));

// 3. Trigger RestrictedEditor tour manually
window.dispatchEvent(new Event('start-restricted-tour'));

// 4. Check multi-select hook
// (inspect component state in React DevTools)
```

---

## Expected Behavior

### Visitor:
1. **Auto-start** on first login
2. **5-6 essential steps** covering basics
3. **~30-60 seconds** total duration
4. **Click anywhere** to advance
5. **Can skip** anytime
6. **Can restart** from Settings

### RestrictedEditor:
1. **NO auto-start**
2. **Manual trigger** from Settings button
3. **7-8 steps** including editor actions
4. **~60 seconds** total duration
5. **Shows Add/Import/Edit** buttons
6. **Form field explanations**

### All Users:
- Grey overlay on non-highlighted areas
- Blue glow around current element
- Can click highlighted element to advance
- Can click anywhere on page to advance
- Buttons always work (Next/Back/Skip)
- Progress shows (e.g., "3/6")
- French language throughout

---

## Success Criteria

- [ ] Tour completes in under 60 seconds
- [ ] Click-anywhere works perfectly
- [ ] Grey out visible on ALL steps
- [ ] Blue glow visible on ALL steps
- [ ] No errors in console
- [ ] LocalStorage tracking works
- [ ] Multi-select works on all tables
- [ ] Batch operations work correctly
- [ ] Toast notifications appear
- [ ] History logging works

---

## If Tests Fail

### Tour doesn't start:
- Check `npm install react-joyride` ran
- Check localStorage cleared
- Check userMode is correct
- Check console for errors

### Click-anywhere doesn't work:
- Verify `disableOverlayClose={false}`
- Verify `spotlightClicks={true}`
- Check Joyride version compatibility

### Grey out not visible:
- Check `overlay.backgroundColor`
- Check `overlayColor` in options
- Inspect with DevTools

### Multi-select doesn't work:
- Check double-click timing (300ms)
- Verify onContextMenu handler attached
- Check state updates in React DevTools

---

## Performance Notes

- Tour should not lag or stutter
- Transitions should be smooth
- Overlay should not flicker
- Element highlighting should be instant
- No memory leaks after completion

---

## Next Steps After Testing

1. Fix any failing tests
2. Optimize step count if too long
3. Add missing data-tour attributes
4. Document final behavior
5. Create user guide
6. Deploy v1.8.1

**Ready to test! 🚀**
