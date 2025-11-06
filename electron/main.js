const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const packageJson = require('../package.json'); // Import for version and app name
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

console.log('🔄 Auto-updater configured');
console.log('📦 Current version:', packageJson.version);

let mainWindow;
let db;

// Ensure data directories exist
const appPath = app.isPackaged 
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, '..', 'data');

const dbPath = path.join(appPath, 'loto.db');
const pdfsPath = path.join(appPath, 'pdfs');
const plansPath = path.join(appPath, 'plans');
const personnelPath = path.join(appPath, 'personnel');
const exportsPath = path.join(appPath, 'exports');
const configPath = path.join(appPath, 'config.json');
const logPath = path.join(appPath, 'app_activity.log');

// Create directories
[appPath, pdfsPath, plansPath, personnelPath, exportsPath].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize log file if not exists
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, `LOTO App Activity Log - Started ${new Date().toISOString()}\n`, 'utf8');
}

// Initialize SQLite Database
function initDatabase() {
  console.log('=== DATABASE INIT ===');
  console.log('DB Path:', dbPath);
  console.log('DB exists:', fs.existsSync(dbPath));
  
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  console.log('Database initialized successfully');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS breakers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      subzone TEXT,
      location TEXT NOT NULL,
      special_use TEXT,
      state TEXT DEFAULT 'Off' CHECK(state IN ('On', 'Off', 'Closed')),
      lock_key TEXT,
      general_breaker TEXT,
      date TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing tables - Add new columns if they don't exist
  try {
    // Check if subzone column exists
    const tableInfo = db.pragma('table_info(breakers)');
    const hasSubzone = tableInfo.some(col => col.name === 'subzone');
    const hasSpecialUse = tableInfo.some(col => col.name === 'special_use');
    const hasDate = tableInfo.some(col => col.name === 'date');

    if (!hasSubzone) {
      console.log('Adding subzone column to breakers table...');
      db.exec('ALTER TABLE breakers ADD COLUMN subzone TEXT');
    }
    if (!hasSpecialUse) {
      console.log('Adding special_use column to breakers table...');
      db.exec('ALTER TABLE breakers ADD COLUMN special_use TEXT');
    }
    if (!hasDate) {
      console.log('Adding date column to breakers table...');
      db.exec('ALTER TABLE breakers ADD COLUMN date TEXT');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_number TEXT UNIQUE NOT NULL,
      zone TEXT NOT NULL,
      used INTEGER DEFAULT 0 CHECK(used IN (0, 1)),
      assigned_to TEXT,
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lastname TEXT NOT NULL,
      id_card TEXT UNIQUE NOT NULL,
      company TEXT,
      habilitation TEXT,
      pdf_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      version TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      breaker_id INTEGER,
      action TEXT NOT NULL,
      user_mode TEXT NOT NULL CHECK(user_mode IN ('Editor', 'Visitor')),
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (breaker_id) REFERENCES breakers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      record_id INTEGER,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS profile_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      name TEXT,
      title TEXT,
      bio TEXT,
      email TEXT,
      linkedin TEXT,
      profilePicture TEXT,
      cvFiles TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      app_name TEXT DEFAULT '${packageJson.build.productName}',
      app_version TEXT DEFAULT '${packageJson.version}',
      company_name TEXT,
      company_logo TEXT,
      about_title TEXT DEFAULT 'About ${packageJson.build.productName}',
      about_text TEXT DEFAULT 'LOTO Key Management System is a comprehensive desktop application designed to manage electrical lockout/tagout procedures, key inventory, personnel tracking, and electrical plans. Built with modern web technologies and Electron, it provides both online and offline functionality with cloud synchronization capabilities.',
      about_image TEXT,
      support_email TEXT,
      support_phone TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lock_inventory (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      total_capacity INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Initialize default app settings if not exists
  try {
    const appSettings = db.prepare('SELECT COUNT(*) as count FROM app_settings').get();
    if (appSettings.count === 0) {
      db.prepare(`
        INSERT INTO app_settings (id, app_name, app_version, company_name, about_title, about_text)
        VALUES (1, '${packageJson.build.productName}', '${packageJson.version}', 'Your Company Name', 'About ${packageJson.build.productName}', 
          '${packageJson.description}')
      `).run();
      console.log('✓ Default app settings initialized');
    }
  } catch (error) {
    console.error('Error initializing app settings:', error);
  }

  console.log('Database initialized at:', dbPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: app.isPackaged 
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../public/company-logo.png'),
    autoHideMenuBar: true
  });

  const startUrl = process.env.ELECTRON_START_URL || 
    (app.isPackaged 
      ? `file://${path.join(__dirname, '../build/index.html')}`
      : `file://${path.join(__dirname, '../build/index.html')}`);
  
  console.log('=== ELECTRON DEBUG INFO ===');
  console.log('Is Packaged:', app.isPackaged);
  console.log('__dirname:', __dirname);
  console.log('Start URL:', startUrl);
  console.log('Build folder path:', path.join(__dirname, '../build'));
  console.log('Index.html path:', path.join(__dirname, '../build/index.html'));
  console.log('Index.html exists:', require('fs').existsSync(path.join(__dirname, '../build/index.html')));
  console.log('Preload.js exists:', require('fs').existsSync(path.join(__dirname, 'preload.js')));
  console.log('===========================');
  
  mainWindow.loadURL(startUrl);

  // Only open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== AUTO-UPDATER EVENT HANDLERS =====

autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('🔔 Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('✅ App is up to date:', info.version);
});

autoUpdater.on('error', (err) => {
  console.error('❌ Update error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.toString());
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  console.log('⬇️', message);
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

// IPC handlers for update actions
ipcMain.on('download-update', () => {
  console.log('⬇️ User requested update download');
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  console.log('🔄 User requested update installation');
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // Check for updates after 5 seconds (give app time to fully load)
  setTimeout(() => {
    if (process.env.NODE_ENV !== 'development') {
      console.log('🔍 Checking for updates...');
      autoUpdater.checkForUpdates().catch(err => {
        console.log('❌ Error checking for updates:', err);
      });
    } else {
      console.log('⚠️ Update check skipped (development mode)');
    }
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('db-query', async (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.all(params);
    return { success: true, data: result };
  } catch (error) {
    console.error('DB Query Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-run', async (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(params);
    return { success: true, data: result };
  } catch (error) {
    console.error('DB Run Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-config', async () => {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { success: true, data: config };
    }
    return { success: false, error: 'Config file not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, { fileName, fileData, type = 'pdf' }) => {
  try {
    console.log(`[SAVE-FILE] Starting save operation - Type: ${type}, FileName: ${fileName}`);
    
    let targetDir;
    switch (type) {
      case 'plan':
        targetDir = plansPath;
        break;
      case 'cv':
        // Create cv directory if it doesn't exist
        const cvPath = path.join(app.getPath('userData'), 'cv');
        if (!fs.existsSync(cvPath)) {
          fs.mkdirSync(cvPath, { recursive: true });
          console.log(`[SAVE-FILE] Created CV directory: ${cvPath}`);
        }
        targetDir = cvPath;
        break;
      case 'profile':
        // Create profile directory if it doesn't exist
        const profilePath = path.join(app.getPath('userData'), 'profile');
        if (!fs.existsSync(profilePath)) {
          fs.mkdirSync(profilePath, { recursive: true });
          console.log(`[SAVE-FILE] Created profile directory: ${profilePath}`);
        }
        targetDir = profilePath;
        break;
      default:
        targetDir = pdfsPath;
    }
    
    const filePath = path.join(targetDir, fileName);
    console.log(`[SAVE-FILE] Target path: ${filePath}`);
    
    // fileData is data URL (data:type;base64,xxxxx)
    let buffer;
    if (fileData.startsWith('data:')) {
      const base64Data = fileData.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(fileData, 'base64');
    }
    
    console.log(`[SAVE-FILE] Buffer size: ${buffer.length} bytes`);
    
    // Write to disk (NOT CACHE - actual file system)
    fs.writeFileSync(filePath, buffer);
    
    // VERIFY file was actually written to disk
    if (fs.existsSync(filePath)) {
      const fileStats = fs.statSync(filePath);
      console.log(`[SAVE-FILE] ✅ File written to DISK successfully!`);
      console.log(`[SAVE-FILE] File size on disk: ${fileStats.size} bytes`);
      console.log(`[SAVE-FILE] File location: ${filePath}`);
      console.log(`[SAVE-FILE] THIS IS A REAL FILE ON YOUR HARD DRIVE, NOT IN CACHE!`);
    } else {
      throw new Error('File write verification failed - file not found on disk');
    }
    
    return { success: true, filePath: filePath, fileName: fileName };
  } catch (error) {
    console.error(`[SAVE-FILE] ❌ ERROR:`, error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    console.log(`[READ-FILE] Reading from DISK (not cache): ${filePath}`);
    
    // Verify file exists on disk
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found on disk: ${filePath}`);
    }
    
    const fileStats = fs.statSync(filePath);
    console.log(`[READ-FILE] File size on disk: ${fileStats.size} bytes`);
    console.log(`[READ-FILE] Last modified: ${fileStats.mtime}`);
    
    // Read from actual file system (NOT CACHE)
    const buffer = fs.readFileSync(filePath);
    console.log(`[READ-FILE] ✅ File read from DISK successfully! Size: ${buffer.length} bytes`);
    console.log(`[READ-FILE] THIS IS READING FROM YOUR HARD DRIVE, NOT CACHE!`);
    
    return { success: true, data: buffer.toString('base64') };
  } catch (error) {
    console.error(`[READ-FILE] ❌ ERROR:`, error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      
      return { 
        success: true, 
        fileName, 
        data: buffer.toString('base64') 
      };
    }
    
    return { success: false, error: 'No file selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-csv', async (event, { fileName, data }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, data);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, error: 'Save canceled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-csv', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const data = fs.readFileSync(result.filePaths[0], 'utf8');
      return { success: true, data };
    }
    
    return { success: false, error: 'No file selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Excel Export Handler
ipcMain.handle('export-excel', async (event, { fileName, data }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      // Convert base64 back to buffer
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(result.filePath, buffer);
      console.log(`[EXPORT-EXCEL] ✅ Excel file saved: ${result.filePath}`);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, error: 'Save canceled' };
  } catch (error) {
    console.error(`[EXPORT-EXCEL] ❌ Error:`, error);
    return { success: false, error: error.message };
  }
});

// Excel Import Handler
ipcMain.handle('select-excel-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const buffer = fs.readFileSync(result.filePaths[0]);
      const base64 = buffer.toString('base64');
      console.log(`[IMPORT-EXCEL] ✅ Excel file loaded: ${result.filePaths[0]}`);
      return { success: true, data: base64, fileName: path.basename(result.filePaths[0]) };
    }
    
    return { success: false, error: 'No file selected' };
  } catch (error) {
    console.error(`[IMPORT-EXCEL] ❌ Error:`, error);
    return { success: false, error: error.message };
  }
});

// Open file with system default application
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save a copy of CV file
ipcMain.handle('save-cv-copy', async (event, { sourcePath, displayName }) => {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source file not found' };
    }
    
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${displayName}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    
    if (!result.canceled && result.filePath) {
      fs.copyFileSync(sourcePath, result.filePath);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, error: 'Save canceled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load image file as data URL
ipcMain.handle('load-image', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    
    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    
    const dataURL = `data:${mimeType};base64,${base64Image}`;
    
    return { success: true, dataURL };
  } catch (error) {
    console.error('Error loading image:', error);
    return { success: false, error: error.message };
  }
});

// Delete file
ipcMain.handle('delete-file', async (event, { fileName, type }) => {
  try {
    let targetDir;
    switch (type) {
      case 'cv':
        targetDir = path.join(app.getPath('userData'), 'cv');
        break;
      case 'profile':
        targetDir = path.join(app.getPath('userData'), 'profile');
        break;
      case 'plan':
        targetDir = plansPath;
        break;
      default:
        targetDir = pdfsPath;
    }
    
    const filePath = path.join(targetDir, fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Temporary backup storage for undo functionality
let dataBackup = null;

ipcMain.handle('nuke-database', async () => {
  try {
    // Create backup before deletion
    const backup = {
      breakers: db.prepare('SELECT * FROM breakers').all(),
      locks: db.prepare('SELECT * FROM locks').all(),
      personnel: db.prepare('SELECT * FROM personnel').all(),
      plans: db.prepare('SELECT * FROM plans').all(),
      history: db.prepare('SELECT * FROM history').all(),
      profile_settings: db.prepare('SELECT * FROM profile_settings').all(),
      app_settings: db.prepare('SELECT * FROM app_settings').all()
    };
    
    // Store backup for undo (5 seconds)
    dataBackup = backup;
    
    // Delete all data (except settings and profile)
    db.exec(`
      DELETE FROM history;
      DELETE FROM plans;
      DELETE FROM personnel;
      DELETE FROM locks;
      DELETE FROM breakers;
      DELETE FROM sync_queue;
      VACUUM;
    `);
    
    console.log('🗑️  Database nuked - Settings and Profile preserved');
    
    // Note: We don't delete physical files yet (in case of undo)
    // They will be deleted after 5 seconds if no undo
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Undo nuke operation
ipcMain.handle('undo-nuke', async () => {
  try {
    if (!dataBackup) {
      return { success: false, error: 'No backup available' };
    }
    
    // Restore all data from backup
    const insertBreaker = db.prepare('INSERT INTO breakers (id, name, zone, subzone, location, special_use, state, lock_key, general_breaker, date, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertLock = db.prepare('INSERT INTO locks (id, key_number, zone, used, assigned_to, remarks) VALUES (?, ?, ?, ?, ?, ?)');
    const insertPersonnel = db.prepare('INSERT INTO personnel (id, name, lastname, id_card, company, habilitation, pdf_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertPlan = db.prepare('INSERT INTO plans (id, filename, file_path, version, uploaded_at) VALUES (?, ?, ?, ?, ?)');
    const insertHistory = db.prepare('INSERT INTO history (id, breaker_id, action, user_mode, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
    // Note: Profile and app settings are NOT restored (they are preserved during nuke)
    
    // Restore breakers
    dataBackup.breakers.forEach(item => {
      insertBreaker.run(item.id, item.name, item.zone, item.subzone, item.location, item.special_use, item.state, item.lock_key, item.general_breaker, item.date, item.last_updated);
    });
    
    // Restore locks
    dataBackup.locks.forEach(item => {
      insertLock.run(item.id, item.key_number, item.zone, item.used, item.assigned_to, item.remarks);
    });
    
    // Restore personnel
    dataBackup.personnel.forEach(item => {
      insertPersonnel.run(item.id, item.name, item.lastname, item.id_card, item.company, item.habilitation, item.pdf_path, item.created_at);
    });
    
    // Restore plans
    dataBackup.plans.forEach(item => {
      insertPlan.run(item.id, item.filename, item.file_path, item.version, item.uploaded_at);
    });
    
    // Restore history
    dataBackup.history.forEach(item => {
      insertHistory.run(item.id, item.breaker_id, item.action, item.user_mode, item.details, item.timestamp);
    });
    
    // NOTE: Profile settings and app settings are NOT restored
    // because they were NOT deleted during nuke (preserved automatically)
    console.log('✅ Data restored - Settings and Profile were preserved during nuke');
    
    // Clear backup after successful restore
    dataBackup = null;
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Finalize nuke (delete files and clear backup)
ipcMain.handle('finalize-nuke', async () => {
  try {
    // Delete only operational files (PDFs and plans)
    // DO NOT delete profile pictures and CV files (user's personal data)
    const dirsToClean = [
      pdfsPath,   // Personnel certificates
      plansPath   // Electrical plans
      // CV and profile folders are NOT deleted (preserved with settings)
    ];
    
    dirsToClean.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          try {
            fs.unlinkSync(path.join(dir, file));
          } catch (err) {
            console.warn(`Could not delete file ${file}:`, err);
          }
        });
      }
    });
    
    console.log('🗑️  Finalized nuke - Profile and CV files preserved');
    
    // Clear backup
    dataBackup = null;
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-paths', async () => {
  return {
    success: true,
    data: {
      app: appPath,
      db: dbPath,
      pdfs: pdfsPath,
      plans: plansPath,
      personnel: personnelPath,
      exports: exportsPath,
      config: configPath,
      log: logPath
    }
  };
});

// Logging handlers
ipcMain.handle('write-log', async (event, logEntry) => {
  try {
    const logLine = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.userMode}] ${logEntry.action} ${JSON.stringify(logEntry.details)}\n`;
    fs.appendFileSync(logPath, logLine, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error writing log:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-logs', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `loto_logs_${new Date().toISOString().split('T')[0]}.log`,
      filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
    });
    
    if (!result.canceled && result.filePath) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      fs.writeFileSync(result.filePath, logContent);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, error: 'Save canceled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-logs', async () => {
  try {
    fs.writeFileSync(logPath, `LOTO App Activity Log - Cleared ${new Date().toISOString()}\n`, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-logs', async (event, lineCount = 100) => {
  try {
    const logContent = fs.readFileSync(logPath, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    const recentLines = lines.slice(-lineCount);
    return { success: true, data: recentLines.join('\n') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Download CSV template
ipcMain.handle('download-template', async (event, templateType) => {
  try {
    let csvContent = '';
    let defaultName = 'template.csv';
    
    if (templateType === 'breakers') {
      csvContent = 'name,zone,location,state,lock_key,general_breaker\n';
      csvContent += 'Example Breaker 1,Zone A,Building 1,Off,,Main Panel\n';
      csvContent += 'Example Breaker 2,Zone B,Building 2,On,,\n';
      defaultName = 'breakers_template.csv';
    } else if (templateType === 'locks') {
      csvContent = 'key_number,zone,used,assigned_to,remarks\n';
      csvContent += 'K001,Zone A,0,,\n';
      csvContent += 'K002,Zone A,0,,\n';
      defaultName = 'locks_template.csv';
    } else if (templateType === 'personnel') {
      csvContent = 'name,lastname,id_card,company,habilitation\n';
      csvContent += 'John,Doe,EMP001,ABC Company,Level 1\n';
      csvContent += 'Jane,Smith,EMP002,XYZ Company,Level 2\n';
      defaultName = 'personnel_template.csv';
    }
    
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, csvContent);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, error: 'Save canceled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open external file
ipcMain.handle('open-external', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check dependencies
ipcMain.handle('check-dependencies', async () => {
  try {
    const dependencies = {
      nodejs: process.version,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      v8: process.versions.v8,
      sqlite: db ? 'OK' : 'Not initialized'
    };
    
    return { success: true, data: dependencies };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Repair database
ipcMain.handle('repair-database', async () => {
  try {
    // Run integrity check
    const integrityCheck = db.pragma('integrity_check');
    
    if (integrityCheck[0].integrity_check !== 'ok') {
      // Try to repair by recreating tables
      initDatabase();
      return { success: true, message: 'Database repaired and reinitialized' };
    }
    
    return { success: true, message: 'Database is healthy' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== SUPABASE SYNC HANDLERS =====

// Get all files for Supabase sync
ipcMain.handle('get-all-files-for-sync', async () => {
  try {
    const profileDir = path.join(app.getPath('userData'), 'profile');
    const cvDir = path.join(app.getPath('userData'), 'cv');
    
    const result = {
      profilePictures: [],
      cvFiles: [],
      personnelCerts: [],
      electricalPlans: []
    };
    
    // Get profile pictures
    if (fs.existsSync(profileDir)) {
      fs.readdirSync(profileDir).forEach(file => {
        const filePath = path.join(profileDir, file);
        const ext = path.extname(file).toLowerCase();
        const mimeType = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        }[ext] || 'image/jpeg';
        
        result.profilePictures.push({
          name: file,
          path: filePath,
          mimeType
        });
      });
    }
    
    // Get CV files
    if (fs.existsSync(cvDir)) {
      fs.readdirSync(cvDir).forEach(file => {
        result.cvFiles.push({
          name: file,
          path: path.join(cvDir, file)
        });
      });
    }
    
    // Get personnel certificates
    if (fs.existsSync(pdfsPath)) {
      fs.readdirSync(pdfsPath).forEach(file => {
        result.personnelCerts.push({
          name: file,
          path: path.join(pdfsPath, file)
        });
      });
    }
    
    // Get electrical plans
    if (fs.existsSync(plansPath)) {
      fs.readdirSync(plansPath).forEach(file => {
        result.electricalPlans.push({
          name: file,
          path: path.join(plansPath, file)
        });
      });
    }
    
    return { success: true, ...result };
  } catch (error) {
    console.error('Error getting files for sync:', error);
    return { success: false, error: error.message };
  }
});

// Read file as base64 for Supabase upload
ipcMain.handle('read-file-as-base64', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    
    return { success: true, data: base64Data };
  } catch (error) {
    console.error('Error reading file as base64:', error);
    return { success: false, error: error.message };
  }
});

// Read app logs for Supabase sync
ipcMain.handle('read-app-logs', async () => {
  try {
    if (!fs.existsSync(logPath)) {
      return { success: false, error: 'Log file not found' };
    }
    
    const logContent = fs.readFileSync(logPath, 'utf8');
    return { success: true, data: logContent };
  } catch (error) {
    console.error('Error reading logs:', error);
    return { success: false, error: error.message };
  }
});
