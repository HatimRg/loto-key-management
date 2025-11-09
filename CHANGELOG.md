# Changelog

All notable changes to LOTO Key Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.7] - 2025-01-09

### 🎉 Added
- **Loading Overlay for Long Operations**
  - Beautiful full-screen loading indicator for Excel imports and file uploads
  - Real-time progress bar (0-100%) with animated shimmer effect
  - Detailed status logs showing each step of the operation
  - Elapsed time counter
  - Operation-specific icons (import, upload, processing, validating)
  - Smooth animations and transitions
  - Dark mode support
  - Applied to ViewByBreakers Excel import (Personnel and Plans coming soon)

### 🐛 Fixed
- **Walkthrough Navigation Sync**
  - Fixed issue where walkthrough showed steps for wrong page
  - Added automatic page navigation synchronization
  - Walkthrough now always stays on correct page for each step
  - Smooth transitions between pages during tour

- **Scroll Functionality Breaking After Walkthrough**
  - Fixed scroll becoming disabled after walkthrough completion
  - Comprehensive scroll restoration on all exit points
  - Proper cleanup of Joyride-modified styles
  - Force reflow to ensure styles are applied correctly
  - No longer requires app restart

- **Walkthrough Focus Issues**
  - Added multi-layer click blocking outside walkthrough popup
  - Users can only interact with walkthrough buttons
  - Prevents accidental defocusing of tour
  - 3-layer protection: Joyride config + CSS injection + Event blocking

- **Auto-Update CMD UI Flash**
  - Extended countdown from 3 to 5 seconds
  - Added multi-stage visual feedback before quitting
  - Electron window stays visible longer (1.5s delay)
  - Clear status messages: "Preparing", "Closing", "Launching", "Quitting"
  - Total feedback time: ~7-8 seconds vs previous instant disappearance

### 🔧 Technical Improvements
- Created reusable `LoadingOverlay` component for all long-running operations
- Enhanced walkthrough with `isNavigating` state to prevent race conditions
- Improved scroll restoration with `useRef` for original overflow values
- Added Joyride configuration options: `disableScrolling`, `scrollOffset`, `spotlightPadding`
- Added global event blockers for walkthrough (capture phase)
- Extended update installer delay in electron main process
- Added NSIS configuration improvements (`perMachine`, `displayLanguageSelector`)

### 📊 Performance
- Excel import now shows real-time progress for each batch
- Detailed status updates every 10 rows for large files
- Visual feedback prevents user confusion during long operations
- Smoother app experience with clear loading states

---

## [1.8.6] - 2025-01-09

### 🎯 **Complete LOTO Key Management System**

**LOTO Key Management System (KMS)** is a comprehensive desktop application designed for managing electrical lockout/tagout (LOTO) procedures, circuit breaker inventory, lock key management, personnel tracking, and electrical documentation. Built with React, Electron, and Supabase for seamless offline/online operation.

---

### 📋 **Core Features**

#### **🔌 Breaker Management**
- Complete CRUD operations for circuit breakers
- Track breaker details: Name, Zone, Subzone, Location, State (On/Off/Closed)
- Lock/unlock breakers with key assignment
- Assign breakers to personnel with remarks
- Filter by zone, location, and state
- Batch operations: Select multiple breakers, bulk delete, bulk state changes
- Excel import/export for bulk operations
- Real-time search and filtering
- Visual state indicators with color coding

#### **🔑 Lock Inventory & Storage Management**
- Track total lock capacity and availability
- View all locked breakers organized by zone and subzone
- Monitor lock usage: Available vs In Use
- Key number tracking with personnel assignment
- Zone-based organization for easy location
- Set total storage capacity for locks
- Real-time usage statistics and analytics

#### **👥 Personnel Management**
- Employee records with complete details
- Fields: Name, Last Name, ID Card, Company, Habilitation level
- Upload and view personnel certificates (PDF, up to 5MB)
- Integrated PDF viewer for quick certificate access
- Track breaker assignments per person
- Excel import/export for personnel data
- Search and filter capabilities
- Batch selection and deletion

#### **📄 Electrical Plans**
- Upload electrical PDF plans (up to 15MB)
- View plans directly in the app with fullscreen PDF viewer
- Version tracking for plan updates
- Download plans for offline use
- Organize by filename and upload date
- Delete outdated plans
- Cloud storage with local caching

#### **📊 Dashboard & Analytics**
- Real-time statistics overview
- Breaker count by state (On/Off/Closed)
- Lock availability metrics
- Personnel count
- Electrical plans inventory
- Quick navigation to all modules
- Visual cards with color-coded indicators

#### **⚙️ Settings & Configuration**
- **User Modes**:
  - **Visitor**: Read-only access to all data
  - **Restricted Editor**: Can edit but not delete
  - **Admin Editor**: Full access including deletion and system settings
- **Security**: PIN protection for mode changes
- **Update Control**: Admin can push update notifications to all users
- **Manual Update Check**: Check for new versions on demand
- **Activity Logs**: View system history and user actions
- **Maintenance Tools**: Database export, clear data options
- **Walkthrough Guide**: Interactive tour for new users
- **Theme Support**: Light/Dark mode with automatic system detection

#### **👨‍💻 About Me Page**
- Developer profile with photo upload
- Editable name, title, and bio
- Contact information: Email, Phone, LinkedIn
- Phone number with Moroccan format support
- CV upload and viewing (multiple CVs, up to 10MB each)
- Download CVs
- Company information and system details

---

### 🆕 **What's New in 1.8.6**

#### 🎉 Added
- **Phone Number Field in About Me**
  - Added phone number field next to email in developer profile
  - Fully editable in Admin mode
  - Displays as clickable tel: link in view mode
  - Supports various Moroccan phone number formats:
    - With spaces: `06 12 34 56 78`
    - Without spaces: `0612345678`
    - International: `+212 6 12 34 56 78`
    - With dashes: `06-12-34-56-78`
    - With dots: `06.12.34.56.78`
  - Phone icon from Lucide React
  - Synced with cloud database (Supabase)

---

### 🔧 **Technical Stack**

#### **Frontend**
- React 18 with modern hooks
- TailwindCSS for responsive design
- Lucide React for beautiful icons
- React Router for navigation
- React Joyride for interactive walkthroughs

#### **Backend & Storage**
- Electron for desktop application
- SQLite for local database (offline support)
- Supabase for cloud sync and real-time updates
- Hybrid database architecture (cloud-first with offline fallback)
- 8 Supabase tables with automatic synchronization
- 8 storage buckets for files (profile pictures, CVs, PDFs, electrical plans)

#### **Data Management**
- Dual-write system: Local SQLite + Cloud Supabase
- Automatic sync when online
- Full offline functionality
- Excel import/export (XLSX format)
- CSV export for all data tables
- Data validation and error handling

#### **Updates & Distribution**
- Auto-update system via GitHub Releases
- Manual update check option
- Admin-controlled update notifications
- Changelog viewer with "What's New" display
- NSIS installer for Windows
- One-click installation with desktop shortcuts

---

### 🌟 **Key Capabilities**

✅ **Offline-First Design**: Work without internet, sync when online  
✅ **Multi-User Modes**: Visitor, Restricted Editor, Admin Editor  
✅ **Batch Operations**: Select and modify multiple items at once  
✅ **Import/Export**: Excel and CSV support for bulk data operations  
✅ **PDF Management**: View, upload, and download PDFs in-app  
✅ **Cloud Sync**: Automatic synchronization with Supabase  
✅ **Search & Filter**: Fast search across all modules  
✅ **Responsive UI**: Works on different screen sizes  
✅ **Dark Mode**: Full dark theme support  
✅ **Auto-Updates**: Seamless updates via GitHub  
✅ **Data Security**: PIN-protected admin functions  
✅ **Activity Tracking**: Complete history logs  

---

### 📦 **Database Schema**

- `breakers` - Circuit breaker inventory
- `locks` - Lock key management
- `personnel` - Employee records
- `plans` - Electrical plan metadata
- `history` - Activity and change logs
- `lock_inventory` - Storage capacity tracking
- `profile_settings` - Developer profile data
- `app_settings` - Application configuration

---

### 🔧 **Technical Improvements in 1.8.6**
- Added `phone_number` column to `profile_settings` table in both SQLite and Supabase
- Updated database migration scripts for phone number field
- Enhanced profile save functionality to include phone number
- Updated hybrid database to sync phone number with cloud
- Improved data validation for international phone formats

---

## [1.7.4] - 2025-01-08

### ✨ Features
- **Admin Update Control System**
  - New "Alert Users" toggle in Settings (Admin only)
  - Force update notifications to all users via Supabase
  - Admin can specify version number (no strict validation)
  - All users see notification on app launch when enabled
  - Automatic update check triggered when alert is active
  - New Supabase table: `update_control` (see `supabase-update-control.sql`)
  
- **Modern CMD-Style Update Installer**
  - Fullscreen terminal interface with real-time installation logs
  - Progress bars with visual feedback during download
  - Automatic countdown (3 seconds) before app restart
  - Color-coded log messages (success, error, warning, info, progress)
  - Auto-scrolling terminal output
  - Admin debug mode: Ctrl+Shift+Click to preview installer UI with mock data

### 🔧 Technical Improvements
- **Enhanced Auto-Update System**
  - Moved update check to Settings page for better accessibility
  - Added manual "Check for Updates" button with real-time feedback
  - Status badges: "Update available", "Up to date", "Check failed"
  - Toast notifications for all update check results
  - Improved update check logging with feed URL and current version display
  - Added IPC handler for manual update checks
  - Clears localStorage snooze when manually checking for updates
  - Better error reporting with 15-second timeout

### 🐛 Fixed
- **Auto-Updater Configuration**
  - Fixed missing `app-update.yml` error by configuring update feed directly in code
  - Update checker now works correctly in packaged apps (not just installers)
  - Fixed detection of development vs production mode
  - Improved error handling and logging for update checks
- Improved auto-updater visibility for testing and troubleshooting

---

## [1.7.1] - 2025-01-08

### 🐛 Fixed
- **Cursor Display Issue**
  - Fixed text cursor appearing on non-text elements in tables (Personnel, View by Breakers, View by Locks)
  - Buttons and icons now correctly show pointer cursor instead of text selection cursor
  - Table cells retain text selection capability for actual content
  
- **Subzone Display in Storage Page**
  - Fixed "No Subzone" showing instead of actual subzone names in "Locks by Zone" section
  - Database query now properly includes subzone field for locked breakers
  - Subzone grouping now displays correct subzone names

### ⚡ Improved
- **Table Layout & Horizontal Scroll Elimination**
  - Removed horizontal scrolling in all table pages (Personnel, View by Breakers, View by Locks)
  - Implemented sticky Actions column that remains visible when viewing long text
  - Text columns now use truncation with ellipsis instead of forcing horizontal scroll
  - Applied `table-fixed` layout with defined column widths for better responsiveness
  - Action buttons (Edit/Delete) are always accessible without scrolling
  - Improved mobile and narrow viewport experience

### 🔧 Technical Improvements
- Enhanced CSS rules for table interactions
- Better cursor management across interactive elements
- Improved table cell text handling with `truncate` utility

---

## [1.7.0] - 2025-01-08

### 🎉 **FINAL RELEASE - Production Ready**

### ✨ New Features
- **Subzone Grouping in Storage Page**
  - Locks by Zone section now groups locks by subzone within each zone
  - Hierarchical display: Zone → Subzone → Lock keys
  - Automatic handling of breakers without subzones
  - Visual indicators for subzone grouping (▶ arrows and indentation)

- **Enhanced Subzone Support**
  - Added Subzone column in View by Locks page
  - Better organization and filtering of locked breakers by subzone

### ⚡ Improved
- **Increased File Size Limits**
  - Personnel PDFs: Now supports up to **5MB** (previously limited)
  - CVs: Increased to **10MB** (was 5MB)
  - Electrical Plans: Increased to **15MB** (was 10MB)
  - Better file size validation with clear error messages

- **Unified PDF Viewer**
  - About Me page now uses the same modal PDF viewer as Personnel and Electrical Plans pages
  - Consistent user experience across all PDF viewing
  - Improved download functionality in CV viewer
  - Better handling of cloud URLs, data URLs, and local files

### 🐛 Fixed
- **CRITICAL: Delete Functionality Restored**
  - Fixed delete operations in Personnel, Electrical Plans, and Storage (Locks) pages
  - Properly synced deletions with cloud database (Supabase)
  - Data now correctly deleted from both local SQLite and cloud storage
  - Resolved issue where success messages showed but data wasn't actually deleted

### 🔧 Technical Improvements
- Fixed package.json loading in packaged apps
- Added comprehensive error logging for debugging
- Improved hybrid database delete operations
- Better cloud-first dual-write deletion for all entities
- Enhanced file size validation using centralized FILE_CONFIG

---

## [1.6.15] - 2025-01-08

### 🐛 Fixed
- **CRITICAL PACKAGING FIX**: Resolved packaged app not launching
  - Disabled asar packaging to make build folder directly accessible
  - Simplified resource path resolution for packaged apps
  - Fixed file path handling for production builds
  - App now works correctly in both development and packaged modes

### ⚡ Improved
- Cleaner packaging structure without asar archive
- More reliable file path resolution
- Better compatibility with auto-update system

---

## [1.6.14] - 2025-01-08

### 🐛 Fixed
- **CRITICAL FIX**: Resolved IPC communication error causing app crash
  - Added missing `removeAllListeners` method to preload IPC bridge
  - Fixed UpdateNotification component cleanup function
  - App now launches properly without JavaScript errors
  - Window displays correctly on all installations

### ⚡ Improved
- Enhanced window lifecycle management
- Better error handling for failed page loads
- Automatic fallback window display after 3 seconds
- Comprehensive debugging logs for troubleshooting

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
