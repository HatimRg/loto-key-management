# LOTO Key Management System - Installation & User Guide

## 📥 Installation Guide

### Step 1: Download the Application

1. Navigate to the [GitHub Releases page](https://github.com/your-repo/loto-key-management/releases)
2. Download the latest version: `LOTO Key Management Setup X.X.X.exe`
3. Save the file to your preferred location (e.g., Downloads folder)

**[INSERT SCREENSHOT: Download page with release file]**

---

### Step 2: Run the Installer

1. Locate the downloaded file `LOTO Key Management Setup X.X.X.exe`
2. Double-click the installer to begin installation

**[INSERT SCREENSHOT: Downloaded .exe file]**

---

### Step 3: Bypass Windows SmartScreen Protection

When you run the installer, Windows SmartScreen may display a warning:

#### ⚠️ **"Windows protected your PC"**

**This is normal for new applications!** The app is safe but not yet recognized by Microsoft's SmartScreen.

**To proceed:**

1. Click on **"More info"** link (appears as blue text)
2. A new button **"Run anyway"** will appear at the bottom
3. Click **"Run anyway"** to continue installation

**[INSERT SCREENSHOT: Windows SmartScreen warning]**

**[INSERT SCREENSHOT: "Run anyway" button after clicking "More info"]**

> **📝 Note:** This warning appears because the application is not digitally signed with an expensive Microsoft certificate. Your antivirus software may also scan the file - this is normal and the app will pass all security checks.

---

### Step 4: Complete Installation

1. The installer will automatically install the application
2. Wait for the installation to complete (usually takes 10-30 seconds)
3. The application will launch automatically after installation

**[INSERT SCREENSHOT: Installation progress]**

---

### Step 5: First Launch

After installation, the LOTO Key Management System will open automatically.

**[INSERT SCREENSHOT: Application main window on first launch]**

🎉 **Installation Complete!** You can now start using the application.

---

## 🔄 Auto-Updates

The LOTO Key Management System includes **automatic update detection**:

- **Automatic Check:** The app checks for updates when you launch it (requires internet connection)
- **Notification:** If a new version is available, you'll see an update notification
- **One-Click Update:** Click the notification to download and install the latest version
- **No Data Loss:** Your data is safely preserved during updates

**[INSERT SCREENSHOT: Update notification banner]**

> **💡 Tip:** Always keep your app updated to get the latest features, bug fixes, and security improvements!

---

## 👤 User Modes

The LOTO Key Management System has two user modes:

### 🔵 Visitor Mode (Read-Only)

**Who uses it:** Technicians, contractors, or anyone who needs to view information without making changes.

**Access:** No code required - simply select "Visitor" when prompted.

**Capabilities:**
- ✅ View all breaker states and locks
- ✅ Check lock inventory and storage
- ✅ View personnel certifications
- ✅ Consult electrical plans
- ✅ Check activity history
- ❌ Cannot add, edit, or delete data
- ❌ Cannot import/export data

**[INSERT SCREENSHOT: User mode selection with Visitor highlighted]**

---

### 🟢 Editor Mode (Full Access)

**Who uses it:** Authorized personnel (supervisors, HSE officers, electrical engineers).

**Access:** Requires a **6-digit access code** provided by your administrator.

**Capabilities:**
- ✅ All Visitor mode features
- ✅ Add, edit, and delete breakers
- ✅ Manage lock inventory and assignments
- ✅ Add/remove personnel records
- ✅ Upload certifications and electrical plans
- ✅ Import/export data via Excel
- ✅ Configure application settings

**Types of Editor Modes:**
- **Admin Editor:** Full access to all features
- **Restricted Editor:** Same editing capabilities with certain limitations

**[INSERT SCREENSHOT: User mode selection with Editor mode and code input]**

> **🔒 Security Note:** The access code is required each time you restart the application. Never share your access code with unauthorized personnel.

---

## 📱 Application Overview

### Navigation Bar

The app uses a **sidebar navigation** with the following sections:

**[INSERT SCREENSHOT: Full sidebar navigation]**

---

## 📖 Page-by-Page Guide

### 1️⃣ **Home (Dashboard)**

**Purpose:** Get a quick overview of your entire LOTO system at a glance.

**What you'll see:**
- **Total Breakers:** Count of all registered breakers in the system
- **Closed Breakers:** Number of breakers currently in locked (closed) state
- **Total Locks:** Lock inventory capacity
- **Locks in Use:** How many locks are currently assigned to breakers
- **Personnel Records:** Total number of certified personnel
- **Electrical Plans:** Count of uploaded electrical plans
- **Quick Stats:** Zone-based distribution and recent activity

**What you can do:**
- Monitor system status in real-time
- Identify which zones have the most locked breakers
- Track lock inventory availability

**[INSERT SCREENSHOT: Dashboard with statistics cards]**

---

### 2️⃣ **View by Breakers**

**Purpose:** Manage and monitor all electrical breakers in your facility.

**What you'll see:**
- Complete table of all breakers with columns:
  - **Name:** Breaker identifier
  - **Zone:** Electrical zone location
  - **Subzone:** Subdivision within the zone
  - **Location:** Physical location description
  - **State:** Open (available) or Closed (locked out)
  - **Lock Key:** Assigned lock number when closed
  - **General Breaker:** Main breaker reference
  - **Actions:** Edit/Delete buttons (Editor mode only)

**Filter Options:**
- **By Zone:** Show breakers from specific zones
- **By Location:** Filter by physical location
- **By State:** View only open or closed breakers
- **Search:** Find breakers by name

**What you can do (Editor Mode):**
- ➕ **Add Breaker:** Register new breakers with zone, location, and state
- ✏️ **Edit Breaker:** Update breaker information or change state
- 🗑️ **Delete Breaker:** Remove breakers from the system
- 📊 **Import from Excel:** Bulk upload breakers using Excel templates
- 📥 **Export to Excel:** Download breaker data for reporting

**[INSERT SCREENSHOT: View by Breakers page with table and filters]**

> **💡 Pro Tip:** Use the Excel import feature to quickly add multiple breakers at once. Download the template first to see the required format!

---

### 3️⃣ **View by Locks**

**Purpose:** See which breakers are currently locked out (closed state).

**What you'll see:**
- Filtered view showing **only closed breakers**
- Same columns as "View by Breakers"
- Focus on active lockout/tagout situations

**Filter Options:**
- **By Zone:** Focus on specific zones
- **By Location:** View locks in particular areas
- **Search:** Find specific locked breakers

**What you can do:**
- Monitor active LOTO procedures
- Verify lock key assignments
- Track locked breakers by zone and subzone
- Generate LOTO status reports

**[INSERT SCREENSHOT: View by Locks page showing only closed breakers]**

> **🔐 Safety Note:** This page is essential for LOTO compliance - use it to verify all required breakers are locked before maintenance work.

---

### 4️⃣ **Personnel**

**Purpose:** Manage electrical personnel certifications and qualifications.

**What you'll see:**
- Table of all registered personnel:
  - **Name:** First and last name
  - **ID Card:** Employee/contractor identification number
  - **Company:** Employer or contracting company
  - **Habilitation/Certificate:** Qualification type with PDF certificate viewer

**What you can do (Editor Mode):**
- ➕ **Add Personnel:** Register new electricians or contractors
- ✏️ **Edit Personnel:** Update information or certifications
- 📄 **Upload Certificate:** Attach PDF certificates (habilitation papers, training certificates)
  - **Maximum file size:** 5MB per PDF
- 👁️ **View Certificate:** Open PDF certificates in the built-in viewer
- 🗑️ **Delete Personnel:** Remove personnel records
- 📊 **Import from Excel:** Bulk upload personnel data
- 📥 **Export to Excel:** Download personnel list for reporting

**What you can do (Visitor Mode):**
- View all personnel information
- Check certificate validity by viewing PDFs
- Verify contractor qualifications before work authorization

**[INSERT SCREENSHOT: Personnel page with certificate viewer]**

> **✅ Best Practice:** Always verify personnel certifications before authorizing electrical work!

---

### 5️⃣ **Electrical Plans**

**Purpose:** Store and access electrical schematics and facility plans.

**What you'll see:**
- Gallery/table of all uploaded electrical plans
- Plan name, zone coverage, and upload date
- Quick preview and download options

**What you can do (Editor Mode):**
- ➕ **Upload Plan:** Add new electrical schematics or facility plans
  - **Maximum file size:** 15MB per PDF
  - Supports high-resolution drawings
- ✏️ **Edit Plan:** Update plan name or zone information
- 👁️ **View Plan:** Open plans in the built-in PDF viewer
- 📥 **Download Plan:** Save plans locally for offline access
- 🗑️ **Delete Plan:** Remove outdated plans

**What you can do (Visitor Mode):**
- View all electrical plans
- Download plans for field reference
- Consult schematics during maintenance

**[INSERT SCREENSHOT: Electrical Plans gallery view]**

> **📐 Technical Note:** Plans are synchronized with cloud storage when online, ensuring your team always has access to the latest versions.

---

### 6️⃣ **Storage (Lock Inventory)**

**Purpose:** Manage and monitor physical lock inventory and usage.

**What you'll see:**

**Inventory Statistics:**
- **Total Locks:** Total capacity of your lock inventory
- **In Use:** Locks currently assigned to breakers
- **Available:** Free locks in storage

**Locks by Zone Section:**
- Hierarchical view organized by:
  - **Zone** → **Subzone** → Individual locks
- Shows which breakers each lock is securing
- Real-time synchronization with breaker status

**What you can do (Editor Mode):**
- ⚙️ **Set Total Storage:** Configure total lock inventory capacity
- View detailed lock distribution by zone and subzone
- Track lock usage patterns

**What you can do (Visitor Mode):**
- Check lock availability
- See which locks are in use and where
- Verify lock-to-breaker assignments

**[INSERT SCREENSHOT: Storage page with inventory stats and zone grouping]**

> **📊 Inventory Insight:** The "Locks in Use" count is automatically calculated from breakers in "Closed" state with assigned lock keys.

---

### 7️⃣ **History**

**Purpose:** Audit trail of all system actions and modifications.

**What you'll see:**
- Chronological log of all activities:
  - Breaker additions, modifications, and deletions
  - Lock assignments and releases
  - Personnel record changes
  - Plan uploads
  - User mode activities

**Information displayed:**
- **Action:** What was done (e.g., "Added breaker," "Updated personnel")
- **User Mode:** Who performed the action (Admin Editor, Restricted Editor, Visitor)
- **Details:** Specific information about the change
- **Timestamp:** When the action occurred

**Filter Options:**
- Date range selection
- Filter by action type
- Search by details

**[INSERT SCREENSHOT: History page with activity log]**

> **🔍 Compliance Tip:** Use the History page for compliance audits and to track who made changes to critical safety systems.

---

### 8️⃣ **About Me (Settings)**

**Purpose:** View application information and developer details.

**What you'll see:**

**Developer Profile:**
- App creator information and contact
- LinkedIn profile link
- **CV Upload:** Ability to upload and view developer CV (PDF format, max 10MB)

**App Settings (Editor Mode):**
- **Company Information:** Customize company name and branding
- **About Text:** Customize application description
- **Support Contacts:** Set support email and phone numbers

**Technical Information:**
- Current app version
- Technologies used (React, Electron, SQLite, Supabase)
- System requirements

**[INSERT SCREENSHOT: About Me page with settings]**

---

## 🔄 Data Synchronization

The LOTO Key Management System uses a **hybrid cloud + local database architecture**:

### 🌐 **Online Mode (Connected to Internet)**

- **Automatic Sync:** All data is synchronized with Supabase cloud database in real-time
- **Team Collaboration:** Multiple users can work on the same data simultaneously
- **Cloud Backup:** Your data is safely backed up in the cloud
- **Access Anywhere:** Data available from any installation of the app with the same credentials

### 💾 **Offline Mode (No Internet Connection)**

- **Local Database:** Uses SQLite for local data storage
- **Full Functionality:** All features work offline (except cloud sync)
- **Data Preserved:** Changes are saved locally and will sync when connection is restored
- **Automatic Recovery:** When internet returns, local changes merge with cloud data

**Connection Status Indicator:**
- **🟢 Green Dot:** Connected to cloud (online mode)
- **🔴 Red Dot:** Offline mode - using local database

**[INSERT SCREENSHOT: Online/offline status indicator]**

> **⚡ Performance Note:** The app works seamlessly in both modes. Offline mode is perfect for field work in areas with limited connectivity!

---

## 📊 Import/Export Features (Editor Mode)

### Excel Import

**Purpose:** Bulk upload data from Excel spreadsheets.

**Available for:**
- Breakers
- Personnel records
- Lock inventory

**How to use:**
1. Click the **"Import from Excel"** button
2. Download the Excel template (first time)
3. Fill in your data following the template format
4. Upload the completed Excel file
5. Review any errors or warnings
6. Confirm import

**[INSERT SCREENSHOT: Excel import dialog with template download]**

### Excel Export

**Purpose:** Download data for reporting, backup, or analysis.

**Available for:**
- All breakers (with filters applied)
- Personnel records
- Lock inventory
- Activity history

**How to use:**
1. Apply any filters you want (optional)
2. Click **"Export to Excel"** button
3. File downloads automatically to your Downloads folder
4. Open with Microsoft Excel, LibreOffice, or Google Sheets

**[INSERT SCREENSHOT: Export button and confirmation]**

---

## 🆘 Troubleshooting

### App Won't Launch After Installation

**Solution:**
- Check if Windows Defender or antivirus blocked the app
- Ensure you clicked "Run anyway" on SmartScreen warning
- Try running the installer as Administrator (right-click → Run as administrator)

---

### Can't Edit Data (Buttons Are Grayed Out)

**Solution:**
- Verify you're in **Editor Mode** (not Visitor Mode)
- Check if you entered the correct access code
- Restart the app and re-enter Editor mode

---

### Changes Not Saving

**Solution:**
- Check your internet connection status (top-right indicator)
- If offline, changes save locally and will sync when online
- Verify you clicked "Save" or "Submit" buttons
- Check the History page to confirm the action was logged

---

### PDF Viewer Not Opening

**Solution:**
- Ensure the PDF file is not corrupted
- Check file size limits (5MB personnel, 10MB CV, 15MB plans)
- Try re-uploading the PDF
- Verify the file path hasn't changed

---

### Data Not Syncing Between Devices

**Solution:**
- Ensure both devices are connected to internet
- Verify you're using the same Supabase credentials
- Check for update notifications - older versions may have sync issues
- Contact support if problem persists

---

## 📞 Support

For technical support, bug reports, or feature requests:

- **Email:** [Your support email]
- **GitHub Issues:** [Repository issues page]
- **Documentation:** This guide + CHANGELOG.md for version history

---

## ⚖️ Safety & Compliance Notes

### ⚠️ Important Safety Information

This application is a **tool to assist** with LOTO procedures, not a replacement for:
- Proper LOTO training
- Physical lockout devices
- Safety procedures and protocols
- Regulatory compliance requirements

### 📋 Recommended Usage

- Always verify physical lock placement matches system records
- Conduct regular audits using the History page
- Keep personnel certifications up-to-date
- Follow your company's LOTO procedures in addition to using this app
- Update electrical plans when facility changes occur

### 🔒 Data Security

- Access codes should be changed regularly
- Do not share Editor mode credentials
- Back up your data regularly (use Excel export)
- Report any security concerns immediately

---

## ✅ Quick Start Checklist

**For Administrators (First Time Setup):**
- [ ] Install the application
- [ ] Set total lock storage capacity
- [ ] Import or manually add all breakers
- [ ] Add personnel records with certifications
- [ ] Upload electrical plans
- [ ] Set access codes for Editor users
- [ ] Configure company information in Settings

**For Daily Users:**
- [ ] Launch app and select appropriate user mode
- [ ] Check Dashboard for current status
- [ ] Update breaker states when performing LOTO procedures
- [ ] Verify lock assignments match physical locks
- [ ] Document any changes or maintenance in notes
- [ ] Export reports when needed

---

## 🎓 Training Resources

**Recommended Training Topics:**
1. Basic navigation and user modes
2. Adding and updating breaker information
3. Managing lock inventory
4. Uploading and viewing personnel certifications
5. Using import/export features
6. Reading the History log for audits
7. Working in offline mode

**Estimated Learning Time:**
- Basic user (Visitor mode): 15-30 minutes
- Editor user: 1-2 hours
- Administrator: 2-3 hours

---

**Version:** 1.7.1  
**Last Updated:** January 2025  
**Document Language:** English

---

© 2025 LOTO Key Management System. All rights reserved.
