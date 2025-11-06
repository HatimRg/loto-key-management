/**
 * LOCAL DATABASE ONLY - Supabase Disabled
 * 
 * This file provides stub functions for backward compatibility.
 * All cloud sync functionality has been removed.
 * The app now works 100% offline with local SQLite database only.
 */

// Stub supabase object
export const supabase = null;

// Stub connection test - always returns disabled
export const testConnection = async () => {
  return { 
    success: false, 
    message: 'Cloud sync disabled - Local database only' 
  };
};

// Stub file upload - returns error
export const uploadFile = async (bucket, path, file) => {
  return { 
    success: false, 
    error: 'Cloud storage disabled - Use local file storage' 
  };
};

// Stub file download - returns error
export const downloadFile = async (bucket, path) => {
  return { 
    success: false, 
    error: 'Cloud storage disabled - Files stored locally only' 
  };
};

// Stub public URL - returns local path
export const getPublicUrl = (bucket, path) => {
  return `/local-files/${path}`;
};

export default supabase;
