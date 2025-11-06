/**
 * COMPREHENSIVE SUPABASE SYNC MANAGER
 * Syncs EVERYTHING to Supabase:
 * - All database tables
 * - All files (profile pictures, CVs, PDFs, plans, logs, Excel templates)
 * - Bidirectional sync
 * - Offline queue support
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const { ipcRenderer } = window;

let supabaseClient = null;
let syncInProgress = false;

// Storage bucket configuration
const BUCKETS = {
  PROFILE_PICTURES: 'profile-pictures',
  CV_FILES: 'cv-files',
  PERSONNEL_CERTS: 'personnel-certificates',
  ELECTRICAL_PLANS: 'electrical-plans',
  APP_LOGS: 'app-logs',
  EXCEL_TEMPLATES: 'excel-templates',
  COMPANY_ASSETS: 'company-assets',  // For company logos, about images, etc.
  LOTO_PDFS: 'loto_pdfs'  // General LOTO PDFs bucket
};

// Database tables to sync
const TABLES = {
  BREAKERS: 'breakers',
  LOCKS: 'locks',
  PERSONNEL: 'personnel',
  PLANS: 'plans',
  HISTORY: 'history',
  PROFILE_SETTINGS: 'profile_settings',
  APP_SETTINGS: 'app_settings',
  SYNC_QUEUE: 'sync_queue',
  LOCK_INVENTORY: 'lock_inventory'
};

/**
 * Initialize Supabase client
 */
export const initializeSupabase = (url, anonKey) => {
  if (!url || !anonKey) {
    console.error('❌ Supabase URL and Key are required');
    return { success: false, error: 'Missing configuration' };
  }

  try {
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    console.log('✅ Supabase client initialized');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test Supabase connection
 */
export const testConnection = async () => {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    // Try to query any table to test connection
    const { data, error } = await supabaseClient
      .from(TABLES.BREAKERS)
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Supabase connection successful');
    return { success: true, message: 'Connected to Supabase' };
  } catch (error) {
    console.error('❌ Connection test exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sync single table to Supabase
 */
const syncTable = async (tableName, localData) => {
  if (!supabaseClient) {
    return { success: false, error: 'Not initialized' };
  }

  try {
    console.log(`📤 Syncing ${tableName}... (${localData.length} records)`);

    if (localData.length === 0) {
      console.log(`⚠️  No data in ${tableName}`);
      return { success: true, uploaded: 0, message: 'No data to sync' };
    }

    // Upsert data (insert or update)
    const { data, error } = await supabaseClient
      .from(tableName)
      .upsert(localData, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Failed to sync ${tableName}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Synced ${tableName} successfully`);
    return { success: true, uploaded: localData.length };
  } catch (error) {
    console.error(`❌ Exception syncing ${tableName}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload file to Supabase Storage
 */
const uploadFile = async (bucket, filePath, fileData, contentType = 'application/octet-stream') => {
  if (!supabaseClient) {
    return { success: false, error: 'Not initialized' };
  }

  try {
    console.log(`📤 Uploading to ${bucket}/${filePath}...`);

    // Convert base64 or Buffer to Blob
    let blob;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      // Data URL
      const base64 = fileData.split(',')[1];
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      blob = new Blob([array], { type: contentType });
    } else if (typeof fileData === 'string') {
      // Base64 string
      const binary = atob(fileData);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      blob = new Blob([array], { type: contentType });
    } else {
      blob = fileData;
    }

    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType,
        upsert: true,  // Overwrite if exists
        cacheControl: '3600'
      });

    if (error) {
      console.error(`❌ Failed to upload ${filePath}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Uploaded ${filePath}`);
    
    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { success: true, path: data.path, url: urlData.publicUrl };
  } catch (error) {
    console.error(`❌ Exception uploading file:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Sync all database tables
 */
export const syncAllDatabaseTables = async () => {
  if (!ipcRenderer) {
    return { success: false, error: 'Electron IPC not available' };
  }

  const results = {};

  try {
    // Sync Breakers
    const breakersData = await ipcRenderer.invoke('db-query', 'SELECT * FROM breakers', []);
    if (breakersData.success) {
      results.breakers = await syncTable(TABLES.BREAKERS, breakersData.data);
    }

    // Sync Locks
    const locksData = await ipcRenderer.invoke('db-query', 'SELECT * FROM locks', []);
    if (locksData.success) {
      results.locks = await syncTable(TABLES.LOCKS, locksData.data);
    }

    // Sync Personnel
    const personnelData = await ipcRenderer.invoke('db-query', 'SELECT * FROM personnel', []);
    if (personnelData.success) {
      results.personnel = await syncTable(TABLES.PERSONNEL, personnelData.data);
    }

    // Sync Plans
    const plansData = await ipcRenderer.invoke('db-query', 'SELECT * FROM plans', []);
    if (plansData.success) {
      results.plans = await syncTable(TABLES.PLANS, plansData.data);
    }

    // Sync History
    const historyData = await ipcRenderer.invoke('db-query', 'SELECT * FROM history', []);
    if (historyData.success) {
      results.history = await syncTable(TABLES.HISTORY, historyData.data);
    }

    // Sync Profile Settings
    const profileData = await ipcRenderer.invoke('db-query', 'SELECT * FROM profile_settings', []);
    if (profileData.success && profileData.data.length > 0) {
      results.profile_settings = await syncTable(TABLES.PROFILE_SETTINGS, profileData.data);
    }

    // Sync App Settings
    const appSettingsData = await ipcRenderer.invoke('db-query', 'SELECT * FROM app_settings', []);
    if (appSettingsData.success && appSettingsData.data.length > 0) {
      results.app_settings = await syncTable(TABLES.APP_SETTINGS, appSettingsData.data);
    }

    // Sync Queue (offline sync tracking)
    const syncQueueData = await ipcRenderer.invoke('db-query', 'SELECT * FROM sync_queue WHERE synced = 0', []);
    if (syncQueueData.success && syncQueueData.data.length > 0) {
      results.sync_queue = await syncTable(TABLES.SYNC_QUEUE, syncQueueData.data);
    }

    // Sync Lock Inventory
    const lockInventoryData = await ipcRenderer.invoke('db-query', 'SELECT * FROM lock_inventory', []);
    if (lockInventoryData.success && lockInventoryData.data.length > 0) {
      results.lock_inventory = await syncTable(TABLES.LOCK_INVENTORY, lockInventoryData.data);
    }

    return { success: true, results };
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    return { success: false, error: error.message, results };
  }
};

/**
 * Sync all files to Supabase Storage
 */
export const syncAllFiles = async () => {
  if (!ipcRenderer) {
    return { success: false, error: 'Electron IPC not available' };
  }

  const results = {
    profilePictures: [],
    cvFiles: [],
    personnelCerts: [],
    electricalPlans: [],
    excelTemplates: [],
    appLogs: [],
    companyAssets: []
  };

  try {
    // Get list of files from Electron
    const files = await ipcRenderer.invoke('get-all-files-for-sync');
    
    if (!files || !files.success) {
      return { success: false, error: 'Failed to get file list' };
    }

    // Sync Profile Pictures
    if (files.profilePictures) {
      for (const file of files.profilePictures) {
        const fileData = await ipcRenderer.invoke('load-image', file.path);
        if (fileData.success) {
          const result = await uploadFile(
            BUCKETS.PROFILE_PICTURES,
            file.name,
            fileData.dataURL,
            file.mimeType || 'image/jpeg'
          );
          results.profilePictures.push({ name: file.name, ...result });
        }
      }
    }

    // Sync CV Files
    if (files.cvFiles) {
      for (const file of files.cvFiles) {
        const fileData = await ipcRenderer.invoke('read-file-as-base64', file.path);
        if (fileData.success) {
          const result = await uploadFile(
            BUCKETS.CV_FILES,
            file.name,
            fileData.data,
            'application/pdf'
          );
          results.cvFiles.push({ name: file.name, ...result });
        }
      }
    }

    // Sync Personnel Certificates
    if (files.personnelCerts) {
      for (const file of files.personnelCerts) {
        const fileData = await ipcRenderer.invoke('read-file-as-base64', file.path);
        if (fileData.success) {
          const result = await uploadFile(
            BUCKETS.PERSONNEL_CERTS,
            file.name,
            fileData.data,
            'application/pdf'
          );
          results.personnelCerts.push({ name: file.name, ...result });
        }
      }
    }

    // Sync Electrical Plans
    if (files.electricalPlans) {
      for (const file of files.electricalPlans) {
        const fileData = await ipcRenderer.invoke('read-file-as-base64', file.path);
        if (fileData.success) {
          const result = await uploadFile(
            BUCKETS.ELECTRICAL_PLANS,
            file.name,
            fileData.data,
            'application/pdf'
          );
          results.electricalPlans.push({ name: file.name, ...result });
        }
      }
    }

    // Sync Excel Templates
    const templatesResult = await syncExcelTemplates();
    results.excelTemplates = templatesResult;

    // Sync App Logs
    const logsResult = await syncAppLogs();
    results.appLogs = logsResult;

    // Sync Company Assets (logo, about image, etc.)
    if (files.companyAssets) {
      for (const file of files.companyAssets) {
        const fileData = await ipcRenderer.invoke('read-file-as-base64', file.path);
        if (fileData.success) {
          const result = await uploadFile(
            BUCKETS.COMPANY_ASSETS,
            file.name,
            fileData.data,
            file.mimeType || 'image/png'
          );
          results.companyAssets.push({ name: file.name, ...result });
        }
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error('❌ File sync failed:', error);
    return { success: false, error: error.message, results };
  }
};

/**
 * Generate and sync Excel templates
 */
const syncExcelTemplates = async () => {
  try {
    const templates = [
      {
        name: 'Breakers_Import_Template.xlsx',
        data: generateBreakersTemplate()
      },
      {
        name: 'Locks_Import_Template.xlsx',
        data: generateLocksTemplate()
      },
      {
        name: 'Personnel_Import_Template.xlsx',
        data: generatePersonnelTemplate()
      }
    ];

    const results = [];
    for (const template of templates) {
      const result = await uploadFile(
        BUCKETS.EXCEL_TEMPLATES,
        template.name,
        template.data,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      results.push({ name: template.name, ...result });
    }

    return results;
  } catch (error) {
    console.error('❌ Excel templates sync failed:', error);
    return [{ success: false, error: error.message }];
  }
};

/**
 * Sync application logs
 */
const syncAppLogs = async () => {
  if (!ipcRenderer) return [];

  try {
    const logsData = await ipcRenderer.invoke('read-app-logs');
    if (logsData.success) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const result = await uploadFile(
        BUCKETS.APP_LOGS,
        `app_log_${timestamp}.txt`,
        btoa(logsData.data),  // Convert to base64
        'text/plain'
      );
      return [result];
    }
    return [];
  } catch (error) {
    console.error('❌ App logs sync failed:', error);
    return [{ success: false, error: error.message }];
  }
};

/**
 * IMPORT data FROM Supabase TO local database
 */
export const importFromSupabase = async (onProgress) => {
  if (!ipcRenderer) {
    return { success: false, error: 'Electron IPC not available' };
  }

  if (!supabaseClient) {
    return { success: false, error: 'Supabase not initialized' };
  }

  const startTime = Date.now();
  const results = {};

  try {
    console.log('📥 Starting import from Supabase...');
    
    if (onProgress) onProgress({ stage: 'connecting', progress: 0 });

    // Test connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return connectionTest;
    }

    if (onProgress) onProgress({ stage: 'breakers', progress: 10 });

    // Import Breakers
    console.log('📥 Importing breakers...');
    const { data: breakersData, error: breakersError } = await supabaseClient
      .from(TABLES.BREAKERS)
      .select('*');
    
    if (!breakersError && breakersData && breakersData.length > 0) {
      for (const breaker of breakersData) {
        await ipcRenderer.invoke('db-run', 
          `INSERT OR REPLACE INTO breakers (id, name, zone, subzone, location, special_use, state, lock_key, general_breaker, date, last_updated) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [breaker.id, breaker.name, breaker.zone, breaker.subzone, breaker.location, 
           breaker.special_use, breaker.state, breaker.lock_key, breaker.general_breaker, 
           breaker.date, breaker.last_updated]
        );
      }
      results.breakers = { success: true, imported: breakersData.length };
      console.log(`✅ Imported ${breakersData.length} breakers`);
    } else {
      results.breakers = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'locks', progress: 30 });

    // Import Locks
    console.log('📥 Importing locks...');
    const { data: locksData, error: locksError } = await supabaseClient
      .from(TABLES.LOCKS)
      .select('*');
    
    if (!locksError && locksData && locksData.length > 0) {
      for (const lock of locksData) {
        await ipcRenderer.invoke('db-run',
          `INSERT OR REPLACE INTO locks (id, key_number, zone, used, assigned_to, remarks) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [lock.id, lock.key_number, lock.zone, lock.used, lock.assigned_to, lock.remarks]
        );
      }
      results.locks = { success: true, imported: locksData.length };
      console.log(`✅ Imported ${locksData.length} locks`);
    } else {
      results.locks = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'personnel', progress: 50 });

    // Import Personnel
    console.log('📥 Importing personnel...');
    const { data: personnelData, error: personnelError } = await supabaseClient
      .from(TABLES.PERSONNEL)
      .select('*');
    
    if (!personnelError && personnelData && personnelData.length > 0) {
      for (const person of personnelData) {
        await ipcRenderer.invoke('db-run',
          `INSERT OR REPLACE INTO personnel (id, name, lastname, id_card, company, habilitation, pdf_path, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [person.id, person.name, person.lastname, person.id_card, person.company, 
           person.habilitation, person.pdf_path, person.created_at]
        );
      }
      results.personnel = { success: true, imported: personnelData.length };
      console.log(`✅ Imported ${personnelData.length} personnel`);
    } else {
      results.personnel = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'plans', progress: 70 });

    // Import Plans
    console.log('📥 Importing plans...');
    const { data: plansData, error: plansError } = await supabaseClient
      .from(TABLES.PLANS)
      .select('*');
    
    if (!plansError && plansData && plansData.length > 0) {
      for (const plan of plansData) {
        await ipcRenderer.invoke('db-run',
          `INSERT OR REPLACE INTO plans (id, filename, file_path, version, uploaded_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [plan.id, plan.filename, plan.file_path, plan.version, plan.uploaded_at]
        );
      }
      results.plans = { success: true, imported: plansData.length };
      console.log(`✅ Imported ${plansData.length} plans`);
    } else {
      results.plans = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'history', progress: 90 });

    // Import History
    console.log('📥 Importing history...');
    const { data: historyData, error: historyError } = await supabaseClient
      .from(TABLES.HISTORY)
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000); // Limit to recent 1000 entries
    
    if (!historyError && historyData && historyData.length > 0) {
      for (const entry of historyData) {
        await ipcRenderer.invoke('db-run',
          `INSERT OR REPLACE INTO history (id, breaker_id, action, user_mode, details, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [entry.id, entry.breaker_id, entry.action, entry.user_mode, entry.details, entry.timestamp]
        );
      }
      results.history = { success: true, imported: historyData.length };
      console.log(`✅ Imported ${historyData.length} history entries`);
    } else {
      results.history = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'profile', progress: 92 });

    // Import Profile Settings
    console.log('📥 Importing profile settings...');
    const { data: profileData, error: profileError } = await supabaseClient
      .from(TABLES.PROFILE_SETTINGS)
      .select('*')
      .limit(1);
    
    if (!profileError && profileData && profileData.length > 0) {
      const profile = profileData[0];
      await ipcRenderer.invoke('db-run',
        `INSERT OR REPLACE INTO profile_settings (id, name, title, bio, email, linkedin, profilePicture, cvFiles, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [profile.id || 1, profile.name, profile.title, profile.bio, profile.email, 
         profile.linkedin, profile.profilePicture, profile.cvFiles, profile.updated_at]
      );
      results.profile_settings = { success: true, imported: 1 };
      console.log(`✅ Imported profile settings`);
    } else {
      results.profile_settings = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'app_settings', progress: 96 });

    // Import App Settings
    console.log('📥 Importing app settings...');
    const { data: appSettingsData, error: appSettingsError } = await supabaseClient
      .from(TABLES.APP_SETTINGS)
      .select('*')
      .limit(1);
    
    if (!appSettingsError && appSettingsData && appSettingsData.length > 0) {
      const settings = appSettingsData[0];
      await ipcRenderer.invoke('db-run',
        `INSERT OR REPLACE INTO app_settings 
         (id, app_name, app_version, company_name, company_logo, about_title, about_text, about_image, support_email, support_phone, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [settings.id || 1, settings.app_name, settings.app_version, settings.company_name, 
         settings.company_logo, settings.about_title, settings.about_text, settings.about_image,
         settings.support_email, settings.support_phone, settings.updated_at]
      );
      results.app_settings = { success: true, imported: 1 };
      console.log(`✅ Imported app settings`);
    } else {
      results.app_settings = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'sync_queue', progress: 98 });

    // Import Sync Queue (optional - for offline sync tracking)
    console.log('📥 Importing sync queue...');
    const { data: syncQueueData, error: syncQueueError } = await supabaseClient
      .from(TABLES.SYNC_QUEUE)
      .select('*')
      .eq('synced', 0)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!syncQueueError && syncQueueData && syncQueueData.length > 0) {
      for (const item of syncQueueData) {
        await ipcRenderer.invoke('db-run',
          `INSERT OR REPLACE INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.table_name, item.operation, item.record_id, item.data, item.created_at, item.synced]
        );
      }
      results.sync_queue = { success: true, imported: syncQueueData.length };
      console.log(`✅ Imported ${syncQueueData.length} sync queue items`);
    } else {
      results.sync_queue = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'lock_inventory', progress: 99 });

    // Import Lock Inventory
    console.log('📥 Importing lock inventory...');
    const { data: lockInventoryData, error: lockInventoryError } = await supabaseClient
      .from(TABLES.LOCK_INVENTORY)
      .select('*')
      .limit(1);
    
    if (!lockInventoryError && lockInventoryData && lockInventoryData.length > 0) {
      const inventory = lockInventoryData[0];
      await ipcRenderer.invoke('db-run',
        `INSERT OR REPLACE INTO lock_inventory (id, total_capacity, updated_at) 
         VALUES (?, ?, ?)`,
        [inventory.id || 1, inventory.total_capacity || 0, inventory.updated_at]
      );
      results.lock_inventory = { success: true, imported: 1 };
      console.log(`✅ Imported lock inventory`);
    } else {
      results.lock_inventory = { success: true, imported: 0 };
    }

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Import completed in ${duration}s`);

    return {
      success: true,
      duration,
      results,
      message: `Successfully imported from Supabase in ${duration}s`
    };
  } catch (error) {
    console.error('❌ Import failed:', error);
    return { success: false, error: error.message, results };
  }
};

/**
 * COMPLETE SYNC - Everything (Upload TO Supabase)
 */
export const syncEverything = async (onProgress) => {
  if (syncInProgress) {
    return { success: false, error: 'Sync already in progress' };
  }

  syncInProgress = true;
  const startTime = Date.now();

  try {
    console.log('🚀 Starting complete sync to Supabase...');
    
    if (onProgress) onProgress({ stage: 'connecting', progress: 0 });

    // Test connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      syncInProgress = false;
      return connectionTest;
    }

    if (onProgress) onProgress({ stage: 'database', progress: 10 });

    // Sync all database tables
    console.log('📊 Syncing database tables...');
    const dbResults = await syncAllDatabaseTables();
    
    if (onProgress) onProgress({ stage: 'files', progress: 50 });

    // Sync all files
    console.log('📁 Syncing files...');
    const fileResults = await syncAllFiles();

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Complete sync finished in ${duration}s`);

    syncInProgress = false;

    return {
      success: true,
      duration,
      database: dbResults,
      files: fileResults,
      message: `Successfully synced to Supabase in ${duration}s`
    };
  } catch (error) {
    syncInProgress = false;
    console.error('❌ Complete sync failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper: Generate Breakers Excel Template
 */
function generateBreakersTemplate() {
  const data = [
    ['Date', 'Breaker Name', 'Zone', 'Subzone', 'Location', 'Specifique Area', 'State', 'Key Number', 'General Breaker'],
    ['01/01/2025', 'BR-001', 'Zone 1', 'R01', 'TGBT', '', 'Off', '', 'GB-01']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Breakers');
  
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * Helper: Generate Locks Excel Template
 */
function generateLocksTemplate() {
  const data = [
    ['Key Number', 'Zone', 'Remarks'],
    ['KEY-001', 'Zone 1', 'Sample lock']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Locks');
  
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

/**
 * Helper: Generate Personnel Excel Template
 */
function generatePersonnelTemplate() {
  const data = [
    ['Name', 'Last Name', 'ID Card', 'Company', 'Habilitation'],
    ['John', 'Doe', 'ABC123', 'Company A', 'H2V']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
  
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export default {
  initializeSupabase,
  testConnection,
  syncEverything,
  importFromSupabase,
  syncAllDatabaseTables,
  syncAllFiles,
  BUCKETS,
  TABLES
};
