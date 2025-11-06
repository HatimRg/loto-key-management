import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Database, RefreshCw, Settings, Upload, Download, Check, X, Loader, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { initializeSupabase, testConnection, syncEverything, importFromSupabase, BUCKETS } from '../utils/supabaseSync';
import { initAutoSync, setAutoSync, isAutoSyncEnabled } from '../utils/autoSync';

function SupabaseSettings() {
  const { showToast } = useToast();
  const { userMode, config: appConfig, isOnline } = useApp();
  const isAdminEditor = userMode === 'AdminEditor';
  const isRestricted = userMode === 'RestrictedEditor';

  const [config, setConfig] = useState({
    url: 'https://qrjkgvglorotucerfspt.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyamtndmdsb3JvdHVjZXJmc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTAwNDcsImV4cCI6MjA3NzY2NjA0N30.6zdPTeIIWN_uQc-SPEYkHLmaGIUY-42c3mOTqdycfok'
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ stage: '', progress: 0 });
  const [importProgress, setImportProgress] = useState({ stage: '', progress: 0 });
  const [lastSync, setLastSync] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(false);

  useEffect(() => {
    loadConfig();
    loadLastSyncTime();
    
    // Initialize auto-sync with config
    const enabled = initAutoSync(appConfig);
    setAutoSyncEnabledState(enabled);
    
    // Listen for auto-sync completion events
    const handleAutoSyncComplete = (event) => {
      if (event.detail.success) {
        showToast('✅ Auto-sync completed', 'success');
        setLastSync(new Date());
        localStorage.setItem('last_sync_time', new Date().toISOString());
      } else {
        showToast(`❌ Auto-sync failed: ${event.detail.error}`, 'error');
      }
    };
    
    window.addEventListener('autoSyncComplete', handleAutoSyncComplete);
    
    return () => {
      window.removeEventListener('autoSyncComplete', handleAutoSyncComplete);
    };
  }, []);

  const loadConfig = () => {
    const saved = localStorage.getItem('supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        if (parsed.url && parsed.anonKey) {
          initializeSupabase(parsed.url, parsed.anonKey);
        }
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
  };

  const loadLastSyncTime = () => {
    const saved = localStorage.getItem('last_sync_time');
    if (saved) {
      setLastSync(new Date(saved));
    }
  };

  const saveConfig = () => {
    if (!config.url || !config.anonKey) {
      showToast('Please provide both URL and Anon Key', 'error');
      return;
    }

    localStorage.setItem('supabase_config', JSON.stringify(config));
    const result = initializeSupabase(config.url, config.anonKey);
    
    if (result.success) {
      showToast('Configuration saved successfully', 'success');
    } else {
      showToast('Failed to save configuration', 'error');
    }
  };

  const handleTestConnection = async () => {
    if (!config.url || !config.anonKey) {
      showToast('Please provide URL and Anon Key first', 'warning');
      return;
    }

    setIsTesting(true);
    
    // Initialize first
    initializeSupabase(config.url, config.anonKey);
    
    // Test connection
    const result = await testConnection();
    
    setIsTesting(false);
    setIsConnected(result.success);

    if (result.success) {
      showToast('✅ Connected to Supabase successfully!', 'success');
    } else {
      showToast(`❌ Connection failed: ${result.error}`, 'error');
    }
  };

  const handleSyncEverything = async () => {
    if (!isConnected) {
      showToast('Please test connection first', 'warning');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ stage: 'starting', progress: 0 });

    const result = await syncEverything((progress) => {
      setSyncProgress(progress);
    });

    setIsSyncing(false);

    if (result.success) {
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('last_sync_time', now.toISOString());
      setSyncResults(result);
      showToast(`✅ ${result.message}`, 'success', 5000);
    } else {
      showToast(`❌ Sync failed: ${result.error}`, 'error');
    }
  };

  const handleImportFromSupabase = async () => {
    if (!isConnected) {
      showToast('Please test connection first', 'warning');
      return;
    }

    if (!window.confirm('⚠️ This will import data from Supabase and may overwrite local changes. Continue?')) {
      return;
    }

    setIsImporting(true);
    setImportProgress({ stage: 'starting', progress: 0 });

    const result = await importFromSupabase((progress) => {
      setImportProgress(progress);
    });

    setIsImporting(false);

    if (result.success) {
      setImportResults(result);
      showToast(`✅ ${result.message}`, 'success', 5000);
      // Reload the page to refresh all data
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showToast(`❌ Import failed: ${result.error}`, 'error');
    }
  };

  const handleToggleAutoSync = () => {
    const newValue = !autoSyncEnabled;
    setAutoSync(newValue);
    setAutoSyncEnabledState(newValue);
    
    if (newValue) {
      showToast('✅ Auto-sync enabled - Changes will sync automatically', 'success');
    } else {
      showToast('⏸️ Auto-sync disabled', 'info');
    }
  };

  const getProgressText = () => {
    switch (syncProgress.stage) {
      case 'connecting':
        return 'Connecting to Supabase...';
      case 'database':
        return 'Syncing database tables...';
      case 'files':
        return 'Uploading files...';
      case 'complete':
        return 'Sync complete!';
      default:
        return 'Preparing...';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <Cloud className="w-8 h-8 mr-3 text-blue-600" />
          Supabase Cloud Sync
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Sync all your data to Supabase cloud storage
        </p>
      </div>

      {/* Restricted Access Warning */}
      {isRestricted && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <X className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">Read-Only Access</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">You can view settings but cannot modify Cloud Sync configuration.</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuration
          </h2>
          {isConnected && (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Connected
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supabase URL
            </label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://your-project.supabase.co"
              disabled={!isAdminEditor || isRestricted}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Anon Key
            </label>
            <input
              type="password"
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              disabled={!isAdminEditor || isRestricted}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Find this in your Supabase project settings → API
            </p>
          </div>

          {isAdminEditor && !isRestricted && (
            <div className="flex space-x-3">
              <button
                onClick={saveConfig}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Save Configuration
              </button>

              <button
                onClick={handleTestConnection}
                disabled={isTesting || !config.url || !config.anonKey}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center"
              >
                {isTesting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    {isConnected ? <Check className="w-4 h-4 mr-2" /> : <Cloud className="w-4 h-4 mr-2" />}
                    Test Connection
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-4">
          <RefreshCw className="w-5 h-5 mr-2" />
          Sync Status
        </h2>

        <div className="space-y-4">
          {/* Auto-Sync Toggle */}
          {isAdminEditor && !isRestricted && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-3">
                <Zap className={`w-5 h-5 ${autoSyncEnabled ? 'text-yellow-500' : 'text-gray-400'}`} />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Auto-Sync</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {autoSyncEnabled ? 'Changes sync automatically after 3 seconds' : 'Manual sync only'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleAutoSync}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {lastSync && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Last Sync:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {lastSync.toLocaleString()}
              </span>
            </div>
          )}

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{getProgressText()}</span>
                <span className="font-medium text-blue-600">{syncProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${syncProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Importing: {importProgress.stage}</span>
                <span className="font-medium text-green-600">{importProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {isAdminEditor && !isRestricted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={isOnline && isConnected ? handleSyncEverything : undefined}
                disabled={isSyncing || isImporting || !isConnected || !isOnline}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center"
                title={!isOnline ? '⚠️ App is offline - Connect to internet to sync' : !isConnected ? 'Test connection first' : 'Upload all data to cloud'}
              >
                {isSyncing ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload to Cloud
                  </>
                )}
              </button>
              
              <button
                onClick={isOnline && isConnected ? handleImportFromSupabase : undefined}
                disabled={isSyncing || isImporting || !isConnected || !isOnline}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center"
                title={!isOnline ? '⚠️ App is offline - Connect to internet to sync' : !isConnected ? 'Test connection first' : 'Import all data from cloud'}
              >
                {isImporting ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Import from Cloud
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* What Gets Synced */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-4">
          <Database className="w-5 h-5 mr-2" />
          What Gets Synced
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📊 Database Tables</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Breakers (with subzone, special_use, date)</li>
              <li>• Locks inventory</li>
              <li>• Personnel records</li>
              <li>• Electrical plans metadata</li>
              <li>• Activity history</li>
              <li>• Profile settings</li>
              <li>• App settings</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">📁 Files</h3>
            <ul className="text-sm text-purple-800 dark:text-purple-400 space-y-1">
              <li>• Profile pictures</li>
              <li>• CV/Resume PDFs</li>
              <li>• Personnel certificates</li>
              <li>• Electrical plan PDFs</li>
              <li>• Excel templates</li>
              <li>• Application logs</li>
            </ul>
          </div>
        </div>

        {syncResults && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">✅ Last Sync Results</h3>
            <div className="text-sm text-green-800 dark:text-green-400">
              <p>Duration: {syncResults.duration}s</p>
              {syncResults.database && (
                <p>Database: {Object.keys(syncResults.database.results || {}).length} tables synced</p>
              )}
              {syncResults.files && (
                <p>
                  Files: {(syncResults.files.profilePictures?.length || 0) + 
                         (syncResults.files.cvFiles?.length || 0) + 
                         (syncResults.files.personnelCerts?.length || 0) + 
                         (syncResults.files.electricalPlans?.length || 0)} files uploaded
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupabaseSettings;
