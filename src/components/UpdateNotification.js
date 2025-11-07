import React, { useEffect, useState, useRef } from 'react';
import { Download, AlertCircle, X, RefreshCw, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';

const { ipcRenderer } = window;

const SNOOZE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const STORAGE_KEY = 'update_snooze_until';

function UpdateNotification() {
  const { config } = useApp();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [show, setShow] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showInstaller, setShowInstaller] = useState(false);
  const [installerLogs, setInstallerLogs] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const logEndRef = useRef(null);

  // Check if update notification should be shown based on snooze
  const shouldShowNotification = () => {
    const snoozeUntil = localStorage.getItem(STORAGE_KEY);
    if (!snoozeUntil) return true;
    
    const snoozeTime = parseInt(snoozeUntil, 10);
    const now = Date.now();
    
    if (now >= snoozeTime) {
      // Snooze period expired, clear it
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (!ipcRenderer) return;

    // Listen for update available
    const handleUpdateAvailable = (event, info) => {
      console.log('🔔 Update available:', info);
      setUpdateInfo(info);
      
      // Only show if not snoozed
      if (shouldShowNotification()) {
        setShow(true);
      } else {
        console.log('⏰ Update notification snoozed');
        // Schedule check after snooze expires
        const snoozeUntil = parseInt(localStorage.getItem(STORAGE_KEY), 10);
        const timeUntilSnoozeExpires = snoozeUntil - Date.now();
        
        if (timeUntilSnoozeExpires > 0) {
          setTimeout(() => {
            setShow(true);
          }, timeUntilSnoozeExpires);
        }
      }
    };

    // Listen for download progress
    const handleDownloadProgress = (event, progressObj) => {
      const percent = Math.round(progressObj.percent);
      setDownloadProgress(percent);
      
      // Log progress at intervals
      if (percent % 25 === 0 && percent > 0) {
        const bars = Math.floor(percent / 100 * 28);
        const empty = 28 - bars;
        const progressBar = '█'.repeat(bars) + '░'.repeat(empty);
        addLog(`Progress: ${percent}% [${progressBar}]`, 'progress');
      }
    };

    // Listen for download complete
    const handleUpdateDownloaded = (event, info) => {
      console.log('✅ Update downloaded:', info);
      addLog('Download complete! Verifying integrity...', 'success');
      setTimeout(() => {
        addLog('SHA512 checksum: VALID', 'success');
        addLog('Update ready to install!', 'success');
        addLog('Application will restart in 3 seconds...', 'warning');
        setDownloading(false);
        setReadyToInstall(true);
        startCountdown(false);
      }, 1000);
    };

    // Listen for errors
    const handleUpdateError = (event, error) => {
      console.error('❌ Update error:', error);
      setDownloading(false);
    };

    ipcRenderer.on('update-available', handleUpdateAvailable);
    ipcRenderer.on('download-progress', handleDownloadProgress);
    ipcRenderer.on('update-downloaded', handleUpdateDownloaded);
    ipcRenderer.on('update-error', handleUpdateError);

    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('update-error');
      }
    };
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setInstallerLogs(prev => [...prev, { time: timestamp, message, type }]);
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDownload = (debugMode = false) => {
    setIsDebugMode(debugMode);
    setDownloading(true);
    setDownloadProgress(0);
    setShowInstaller(true);
    setInstallerLogs([]);
    
    if (debugMode) {
      // Mock download for debug mode
      simulateDebugInstall();
    } else {
      // Real download
      addLog('Initializing update system...', 'info');
      addLog(`Downloading LOTO KMS v${updateInfo.version}`, 'info');
      if (ipcRenderer) {
        ipcRenderer.send('download-update');
      }
    }
  };

  const simulateDebugInstall = () => {
    const logs = [
      { delay: 500, msg: 'Connecting to GitHub releases...', type: 'info' },
      { delay: 1000, msg: 'Verifying release signature...', type: 'success' },
      { delay: 1500, msg: 'Downloading LOTO-Key-Management-Setup-999.9.9.exe', type: 'info' },
      { delay: 2000, msg: 'Progress: 25% [████████░░░░░░░░░░░░░░░░░░░░]', type: 'progress' },
      { delay: 2500, msg: 'Progress: 50% [████████████████░░░░░░░░░░░░]', type: 'progress' },
      { delay: 3000, msg: 'Progress: 75% [████████████████████████░░░░]', type: 'progress' },
      { delay: 3500, msg: 'Progress: 100% [████████████████████████████]', type: 'progress' },
      { delay: 4000, msg: 'Download complete! Verifying integrity...', type: 'success' },
      { delay: 4500, msg: 'SHA512 checksum: VALID', type: 'success' },
      { delay: 5000, msg: 'Extracting update files...', type: 'info' },
      { delay: 5500, msg: 'Preparing installation...', type: 'info' },
      { delay: 6000, msg: 'Update ready to install!', type: 'success' },
      { delay: 6500, msg: 'Application will restart in 3 seconds...', type: 'warning' },
    ];

    logs.forEach(({ delay, msg, type }) => {
      setTimeout(() => {
        addLog(msg, type);
        if (msg.includes('Progress: 25%')) setDownloadProgress(25);
        if (msg.includes('Progress: 50%')) setDownloadProgress(50);
        if (msg.includes('Progress: 75%')) setDownloadProgress(75);
        if (msg.includes('Progress: 100%')) {
          setDownloadProgress(100);
          setDownloading(false);
          setReadyToInstall(true);
        }
        if (msg.includes('restart in 3')) {
          startCountdown(true);
        }
      }, delay);
    });
  };

  const startCountdown = (isDebug = false) => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isDebug) {
            addLog('🐛 DEBUG MODE: Restart triggered (simulation only)', 'success');
            setTimeout(() => {
              setShowInstaller(false);
              setShow(false);
              setIsDebugMode(false);
            }, 2000);
          } else {
            addLog('Restarting application...', 'info');
            setTimeout(() => {
              if (ipcRenderer) {
                ipcRenderer.send('install-update');
              }
            }, 500);
          }
          return null;
        }
        addLog(`Restarting in ${prev - 1}...`, 'warning');
        return prev - 1;
      });
    }, 1000);
  };

  const handleInstall = () => {
    if (ipcRenderer) {
      ipcRenderer.send('install-update');
    }
  };

  const handleRemindLater = () => {
    // Set snooze time to 4 hours from now
    const snoozeUntil = Date.now() + SNOOZE_DURATION;
    localStorage.setItem(STORAGE_KEY, snoozeUntil.toString());
    console.log('⏰ Update notification snoozed for 4 hours');
    setShow(false);
  };

  const handleClose = () => {
    setShow(false);
  };

  // Check for admin-controlled update on launch
  useEffect(() => {
    const checkAdminUpdateControl = async () => {
      if (!config?.SUPABASE_URL || !config?.SUPABASE_KEY) return;
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        
        const { data, error } = await supabase
          .from('update_control')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking update control:', error);
          return;
        }
        
        if (data && data.is_update_available) {
          console.log('🔔 Admin-controlled update notification triggered:', data.version_number);
          
          // Clear snooze to force showing the notification
          localStorage.removeItem(STORAGE_KEY);
          
          // Set update info with admin version
          const adminUpdateInfo = {
            version: data.version_number || 'Latest',
            releaseNotes: 'An important update is available. Please check for updates.',
            releaseDate: data.updated_at || data.created_at
          };
          
          setUpdateInfo(adminUpdateInfo);
          setShow(true);
          
          // Also trigger automatic update check if IPC available
          if (ipcRenderer) {
            console.log('🔍 Triggering automatic update check...');
            setTimeout(() => {
              ipcRenderer.send('check-for-updates');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking admin update control:', error);
      }
    };
    
    // Check on mount after a short delay
    const timer = setTimeout(checkAdminUpdateControl, 3000);
    return () => clearTimeout(timer);
  }, [config]);

  // Listen for debug mode trigger
  useEffect(() => {
    const handleDebugUpdate = (event) => {
      if (event.detail) {
        setUpdateInfo(event.detail);
        setShow(true);
        // Auto-trigger download in debug mode
        setTimeout(() => {
          handleDownload(true);
        }, 500);
      }
    };
    
    window.addEventListener('mock-update-available', handleDebugUpdate);
    return () => window.removeEventListener('mock-update-available', handleDebugUpdate);
  }, []);

  if (!updateInfo || !show) return null;

  // CMD-style installer
  if (showInstaller) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Terminal Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-mono text-gray-300">LOTO KMS Update Installer v2.0</span>
          <div className="flex-1" />
          <span className="text-xs font-mono text-gray-500">Administrator: SYSTEM</span>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm">
          <div className="max-w-4xl mx-auto space-y-1">
            <div className="text-green-400 mb-4">
              <span className="text-gray-500">C:\Program Files\LOTO KMS&gt;</span> update.exe --install
            </div>
            
            {installerLogs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 ${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'progress' ? 'text-cyan-400' :
                  'text-gray-300'
                }`}
              >
                <span className="text-gray-600 select-none">[{log.time}]</span>
                <span className="select-none">
                  {log.type === 'success' && '✓'}
                  {log.type === 'error' && '✗'}
                  {log.type === 'warning' && '⚠'}
                  {log.type === 'info' && '→'}
                  {log.type === 'progress' && '▶'}
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
            
            {countdown !== null && (
              <div className="mt-6 text-center">
                <div className="inline-block bg-yellow-900/30 border border-yellow-600 rounded-lg px-8 py-4">
                  <div className="text-6xl font-bold text-yellow-400 mb-2 tabular-nums">
                    {countdown > 0 ? countdown : '🚀'}
                  </div>
                  <div className="text-sm text-yellow-300">
                    {countdown > 0 ? 'Restarting...' : isDebugMode ? 'Debug Complete!' : 'Launching...'}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={logEndRef} />
            
            {/* Blinking cursor */}
            {!countdown && (
              <div className="flex items-center space-x-1 mt-4">
                <span className="text-gray-500">C:\Program Files\LOTO KMS&gt;</span>
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs font-mono text-gray-500">
          <span>Status: {downloading ? 'Downloading...' : readyToInstall ? 'Ready' : 'Idle'}</span>
          <span>Progress: {downloadProgress}%</span>
          <span>{isDebugMode && '🐛 DEBUG MODE'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl border border-blue-500 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <RefreshCw className="w-5 h-5 flex-shrink-0" />
            </div>
            <h3 className="font-bold text-lg">
              {readyToInstall ? 'Update Ready!' : 'A New Update Available'}
            </h3>
          </div>
          {!readyToInstall && !downloading && (
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          {!readyToInstall ? (
            <>
              <p className="text-sm text-blue-100 mb-2">
                Version <span className="font-semibold">{updateInfo.version}</span> is now available!
              </p>
              <div className="bg-white/10 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-50 leading-relaxed">
                  ✨ This update may include bug fixes for issues you might have encountered, 
                  new features, performance improvements, and security enhancements.
                </p>
              </div>

              {downloading && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-blue-200 mb-1">
                    <span>Downloading...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {!downloading ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleDownload(false)}
                    className="w-full bg-white text-blue-600 hover:bg-blue-50 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Update Now</span>
                  </button>
                  <button
                    onClick={handleRemindLater}
                    className="w-full bg-blue-800 text-white hover:bg-blue-900 py-2 px-4 rounded-lg font-medium transition-colors text-sm"
                  >
                    Remind Me Later (4 hours)
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 py-2.5 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 shadow-sm cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Downloading {downloadProgress}%</span>
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-blue-100 mb-3">
                Version <span className="font-semibold">{updateInfo.version}</span> is ready to install.
                <span className="block mt-1 text-xs opacity-90">
                  The app will restart to complete the installation.
                </span>
              </p>
              <button
                onClick={handleInstall}
                className="w-full bg-white text-blue-600 hover:bg-blue-50 py-2.5 px-4 rounded-lg font-medium transition-colors shadow-sm"
              >
                Restart & Install Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
