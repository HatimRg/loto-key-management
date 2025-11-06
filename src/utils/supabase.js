import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export const initSupabase = (config) => {
  if (!config?.SUPABASE_URL || !config?.SUPABASE_KEY) {
    console.log('Supabase not configured - working offline only');
    return null;
  }

  try {
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    console.log('Supabase initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return null;
  }
};

export const getSupabase = () => supabaseClient;

export const syncToSupabase = async (table, data, operation = 'upsert') => {
  if (!supabaseClient) {
    console.log('Supabase not initialized - skipping sync');
    return { success: false, error: 'Not configured' };
  }

  try {
    let result;
    
    switch (operation) {
      case 'insert':
        result = await supabaseClient.from(table).insert(data);
        break;
      case 'update':
        result = await supabaseClient.from(table).update(data).eq('id', data.id);
        break;
      case 'upsert':
        result = await supabaseClient.from(table).upsert(data);
        break;
      case 'delete':
        result = await supabaseClient.from(table).delete().eq('id', data.id);
        break;
      default:
        return { success: false, error: 'Invalid operation' };
    }

    if (result.error) {
      console.error('Supabase sync error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Supabase sync exception:', error);
    return { success: false, error: error.message };
  }
};

export const syncAllTables = async (db) => {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured' };
  }

  const results = {
    breakers: { success: false },
    locks: { success: false },
    personnel: { success: false },
    plans: { success: false },
    history: { success: false }
  };

  try {
    // Sync breakers
    const breakersResult = await db.query('SELECT * FROM breakers');
    if (breakersResult.success && breakersResult.data.length > 0) {
      results.breakers = await syncToSupabase('breakers', breakersResult.data, 'upsert');
    }

    // Sync locks
    const locksResult = await db.query('SELECT * FROM locks');
    if (locksResult.success && locksResult.data.length > 0) {
      results.locks = await syncToSupabase('locks', locksResult.data, 'upsert');
    }

    // Sync personnel
    const personnelResult = await db.query('SELECT * FROM personnel');
    if (personnelResult.success && personnelResult.data.length > 0) {
      results.personnel = await syncToSupabase('personnel', personnelResult.data, 'upsert');
    }

    // Sync plans
    const plansResult = await db.query('SELECT * FROM plans');
    if (plansResult.success && plansResult.data.length > 0) {
      results.plans = await syncToSupabase('plans', plansResult.data, 'upsert');
    }

    // Sync history
    const historyResult = await db.query('SELECT * FROM history');
    if (historyResult.success && historyResult.data.length > 0) {
      results.history = await syncToSupabase('history', historyResult.data, 'upsert');
    }

    return { success: true, results };
  } catch (error) {
    console.error('Full sync error:', error);
    return { success: false, error: error.message };
  }
};

export const uploadFileToStorage = async (bucket, filePath, fileData) => {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, Buffer.from(fileData, 'base64'), {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Storage upload exception:', error);
    return { success: false, error: error.message };
  }
};

export const downloadFileFromStorage = async (bucket, filePath) => {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Storage download error:', error);
      return { success: false, error: error.message };
    }

    // Convert blob to base64
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve({ success: true, data: base64 });
      };
      reader.readAsDataURL(data);
    });
  } catch (error) {
    console.error('Storage download exception:', error);
    return { success: false, error: error.message };
  }
};

export const testConnection = async () => {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabaseClient.from('breakers').select('count');
    
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Connected to Supabase' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  initSupabase,
  getSupabase,
  syncToSupabase,
  syncAllTables,
  uploadFileToStorage,
  downloadFileFromStorage,
  testConnection
};
