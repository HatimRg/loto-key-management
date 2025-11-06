# Changelog

All notable changes to LOTO Key Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.13] - 2025-01-08 (Debug Version)

### 🐛 Fixed
- **Enhanced Debugging**: Added comprehensive error logging and forced window display
  - Window now force-shows after 3 seconds if not visible
  - DevTools automatically open to show console errors
  - Better error handling for URL loading failures
  - Enhanced logging for all window lifecycle events
  
### 🔍 Diagnostic Features
- Ready-to-show event handler
- Automatic window visibility check
- Fallback window display mechanism
- Detailed error information in console

---

## [1.6.12] - 2025-01-08

### 🐛 Fixed
- **CRITICAL FIX**: Resolved app window not appearing after installation
  - Fixed electron-builder packaging configuration
  - Removed problematic node_modules inclusion from files array
  - Added asarUnpack configuration for build folder
  - Improved path resolution for packaged app resources
  - App now correctly loads React interface on all installations

### ⚡ Improved
- Enhanced debug logging for troubleshooting packaged apps
- Better resource path handling in production builds

---

## [1.6.9] - 2025-01-08

### 🎉 Added
- **Auto-Update System**: Implemented automatic updates via GitHub Releases
  - Beautiful notification UI for available updates
  - Download progress tracking
  - One-click installation
  - "Remind Me Later" option (4-hour snooze)
- **Custom Delete Confirmation**: Replaced Windows default dialogs with styled modal
  - Shows item name in confirmation
  - Smooth animations
  - Dark mode support
- **Changelog Viewer**: Automatic "What's New" display after updates
- **Version Auto-Sync**: All version mentions now automatically sync from package.json
  - Settings page footer
  - About page
  - Database defaults
  - Installer properties

### 🐛 Fixed
- **Input Field Selection Bug**: Fixed issue where input fields became unselectable after delete operations
  - Resolved CSS specificity conflict with button selectors
  - Input fields now always allow text selection and interaction
- **Personnel Deletion**: Fixed bug where personnel deletion showed success but didn't actually delete
  - Added proper async/await flow
  - Automatic data reload after deletion
  - Fixed race conditions
- **Electrical Plans Deletion**: Fixed similar deletion bug in plans module
- **Breaker Deletion**: Fixed deletion bug in breakers module

### ⚡ Improved
- **Update Notifications**: Enhanced with better messaging about bug fixes
- **User Experience**: More informative delete confirmations showing exact item names
- **Version Management**: Simplified to single update point in package.json

### 🔒 Security
- All database operations now properly validated
- Improved error handling across all delete operations

---

## [1.6.0] - 2025-01-05

### 🎉 Added
- **Offline Mode Protection**: All edit functions now disabled when app is offline
  - Add, Edit, Delete, Import, Export buttons blocked
  - Clear visual indicators (grayed out buttons)
  - Tooltips explaining offline status
- **About Page Improvements**: Better paragraph formatting with whitespace-pre-wrap

### 🐛 Fixed
- **ID Card Field**: Made optional instead of required in Personnel module
- **Template Instructions**: Updated Excel import templates to reflect optional fields

### ⚡ Improved
- **Connection Status**: Better visual feedback for online/offline state
- **Form Validation**: More flexible validation rules

---

## [1.5.0] - 2025-01-01

### 🎉 Added
- **Cloud-First Hybrid Database**: Supabase integration with offline fallback
  - 8 tables synced to cloud
  - 8 storage buckets for files
  - Automatic sync when online
- **Connection Status Widget**: Real-time online/offline indicator
- **Import/Export System**: Complete data backup and restore

### ⚡ Improved
- **Performance**: Faster data loading with cloud-first strategy
- **Reliability**: Dual-write to both cloud and local storage

---

## [1.0.0] - 2024-12-01

### 🎉 Initial Release
- **Dashboard**: Overview of breakers, locks, personnel, and plans
- **Breaker Management**: Full CRUD operations for circuit breakers
- **Lock Management**: Key inventory tracking
- **Personnel Management**: Employee records with certificates
- **Electrical Plans**: PDF upload and viewing
- **Settings**: User mode configuration
- **Dark Mode**: Full dark theme support
- **Excel Import/Export**: Bulk operations support

---

## Types of Changes

- **🎉 Added**: New features
- **⚡ Improved**: Enhancements to existing features
- **🐛 Fixed**: Bug fixes
- **🔒 Security**: Security improvements
- **⚠️ Deprecated**: Soon-to-be removed features
- **❌ Removed**: Removed features
- **📝 Changed**: Changes in existing functionality

---

## How to Read Version Numbers

Version format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backwards compatible (e.g., 1.6.0 → 1.7.0)
- **PATCH**: Bug fixes, backwards compatible (e.g., 1.6.9 → 1.6.10)

---

**Note**: This changelog is automatically displayed to users after updates.
Keep it clear, concise, and user-friendly!
