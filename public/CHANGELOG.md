# Changelog

All notable changes to LOTO Key Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.7] - 2025-01-09

### 🎉 What's New

**Better Visual Feedback for Long Operations**
- ✨ Added beautiful loading overlay for Excel imports and file uploads
- 📊 Real-time progress bar shows exactly what's happening (0-100%)
- ⏱️ Elapsed time counter keeps you informed
- 📝 Detailed status logs for each step of the process
- 🎨 Smooth animations and professional appearance

### 🐛 Bug Fixes

**Walkthrough Improvements**
- ✅ Fixed walkthrough showing wrong page content
- ✅ Fixed scroll not working after completing tour
- ✅ Blocked clicks outside walkthrough to prevent confusion
- ✅ Smoother navigation between pages during tour

**Auto-Update Experience**
- ✅ CMD installer UI now stays visible longer (7-8 seconds)
- ✅ Clear status messages before app restarts
- ✅ No more confusing flash-and-disappear

### 💡 User Experience

**What You'll Notice:**
- Import large Excel files with confidence - see exactly what's happening
- No more wondering if the app is frozen during imports
- Walkthrough tour works perfectly without breaking scroll
- Update installation gives clear visual feedback

---

## [1.8.6] - 2025-01-09 🎉 **OFFICIAL LAUNCH VERSION**

### 🎯 **Welcome to LOTO Key Management System**

**LOTO Key Management System (KMS)** is a comprehensive desktop application designed for managing electrical lockout/tagout (LOTO) procedures, circuit breaker inventory, lock key management, personnel tracking, and electrical documentation. Built with React, Electron, and Supabase for seamless offline/online operation.

This is the **official launch version** with all features fully implemented and ready for production use!

---

### 📋 **Complete Feature Set**

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

### 🚀 **Included in Launch Version 1.8.6**

#### **All Features Are Production-Ready:**

✨ **Complete Breaker Management System** - Full CRUD operations with batch processing  
✨ **Lock Inventory Tracking** - Real-time capacity monitoring and zone organization  
✨ **Personnel Management** - Employee records with certificate uploads (PDF support)  
✨ **Electrical Plans Module** - PDF viewer with cloud storage and version tracking  
✨ **Smart Dashboard** - Real-time analytics and quick navigation  
✨ **Multi-User Modes** - Visitor, Restricted Editor, and Admin Editor roles  
✨ **Cloud Synchronization** - Automatic sync with Supabase (works offline too!)  
✨ **Batch Operations** - Select and modify multiple items simultaneously  
✨ **Import/Export** - Excel and CSV support for all data modules  
✨ **Auto-Update System** - Seamless updates via GitHub Releases  
✨ **Dark Mode** - Beautiful dark theme with automatic system detection  
✨ **Activity Logs** - Complete history tracking for all actions  
✨ **Interactive Walkthrough** - Guided tour for new users  
✨ **Developer Profile** - Complete profile with photo, CV uploads, and contact info including phone numbers  

#### **Enterprise-Grade Features:**
- 🔐 PIN-protected admin functions for security
- 📱 Offline-first design with automatic cloud sync
- 🎨 Responsive UI that works on all screen sizes
- 🔄 Hybrid database architecture (SQLite + Supabase)
- 📊 8 synchronized database tables
- ☁️ 8 cloud storage buckets for files
- 🚀 One-click NSIS installer for Windows

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

### 💻 **Built With Modern Technology**

**Architecture Highlights:**
- ⚡ **Hybrid Database System**: Cloud-first with offline fallback using SQLite + Supabase
- 🔄 **Dual-Write Strategy**: All data written to both local and cloud simultaneously
- 📡 **Smart Sync Engine**: Automatic synchronization when connection is restored
- 🎨 **Modern UI Framework**: React 18 with TailwindCSS for beautiful, responsive design
- 🖥️ **Native Desktop Experience**: Electron wrapper with OS integration
- 📦 **Complete Database Schema**: 8 tables covering all aspects of LOTO management
- ☁️ **Cloud Storage**: 8 dedicated buckets for different file types (plans, CVs, certificates, etc.)
- 🔐 **Security First**: PIN protection, role-based access, and encrypted storage

**Database Tables:**
- `breakers` - Circuit breaker inventory
- `locks` - Lock key management  
- `personnel` - Employee records
- `plans` - Electrical plan metadata
- `history` - Complete activity audit trail
- `lock_inventory` - Storage capacity tracking
- `profile_settings` - Developer profile with phone support
- `app_settings` - Application configuration

**Deployment:**
- Windows installer with NSIS
- Auto-update mechanism via GitHub Releases
- Portable data directory for easy backup
- One-click installation process

---

### 🎊 **Thank You for Choosing LOTO KMS!**

This application represents months of development, testing, and refinement to deliver a comprehensive solution for managing electrical lockout/tagout procedures. Every feature has been designed with safety, efficiency, and ease of use in mind.

**Getting Started:**
1. 🎯 Start with the **Dashboard** to get an overview
2. 📖 Try the **Interactive Walkthrough** (Settings → Walkthrough Guide)
3. 🔧 Configure your **User Mode** in Settings
4. 📊 Import your existing data using Excel templates
5. ☁️ Enable cloud sync for automatic backups

**Need Help?**
- Check the **About Me** page for developer contact information
- Review the **Activity Logs** in Settings for troubleshooting
- Use the built-in **Search** feature to quickly find what you need

We're committed to continuous improvement and regularly release updates with new features and enhancements. The auto-update system will notify you when new versions are available.

**Happy Managing! 🚀**

---

## Previous Versions

Below are the development versions that led to this launch release:

---

## [1.7.4] - 2025-01-08

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
