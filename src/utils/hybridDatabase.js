/**
 * HYBRID DATABASE MANAGER
 * Cloud-first with offline fallback
 * 
 * Strategy:
 * 1. Try to fetch from Supabase (if online)
 * 2. Cache results locally
 * 3. If offline, use local cache
 * 4. Show offline indicator when using cache
 */

import { createClient } from '@supabase/supabase-js';

const { ipcRenderer } = window;
let supabaseClient = null;
let isOnline = navigator.onLine;
let offlineMode = false;
let lastConnectionCheck = null;

// Debounce map to prevent duplicate history entries
const historyDebounce = new Map();

// Update online status
window.addEventListener('online', () => {
  isOnline = true;
  offlineMode = false;
  console.log('🟢 Back online - using cloud data');
  // Dispatch event for UI to update
  window.dispatchEvent(new CustomEvent('connectionStatusChange', { detail: { online: true } }));
});

window.addEventListener('offline', () => {
  isOnline = false;
  offlineMode = true;
  console.log('🔴 Offline - using cached data');
  window.dispatchEvent(new CustomEvent('connectionStatusChange', { detail: { online: false } }));
});

/**
 * Initialize Supabase from config
 */
export const initHybridDB = async () => {
  try {
    console.log('🔧 Initializing Hybrid Database...');
    
    // Get config from Electron or localStorage
    let config;
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('get-config');
      config = result.success ? result.data : null;
      console.log('📄 Config loaded from Electron:', config ? 'Found' : 'Not found');
    } else {
      const saved = localStorage.getItem('supabase_config');
      config = saved ? JSON.parse(saved) : null;
      console.log('📄 Config loaded from localStorage:', config ? 'Found' : 'Not found');
    }

    // Use hardcoded defaults if no config
    const url = config?.SUPABASE_URL || 'https://qrjkgvglorotucerfspt.supabase.co';
    const key = config?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok';

    console.log('🔗 Supabase URL:', url);
    console.log('🔑 Supabase Key:', key ? key.substring(0, 20) + '...' : 'MISSING');

    if (url && key) {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      console.log('✅ Supabase client created');
      
      // Test connection
      const testResult = await testConnection();
      if (testResult) {
        console.log('✅ Hybrid DB fully initialized and connected to Supabase');
        offlineMode = false;
      } else {
        console.warn('⚠️ Hybrid DB initialized but Supabase connection failed - using offline mode');
        offlineMode = true;
      }
    } else {
      console.error('❌ Missing Supabase URL or Key');
      offlineMode = true;
    }

    return { success: true, online: !offlineMode };
  } catch (error) {
    console.error('❌ Failed to initialize hybrid DB:', error);
    offlineMode = true;
    return { success: false, error: error.message };
  }
};

/**
 * Test Supabase connection
 */
const testConnection = async (force = false) => {
  if (!supabaseClient) return false;
  
  const now = Date.now();
  // Only test every 30 seconds to avoid spam (unless forced)
  if (!force && lastConnectionCheck && (now - lastConnectionCheck) < 30000) {
    console.log('⏭️ Connection test skipped (cached):', !offlineMode);
    return !offlineMode;
  }

  try {
    console.log('🔍 Testing Supabase connection...');
    const { error } = await supabaseClient
      .from('breakers')
      .select('count')
      .limit(1);
    
    lastConnectionCheck = now;
    const wasOffline = offlineMode;
    offlineMode = !!error;
    
    if (wasOffline !== offlineMode) {
      console.log(`🔄 Connection status changed: ${wasOffline ? 'offline' : 'online'} → ${offlineMode ? 'offline' : 'online'}`);
    }
    
    return !error;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    lastConnectionCheck = now;
    offlineMode = true;
    return false;
  }
};

/**
 * Get data from Supabase or local cache
 */
const getData = async (table, orderBy = null, limit = null) => {
  // Special logging for history table
  if (table === 'history') {
    console.log('📖 FETCHING HISTORY:', { orderBy, limit });
  }
  
  // Try Supabase first if online
  if (isOnline && supabaseClient && !offlineMode) {
    try {
      let query = supabaseClient.from(table).select('*');
      
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
      }
      
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (!error && data) {
        console.log(`☁️ Loaded ${data.length} records from ${table} (cloud)`);
        
        // Special logging for history
        if (table === 'history') {
          console.log('📝 HISTORY RECORDS:', data.length > 0 ? data.slice(0, 3) : 'EMPTY');
        }
        
        // Cache locally in background
        cacheDataLocally(table, data);
        return { success: true, data, source: 'cloud' };
      } else if (error) {
        console.error(`❌ Supabase error for ${table}:`, error);
        if (table === 'history') {
          console.error('📝 HISTORY FETCH ERROR:', error.message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Supabase error, falling back to cache:`, error);
      if (table === 'history') {
        console.error('📝 HISTORY EXCEPTION:', error.message);
      }
    }
  }

  // Fallback to local database
  if (ipcRenderer) {
    try {
      let sql = `SELECT * FROM ${table}`;
      if (orderBy) {
        sql += ` ORDER BY ${orderBy.column} ${orderBy.ascending === false ? 'DESC' : 'ASC'}`;
      }
      if (limit) {
        sql += ` LIMIT ${limit}`;
      }

      const result = await ipcRenderer.invoke('db-query', sql, []);
      if (result.success) {
        console.log(`💾 Loaded ${result.data.length} records from ${table} (local cache)`);
        return { success: true, data: result.data, source: 'cache' };
      }
    } catch (error) {
      console.error(`❌ Local DB error:`, error);
    }
  }

  return { success: false, data: [], source: 'none' };
};

/**
 * Cache data locally (background operation)
 */
const cacheDataLocally = async (table, data) => {
  if (!ipcRenderer || !data || data.length === 0) return;

  try {
    // Use INSERT OR REPLACE to update cache
    for (const row of data) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => row[col]);
      
      await ipcRenderer.invoke('db-run',
        `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  } catch (error) {
    console.warn('Cache update failed:', error);
  }
};

/**
 * Write data (CLOUD-FIRST: Supabase → Local)
 * - If ONLINE: Write to Supabase first, then sync to local cache
 * - If OFFLINE: Write to local cache, queue for later sync
 */
const writeData = async (table, operation, data) => {
  console.log(`💾 WRITE STARTED: ${operation} to ${table}`, data);
  
  // Special logging for history table
  if (table === 'history') {
    console.log('📝 HISTORY INSERT DETAILS:', {
      action: data.action,
      user_mode: data.user_mode,
      details: data.details,
      timestamp: data.timestamp,
      breaker_id: data.breaker_id
    });
  }
  
  let cloudSuccess = false;
  let localSuccess = false;

  // STEP 1: Try cloud first (if online)
  if (isOnline && supabaseClient && !offlineMode) {
    try {
      console.log(`☁️ [CLOUD-FIRST] Writing to Supabase: ${operation} to ${table}`);
      console.log('🔑 Supabase client available:', !!supabaseClient);
      console.log('🌐 Online status:', isOnline);
      console.log('📡 Offline mode:', offlineMode);
      
      let result;
      switch (operation) {
        case 'insert':
          console.log('📤 Inserting data to Supabase:', data);
          result = await supabaseClient.from(table).insert(data).select();
          console.log('📥 Supabase insert result:', result);
          break;
        case 'update':
          console.log(`✏️ Updating ${table} with id=${data.id}`);
          result = await supabaseClient.from(table).update(data).eq('id', data.id).select();
          break;
        case 'upsert':
          result = await supabaseClient.from(table).upsert(data).select();
          break;
        case 'delete':
          console.log(`🗑️ Supabase DELETE: table=${table}, id=${data.id}`);
          result = await supabaseClient.from(table).delete().eq('id', data.id);
          console.log(`📊 Supabase DELETE result:`, {
            error: result.error,
            data: result.data,
            status: result.status,
            statusText: result.statusText
          });
          break;
      }
      
      cloudSuccess = !result.error;
      if (cloudSuccess) {
        console.log(`✅ [CLOUD-FIRST] Supabase write SUCCESS: ${operation} to ${table}`);
        if (result.data) {
          console.log('📦 Returned data:', result.data);
        }
      } else {
        console.error(`❌ [CLOUD-FIRST] Supabase write FAILED: ${operation} to ${table}`, result.error);
        // If cloud write fails while online, return error (don't write locally)
        return { success: false, error: result.error, cloudFailed: true };
      }
    } catch (error) {
      console.error('❌ [CLOUD-FIRST] Supabase write EXCEPTION:', error);
      // If cloud write throws while online, return error
      return { success: false, error: error.message, cloudFailed: true };
    }
  } else {
    console.warn('⚠️ [OFFLINE MODE] Supabase unavailable - will queue for sync');
    console.log('  - isOnline:', isOnline);
    console.log('  - supabaseClient:', !!supabaseClient);
    console.log('  - offlineMode:', offlineMode);
  }

  // STEP 2: Write to local cache (only if cloud succeeded OR we're offline)
  if (ipcRenderer && (cloudSuccess || !isOnline || offlineMode)) {
    try {
      let result;
      let sql;
      let params;
      
      switch (operation) {
        case 'insert':
        case 'upsert':
          // Handle INSERT/UPSERT per table
          if (table === 'breakers') {
            sql = `INSERT OR REPLACE INTO breakers (id, name, zone, subzone, location, special_use, state, lock_key, general_breaker, date, last_updated) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [data.id, data.name, data.zone, data.subzone, data.location, data.special_use, data.state, data.lock_key, data.general_breaker, data.date, data.last_updated || new Date().toISOString()];
          } else if (table === 'locks') {
            sql = `INSERT OR REPLACE INTO locks (id, key_number, zone, used, assigned_to, remarks) VALUES (?, ?, ?, ?, ?, ?)`;
            params = [data.id, data.key_number, data.zone, data.used || 0, data.assigned_to, data.remarks];
          } else if (table === 'personnel') {
            sql = `INSERT OR REPLACE INTO personnel (id, name, lastname, id_card, company, habilitation, pdf_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [data.id, data.name, data.lastname, data.id_card, data.company, data.habilitation, data.pdf_path, data.created_at || new Date().toISOString()];
          } else if (table === 'plans') {
            sql = `INSERT OR REPLACE INTO plans (id, filename, file_path, version, uploaded_at) VALUES (?, ?, ?, ?, ?)`;
            params = [data.id, data.filename, data.file_path, data.version, data.uploaded_at || new Date().toISOString()];
          } else if (table === 'history') {
            sql = `INSERT INTO history (breaker_id, action, user_mode, details, timestamp) VALUES (?, ?, ?, ?, ?)`;
            params = [data.breaker_id, data.action, data.user_mode, data.details, data.timestamp || new Date().toISOString()];
          } else if (table === 'lock_inventory') {
            sql = `INSERT OR REPLACE INTO lock_inventory (id, total_capacity, updated_at) VALUES (?, ?, ?)`;
            params = [data.id || 1, data.total_capacity, data.updated_at || new Date().toISOString()];
          } else if (table === 'profile_settings') {
            sql = `INSERT OR REPLACE INTO profile_settings (id, name, title, bio, email, linkedin, profilePicture, cvFiles, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [data.id || 1, data.name, data.title, data.bio, data.email, data.linkedin, data.profilePicture, JSON.stringify(data.cvFiles || []), data.updated_at || new Date().toISOString()];
          } else if (table === 'app_settings') {
            sql = `INSERT OR REPLACE INTO app_settings (id, app_name, app_version, company_name, company_logo, about_title, about_text, about_image, support_email, support_phone, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [data.id || 1, data.app_name, data.app_version, data.company_name, data.company_logo, data.about_title, data.about_text, data.about_image, data.support_email, data.support_phone, data.updated_at || new Date().toISOString()];
          }
          if (sql) {
            result = await ipcRenderer.invoke('db-run', sql, params);
          }
          break;

        case 'update':
          // Handle UPDATE per table
          if (table === 'breakers') {
            sql = `UPDATE breakers SET name=?, zone=?, subzone=?, location=?, special_use=?, state=?, lock_key=?, general_breaker=?, date=?, last_updated=? WHERE id=?`;
            params = [data.name, data.zone, data.subzone, data.location, data.special_use, data.state, data.lock_key, data.general_breaker, data.date, data.last_updated || new Date().toISOString(), data.id];
          } else if (table === 'locks') {
            sql = `UPDATE locks SET key_number=?, zone=?, used=?, assigned_to=?, remarks=? WHERE id=?`;
            params = [data.key_number, data.zone, data.used || 0, data.assigned_to, data.remarks, data.id];
          } else if (table === 'personnel') {
            sql = `UPDATE personnel SET name=?, lastname=?, id_card=?, company=?, habilitation=?, pdf_path=? WHERE id=?`;
            params = [data.name, data.lastname, data.id_card, data.company, data.habilitation, data.pdf_path, data.id];
          } else if (table === 'lock_inventory') {
            sql = `UPDATE lock_inventory SET total_capacity=?, updated_at=? WHERE id=?`;
            params = [data.total_capacity, data.updated_at || new Date().toISOString(), data.id || 1];
          } else if (table === 'profile_settings') {
            sql = `UPDATE profile_settings SET name=?, title=?, bio=?, email=?, linkedin=?, profilePicture=?, cvFiles=?, updated_at=? WHERE id=?`;
            params = [data.name, data.title, data.bio, data.email, data.linkedin, data.profilePicture, JSON.stringify(data.cvFiles || []), data.updated_at || new Date().toISOString(), data.id || 1];
          } else if (table === 'app_settings') {
            sql = `UPDATE app_settings SET app_name=?, app_version=?, company_name=?, company_logo=?, about_title=?, about_text=?, about_image=?, support_email=?, support_phone=?, updated_at=? WHERE id=?`;
            params = [data.app_name, data.app_version, data.company_name, data.company_logo, data.about_title, data.about_text, data.about_image, data.support_email, data.support_phone, data.updated_at || new Date().toISOString(), data.id || 1];
          }
          if (sql) {
            result = await ipcRenderer.invoke('db-run', sql, params);
          }
          break;

        case 'delete':
          sql = `DELETE FROM ${table} WHERE id = ?`;
          result = await ipcRenderer.invoke('db-run', sql, [data.id]);
          break;
      }
      
      localSuccess = result?.success;
      if (localSuccess) {
        console.log(`💾 ${operation} to ${table} (local cache)`);
      }
    } catch (error) {
      console.error('Local write failed:', error);
    }
  }

  return {
    success: cloudSuccess || localSuccess,
    cloudSuccess,
    localSuccess,
    offlineMode: !cloudSuccess && localSuccess
  };
};

/**
 * Public API - matches existing database.js interface
 */
export default {
  // Status
  isOnline: () => isOnline && !offlineMode,
  isOfflineMode: () => offlineMode,
  verifyConnection: () => testConnection(true), // Force fresh connection test
  
  // Initialize
  init: initHybridDB,
  
  // Getters (cloud-first)
  getBreakers: () => getData('breakers', { column: 'zone' }),
  getLocks: () => getData('locks', { column: 'key_number' }),
  getPersonnel: () => getData('personnel', { column: 'lastname' }),
  getPlans: () => getData('plans', { column: 'uploaded_at', ascending: false }),
  getHistory: (limit = 100) => getData('history', { column: 'timestamp', ascending: false }, limit),
  getProfileSettings: () => getData('profile_settings', null, 1),
  getAppSettings: () => getData('app_settings', null, 1),
  getLockInventory: async () => {
    // Fetch specifically id=1 (not just first record)
    if (isOnline && supabaseClient && !offlineMode) {
      try {
        const { data, error } = await supabaseClient
          .from('lock_inventory')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (!error && data) {
          console.log(`☁️ Loaded lock_inventory (id=1) from cloud:`, data);
          // Cache locally
          cacheDataLocally('lock_inventory', [data]);
          return { success: true, data, source: 'cloud' };
        } else if (error) {
          console.error(`❌ Supabase error fetching lock_inventory:`, error);
        }
      } catch (error) {
        console.warn(`⚠️ Supabase error, falling back to cache:`, error);
      }
    }
    
    // Fallback to local
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('db-query', 'SELECT * FROM lock_inventory WHERE id = 1', []);
      return result.success && result.data.length > 0 
        ? { success: true, data: result.data[0], source: 'local' }
        : { success: true, data: { id: 1, total_capacity: 0, updated_at: new Date().toISOString() }, source: 'default' };
    }
    return { success: true, data: { id: 1, total_capacity: 0, updated_at: new Date().toISOString() }, source: 'default' };
  },
  
  // Query with custom SQL (local only)
  query: async (sql, params = []) => {
    if (ipcRenderer) {
      return await ipcRenderer.invoke('db-query', sql, params);
    }
    return { success: false, error: 'IPC not available' };
  },
  
  // Writers (dual write)
  addBreaker: (data) => writeData('breakers', 'upsert', data),
  updateBreaker: (data) => writeData('breakers', 'update', data),
  deleteBreaker: (id) => writeData('breakers', 'delete', { id }),
  
  addLock: (data) => writeData('locks', 'upsert', data),
  updateLock: (data) => writeData('locks', 'update', data),
  deleteLock: (id) => writeData('locks', 'delete', { id }),
  
  addPersonnel: (data) => writeData('personnel', 'upsert', data),
  updatePersonnel: (data) => writeData('personnel', 'update', data),
  deletePersonnel: (id) => writeData('personnel', 'delete', { id }),
  
  addPlan: (data) => writeData('plans', 'upsert', data),
  deletePlan: (id) => writeData('plans', 'delete', { id }),
  
  addHistory: (data) => {
    // Debounce to prevent duplicate entries (React StrictMode, double clicks, etc.)
    const key = `${data.action}-${data.user_mode}-${data.timestamp || Date.now()}`;
    if (historyDebounce.has(key)) {
      console.log('⚠️ Prevented duplicate history log:', data.action);
      return Promise.resolve({ success: true, deduplicated: true });
    }
    historyDebounce.set(key, true);
    // Clear debounce after 2 seconds
    setTimeout(() => historyDebounce.delete(key), 2000);
    return writeData('history', 'insert', data);
  },
  
  updateLockInventory: (data) => writeData('lock_inventory', 'upsert', data),
  updateProfileSettings: (data) => writeData('profile_settings', 'upsert', data),
  updateAppSettings: (data) => writeData('app_settings', 'upsert', data)
};
