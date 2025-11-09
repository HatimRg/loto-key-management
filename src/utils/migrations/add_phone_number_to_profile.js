/**
 * Migration: Add phone_number column to profile_settings table
 * Date: 2025-01-09
 * Description: Adds phone_number field to store user's phone number with support for Moroccan formats
 */

const migration = {
  version: 11, // Increment from last migration version
  name: 'add_phone_number_to_profile',
  
  up: async (db) => {
    console.log('📝 Running migration: add_phone_number_to_profile');
    
    try {
      // Check if column already exists
      const tableInfo = await db.get(`PRAGMA table_info(profile_settings)`);
      const hasPhoneNumber = tableInfo && tableInfo.some(col => col.name === 'phone_number');
      
      if (!hasPhoneNumber) {
        // Add phone_number column to profile_settings table
        await db.run(`
          ALTER TABLE profile_settings 
          ADD COLUMN phone_number TEXT DEFAULT NULL
        `);
        console.log('✅ Added phone_number column to profile_settings');
      } else {
        console.log('ℹ️ phone_number column already exists, skipping');
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  down: async (db) => {
    console.log('📝 Rolling back migration: add_phone_number_to_profile');
    
    try {
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      await db.run(`
        CREATE TABLE profile_settings_backup AS 
        SELECT id, name, title, bio, email, linkedin, profilePicture, cvFiles, updated_at 
        FROM profile_settings
      `);
      
      await db.run(`DROP TABLE profile_settings`);
      
      await db.run(`
        CREATE TABLE profile_settings (
          id INTEGER PRIMARY KEY,
          name TEXT,
          title TEXT,
          bio TEXT,
          email TEXT,
          linkedin TEXT,
          profilePicture TEXT,
          cvFiles TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await db.run(`
        INSERT INTO profile_settings 
        SELECT * FROM profile_settings_backup
      `);
      
      await db.run(`DROP TABLE profile_settings_backup`);
      
      console.log('✅ Rolled back phone_number column');
      return { success: true };
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = migration;
