/**
 * Unified File Storage Manager
 * Handles both local storage (Electron) and cloud storage (Supabase)
 * Provides seamless offline/online file management with sync capability
 */

import { uploadFileToStorage, downloadFileFromStorage, getSupabase } from './supabase';

const ipcRenderer = window.ipcRenderer || null;
const isElectron = !!ipcRenderer;

/**
 * File Storage Strategy:
 * - OFFLINE (Electron): Files saved to AppData folder with local paths
 * - ONLINE (Supabase): Files uploaded to Supabase Storage with public URLs
 * - HYBRID: Both - local copy for offline access + cloud URL for sync
 */

class FileStorageManager {
  constructor() {
    this.supabaseClient = null;
    this.isOnline = false;
    this.storageBuckets = {
      personnel: 'personnel-pdfs',
      plans: 'electrical-plans',
      profile: 'profile-pictures',
      cv: 'cv-files'
    };
  }

  /**
   * Initialize with Supabase client
   */
  initialize(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.isOnline = !!supabaseClient;
    console.log(`[FileStorage] Initialized - Mode: ${this.isOnline ? 'HYBRID (Local + Cloud)' : 'LOCAL ONLY'}`);
  }

  /**
   * Save a file - handles both local and cloud storage
   * @param {string} fileName - Name of file
   * @param {string} fileData - Base64 file data
   * @param {string} type - File type (personnel, plans, profile, cv)
   * @param {object} metadata - Additional metadata
   * @returns {object} { localPath, cloudUrl, success }
   */
  async saveFile(fileName, fileData, type = 'personnel', metadata = {}) {
    console.log(`[FileStorage] Saving file: ${fileName} (Type: ${type})`);
    
    const result = {
      success: false,
      localPath: null,
      cloudUrl: null,
      error: null
    };

    try {
      // STEP 1: Always save locally first (for offline access)
      if (isElectron && ipcRenderer) {
        const localResult = await ipcRenderer.invoke('save-file', {
          fileName: fileName,
          fileData: fileData,
          type: type
        });

        if (localResult.success) {
          result.localPath = localResult.filePath;
          result.success = true;
          console.log(`[FileStorage] ✅ Local save successful: ${result.localPath}`);
        } else {
          console.error(`[FileStorage] ❌ Local save failed:`, localResult.error);
          result.error = localResult.error;
          return result;
        }
      }

      // STEP 2: If online, also upload to Supabase Storage
      if (this.isOnline && this.supabaseClient) {
        const bucket = this.storageBuckets[type] || 'general-files';
        const cloudPath = `${new Date().getFullYear()}/${Date.now()}_${fileName}`;

        console.log(`[FileStorage] Uploading to cloud: ${bucket}/${cloudPath}`);

        const cloudResult = await uploadFileToStorage(bucket, cloudPath, fileData);

        if (cloudResult.success) {
          // Get public URL for the file
          const { data: urlData } = this.supabaseClient.storage
            .from(bucket)
            .getPublicUrl(cloudPath);
          
          result.cloudUrl = urlData.publicUrl;
          console.log(`[FileStorage] ✅ Cloud upload successful: ${result.cloudUrl}`);
        } else {
          console.warn(`[FileStorage] ⚠️  Cloud upload failed (offline?):`, cloudResult.error);
          // Not a critical error - we have local copy
        }
      }

      // STEP 3: Return both paths
      console.log(`[FileStorage] ✅ File saved successfully`);
      console.log(`[FileStorage] Local: ${result.localPath || 'N/A'}`);
      console.log(`[FileStorage] Cloud: ${result.cloudUrl || 'N/A (offline)'}`);

      return result;

    } catch (error) {
      console.error(`[FileStorage] ❌ Save error:`, error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Read a file - tries cloud first if online, then local
   * @param {string} localPath - Local file path
   * @param {string} cloudUrl - Cloud URL (optional)
   * @returns {object} { success, data, source }
   */
  async readFile(localPath, cloudUrl = null) {
    console.log(`[FileStorage] Reading file - Local: ${localPath}, Cloud: ${cloudUrl || 'N/A'}`);

    try {
      // STRATEGY 1: If we have cloud URL and we're online, try cloud first (always up-to-date)
      if (cloudUrl && this.isOnline) {
        console.log(`[FileStorage] Attempting cloud download...`);
        try {
          const response = await fetch(cloudUrl);
          if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            console.log(`[FileStorage] ✅ Read from CLOUD successful`);
            return { success: true, data: base64, source: 'cloud' };
          }
        } catch (cloudError) {
          console.warn(`[FileStorage] Cloud read failed, falling back to local:`, cloudError.message);
        }
      }

      // STRATEGY 2: Read from local storage (always available in Electron)
      if (localPath && isElectron && ipcRenderer) {
        console.log(`[FileStorage] Attempting local read...`);
        const localResult = await ipcRenderer.invoke('read-file', localPath);
        
        if (localResult.success) {
          console.log(`[FileStorage] ✅ Read from LOCAL successful`);
          return { success: true, data: localResult.data, source: 'local' };
        }
      }

      // STRATEGY 3: If it's a data URL (browser mode)
      if (localPath && localPath.startsWith('data:')) {
        console.log(`[FileStorage] ✅ Read from DATA URL (browser mode)`);
        return { success: true, data: localPath, source: 'dataurl' };
      }

      throw new Error('No valid file source available');

    } catch (error) {
      console.error(`[FileStorage] ❌ Read error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync a local file to cloud (manual sync trigger)
   * @param {string} localPath - Local file path
   * @param {string} fileName - File name
   * @param {string} type - File type
   * @returns {object} { success, cloudUrl }
   */
  async syncFileToCloud(localPath, fileName, type) {
    if (!this.isOnline) {
      return { success: false, error: 'Offline - cannot sync to cloud' };
    }

    if (!localPath || !isElectron) {
      return { success: false, error: 'No local file to sync' };
    }

    console.log(`[FileStorage] Syncing file to cloud: ${fileName}`);

    try {
      // Read local file
      const readResult = await ipcRenderer.invoke('read-file', localPath);
      if (!readResult.success) {
        return { success: false, error: 'Failed to read local file' };
      }

      // Upload to cloud
      const bucket = this.storageBuckets[type] || 'general-files';
      const cloudPath = `${new Date().getFullYear()}/${Date.now()}_${fileName}`;

      const uploadResult = await uploadFileToStorage(bucket, cloudPath, readResult.data);
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Get public URL
      const { data: urlData } = this.supabaseClient.storage
        .from(bucket)
        .getPublicUrl(cloudPath);

      console.log(`[FileStorage] ✅ File synced to cloud: ${urlData.publicUrl}`);

      return { success: true, cloudUrl: urlData.publicUrl };

    } catch (error) {
      console.error(`[FileStorage] ❌ Sync error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync a cloud file to local (download for offline access)
   * @param {string} cloudUrl - Cloud URL
   * @param {string} fileName - File name
   * @param {string} type - File type
   * @returns {object} { success, localPath }
   */
  async syncFileToLocal(cloudUrl, fileName, type) {
    if (!isElectron) {
      return { success: false, error: 'Not in Electron - cannot save locally' };
    }

    console.log(`[FileStorage] Syncing file to local: ${fileName}`);

    try {
      // Download from cloud
      const response = await fetch(cloudUrl);
      if (!response.ok) {
        return { success: false, error: 'Failed to download from cloud' };
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Save locally
      const saveResult = await ipcRenderer.invoke('save-file', {
        fileName: fileName,
        fileData: `data:application/octet-stream;base64,${base64}`,
        type: type
      });

      if (saveResult.success) {
        console.log(`[FileStorage] ✅ File synced to local: ${saveResult.filePath}`);
        return { success: true, localPath: saveResult.filePath };
      }

      return { success: false, error: 'Failed to save locally' };

    } catch (error) {
      console.error(`[FileStorage] ❌ Sync error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage mode info
   */
  getStorageInfo() {
    return {
      isElectron,
      isOnline: this.isOnline,
      mode: !isElectron ? 'BROWSER' : (this.isOnline ? 'HYBRID' : 'LOCAL_ONLY'),
      localStorageAvailable: isElectron,
      cloudStorageAvailable: this.isOnline,
      buckets: this.storageBuckets
    };
  }
}

// Singleton instance
const fileStorageManager = new FileStorageManager();

export default fileStorageManager;
