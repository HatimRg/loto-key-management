/**
 * File Sync Manager - Upload/Download files to/from Supabase Storage
 * Integrates with hybridDatabase for cloud-first file management
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrjkgvglorotucerfspt.supabase.co';
// ✅ UPDATED: Using same key as hybridDatabase.js (Nov 2025)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok';

// ⚠️ IMPORTANT: If uploads fail with "signature verification failed":
// Option 1: Disable RLS on storage.objects table in Supabase
// Option 2: Create permissive policies for each bucket
// Option 3: Use service role key instead (see Settings → API → service_role key)
// Replace SUPABASE_ANON_KEY with service role key if RLS is enabled

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { ipcRenderer } = window;

// Storage bucket mapping
const BUCKETS = {
  personnel: 'personnel-certificates',  // Personnel PDFs/certificates
  plans: 'electrical-plans',            // Electrical plan PDFs
  profile: 'profile-pictures',          // Profile pictures
  cv: 'cv-files',                       // CV/Resume files
  logs: 'app-logs',                     // Activity logs
  templates: 'excel-templates',         // Excel templates
  assets: 'company-assets',             // Company logo, about images
  pdfs: 'loto_pdfs'                     // General LOTO PDFs
};

/**
 * Convert base64 to Blob
 */
function base64ToBlob(base64, mimeType = 'application/pdf') {
  const base64Data = base64.split(',')[1] || base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Upload file to Supabase Storage
 * @param {string} bucketName - Bucket name (personnel, plans, profile, cv, etc.)
 * @param {string} fileName - File name
 * @param {string} fileData - Base64 file data or Blob
 * @param {object} metadata - Optional metadata
 * @returns {object} { success, url, path, error }
 */
export async function uploadFileToSupabase(bucketName, fileName, fileData, metadata = {}) {
  try {
    console.log(`📤 Uploading file to Supabase: ${bucketName}/${fileName}`);
    console.log('🔑 Supabase client status:', !!supabase);
    console.log('🗂️ Bucket name:', bucketName);

    // Get the correct bucket
    const bucket = BUCKETS[bucketName] || bucketName;
    console.log('🎯 Target bucket:', bucket);
    
    // Convert base64 to blob if needed
    let fileBlob = fileData;
    if (typeof fileData === 'string' && fileData.includes('base64')) {
      const mimeType = fileData.match(/data:([^;]+);/)?.[1] || 'application/octet-stream';
      fileBlob = base64ToBlob(fileData, mimeType);
      console.log('📦 Converted to blob, type:', mimeType, 'size:', fileBlob.size);
    } else if (fileData instanceof Blob) {
      console.log('📦 Already a blob, size:', fileData.size);
    } else {
      console.warn('⚠️ Unknown file data type:', typeof fileData);
    }
    
    // Create unique path: YYYY/MM/timestamp_filename
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const filePath = `${year}/${month}/${timestamp}_${fileName}`;
    console.log('📂 Upload path:', filePath);
    
    // Upload to Supabase Storage
    console.log('⬆️ Starting upload to Supabase...');
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: metadata.contentType || 'application/pdf'
      });
    
    if (error) {
      console.error(`❌ Supabase upload failed:`, error);
      console.error('📋 Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: `Upload failed: ${error.message || 'Unknown error'}` };
    }
    
    console.log('📦 Upload response:', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);
    
    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      bucket: bucket
    };
    
  } catch (error) {
    console.error(`❌ Upload exception:`, error);
    console.error('📋 Exception details:', error.stack);
    return { success: false, error: `Failed to fetch: ${error.message || 'Network error'}` };
  }
}

/**
 * Download file from Supabase Storage
 * @param {string} bucketName - Bucket name
 * @param {string} filePath - File path in bucket
 * @returns {object} { success, data, error }
 */
export async function downloadFileFromSupabase(bucketName, filePath) {
  try {
    console.log(`📥 Downloading file from Supabase: ${bucketName}/${filePath}`);
    
    const bucket = BUCKETS[bucketName] || bucketName;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    
    if (error) {
      console.error(`❌ Supabase download failed:`, error);
      return { success: false, error: error.message };
    }
    
    // Convert blob to base64
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        console.log(`✅ File downloaded successfully`);
        resolve({
          success: true,
          data: reader.result,
          blob: data
        });
      };
      reader.onerror = (error) => {
        resolve({ success: false, error: error.message });
      };
      reader.readAsDataURL(data);
    });
    
  } catch (error) {
    console.error(`❌ Download error:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public URL for a file
 * @param {string} bucketName - Bucket name
 * @param {string} filePath - File path in bucket
 * @returns {string} Public URL
 */
export function getPublicUrl(bucketName, filePath) {
  const bucket = BUCKETS[bucketName] || bucketName;
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucketName - Bucket name
 * @param {string} filePath - File path in bucket
 * @returns {object} { success, error }
 */
export async function deleteFileFromSupabase(bucketName, filePath) {
  try {
    console.log(`🗑️ Deleting file from Supabase: ${bucketName}/${filePath}`);
    
    const bucket = BUCKETS[bucketName] || bucketName;
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error(`❌ Supabase delete failed:`, error);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ File deleted successfully`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Delete error:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Save file to Supabase Storage ONLY (cloud-first approach)
 * @param {string} fileName - File name
 * @param {string} fileData - Base64 file data
 * @param {string} bucketType - Bucket type (personnel, plans, profile, cv, etc.)
 * @returns {object} { success, cloudUrl, cloudPath, error }
 */
export async function saveFileDualWrite(fileName, fileData, bucketType) {
  console.log(`☁️  Uploading file to Supabase Storage: ${fileName} to ${bucketType}`);
  
  // Upload to Supabase Storage ONLY
  const uploadResult = await uploadFileToSupabase(bucketType, fileName, fileData);
  
  if (uploadResult.success) {
    console.log('✅ Cloud upload SUCCESS:', uploadResult.url);
    return {
      success: true,
      cloudUrl: uploadResult.url,
      cloudPath: uploadResult.path,
      localPath: uploadResult.url, // Return cloud URL as "path" for compatibility
      error: null
    };
  } else {
    console.error('❌ Cloud upload FAILED:', uploadResult.error);
    return {
      success: false,
      cloudUrl: null,
      cloudPath: null,
      localPath: null,
      error: uploadResult.error
    };
  }
}

/**
 * Load file with cloud-first fallback to local
 * @param {string} cloudUrl - Cloud URL (if available)
 * @param {string} localPath - Local file path (fallback)
 * @param {string} bucketType - Bucket type
 * @returns {object} { success, data, source, error }
 */
export async function loadFileDualSource(cloudUrl, localPath, bucketType = 'pdfs') {
  try {
    // Try cloud first if URL available
    if (cloudUrl) {
      console.log(`☁️ Loading file from cloud: ${cloudUrl}`);
      try {
        const response = await fetch(cloudUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onloadend = () => {
              console.log(`✅ File loaded from cloud`);
              resolve({
                success: true,
                data: reader.result,
                source: 'cloud'
              });
            };
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn(`⚠️ Cloud load failed, trying local:`, error);
      }
    }
    
    // Fallback to local
    if (localPath && ipcRenderer) {
      console.log(`💾 Loading file from local: ${localPath}`);
      const localResult = await ipcRenderer.invoke('read-file', localPath);
      if (localResult.success) {
        console.log(`✅ File loaded from local`);
        return {
          success: true,
          data: localResult.data,
          source: 'local'
        };
      }
    }
    
    return { success: false, error: 'File not found in cloud or local' };
    
  } catch (error) {
    console.error(`❌ Load file error:`, error);
    return { success: false, error: error.message };
  }
}

export default {
  uploadFileToSupabase,
  downloadFileFromSupabase,
  getPublicUrl,
  deleteFileFromSupabase,
  saveFileDualWrite,
  loadFileDualSource,
  BUCKETS
};
