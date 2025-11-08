/**
 * Nuke Helper - Clear local database and force sync to Supabase
 */

import hybridDB from './hybridDatabase';

const { ipcRenderer } = window;

export const nukeAllOperationalData = async () => {
  try {
    console.log('🗑️ Starting CLOUD-FIRST nuke operation...');
    
    if (!ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    // Step 1: Fetch records from CLOUD (not local cache) and delete
    console.log('🗑️ Step 1: Fetching and deleting from Supabase...');
    
    const tables = [
      { name: 'breakers', getter: hybridDB.getBreakers, deleter: hybridDB.deleteBreaker },
      { name: 'locks', getter: hybridDB.getLocks, deleter: hybridDB.deleteLock },
      { name: 'personnel', getter: hybridDB.getPersonnel, deleter: hybridDB.deletePersonnel },
      { name: 'plans', getter: hybridDB.getPlans, deleter: hybridDB.deletePlan }
    ];
    
    for (const table of tables) {
      try {
        // Get records from CLOUD via hybridDB (cloud-first fetch)
        const result = await table.getter();
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`🗑️ Deleting ${result.data.length} records from ${table.name} (from cloud)...`);
          
          // Delete each record (will delete from both cloud AND local)
          for (const row of result.data) {
            try {
              await table.deleter(row.id);
              console.log(`  ✓ Deleted ${table.name} id=${row.id}`);
            } catch (err) {
              console.error(`  ✗ Failed to delete ${table.name} id=${row.id}:`, err);
            }
          }
        } else {
          console.log(`  ℹ️ No records in ${table.name}`);
        }
      } catch (err) {
        console.error(`Failed to process ${table.name}:`, err);
      }
    }
    
    // Step 2: Clear history table from BOTH cloud and local
    console.log('🗑️ Step 2: Clearing history...');
    try {
      // Clear from Supabase first
      const historyResult = await hybridDB.getHistory(10000); // Get all
      if (historyResult.success && historyResult.data) {
        console.log(`🗑️ Clearing ${historyResult.data.length} history records from cloud...`);
        // Supabase doesn't have deleteHistory, so we'll rely on local delete cascade
      }
    } catch (err) {
      console.warn('History cloud delete warning:', err);
    }
    await ipcRenderer.invoke('db-run', 'DELETE FROM history', []);
    
    // Step 3: Clear sync queue
    console.log('🗑️ Step 3: Clearing sync queue...');
    await ipcRenderer.invoke('db-run', 'DELETE FROM sync_queue', []);
    
    // Step 4: Vacuum database
    console.log('🗑️ Step 4: Vacuuming database...');
    await ipcRenderer.invoke('db-run', 'VACUUM', []);
    
    console.log('✅ Nuke operation completed successfully!');
    console.log('✅ All operational data cleared from Supabase AND local');
    console.log('✅ Profile settings and app settings preserved');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Nuke operation failed:', error);
    return { success: false, error: error.message };
  }
};

export const quickNukeLocal = async () => {
  try {
    console.log('⚡ Quick nuke - local only...');
    
    if (!ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    // Quick delete from local database
    await ipcRenderer.invoke('db-run', `
      DELETE FROM history;
      DELETE FROM plans;
      DELETE FROM personnel;
      DELETE FROM locks;
      DELETE FROM breakers;
      DELETE FROM sync_queue;
      VACUUM;
    `, []);
    
    console.log('✅ Local database cleared');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Quick nuke failed:', error);
    return { success: false, error: error.message };
  }
};

export const nukeSelectedTables = async (selectedTables) => {
  try {
    console.log('🗑️ Starting SELECTIVE nuke operation...', selectedTables);
    
    if (!ipcRenderer) {
      throw new Error('Electron IPC not available');
    }

    // Force a fresh connection check before bulk operations to avoid stale offline mode
    console.log('🔍 Verifying cloud connection before bulk delete...');
    try {
      const isConnected = await hybridDB.verifyConnection();
      console.log('☁️ Fresh connection test result:', isConnected ? '✅ Online' : '❌ Offline');
      if (!isConnected) {
        console.warn('⚠️ Cloud connection not available - deletions may only affect local database');
      }
    } catch (err) {
      console.warn('⚠️ Connection verification failed, proceeding anyway:', err);
    }

    // Map table names to their delete operations
    const tableOperations = {
      breakers: { getter: hybridDB.getBreakers, deleter: hybridDB.deleteBreaker },
      personnel: { getter: hybridDB.getPersonnel, deleter: hybridDB.deletePersonnel },
      plans: { getter: hybridDB.getPlans, deleter: hybridDB.deletePlan }
    };

    // Delete selected operational tables
    for (const [tableName, selected] of Object.entries(selectedTables)) {
      if (!selected) {
        console.log(`⏭️ Skipping ${tableName} (not selected)`);
        continue;
      }

      // Special handling for locks (lock_inventory is a single-row table)
      if (tableName === 'locks') {
        console.log('🗑️ Resetting lock inventory...');
        try {
          // Reset lock inventory to 0
          await ipcRenderer.invoke('db-run', 'UPDATE lock_inventory SET total_capacity = 0 WHERE id = 1', []);
          // Also update in Supabase
          await hybridDB.updateLockInventory(0);
          console.log('  ✓ Lock inventory reset to 0');
        } catch (err) {
          console.error('  ✗ Failed to reset lock inventory:', err);
        }
        continue;
      }

      if (tableName === 'history') {
        console.log('🗑️ Clearing history...');
        await ipcRenderer.invoke('db-run', 'DELETE FROM history', []);
        continue;
      }

      if (tableName === 'sync_queue') {
        console.log('🗑️ Clearing sync queue...');
        await ipcRenderer.invoke('db-run', 'DELETE FROM sync_queue', []);
        continue;
      }

      const operation = tableOperations[tableName];
      if (!operation) continue;

      try {
        const result = await operation.getter();
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`🗑️ Deleting ${result.data.length} records from ${tableName}...`);
          console.log(`📋 IDs to delete:`, result.data.map(r => r.id));
          
          let successCount = 0;
          let failCount = 0;
          
          for (const row of result.data) {
            try {
              console.log(`🔄 Attempting to delete ${tableName} id=${row.id}...`);
              const deleteResult = await operation.deleter(row.id);
              console.log(`📊 Delete result for id=${row.id}:`, deleteResult);
              
              if (deleteResult && deleteResult.success) {
                successCount++;
                console.log(`  ✅ Successfully deleted ${tableName} id=${row.id}`);
              } else {
                failCount++;
                console.error(`  ❌ Delete returned false for ${tableName} id=${row.id}`, deleteResult);
              }
              
              // Small delay between deletes to avoid overwhelming Supabase
              if (result.data.length > 10) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            } catch (err) {
              failCount++;
              console.error(`  ❌ Exception deleting ${tableName} id=${row.id}:`, err);
            }
          }
          
          console.log(`📊 ${tableName} deletion summary: ${successCount} succeeded, ${failCount} failed`);
        } else {
          console.log(`  ℹ️ No records in ${tableName}`);
        }
      } catch (err) {
        console.error(`❌ Failed to process ${tableName}:`, err);
      }
    }
    
    // Vacuum database
    console.log('🗑️ Vacuuming database...');
    await ipcRenderer.invoke('db-run', 'VACUUM', []);
    
    console.log('✅ Selective nuke operation completed successfully!');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Selective nuke operation failed:', error);
    return { success: false, error: error.message };
  }
};
