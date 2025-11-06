/**
 * Database Migration: Add Cloud Storage Support
 * Adds columns for Supabase Storage URLs alongside existing local paths
 * 
 * THIS MIGRATION IS NON-BREAKING:
 * - Keeps all existing local paths
 * - Adds new columns with NULL defaults
 * - App continues to work with local-only files
 */

const ipcRenderer = window.ipcRenderer;

export const migrateToCloudStorage = async () => {
  if (!ipcRenderer) {
    console.log('[Migration] Not in Electron - skipping migration');
    return { success: false, error: 'Not in Electron mode' };
  }

  console.log('[Migration] Starting cloud storage schema migration...');

  const migrations = [];

  try {
    // MIGRATION 1: Add cloud storage columns to personnel table
    console.log('[Migration] Step 1/4: Updating personnel table...');
    const personnel1 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE personnel ADD COLUMN pdf_cloud_url TEXT
    `);
    migrations.push({ table: 'personnel', column: 'pdf_cloud_url', success: personnel1.success });

    const personnel2 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE personnel ADD COLUMN pdf_last_synced DATETIME
    `);
    migrations.push({ table: 'personnel', column: 'pdf_last_synced', success: personnel2.success });

    const personnel3 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE personnel ADD COLUMN pdf_synced INTEGER DEFAULT 0
    `);
    migrations.push({ table: 'personnel', column: 'pdf_synced', success: personnel3.success });

    console.log('[Migration] ✅ Personnel table updated');

    // MIGRATION 2: Add cloud storage columns to plans table
    console.log('[Migration] Step 2/4: Updating plans table...');
    const plans1 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE plans ADD COLUMN file_cloud_url TEXT
    `);
    migrations.push({ table: 'plans', column: 'file_cloud_url', success: plans1.success });

    const plans2 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE plans ADD COLUMN file_last_synced DATETIME
    `);
    migrations.push({ table: 'plans', column: 'file_last_synced', success: plans2.success });

    const plans3 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE plans ADD COLUMN file_synced INTEGER DEFAULT 0
    `);
    migrations.push({ table: 'plans', column: 'file_synced', success: plans3.success });

    console.log('[Migration] ✅ Plans table updated');

    // MIGRATION 3: Add profile_picture_url column to profile_settings
    console.log('[Migration] Step 3/4: Updating profile_settings table...');
    const profile1 = await ipcRenderer.invoke('db-run', `
      ALTER TABLE profile_settings ADD COLUMN profilePicture_url TEXT
    `);
    migrations.push({ table: 'profile_settings', column: 'profilePicture_url', success: profile1.success });

    console.log('[Migration] ✅ Profile settings table updated');

    // MIGRATION 4: Set migration flag
    console.log('[Migration] Step 4/4: Setting migration flag...');
    const flag = await ipcRenderer.invoke('db-run', `
      INSERT OR REPLACE INTO profile_settings (id, updated_at) 
      VALUES (1, CURRENT_TIMESTAMP)
    `);

    console.log('[Migration] ✅ Migration flag set');

    // Summary
    const successCount = migrations.filter(m => m.success).length;
    const totalCount = migrations.length;

    console.log(`[Migration] ✅ Migration complete: ${successCount}/${totalCount} columns added`);
    console.log('[Migration] Details:', migrations);

    return {
      success: true,
      migrations: migrations,
      message: `Successfully added ${successCount} columns for cloud storage support`
    };

  } catch (error) {
    // SQLite may throw error if column already exists - this is OK
    if (error.message && error.message.includes('duplicate column')) {
      console.log('[Migration] ℹ️  Columns already exist - migration already applied');
      return {
        success: true,
        alreadyMigrated: true,
        message: 'Migration already applied'
      };
    }

    console.error('[Migration] ❌ Migration failed:', error);
    return {
      success: false,
      error: error.message,
      migrations: migrations
    };
  }
};

/**
 * Check if migration has been applied
 */
export const checkMigrationStatus = async () => {
  if (!ipcRenderer) {
    return { migrated: false, reason: 'Not in Electron' };
  }

  try {
    // Check if new columns exist by querying table info
    const result = await ipcRenderer.invoke('db-query', `
      PRAGMA table_info(personnel)
    `);

    if (result.success && result.data) {
      const columns = result.data.map(col => col.name);
      const hasPdfCloudUrl = columns.includes('pdf_cloud_url');
      const hasPdfSynced = columns.includes('pdf_synced');

      return {
        migrated: hasPdfCloudUrl && hasPdfSynced,
        columns: columns,
        missingColumns: !hasPdfCloudUrl ? ['pdf_cloud_url', 'pdf_synced', 'pdf_last_synced'] : []
      };
    }

    return { migrated: false, reason: 'Could not check table info' };

  } catch (error) {
    return { migrated: false, error: error.message };
  }
};

/**
 * Get sync statistics
 */
export const getSyncStats = async () => {
  if (!ipcRenderer) {
    return null;
  }

  try {
    const stats = {
      personnel: { total: 0, synced: 0, pending: 0 },
      plans: { total: 0, synced: 0, pending: 0 }
    };

    // Personnel stats
    const personnelTotal = await ipcRenderer.invoke('db-query', `
      SELECT COUNT(*) as count FROM personnel WHERE pdf_path IS NOT NULL
    `);
    if (personnelTotal.success && personnelTotal.data) {
      stats.personnel.total = personnelTotal.data[0]?.count || 0;
    }

    const personnelSynced = await ipcRenderer.invoke('db-query', `
      SELECT COUNT(*) as count FROM personnel WHERE pdf_synced = 1
    `);
    if (personnelSynced.success && personnelSynced.data) {
      stats.personnel.synced = personnelSynced.data[0]?.count || 0;
    }
    stats.personnel.pending = stats.personnel.total - stats.personnel.synced;

    // Plans stats
    const plansTotal = await ipcRenderer.invoke('db-query', `
      SELECT COUNT(*) as count FROM plans WHERE file_path IS NOT NULL
    `);
    if (plansTotal.success && plansTotal.data) {
      stats.plans.total = plansTotal.data[0]?.count || 0;
    }

    const plansSynced = await ipcRenderer.invoke('db-query', `
      SELECT COUNT(*) as count FROM plans WHERE file_synced = 1
    `);
    if (plansSynced.success && plansSynced.data) {
      stats.plans.synced = plansSynced.data[0]?.count || 0;
    }
    stats.plans.pending = stats.plans.total - stats.plans.synced;

    return stats;

  } catch (error) {
    console.error('[SyncStats] Error:', error);
    return null;
  }
};

export default {
  migrateToCloudStorage,
  checkMigrationStatus,
  getSyncStats
};
