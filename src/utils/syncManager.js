/**
 * Sync Manager for LOTO KMS
 * LOCAL DATABASE ONLY - Cloud sync disabled
 * 
 * This manager now only works with local SQLite database.
 * All sync functions return "disabled" messages.
 */

import db from './database';
import logger from './logger';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.lastSync = null;
    this.syncErrors = [];
    this.cloudSyncDisabled = true; // Cloud sync permanently disabled
  }

  /**
   * Main sync function - DISABLED (local database only)
   */
  async sync(options = {}) {
    logger.info('Sync requested but cloud sync is disabled - using local database only');
    
    return {
      success: false,
      error: 'Cloud sync disabled',
      message: 'App is running in local-only mode. All data is stored in local SQLite database.',
      pulled: 0,
      pushed: 0,
      duration: 0
    };
  }

  /**
   * Pull data - DISABLED (local only)
   */
  async pullFromSupabase() {
    let totalCount = 0;

    try {
      // Pull breakers
      const breakersResult = await this.pullTable('breakers');
      if (breakersResult.success) {
        totalCount += breakersResult.count;
        logger.info(`Pulled ${breakersResult.count} breakers`);
      }

      // Pull locks
      const locksResult = await this.pullTable('locks');
      if (locksResult.success) {
        totalCount += locksResult.count;
        logger.info(`Pulled ${locksResult.count} locks`);
      }

      // Pull personnel
      const personnelResult = await this.pullTable('personnel');
      if (personnelResult.success) {
        totalCount += personnelResult.count;
        logger.info(`Pulled ${personnelResult.count} personnel`);
      }

      // Pull electrical plans (metadata only)
      const plansResult = await this.pullTable('electrical_plans');
      if (plansResult.success) {
        totalCount += plansResult.count;
        logger.info(`Pulled ${plansResult.count} electrical plans`);
      }

      return { success: true, count: totalCount };
    } catch (error) {
      logger.error('Pull error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Push data - DISABLED (local only)
   */
  async pushToSupabase() {
    let totalCount = 0;

    try {
      // Push breakers
      const breakersResult = await this.pushTable('breakers');
      if (breakersResult.success) {
        totalCount += breakersResult.count;
        logger.info(`Pushed ${breakersResult.count} breakers`);
      }

      // Push locks
      const locksResult = await this.pushTable('locks');
      if (locksResult.success) {
        totalCount += locksResult.count;
        logger.info(`Pushed ${locksResult.count} locks`);
      }

      // Push personnel
      const personnelResult = await this.pushTable('personnel');
      if (personnelResult.success) {
        totalCount += personnelResult.count;
        logger.info(`Pushed ${personnelResult.count} personnel`);
      }

      // Push electrical plans
      const plansResult = await this.pushTable('electrical_plans');
      if (plansResult.success) {
        totalCount += plansResult.count;
        logger.info(`Pushed ${plansResult.count} electrical plans`);
      }

      return { success: true, count: totalCount };
    } catch (error) {
      logger.error('Push error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pull table - DISABLED (local only)
   */
  async pullTable(tableName) {
    logger.info(`Pull ${tableName}: Skipped (local-only mode)`);
    return { success: true, count: 0 };
  }

  /**
   * Push table - DISABLED (local only)
   */
  async pushTable(tableName) {
    logger.info(`Push ${tableName}: Skipped (local-only mode)`);
    return { success: true, count: 0 };
  }

  /**
   * Upsert a record into local database
   */
  async upsertLocalRecord(tableName, record) {
    try {
      switch (tableName) {
        case 'breakers':
          // Check if exists
          const existingBreaker = await db.query(
            'SELECT id FROM breakers WHERE id = ?',
            [record.id]
          );
          
          if (existingBreaker.length > 0) {
            await db.updateBreaker(record.id, record);
          } else {
            await db.addBreaker(record);
          }
          break;

        case 'locks':
          const existingLock = await db.query(
            'SELECT id FROM locks WHERE id = ?',
            [record.id]
          );
          
          if (existingLock.length > 0) {
            await db.updateLock(record.id, record);
          } else {
            await db.addLock(record);
          }
          break;

        case 'personnel':
          const existingPersonnel = await db.query(
            'SELECT id FROM personnel WHERE id = ?',
            [record.id]
          );
          
          if (existingPersonnel.length > 0) {
            await db.updatePersonnel(record.id, record);
          } else {
            await db.addPersonnel(record);
          }
          break;

        case 'electrical_plans':
          const existingPlan = await db.query(
            'SELECT id FROM electrical_plans WHERE id = ?',
            [record.id]
          );
          
          if (existingPlan.length > 0) {
            await db.updateElectricalPlan(record.id, record);
          } else {
            await db.addElectricalPlan(record);
          }
          break;

        default:
          logger.warn(`Unknown table: ${tableName}`);
      }
    } catch (error) {
      logger.error(`Error upserting ${tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Get all records from local database for a table
   */
  async getLocalRecords(tableName) {
    try {
      switch (tableName) {
        case 'breakers':
          const breakers = await db.getBreakers();
          return breakers.success ? breakers.data : [];

        case 'locks':
          const locks = await db.getLocks();
          return locks.success ? locks.data : [];

        case 'personnel':
          const personnel = await db.getPersonnel();
          return personnel.success ? personnel.data : [];

        case 'electrical_plans':
          const plans = await db.getElectricalPlans();
          return plans.success ? plans.data : [];

        default:
          return [];
      }
    } catch (error) {
      logger.error(`Error getting local ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Test connection - DISABLED (local only)
   */
  async testConnection() {
    logger.info('Connection test: Local database only (cloud sync disabled)');
    return { 
      success: false, 
      message: 'Cloud sync disabled - using local database only' 
    };
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSync: this.lastSync,
      errors: this.syncErrors
    };
  }

  /**
   * Clear sync history
   */
  clearHistory() {
    this.lastSync = null;
    this.syncErrors = [];
  }
}

// Export singleton instance
const syncManager = new SyncManager();
export default syncManager;
