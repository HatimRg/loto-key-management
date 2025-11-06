/**
 * Local Database Fallback using IndexedDB
 * Used when Electron IPC is not available (e.g., browser mode, dev mode)
 */

const DB_NAME = 'LOTO_KMS_DB';
const DB_VERSION = 2; // Incremented to add missing stores

class LocalDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (this.isReady) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✅ Local database (IndexedDB) connected');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('breakers')) {
          const breakerStore = db.createObjectStore('breakers', { keyPath: 'id', autoIncrement: true });
          breakerStore.createIndex('zone', 'zone', { unique: false });
          breakerStore.createIndex('location', 'location', { unique: false });
          breakerStore.createIndex('state', 'state', { unique: false });
        }

        if (!db.objectStoreNames.contains('locks')) {
          const lockStore = db.createObjectStore('locks', { keyPath: 'id', autoIncrement: true });
          lockStore.createIndex('zone', 'zone', { unique: false });
          lockStore.createIndex('used', 'used', { unique: false });
        }

        if (!db.objectStoreNames.contains('personnel')) {
          const personnelStore = db.createObjectStore('personnel', { keyPath: 'id', autoIncrement: true });
          personnelStore.createIndex('company', 'company', { unique: false });
          personnelStore.createIndex('id_card', 'id_card', { unique: false });
        }

        // History store for activity logs
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('action', 'action', { unique: false });
        }

        // Plans store (electrical plans)
        if (!db.objectStoreNames.contains('plans')) {
          const planStore = db.createObjectStore('plans', { keyPath: 'id', autoIncrement: true });
          planStore.createIndex('uploaded_at', 'uploaded_at', { unique: false });
        }

        // Keep electrical_plans for backward compatibility
        if (!db.objectStoreNames.contains('electrical_plans')) {
          db.createObjectStore('electrical_plans', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'id', autoIncrement: true });
        }

        console.log('✅ IndexedDB schema created/updated - Version', DB_VERSION);
      };
    });
  }

  async getAll(storeName) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve({ success: true, data: request.result });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async add(storeName, data) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          
          // Add timestamp
          data.created_at = new Date().toISOString();
          data.last_updated = new Date().toISOString();
          
          const request = store.add(data);

          request.onsuccess = () => {
            resolve({ success: true, data: { id: request.result, ...data } });
          };

          request.onerror = () => {
            console.error(`IndexedDB add error in ${storeName}:`, request.error);
            resolve({ success: false, error: request.error?.message || 'Add operation failed' });
          };
        } catch (error) {
          console.error(`Transaction error in ${storeName}:`, error);
          resolve({ success: false, error: error.message });
        }
      });
    } catch (error) {
      console.error(`Init error for ${storeName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async update(storeName, id, data) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Get existing record first
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject({ success: false, error: 'Record not found' });
          return;
        }

        // Merge data and update timestamp
        const updated = { ...existing, ...data, last_updated: new Date().toISOString() };
        const updateRequest = store.put(updated);

        updateRequest.onsuccess = () => {
          resolve({ success: true, data: updated });
        };

        updateRequest.onerror = () => {
          reject({ success: false, error: updateRequest.error });
        };
      };

      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async delete(storeName, id) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async clear(storeName) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async query(storeName, filters = {}) {
    const result = await this.getAll(storeName);
    
    if (!result.success) return result;

    let data = result.data || [];

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        data = data.filter(item => item[key] === filters[key]);
      }
    });

    return { success: true, data };
  }
}

// Export singleton instance
const localDB = new LocalDatabase();
export default localDB;
