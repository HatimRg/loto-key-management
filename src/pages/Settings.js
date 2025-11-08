import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Moon, Sun, Wifi, WifiOff, Download, Upload, Trash2, User, X, Database, Save, Info, Edit2, CheckCircle, Wrench, RefreshCw, AlertTriangle, Check, AlertCircle, Bell, BellOff, Play, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Footer from '../components/Footer';
import db from '../utils/database';
import { useToast } from '../context/ToastContext';
import packageJson from '../../package.json';
import { nukeAllOperationalData, nukeSelectedTables } from '../utils/nukeHelper';
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
  const updateCheckTimeoutRef = useRef(null);
  const [formData, setFormData] = useState({
    ADMIN_ACCESS_CODE: '010203',
    RESTRICTED_ACCESS_CODE: 'sgtm123'
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
  const [nukeTables, setNukeTables] = useState({
    breakers: true,
    locks: true,
    personnel: true,
    plans: true,
    history: true,
    sync_queue: true
  });
  const [saveMessage, setSaveMessage] = useState('');
  const [paths, setPaths] = useState(null);
  const [dependencies, setDependencies] = useState(null);
  const [logs, setLogs] = useState('');
  const [repairMessage, setRepairMessage] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState(null); // 'available', 'up-to-date', 'error'
  const [showUpdateControlModal, setShowUpdateControlModal] = useState(false);
  const [updateControlVersion, setUpdateControlVersion] = useState('');
  const [updateControlEnabled, setUpdateControlEnabled] = useState(false);
  const [loadingUpdateControl, setLoadingUpdateControl] = useState(false);

  useEffect(() => {
    // Warn if Electron is not available
    if (!useElectron) {
      showToast('⚠️ Running in browser mode - Some features unavailable', 'error', 5000);
      console.error('Electron IPC not available. Make sure you are running the Electron app, not just the web server.');
    }
    
    if (config) {
      setFormData({ 
        ADMIN_ACCESS_CODE: config.ADMIN_ACCESS_CODE || config.ACCESS_CODE || '010203',
        RESTRICTED_ACCESS_CODE: config.RESTRICTED_ACCESS_CODE || 'sgtm123'
      });
    }
    loadPaths();
    loadDependencies();
    loadLogs();
    loadDbStats();
    loadUpdateControlState();
    
    // Listen for update check results
    // NOTE: Only listen to update-not-available here
    // UpdateNotification.js handles update-available and update-error to show popup
    if (ipcRenderer) {
      const handleUpdateNotAvailable = () => {
        console.log('✅ App is up to date');
        if (updateCheckTimeoutRef.current) {
          clearTimeout(updateCheckTimeoutRef.current);
          updateCheckTimeoutRef.current = null;
        }
        setUpdateCheckResult('up-to-date');
        setCheckingUpdate(false);
        showToast('You are running the latest version', 'success');
      };
      
      // Listen for update available (for UI state only, UpdateNotification shows popup)
      const handleUpdateAvailable = (event, info) => {
        console.log('✅ Update available (Settings UI state):', info);
        if (updateCheckTimeoutRef.current) {
          clearTimeout(updateCheckTimeoutRef.current);
          updateCheckTimeoutRef.current = null;
        }
        setUpdateCheckResult('available');
        setCheckingUpdate(false);
        // Don't show toast - UpdateNotification will show popup
      };
      
      const handleUpdateError = (event, error) => {
        console.error('❌ Update check failed:', error);
        if (updateCheckTimeoutRef.current) {
          clearTimeout(updateCheckTimeoutRef.current);
          updateCheckTimeoutRef.current = null;
        }
        setUpdateCheckResult('error');
        setCheckingUpdate(false);
        // Don't show toast if UpdateNotification is handling it
      };
      
      ipcRenderer.on('update-not-available', handleUpdateNotAvailable);
      ipcRenderer.on('update-available', handleUpdateAvailable);
      ipcRenderer.on('update-error', handleUpdateError);
      
      return () => {
        // Clear timeout on unmount
        if (updateCheckTimeoutRef.current) {
          clearTimeout(updateCheckTimeoutRef.current);
          updateCheckTimeoutRef.current = null;
        }
        
        ipcRenderer.removeListener('update-not-available', handleUpdateNotAvailable);
        ipcRenderer.removeListener('update-available', handleUpdateAvailable);
        ipcRenderer.removeListener('update-error', handleUpdateError);
      };
    }
  }, [config]);

  const loadUpdateControlState = async () => {
    // Hardcoded Supabase credentials
    const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok';
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Simple: Just get the row with id=1 (only one row exists)
      const { data, error } = await supabase
        .from('update_control')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading update control state:', error);
        return;
      }
      
      if (data) {
        setUpdateControlEnabled(data.is_update_available);
        setUpdateControlVersion(data.version_number || '');
      }
    } catch (error) {
      console.error('Error loading update control:', error);
    }
  };

  const handleUpdateControlToggle = () => {
    if (updateControlEnabled) {
      // Disable update control
      disableUpdateControl();
    } else {
      // Show modal to enable
      setShowUpdateControlModal(true);
    }
  };

  const enableUpdateControl = async () => {
    // Hardcoded Supabase credentials
    const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok';
    
    if (!updateControlVersion.trim()) {
      showToast('❌ Please enter a version number', 'error');
      return;
    }
    
    setLoadingUpdateControl(true);
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Simple: Just update the row with id=1 (only one row exists)
      const { error } = await supabase
        .from('update_control')
        .update({
          is_update_available: true,
          version_number: updateControlVersion.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      setUpdateControlEnabled(true);
      setShowUpdateControlModal(false);
      showToast(`✅ Update notification enabled for v${updateControlVersion.trim()}`, 'success');
      logger.log('Admin enabled update control', {
        version: updateControlVersion.trim(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error enabling update control:', error);
      showToast('❌ Failed to enable update notification', 'error');
    } finally {
      setLoadingUpdateControl(false);
    }
  };

  const disableUpdateControl = async () => {
    // Hardcoded Supabase credentials
    const supabaseUrl = 'https://qrjkgvglorotucerfspt.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok';
    
    setLoadingUpdateControl(true);
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Simple: Just update the row with id=1 (only one row exists)
      const { error } = await supabase
        .from('update_control')
        .update({
          is_update_available: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      setUpdateControlEnabled(false);
      setUpdateControlVersion('');
      showToast('✅ Update notification disabled', 'success');
      logger.log('Admin disabled update control', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error disabling update control:', error);
      showToast('❌ Failed to disable update notification', 'error');
    } finally {
      setLoadingUpdateControl(false);
    }
  };

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

    // Check if at least one table is selected
    const hasSelection = Object.values(nukeTables).some(v => v);
    if (!hasSelection) {
      setNukeError('Please select at least one table to delete');
      return;
    }

    // Start nuking process (no second confirmation needed)
    setIsNuking(true);
    console.log('Starting selective nuke operation...', nukeTables);

    if (!ipcRenderer) {
      console.error('IPC Renderer not available');
      setIsNuking(false);
      showToast('Error: Electron IPC not available', 'error');
      return;
    }

    try {
      // Use selective nuke helper
      const result = await nukeSelectedTables(nukeTables);
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
      // Reset toggles to all selected for next time
      setNukeTables({
        breakers: true,
        locks: true,
        personnel: true,
        plans: true,
        history: true,
        sync_queue: true
      });
      
      // Show success toast
      const deletedTables = Object.entries(nukeTables)
        .filter(([_, selected]) => selected)
        .map(([name]) => name)
        .join(', ');
      showToast(
        `Selected data cleared: ${deletedTables}. Refreshing app...`,
        'success',
        3000
      );
      
      // Wait a moment then finalize and reload
      setTimeout(async () => {
        try {
          if (ipcRenderer) {
            await ipcRenderer.invoke('finalize-nuke');
            console.log('✅ Physical files cleaned up');
          }
          
          // Force full app reload to clear all cached data
          console.log('🔄 Reloading app to refresh data...');
          window.location.reload();
        } catch (error) {
          console.error('❌ Finalize error:', error);
          // Still reload even if finalize fails
          window.location.reload();
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

      {/* Walkthrough Guide - Visitor and RestrictedEditor */}
      {(userMode === 'visitor' || userMode === 'RestrictedEditor') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            {userMode === 'visitor' ? (
              <RotateCcw className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Visite Guidée</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {userMode === 'visitor' 
              ? 'Redémarrer la visite guidée pour revoir toutes les fonctionnalités de l\'application.' 
              : 'Lancer la visite guidée pour découvrir toutes les fonctionnalités de l\'application.'}
          </p>
          <button
            onClick={() => {
              if (userMode === 'visitor') {
                // Visitor: Clear localStorage and reload
                localStorage.removeItem('visitor_walkthrough_completed');
                showToast('✓ Visite guidée redémarrée! Rechargez la page pour commencer.', 'success');
                setTimeout(() => window.location.reload(), 1500);
              } else {
                // RestrictedEditor: Dispatch event to start tour immediately
                localStorage.removeItem('visitor_walkthrough_completed');
                showToast('✓ Visite guidée démarrée!', 'success');
                setTimeout(() => {
                  window.dispatchEvent(new Event('start-restricted-tour'));
                }, 500);
              }
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            {userMode === 'visitor' ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Redémarrer la Visite</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Démarrer la Visite</span>
              </>
            )}
          </button>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border-4 border-red-500 animate-scaleIn">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">⚠️ DANGER ZONE ⚠️</h2>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-semibold">
              Select which tables to delete:
            </p>

            {/* All Toggle */}
            <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Object.values(nukeTables).every(v => v)}
                  onChange={(e) => {
                    const allSelected = e.target.checked;
                    setNukeTables({
                      breakers: allSelected,
                      locks: allSelected,
                      personnel: allSelected,
                      plans: allSelected,
                      history: allSelected,
                      sync_queue: allSelected
                    });
                  }}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-bold text-gray-900 dark:text-white">Select All Tables</span>
              </label>
            </div>

            {/* Individual Table Toggles */}
            <div className="mb-4 space-y-2 max-h-64 overflow-y-auto">
              {[
                { key: 'breakers', label: 'Breakers', desc: 'All breakers and their history' },
                { key: 'locks', label: 'Lock Inventory', desc: 'Reset lock inventory count to 0' },
                { key: 'personnel', label: 'Personnel', desc: 'All personnel records and certificates' },
                { key: 'plans', label: 'Electrical Plans', desc: 'All electrical plan PDFs' },
                { key: 'history', label: 'Audit History', desc: 'All activity logs' },
                { key: 'sync_queue', label: 'Sync Queue', desc: 'Pending cloud sync operations' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg border border-red-200 dark:border-red-800">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nukeTables[key]}
                      onChange={(e) => setNukeTables({ ...nukeTables, [key]: e.target.checked })}
                      className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">{label}</span>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{desc}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-semibold text-center">
              ⚠️ This action CANNOT be undone!
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter Admin Access Code to START DELETION:
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                ⚠️ Clicking "Delete Selected Tables" will immediately start the deletion process
              </p>
              <input
                type="password"
                value={nukeCode}
                onChange={(e) => {
                  setNukeCode(e.target.value);
                  setNukeError('');
                }}
                className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter admin code"
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
                {isNuking ? 'Deleting...' : 'Delete Selected Tables'}
              </button>
              <button
                onClick={() => {
                  setShowNukeModal(false);
                  setNukeCode('');
                  setNukeError('');
                  // Reset toggles to all selected for next time
                  setNukeTables({
                    breakers: true,
                    locks: true,
                    personnel: true,
                    plans: true,
                    history: true,
                    sync_queue: true
                  });
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

      {/* Update Control Modal */}
      {showUpdateControlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-orange-500 dark:border-orange-400">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Alert All Users</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Force update notification</p>
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                This will show an update notification to <strong>all users</strong> when they launch the app.
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ⚠️ Use this to alert users about important updates or maintenance.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version Number
              </label>
              <input
                type="text"
                value={updateControlVersion}
                onChange={(e) => setUpdateControlVersion(e.target.value)}
                placeholder="e.g., 1.8.0 or 2.0.0-beta"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loadingUpdateControl}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter any version format - no strict validation
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={enableUpdateControl}
                disabled={loadingUpdateControl || !updateControlVersion.trim()}
                className={`flex-1 ${
                  loadingUpdateControl || !updateControlVersion.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                } text-white py-3 px-4 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2`}
              >
                {loadingUpdateControl ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Enable Alert</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowUpdateControlModal(false);
                  setUpdateControlVersion('');
                }}
                disabled={loadingUpdateControl}
                className={`flex-1 ${
                  loadingUpdateControl ? 'opacity-50 cursor-not-allowed' : ''
                } bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white py-3 px-4 rounded-lg font-medium transition-colors`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Software Updates Section */}
      {ipcRenderer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Software Updates</h2>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Current Version</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">v{packageJson.version}</p>
              </div>
              {updateCheckResult === 'available' && (
                <span className="flex items-center space-x-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <Check className="w-4 h-4" />
                  <span>Update available</span>
                </span>
              )}
              {updateCheckResult === 'up-to-date' && (
                <span className="flex items-center space-x-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span>Up to date</span>
                </span>
              )}
              {updateCheckResult === 'error' && (
                <span className="flex items-center space-x-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  <span>Check failed</span>
                </span>
              )}
            </div>
            
            <div className={`grid ${isAdminEditor ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              <button
                onClick={(e) => {
                  // Debug mode: Ctrl+Shift+Click (Admin only) to trigger mock update notification
                  if (e.ctrlKey && e.shiftKey && isAdminEditor) {
                    console.log('🐛 Debug mode: Triggering mock update installer with CMD UI');
                    showToast('🐛 Debug: Opening mock update installer...', 'info');
                    // Dispatch custom event for UpdateNotification component
                    const mockInfo = {
                      version: '999.9.9',
                      releaseNotes: 'Debug update to preview the CMD-style installer UI',
                      releaseDate: new Date().toISOString()
                    };
                    const event = new CustomEvent('mock-update-available', { detail: mockInfo });
                    window.dispatchEvent(event);
                    return;
                  }
                  
                  // Normal update check
                  setCheckingUpdate(true);
                  setUpdateCheckResult(null);
                  console.log('🔍 Manual update check triggered');
                  showToast('Checking for updates...', 'info');
                  // Clear localStorage snooze if exists
                  localStorage.removeItem('update_snooze_until');
                  // Force update check via IPC - use window.ipcRenderer directly
                  if (window.ipcRenderer && window.ipcRenderer.send) {
                    window.ipcRenderer.send('check-for-updates');
                  } else {
                    console.error('❌ ipcRenderer.send not available');
                    showToast('Update check failed - IPC not available', 'error');
                    setCheckingUpdate(false);
                    return;
                  }
                  // Auto-reset after 15 seconds if no response
                  // Clear any existing timeout
                  if (updateCheckTimeoutRef.current) {
                    clearTimeout(updateCheckTimeoutRef.current);
                  }
                  updateCheckTimeoutRef.current = setTimeout(() => {
                    setCheckingUpdate(false);
                    setUpdateCheckResult('error');
                    showToast('Update check timed out', 'error');
                    updateCheckTimeoutRef.current = null;
                  }, 15000);
                }}
                disabled={checkingUpdate}
                className={`py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  checkingUpdate
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-600 dark:text-gray-400'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
              
              {isAdminEditor && (
                <button
                  onClick={handleUpdateControlToggle}
                  disabled={loadingUpdateControl}
                  className={`py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    updateControlEnabled
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg'
                  } ${loadingUpdateControl ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {updateControlEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  <span>{loadingUpdateControl ? 'Loading...' : updateControlEnabled ? 'Disable Alert' : 'Alert Users'}</span>
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              {isAdminEditor ? '💡 Admin: Hold Ctrl+Shift on "Check" to preview UI • Use "Alert Users" to force update notification' : 'Checks GitHub for new releases'}
            </p>
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
