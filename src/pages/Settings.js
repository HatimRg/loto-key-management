import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Moon, Sun, Wifi, WifiOff, Download, Upload, Trash2, User, X, Database, Save, Info, Edit2, CheckCircle, Wrench, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Footer from '../components/Footer';
import db from '../utils/database';
import { useToast } from '../context/ToastContext';
import packageJson from '../../package.json';
import { nukeAllOperationalData } from '../utils/nukeHelper';
import { APP_CONFIG } from '../utils/constants';
import logger from '../utils/logger';
import { downloadActivityLog } from '../utils/downloadHelper';

// Safely access ipcRenderer with detailed debugging
console.log('[Settings] Checking window.ipcRenderer...');
console.log('[Settings] window object keys:', Object.keys(window).filter(k => k.includes('ipc') || k.includes('electron')));
console.log('[Settings] window.ipcRenderer:', window.ipcRenderer);

const ipcRenderer = window.ipcRenderer || null;
const useElectron = !!ipcRenderer;

// Detailed logging for debugging
console.log('[Settings] IPC Renderer available:', useElectron);
console.log('[Settings] IPC Renderer type:', typeof ipcRenderer);
console.log('[Settings] IPC Renderer has invoke:', ipcRenderer && typeof ipcRenderer.invoke === 'function');

if (!useElectron) {
  console.error('[Settings] ❌ ELECTRON IPC NOT AVAILABLE!');
  console.error('[Settings] Make sure you are running: npm run electron-dev');
  console.error('[Settings] NOT running: npm start');
} else {
  console.log('[Settings] ✅ Electron IPC is properly loaded');
}

function Settings() {
  const navigate = useNavigate();
  const { config, loadConfig, userMode, isOnline } = useApp();
  const { showToast } = useToast();
  const isAdminEditor = userMode === 'AdminEditor';
  const isRestricted = userMode === 'RestrictedEditor';
  const [formData, setFormData] = useState({
    ADMIN_ACCESS_CODE: '010203',
    RESTRICTED_ACCESS_CODE: 'sgtm123',
    SUPABASE_URL: '',
    SUPABASE_KEY: '',
    AUTO_SYNC_ENABLED: true
  });
  const [appInfo, setAppInfo] = useState({
    name: APP_CONFIG.name,
    version: APP_CONFIG.version
  });
  const [editingAppInfo, setEditingAppInfo] = useState(false);
  const [dbStats, setDbStats] = useState({
    breakers: 0,
    personnel: 0,
    locks: 0,
    plans: 0,
    activities: 0
  });
  const [showNukeModal, setShowNukeModal] = useState(false);
  const [nukeCode, setNukeCode] = useState('');
  const [nukeError, setNukeError] = useState('');
  const [isNuking, setIsNuking] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [paths, setPaths] = useState(null);
  const [dependencies, setDependencies] = useState(null);
  const [logs, setLogs] = useState('');
  const [repairMessage, setRepairMessage] = useState('');

  useEffect(() => {
    // Warn if Electron is not available
    if (!useElectron) {
      showToast('⚠️ Running in browser mode - Some features unavailable', 'error', 5000);
      console.error('Electron IPC not available. Make sure you are running the Electron app, not just the web server.');
    }
    
    if (config) {
      setFormData({ 
        ADMIN_ACCESS_CODE: config.ADMIN_ACCESS_CODE || config.ACCESS_CODE || '010203',
        RESTRICTED_ACCESS_CODE: config.RESTRICTED_ACCESS_CODE || 'sgtm123',
        SUPABASE_URL: config.SUPABASE_URL || 'https://qrjkgvglorotucerfspt.supabase.co',
        SUPABASE_KEY: config.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok',
        AUTO_SYNC_ENABLED: config.AUTO_SYNC_ENABLED !== undefined ? config.AUTO_SYNC_ENABLED : true
      });
    }
    loadPaths();
    loadDependencies();
    loadLogs();
    loadDbStats();
  }, [config]);

  const loadDbStats = async () => {
    try {
      const [breakers, personnel, lockInventory, plans, activities] = await Promise.all([
        db.getBreakers(),
        db.getPersonnel(),
        db.getLockInventory(), // Get total capacity from lock_inventory
        db.getPlans(),
        db.getHistory(1000) // Get total count
      ]);
      
      setDbStats({
        breakers: breakers.success ? breakers.data.length : 0,
        personnel: personnel.success ? personnel.data.length : 0,
        locks: lockInventory.success && lockInventory.data ? (lockInventory.data.total_capacity || 0) : 0, // Use total_capacity
        plans: plans.success ? plans.data.length : 0,
        activities: activities.success ? activities.data.length : 0
      });
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const loadPaths = async () => {
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('get-paths');
      if (result.success) {
        setPaths(result.data);
      }
    }
  };

  const loadDependencies = async () => {
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('check-dependencies');
      if (result.success) {
        setDependencies(result.data);
      }
    }
  };

  const loadLogs = async () => {
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('read-logs', 50);
      if (result.success) {
        setLogs(result.data);
      }
    }
  };

  const handleDownloadLogs = async () => {
    await logger.info('Download logs requested');
    
    const result = await downloadActivityLog();
    if (result.success) {
      showToast('Activity log downloaded successfully', 'success');
    } else {
      showToast(`Failed to download logs: ${result.error}`, 'error');
    }
  };

  const handleRepairDatabase = async () => {
    if (window.confirm('This will check and repair database integrity. Continue?')) {
      if (ipcRenderer) {
        showToast('Checking database integrity...', 'info', 2000);
        await logger.info('Repair database', { userMode: 'Editor' });
        const result = await ipcRenderer.invoke('repair-database');
        if (result.success) {
          setRepairMessage(result.message);
          showToast(result.message, 'success');
          setTimeout(() => setRepairMessage(''), 5000);
        } else {
          setRepairMessage('Error: ' + result.error);
          showToast('Error: ' + result.error, 'error');
          setTimeout(() => setRepairMessage(''), 5000);
        }
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('save-config', formData);
      if (result.success) {
        setSaveMessage('Configuration saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
        loadConfig();
      } else {
        setSaveMessage('Error saving configuration');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    }
  };

  const handleNuke = async () => {
    const correctCode = config?.ADMIN_ACCESS_CODE || config?.ACCESS_CODE || '010203';
    
    // Validate access code
    if (nukeCode !== correctCode) {
      setNukeError('Incorrect Admin Editor access code');
      return;
    }

    // Clear any previous errors
    setNukeError('');

    // Final confirmation
    if (!window.confirm('⚠️ FINAL WARNING: This will delete ALL data including breakers, locks, personnel, plans, and files. You will have 5 seconds to undo. Are you absolutely sure?')) {
      setShowNukeModal(false);
      setNukeCode('');
      return;
    }

    // Start nuking process
    setIsNuking(true);
    console.log('Starting nuke operation...');

    if (!ipcRenderer) {
      console.error('IPC Renderer not available');
      setIsNuking(false);
      showToast('Error: Electron IPC not available', 'error');
      return;
    }

    try {
      // Use new nuke helper that syncs to Supabase
      console.log('Starting cloud-synced nuke operation...');
      const result = await nukeAllOperationalData();
      console.log('Nuke result:', result);
      
      if (!result.success) {
        setIsNuking(false);
        setShowNukeModal(false);
        setNukeCode('');
        showToast('Error deleting data: ' + (result.error || 'Unknown error'), 'error');
        return;
      }

      // Success - close modal immediately
      console.log('Nuke successful, closing modal...');
      setShowNukeModal(false);
      setNukeCode('');
      setNukeError('');
      setIsNuking(false);
      
      // Show success toast
      showToast(
        'All operational data has been cleared from both local database and Supabase. Profile and settings preserved.',
        'success',
        5000
      );
      
      // Wait a moment then finalize (delete physical files)
      setTimeout(async () => {
        try {
          if (ipcRenderer) {
            await ipcRenderer.invoke('finalize-nuke');
            console.log('✅ Physical files cleaned up');
          }
        } catch (error) {
          console.error('❌ Finalize error:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Nuke operation error:', error);
      setIsNuking(false);
      setShowNukeModal(false);
      setNukeCode('');
      showToast('Error during nuke operation: ' + error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
          <SettingsIcon className="w-7 h-7 text-gray-600 dark:text-gray-400" />
          <span>Settings</span>
        </h1>
      </div>

      {/* Restricted Access Warning */}
      {isRestricted && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <X className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">Read-Only Access</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">You can view settings but cannot modify them.</p>
            </div>
          </div>
        </div>
      )}

      {/* Access Code Configuration - Admin Editor Only */}
      {isAdminEditor && !isRestricted && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Security Settings</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure the access codes for Admin Editor and Restricted Editor authentication.
          </p>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Editor Access Code
              </label>
              <input
                type="password"
                value={formData.ADMIN_ACCESS_CODE}
                onChange={(e) => setFormData({...formData, ADMIN_ACCESS_CODE: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter new admin access code"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Full access to all features including Cloud Sync, Settings, and About Me
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Restricted Editor Access Code
              </label>
              <input
                type="password"
                value={formData.RESTRICTED_ACCESS_CODE}
                onChange={(e) => setFormData({...formData, RESTRICTED_ACCESS_CODE: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter new restricted editor code"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Can edit Breakers, Locks, Personnel, and Plans but cannot modify Cloud Sync, Settings, or About Me
              </p>
            </div>

            {/* Supabase Configuration */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-4 flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Supabase Configuration</span>
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supabase URL
                </label>
                <input
                  type="text"
                  value={formData.SUPABASE_URL}
                  onChange={(e) => setFormData({...formData, SUPABASE_URL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supabase Anon Key
                </label>
                <textarea
                  value={formData.SUPABASE_KEY}
                  onChange={(e) => setFormData({...formData, SUPABASE_KEY: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
                  rows="3"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.AUTO_SYNC_ENABLED}
                    onChange={(e) => setFormData({...formData, AUTO_SYNC_ENABLED: e.target.checked})}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Auto-Sync</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automatically sync data changes to Supabase cloud</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">System Information</h2>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Database Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dbStats.breakers}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Breakers</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dbStats.personnel}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Personnel</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dbStats.locks}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Locks</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dbStats.plans}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Plans</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{dbStats.activities}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Activities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dependencies */}
      {dependencies && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Dependencies Status</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Node.js</p>
              <p className="font-semibold text-gray-900 dark:text-white">{dependencies.nodejs}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Electron</p>
              <p className="font-semibold text-gray-900 dark:text-white">{dependencies.electron}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <p className="text-gray-500 dark:text-gray-400 text-xs">SQLite</p>
              <p className="font-semibold text-gray-900 dark:text-white">{dependencies.sqlite}</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Logs - Available to All Users */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Activity Logs</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Download the last 10 minutes of application activity logs (console output)
        </p>
        <button
          onClick={handleDownloadLogs}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download the complete activity log history</span>
        </button>
      </div>

      {/* Maintenance Tools - Admin Editor Only */}
      {isAdminEditor && !isRestricted && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Database Maintenance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRepairDatabase}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Wrench className="w-4 h-4" />
                <span>Repair Database</span>
              </button>
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Logs</span>
              </button>
            </div>
            {repairMessage && (
              <div className={`p-3 rounded-lg ${repairMessage.includes('Error') ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'}`}>
                {repairMessage}
              </div>
            )}
            {logs && (
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap select-text">{logs || 'No logs available'}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone - Admin Editor Only + Electron Only */}
      {isAdminEditor && !isRestricted && ipcRenderer && (
        <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg shadow-md border-2 border-red-300 dark:border-red-800 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">Danger Zone</h2>
          </div>
          
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            ⚠️ Warning: These actions are irreversible and will permanently delete all data.
          </p>

          <button
            onClick={isOnline && !isNuking ? () => setShowNukeModal(true) : undefined}
            disabled={isNuking || !isOnline}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isNuking || !isOnline
                ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
            }`}
            title={!isOnline ? '⚠️ App is offline - Connect to internet to delete data' : isNuking ? 'Deleting...' : 'Delete all operational data'}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isNuking ? 'Deleting Data...' : 'Delete All Data (Nuke Database)'}</span>
          </button>
        </div>
      )}

      {/* Browser Mode Warning - Show when not in Electron */}
      {isAdminEditor && !isRestricted && !ipcRenderer && (
        <div className="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg shadow-md border-2 border-yellow-300 dark:border-yellow-800 p-6">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400">Browser Mode</h2>
          </div>
          
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ You are running in browser mode. Some features (like Nuke Data, file system operations, and persistent configuration) are only available in the Electron desktop app.
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            💡 Use <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">npm run electron-dev</code> to start the full desktop application.
          </p>
        </div>
      )}

      {/* Nuke Confirmation Modal */}
      {showNukeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border-4 border-red-500">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">⚠️ DANGER ZONE ⚠️</h2>
            </div>
            
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 dark:bg-opacity-30 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300 font-semibold mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                <li>All breakers and their history</li>
                <li>All locks inventory</li>
                <li>All personnel records</li>
                <li>All electrical plans</li>
                <li>All PDF certificates and files</li>
                <li>All audit logs</li>
              </ul>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-semibold">
              This action CANNOT be undone!
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter Editor Access Code to confirm:
              </label>
              <input
                type="password"
                value={nukeCode}
                onChange={(e) => {
                  setNukeCode(e.target.value);
                  setNukeError('');
                }}
                className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter access code"
                autoFocus
              />
              {nukeError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{nukeError}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleNuke}
                disabled={isNuking}
                className={`flex-1 ${isNuking ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white py-2 rounded-lg font-medium transition-colors`}
              >
                {isNuking ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button
                onClick={() => {
                  setShowNukeModal(false);
                  setNukeCode('');
                  setNukeError('');
                }}
                disabled={isNuking}
                className={`flex-1 ${isNuking ? 'opacity-50 cursor-not-allowed' : ''} bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white py-2 rounded-lg font-medium transition-colors`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-md border border-blue-200 dark:border-gray-600 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">About</h2>
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Company</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">SGTM</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">System Name</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white">LOTO Key Management System (KMS)</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              An internal SGTM application developed to digitalize the Lockout Tagout (LOTO) key management process — ensuring safety, traceability, and operational control.
            </p>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Version {packageJson.version}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 {packageJson.author} - All rights reserved</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Settings;
