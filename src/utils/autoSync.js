/**
 * AUTO-SYNC MANAGER
 * Automatically syncs changes to Supabase when data is modified
 */

import { syncEverything } from './supabaseSync';

let autoSyncEnabled = false;
let syncTimeout = null;
let isSyncing = false;
let pendingSync = false;
let lastSyncTime = null;

const SYNC_DEBOUNCE_MS = 3000; // Wait 3 seconds after last change before syncing

/**
 * Initialize auto-sync from config or localStorage
 * Defaults to TRUE if not set
 */
export const initAutoSync = (config = null) => {
  // Priority: config.AUTO_SYNC_ENABLED > localStorage > default true
  if (config && config.AUTO_SYNC_ENABLED !== undefined) {
    autoSyncEnabled = config.AUTO_SYNC_ENABLED;
  } else {
    const saved = localStorage.getItem('auto_sync_enabled');
    autoSyncEnabled = saved === null ? true : saved === 'true'; // Default to true
  }
  console.log(`🔄 Auto-sync initialized: ${autoSyncEnabled ? 'ENABLED' : 'DISABLED'}`);
  return autoSyncEnabled;
};

/**
 * Enable or disable auto-sync
 */
export const setAutoSync = (enabled) => {
  autoSyncEnabled = enabled;
  localStorage.setItem('auto_sync_enabled', enabled.toString());
  console.log(`🔄 Auto-sync ${enabled ? 'ENABLED' : 'DISABLED'}`);
  
  if (!enabled && syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  
  return enabled;
};

/**
 * Check if auto-sync is enabled
 */
export const isAutoSyncEnabled = () => autoSyncEnabled;

/**
 * Check if currently syncing
 */
export const isCurrentlySyncing = () => isSyncing;

/**
 * Get last sync time
 */
export const getLastSyncTime = () => lastSyncTime;

/**
 * Trigger auto-sync (with debounce)
 * This is called whenever data changes in the app
 */
export const triggerAutoSync = (changeType, details = {}) => {
  if (!autoSyncEnabled) {
    console.log('⏸️  Auto-sync disabled, skipping...');
    return;
  }

  console.log(`📝 Change detected: ${changeType}`, details);

  // Clear existing timeout
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    console.log('⏱️  Debouncing sync...');
  }

  // Set pending flag
  pendingSync = true;

  // Set new timeout
  syncTimeout = setTimeout(async () => {
    if (isSyncing) {
      console.log('⏸️  Already syncing, will retry after...');
      // Set flag to sync again after current sync completes
      return;
    }

    await performAutoSync();
  }, SYNC_DEBOUNCE_MS);
};

/**
 * Perform the actual sync
 */
const performAutoSync = async () => {
  if (isSyncing) {
    console.log('⏸️  Sync already in progress');
    return;
  }

  isSyncing = true;
  pendingSync = false;
  console.log('🚀 Starting auto-sync...');

  try {
    const result = await syncEverything((progress) => {
      // Optional: You can emit progress events here
      console.log(`📤 Sync progress: ${progress.stage} (${progress.progress}%)`);
    });

    if (result.success) {
      lastSyncTime = new Date();
      console.log(`✅ Auto-sync completed in ${result.duration}s`);
      
      // Store last sync time
      localStorage.setItem('last_auto_sync', lastSyncTime.toISOString());
      
      // Emit success event
      window.dispatchEvent(new CustomEvent('autoSyncComplete', { 
        detail: { success: true, duration: result.duration } 
      }));
    } else {
      console.error('❌ Auto-sync failed:', result.error);
      
      // Emit error event
      window.dispatchEvent(new CustomEvent('autoSyncComplete', { 
        detail: { success: false, error: result.error } 
      }));
    }
  } catch (error) {
    console.error('❌ Auto-sync exception:', error);
    
    window.dispatchEvent(new CustomEvent('autoSyncComplete', { 
      detail: { success: false, error: error.message } 
    }));
  } finally {
    isSyncing = false;
    
    // If another change happened during sync, trigger another sync
    if (pendingSync) {
      console.log('🔄 Pending changes detected, scheduling another sync...');
      setTimeout(() => performAutoSync(), 1000);
    }
  }
};

/**
 * Force immediate sync (bypass debounce)
 */
export const forceSync = async () => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  
  await performAutoSync();
};

/**
 * Hook for database operations
 * Call this after any database write operation
 */
export const notifyDataChange = (table, operation, recordId = null) => {
  triggerAutoSync(`${operation} ${table}`, { table, operation, recordId });
};

export default {
  initAutoSync,
  setAutoSync,
  isAutoSyncEnabled,
  isCurrentlySyncing,
  getLastSyncTime,
  triggerAutoSync,
  forceSync,
  notifyDataChange
};
