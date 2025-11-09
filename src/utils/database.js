/**
 * Universal Database Interface
 * CLOUD-FIRST HYBRID DATABASE
 * 
 * Strategy:
 * 1. Try Supabase (cloud) first when online
 * 2. Cache results locally (SQLite/IndexedDB)
 * 3. If offline, use local cache
 * 4. Auto-sync writes to both cloud and local
 * 
 * This wrapper maintains backward compatibility with existing code
 * while providing cloud-first functionality
 */

import hybridDB from './hybridDatabase';
import localDB from './localDatabase';
import { notifyDataChange } from './autoSync';

// Detect if IPC is available
const ipcRenderer = window.ipcRenderer || null;
const useElectron = !!ipcRenderer;

if (useElectron) {
  console.log('✅ Using Hybrid Database (Cloud-first with local cache)');
} else {
  console.log('⚠️  Using IndexedDB fallback');
}

export const db = {
  async query(sql, params = []) {
    if (useElectron) {
      return await ipcRenderer.invoke('db-query', sql, params);
    }
    
    // Fallback: Return empty result for now
    // IndexedDB doesn't use SQL queries
    console.warn('SQL query in browser mode - not supported');
    return { success: true, data: [] };
  },

  async run(sql, params = []) {
    if (useElectron) {
      return await ipcRenderer.invoke('db-run', sql, params);
    }
    
    // Fallback: Return success
    console.warn('SQL run in browser mode - not supported');
    return { success: true };
  },

  // Helper to log actions with proper formatting
  async logAction(action, details = null, breakerId = null, user = 'Admin') {
    try {
      await this.addHistory({
        breaker_id: breakerId,
        action: action,
        user: user,
        details: details
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  },

  // Breakers (Cloud-first)
  async getBreakers(filters = {}) {
    if (!useElectron) {
      // IndexedDB fallback
      return await localDB.query('breakers', filters);
    }

    // Use hybrid DB for cloud-first fetch
    const result = await hybridDB.getBreakers();
    
    // Apply filters if any (client-side filtering)
    if (result.success && (filters.zone || filters.location || filters.state)) {
      result.data = result.data.filter(breaker => {
        if (filters.zone && breaker.zone !== filters.zone) return false;
        if (filters.location && breaker.location !== filters.location) return false;
        if (filters.state && breaker.state !== filters.state) return false;
        return true;
      });
    }
    
    return result;
  },

  async getLockedBreakers() {
    // Use cloud-first getBreakers then filter for Closed state
    const result = await this.getBreakers();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    const lockedBreakers = (result.data || [])
      .filter(b => b.state === 'Closed')
      .sort((a, b) => {
        if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
        if (a.location !== b.location) return a.location.localeCompare(b.location);
        return a.name.localeCompare(b.name);
      });
    
    return { success: true, data: lockedBreakers };
  },

  async addBreaker(breaker) {
    let result;
    if (!useElectron) {
      // IndexedDB fallback
      result = await localDB.add('breakers', {
        name: breaker.name,
        zone: breaker.zone,
        subzone: breaker.subzone || null,
        location: breaker.location,
        special_use: breaker.special_use || null,
        state: breaker.state || 'Off',
        lock_key: breaker.lock_key || null,
        general_breaker: breaker.general_breaker || null,
        date: breaker.date || new Date().toLocaleDateString('fr-FR')
      });
    } else {
      // Use hybrid DB to write to both cloud and local
      result = await hybridDB.addBreaker({
        name: breaker.name,
        zone: breaker.zone,
        subzone: breaker.subzone || null,
        location: breaker.location,
        special_use: breaker.special_use || null,
        state: breaker.state || 'Off',
        lock_key: breaker.lock_key || null,
        general_breaker: breaker.general_breaker || null,
        date: breaker.date || new Date().toLocaleDateString('fr-FR'),
        last_updated: new Date().toISOString()
      });
    }

    // Mark lock as used ONLY if lock_key is provided AND breaker is Closed (locked)
    if (result.success && breaker.lock_key && breaker.state === 'Closed') {
      await this.updateLockUsageByKey(breaker.lock_key, true, breaker.name);
      console.log(`🔒 Lock ${breaker.lock_key} marked as in use by new breaker ${breaker.name}`);
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('breakers', 'INSERT', result.data?.id);
    }

    return result;
  },

  async updateBreaker(id, breaker) {
    // Get old breaker data to compare lock_key changes
    const oldBreakerResult = await this.getBreakers({ id });
    const oldBreaker = oldBreakerResult.success && oldBreakerResult.data?.length > 0 
      ? oldBreakerResult.data[0] 
      : null;

    let result;
    if (!useElectron) {
      // IndexedDB fallback
      result = await localDB.update('breakers', id, {
        name: breaker.name,
        zone: breaker.zone,
        subzone: breaker.subzone || null,
        location: breaker.location,
        special_use: breaker.special_use || null,
        state: breaker.state,
        lock_key: breaker.lock_key || null,
        general_breaker: breaker.general_breaker || null,
        date: breaker.date || null
      });
    } else {
      // Use hybrid DB for cloud-first dual-write
      result = await hybridDB.updateBreaker({
        id,
        name: breaker.name,
        zone: breaker.zone,
        subzone: breaker.subzone || null,
        location: breaker.location,
        special_use: breaker.special_use || null,
        state: breaker.state,
        lock_key: breaker.lock_key || null,
        general_breaker: breaker.general_breaker || null,
        date: breaker.date || null,
        last_updated: new Date().toISOString()
      });
    }

    // Update lock usage status based on lock_key AND state changes
    if (result.success) {
      // Determine if old breaker had lock in use (had lock_key AND was Closed)
      const oldLockInUse = oldBreaker?.lock_key && oldBreaker.state === 'Closed';
      
      // Determine if new breaker has lock in use (has lock_key AND is Closed)
      const newLockInUse = breaker.lock_key && breaker.state === 'Closed';
      
      // Release old lock if:
      // 1. Lock key changed, OR
      // 2. State changed from Closed to something else
      if (oldBreaker?.lock_key && 
          (oldBreaker.lock_key !== breaker.lock_key || (oldLockInUse && !newLockInUse))) {
        await this.updateLockUsageByKey(oldBreaker.lock_key, false);
        console.log(`🔓 Lock ${oldBreaker.lock_key} released from breaker ${breaker.name}`);
      }
      
      // Mark new lock as used ONLY if breaker is Closed (locked)
      if (breaker.lock_key && breaker.state === 'Closed') {
        await this.updateLockUsageByKey(breaker.lock_key, true, breaker.name);
        console.log(`🔒 Lock ${breaker.lock_key} marked as in use by breaker ${breaker.name}`);
      }
    }

    // Log action with state change details and icon type
    if (result.success) {
      let actionType = 'breaker';
      let actionText = '';
      
      if (breaker.state === 'Closed') {
        actionText = `Breaker ${breaker.name} locked`;
        actionType = 'lock';
      } else if (breaker.state === 'On') {
        actionText = `Breaker ${breaker.name} set on`;
      } else {
        actionText = `Breaker ${breaker.name} set off`;
      }
      
      // Trigger auto-sync
      notifyDataChange('breakers', 'UPDATE', id);
    }

    return result;
  },

  // Update breaker and cascade to children
  async updateBreakerWithChildren(id, breaker) {
    try {
      // Update the parent breaker
      await this.updateBreaker(id, breaker);

      // If state changed to Off or Closed, cascade to children
      if (breaker.state === 'Off' || breaker.state === 'Closed') {
        const childrenResult = await this.query(
          'SELECT * FROM breakers WHERE general_breaker = ?',
          [id]
        );

        if (childrenResult.success && childrenResult.data) {
          for (const child of childrenResult.data) {
            await this.updateBreaker(child.id, {
              ...child,
              state: breaker.state
            });
          }
          return {
            success: true,
            message: `Updated breaker and ${childrenResult.data.length} children`,
            childrenUpdated: childrenResult.data.length
          };
        }
      }

      return { success: true, message: 'Breaker updated', childrenUpdated: 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteBreaker(id) {
    // Get breaker data before deleting (to release lock if assigned and locked)
    let breakerName = `Breaker #${id}`;
    let lockKey = null;
    let wasLocked = false;
    try {
      const breakers = await this.getBreakers();
      if (breakers.success && breakers.data) {
        const breaker = breakers.data.find(b => b.id === id);
        if (breaker) {
          breakerName = breaker.name;
          lockKey = breaker.lock_key;
          wasLocked = breaker.state === 'Closed';
        }
      }
    } catch (e) {
      console.error('Could not fetch breaker data:', e);
    }

    // Release the lock before deleting the breaker (only if it was actually locked)
    if (lockKey && wasLocked) {
      await this.updateLockUsageByKey(lockKey, false);
      console.log(`🔓 Lock ${lockKey} released from deleted breaker ${breakerName}`);
    }

    let result;
    if (!useElectron) {
      result = await localDB.delete('breakers', id);
    } else {
      // Use hybrid DB for cloud-first dual-write deletion
      result = await hybridDB.deleteBreaker(id);
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('breakers', 'DELETE', id);
    }

    return result;
  },

  // Locks (Cloud-first)
  async getLocks(filters = {}) {
    if (!useElectron) {
      // IndexedDB fallback with filtering
      const result = await localDB.getAll('locks');
      if (result.success && result.data) {
        let filtered = result.data;
        
        if (filters.zone) {
          filtered = filtered.filter(l => l.zone === filters.zone);
        }
        if (filters.used !== undefined) {
          filtered = filtered.filter(l => Boolean(l.used) === Boolean(filters.used));
        }
        
        filtered.sort((a, b) => {
          if (a.zone !== b.zone) return a.zone?.localeCompare(b.zone || '') || 0;
          return a.key_number?.localeCompare(b.key_number || '') || 0;
        });
        
        return { success: true, data: filtered };
      }
      return result;
    }

    // Use hybrid DB for cloud-first fetch
    const result = await hybridDB.getLocks();
    
    // Apply filters client-side
    if (result.success && (filters.zone || filters.used !== undefined)) {
      result.data = result.data.filter(lock => {
        if (filters.zone && lock.zone !== filters.zone) return false;
        if (filters.used !== undefined && Boolean(lock.used) !== Boolean(filters.used)) return false;
        return true;
      });
    }
    
    return result;
  },

  async addLock(lock) {
    let result;
    if (!useElectron) {
      result = await localDB.add('locks', {
        key_number: lock.key_number,
        zone: lock.zone,
        used: lock.used ? 1 : 0,
        assigned_to: lock.assigned_to || null,
        remarks: lock.remarks || null
      });
    } else {
      // Use hybrid DB for cloud-first dual-write
      result = await hybridDB.addLock({
        key_number: lock.key_number,
        zone: lock.zone,
        used: lock.used ? 1 : 0,
        assigned_to: lock.assigned_to || null,
        remarks: lock.remarks || null
      });
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('locks', 'INSERT', result.data?.id);
    }

    return result;
  },

  async updateLock(id, lock) {
    let result;
    if (!useElectron) {
      result = await localDB.update('locks', id, {
        key_number: lock.key_number,
        zone: lock.zone,
        used: lock.used ? 1 : 0,
        assigned_to: lock.assigned_to || null,
        remarks: lock.remarks || null
      });
    } else {
      // Use hybrid DB for cloud-first dual-write
      result = await hybridDB.updateLock({
        id,
        key_number: lock.key_number,
        zone: lock.zone,
        used: lock.used ? 1 : 0,
        assigned_to: lock.assigned_to || null,
        remarks: lock.remarks || null
      });
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('locks', 'UPDATE', id);
    }

    return result;
  },

  async deleteLock(id) {
    // Get lock info before deleting
    let lockName = `Lock #${id}`;
    try {
      const locks = await this.getLocks();
      if (locks.success && locks.data) {
        const lock = locks.data.find(l => l.id === id);
        if (lock) lockName = lock.key_number;
      }
    } catch (e) {
      console.error('Could not fetch lock info:', e);
    }

    let result;
    if (!useElectron) {
      result = await localDB.delete('locks', id);
    } else {
      // Use hybrid DB for cloud-first dual-write deletion
      result = await hybridDB.deleteLock(id);
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('locks', 'DELETE', id);
    }

    return result;
  },

  // Helper function to update lock usage by key_number
  async updateLockUsageByKey(keyNumber, isUsed, assignedTo = null) {
    if (!keyNumber) return { success: false, error: 'No key number provided' };

    try {
      // Find the lock by key_number
      const locksResult = await this.getLocks();
      if (!locksResult.success || !locksResult.data) {
        return { success: false, error: 'Failed to fetch locks' };
      }

      const lock = locksResult.data.find(l => l.key_number === keyNumber);
      if (!lock) {
        console.warn(`Lock with key_number ${keyNumber} not found`);
        return { success: true }; // Not an error if lock doesn't exist
      }

      // Update the lock
      let result;
      if (!useElectron) {
        result = await localDB.update('locks', lock.id, {
          ...lock,
          used: isUsed ? 1 : 0,
          assigned_to: isUsed ? assignedTo : null
        });
      } else {
        const sql = `
          UPDATE locks 
          SET used = ?, assigned_to = ?
          WHERE key_number = ?
        `;
        result = await this.run(sql, [
          isUsed ? 1 : 0,
          isUsed ? assignedTo : null,
          keyNumber
        ]);
      }

      return result;
    } catch (error) {
      console.error('Error updating lock usage:', error);
      return { success: false, error: error.message };
    }
  },

  // Sync all locks with current breaker assignments
  async syncLockUsage() {
    try {
      console.log('🔄 Starting lock usage sync...');
      
      // Get all locks and breakers
      const locksResult = await this.getLocks();
      const breakersResult = await this.getBreakers();
      
      if (!locksResult.success || !breakersResult.success) {
        console.error('Failed to fetch data for sync');
        return { success: false, error: 'Failed to fetch data' };
      }

      const locks = locksResult.data || [];
      const breakers = breakersResult.data || [];
      
      console.log(`📦 Found ${locks.length} locks and ${breakers.length} breakers`);

      // Step 1: Mark all locks as available
      for (const lock of locks) {
        if (!useElectron) {
          await localDB.update('locks', lock.id, {
            ...lock,
            used: 0,
            assigned_to: null
          });
        } else {
          await this.run('UPDATE locks SET used = 0, assigned_to = NULL WHERE id = ?', [lock.id]);
        }
      }
      console.log('✓ All locks marked as available');

      // Step 2: Mark locks as used ONLY for breakers that are LOCKED (state = Closed)
      let updatedCount = 0;
      for (const breaker of breakers) {
        // Only mark lock as used if breaker has a lock AND is in Closed (locked) state
        if (breaker.lock_key && breaker.state === 'Closed') {
          const lock = locks.find(l => l.key_number === breaker.lock_key);
          if (lock) {
            if (!useElectron) {
              await localDB.update('locks', lock.id, {
                ...lock,
                used: 1,
                assigned_to: breaker.name
              });
            } else {
              await this.run(
                'UPDATE locks SET used = 1, assigned_to = ? WHERE key_number = ?',
                [breaker.name, breaker.lock_key]
              );
            }
            updatedCount++;
            console.log(`✓ Lock ${breaker.lock_key} in use by LOCKED breaker ${breaker.name}`);
          } else {
            console.warn(`⚠ Breaker ${breaker.name} references lock ${breaker.lock_key} which doesn't exist`);
          }
        } else if (breaker.lock_key && breaker.state !== 'Closed') {
          console.log(`ℹ️ Lock ${breaker.lock_key} assigned to breaker ${breaker.name} but breaker is ${breaker.state} (not locked)`);
        }
      }

      console.log(`✅ Sync complete: ${updatedCount} locks marked as in use`);
      return { success: true, updatedCount };
    } catch (error) {
      console.error('❌ Error syncing lock usage:', error);
      return { success: false, error: error.message };
    }
  },

  // Personnel (Cloud-first)
  async getPersonnel() {
    if (!useElectron) {
      return await localDB.getAll('personnel');
    }
    return await hybridDB.getPersonnel();
  },

  async addPersonnel(person) {
    let result;
    if (!useElectron) {
      result = await localDB.add('personnel', {
        name: person.name,
        lastname: person.lastname,
        id_card: person.id_card,
        company: person.company || null,
        habilitation: person.habilitation || null,
        pdf_path: person.pdf_path || null
      });
    } else {
      // Use hybrid DB for cloud-first dual-write
      result = await hybridDB.addPersonnel({
        name: person.name,
        lastname: person.lastname,
        id_card: person.id_card,
        company: person.company || null,
        habilitation: person.habilitation || null,
        pdf_path: person.pdf_path || null,
        created_at: new Date().toISOString()
      });
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('personnel', 'INSERT', result.data?.id);
    }

    return result;
  },

  async updatePersonnel(id, person) {
    let result;
    if (!useElectron) {
      result = await localDB.update('personnel', id, {
        name: person.name,
        lastname: person.lastname,
        id_card: person.id_card,
        company: person.company || null,
        habilitation: person.habilitation || null,
        pdf_path: person.pdf_path || null
      });
    } else {
      // Use hybrid DB for cloud-first dual-write
      result = await hybridDB.updatePersonnel({
        id,
        name: person.name,
        lastname: person.lastname,
        id_card: person.id_card,
        company: person.company || null,
        habilitation: person.habilitation || null,
        pdf_path: person.pdf_path || null
      });
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('personnel', 'UPDATE', id);
    }

    return result;
  },

  async deletePersonnel(id) {
    // Get personnel info before deleting
    let personName = `Personnel #${id}`;
    try {
      const personnel = await this.getPersonnel();
      if (personnel.success && personnel.data) {
        const person = personnel.data.find(p => p.id === id);
        if (person) personName = `${person.name} ${person.lastname}`;
      }
    } catch (e) {
      console.error('Could not fetch personnel info:', e);
    }

    let result;
    if (!useElectron) {
      result = await localDB.delete('personnel', id);
    } else {
      // Use hybrid DB for cloud-first dual-write deletion
      result = await hybridDB.deletePersonnel(id);
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('personnel', 'DELETE', id);
    }

    return result;
  },

  // Plans (Cloud-first)
  async getPlans() {
    if (!useElectron) {
      return await localDB.getAll('plans');
    }
    return await hybridDB.getPlans();
  },

  async addPlan(plan) {
    let result;
    if (!useElectron) {
      result = await localDB.add('plans', {
        filename: plan.filename,
        file_path: plan.file_path,
        version: plan.version || null,
        uploaded_at: new Date().toISOString()
      });
    } else {
      // Use hybrid DB for cloud-first dual-write
      result = await hybridDB.addPlan({
        filename: plan.filename,
        file_path: plan.file_path,
        version: plan.version || null,
        uploaded_at: new Date().toISOString()
      });
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('plans', 'INSERT', result.data?.id);
    }

    return result;
  },

  async deletePlan(id) {
    // Get plan info before deleting
    let planName = `Plan #${id}`;
    try {
      const plans = await this.getPlans();
      if (plans.success && plans.data) {
        const plan = plans.data.find(p => p.id === id);
        if (plan) planName = plan.filename;
      }
    } catch (e) {
      console.error('Could not fetch plan info:', e);
    }

    let result;
    if (!useElectron) {
      result = await localDB.delete('plans', id);
    } else {
      // Use hybrid DB for cloud-first dual-write deletion
      result = await hybridDB.deletePlan(id);
    }

    // Trigger auto-sync
    if (result.success) {
      notifyDataChange('plans', 'DELETE', id);
    }

    return result;
  },

  // History (Cloud-first)
  async getHistory(limit = 100) {
    if (!useElectron) {
      const history = await localDB.getAll('history');
      if (history.success && history.data) {
        // Sort and optionally limit
        const sorted = history.data.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        // If limit is null or 0, return all
        const result = (limit && limit > 0) ? sorted.slice(0, limit) : sorted;
        return { success: true, data: result };
      }
      return history;
    }

    // Use hybrid DB for cloud-first fetch
    return await hybridDB.getHistory(limit);
  },

  async addHistory(entry) {
    if (!useElectron) {
      return await localDB.add('history', {
        breaker_id: entry.breaker_id || null,
        action: entry.action,
        user: entry.user || entry.user_mode || 'Admin',
        details: entry.details || null,
        timestamp: new Date().toISOString()
      });
    }

    // Use hybrid DB for cloud-first dual-write
    return await hybridDB.addHistory({
      breaker_id: entry.breaker_id || null,
      action: entry.action,
      user_mode: entry.user || entry.user_mode || 'Admin',
      details: entry.details || null,
      timestamp: new Date().toISOString()
    });
  },

  async clearHistory() {
    if (!useElectron) {
      return await localDB.clear('history');
    }
    return await this.run('DELETE FROM history');
  },

  // Profile Settings (Cloud-first)
  async getProfileSettings() {
    if (!useElectron) {
      return await localDB.getAll('profile_settings');
    }
    return await hybridDB.getProfileSettings();
  },

  async updateProfileSettings(data) {
    if (!useElectron) {
      return await localDB.update('profile_settings', 1, data);
    }
    
    const sql = `
      INSERT OR REPLACE INTO profile_settings (id, name, title, bio, email, phone_number, linkedin, profilePicture, cvFiles, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    return await this.run(sql, [
      data.name, data.title, data.bio, data.email, data.phone_number,
      data.linkedin, data.profilePicture, data.cvFiles
    ]);
  },

  // App Settings (Cloud-first)
  async getAppSettings() {
    if (!useElectron) {
      return await localDB.getAll('app_settings');
    }
    return await hybridDB.getAppSettings();
  },

  async updateAppSettings(data) {
    if (!useElectron) {
      // IndexedDB fallback
      return await localDB.update('app_settings', 1, data);
    } else {
      // Use cloud-first database method
      return await hybridDB.updateAppSettings(data);
    }
  },

  async updateProfileSettings(data) {
    if (!useElectron) {
      // IndexedDB fallback
      return await localDB.update('profile_settings', 1, data);
    } else {
      // Use cloud-first database method
      return await hybridDB.updateProfileSettings(data);
    }
  },

  // Lock Inventory (Cloud-first)
  async getLockInventory() {
    if (!useElectron) {
      // IndexedDB fallback
      const result = await localDB.getAll('lock_inventory');
      return { success: true, data: result.length > 0 ? result[0] : { id: 1, total_capacity: 0 } };
    } else {
      // Use cloud-first database method
      return await hybridDB.getLockInventory();
    }
  },

  async updateLockInventory(totalCapacity) {
    if (!useElectron) {
      // IndexedDB fallback
      return await localDB.update('lock_inventory', 1, { total_capacity: totalCapacity, updated_at: new Date().toISOString() });
    } else {
      // Use cloud-first database method
      return await hybridDB.updateLockInventory({
        id: 1,
        total_capacity: totalCapacity,
        updated_at: new Date().toISOString()
      });
    }
  },

  // Statistics
  async getStats() {
    if (!useElectron) {
      // IndexedDB fallback - calculate from data
      try {
        const breakers = (await localDB.getAll('breakers')).data || [];
        const locks = (await localDB.getAll('locks')).data || [];
        const personnel = (await localDB.getAll('personnel')).data || [];
        
        const stats = {
          totalBreakers: breakers.length,
          breakersOn: breakers.filter(b => b.state === 'On').length,
          lockedBreakers: breakers.filter(b => b.state === 'Closed').length,
          totalLocks: locks.length,
          usedLocks: locks.filter(l => l.used === 1 || l.used === true).length,
          totalPersonnel: personnel.length
        };
        
        return { success: true, data: stats };
      } catch (error) {
        console.error('getStats error:', error);
        return { success: false, error: error.message };
      }
    }

    const stats = {};
    
    const breakersCount = await this.query('SELECT COUNT(*) as count FROM breakers');
    stats.totalBreakers = breakersCount.data?.[0]?.count || 0;
    
    const breakersOnCount = await this.query("SELECT COUNT(*) as count FROM breakers WHERE state = 'On'");
    stats.breakersOn = breakersOnCount.data?.[0]?.count || 0;
    
    const lockedCount = await this.query("SELECT COUNT(*) as count FROM breakers WHERE state = 'Closed'");
    stats.lockedBreakers = lockedCount.data?.[0]?.count || 0;
    
    const locksCount = await this.query('SELECT COUNT(*) as count FROM locks');
    stats.totalLocks = locksCount.data?.[0]?.count || 0;
    
    const usedLocks = await this.query('SELECT COUNT(*) as count FROM locks WHERE used = 1');
    stats.usedLocks = usedLocks.data?.[0]?.count || 0;
    
    const personnelCount = await this.query('SELECT COUNT(*) as count FROM personnel');
    stats.totalPersonnel = personnelCount.data?.[0]?.count || 0;
    
    return { success: true, data: stats };
  },

  // Get statistics calculated from breaker data (not lock table)
  // This ensures "Locks in Use" matches the actual number of locked breakers
  async getStatsFromBreakers() {
    try {
      const breakersResult = await this.getBreakers();
      const personnelResult = await this.getPersonnel();
      
      // ✅ Get total locks from lock_inventory table (Supabase)
      const inventoryResult = await this.getLockInventory();

      if (!breakersResult.success || !personnelResult.success) {
        return { success: false, error: 'Failed to fetch data' };
      }

      const breakers = breakersResult.data || [];
      const personnel = personnelResult.data || [];
      
      // Get total capacity from lock_inventory table (cloud-first)
      const totalCapacity = inventoryResult.success && inventoryResult.data 
        ? inventoryResult.data.total_capacity || 0 
        : 0;

      // Calculate locks in use from BREAKERS
      // A lock is "in use" if a breaker is Closed (locked) and has a lock_key
      const lockedBreakersWithLocks = breakers.filter(b => 
        b.state === 'Closed' && b.lock_key && b.lock_key.trim() !== ''
      );

      const stats = {
        totalBreakers: breakers.length,
        breakersOn: breakers.filter(b => b.state === 'On').length,
        lockedBreakers: breakers.filter(b => b.state === 'Closed').length,
        totalLocks: totalCapacity,  // ✅ FROM lock_inventory TABLE (Supabase)
        usedLocks: lockedBreakersWithLocks.length,  // From breaker data
        totalPersonnel: personnel.length
      };

      console.log('📊 Stats calculated:', {
        totalLocks: `${stats.totalLocks} (from lock_inventory table)`,
        usedLocks: `${stats.usedLocks} (from breaker data)`,
        available: stats.totalLocks - stats.usedLocks
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('getStatsFromBreakers error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get locks by zone from breaker data
  async getLocksByZone() {
    try {
      const breakersResult = await this.getBreakers();
      
      if (!breakersResult.success) {
        return { success: false, error: 'Failed to fetch breakers' };
      }

      const breakers = breakersResult.data || [];

      // Group locked breakers by zone
      const zoneStats = {};
      
      breakers.forEach(breaker => {
        // Only count breakers that are Closed (locked) and have a lock_key
        if (breaker.state === 'Closed' && breaker.lock_key && breaker.lock_key.trim() !== '') {
          const zone = breaker.zone || 'Unknown';
          
          if (!zoneStats[zone]) {
            zoneStats[zone] = {
              zone: zone,
              locksInUse: 0,
              breakers: []
            };
          }
          
          zoneStats[zone].locksInUse++;
          zoneStats[zone].breakers.push({
            name: breaker.name,
            location: breaker.location,
            lock_key: breaker.lock_key,
            subzone: breaker.subzone
          });
        }
      });

      // Convert to array and sort by zone name
      const zoneArray = Object.values(zoneStats).sort((a, b) => 
        a.zone.localeCompare(b.zone)
      );

      return { success: true, data: zoneArray };
    } catch (error) {
      console.error('getLocksByZone error:', error);
      return { success: false, error: error.message };
    }
  },

  // Zones and Locations
  async getZones() {
    // Use cloud-first getBreakers to ensure data consistency
    const result = await this.getBreakers();
    if (!result.success || !result.data) {
      return [];
    }
    
    const breakers = result.data;
    const zones = [...new Set(breakers.map(b => b.zone).filter(Boolean))];
    return zones.sort();
  },

  async getLocations(zone) {
    // Use cloud-first getBreakers to ensure data consistency
    const result = await this.getBreakers();
    if (!result.success || !result.data) {
      return [];
    }
    
    const breakers = result.data;
    const filtered = zone ? breakers.filter(b => b.zone === zone) : breakers;
    const locations = [...new Set(filtered.map(b => b.location).filter(Boolean))];
    return locations.sort();
  }
};

export default db;
