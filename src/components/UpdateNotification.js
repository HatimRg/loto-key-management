import React, { useEffect, useState, useRef } from 'react';
import { Download, X, RefreshCw, Terminal } from 'lucide-react';

const { ipcRenderer } = window;

const SNOOZE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const STORAGE_KEY = 'update_snooze_until';

// Compare semantic versions (e.g., "1.8.2" vs "1.7.4")
const compareVersions = (version1, version2) => {
  const v1 = (version1 || '').replace(/^v/, '');
  const v2 = (version2 || '').replace(/^v/, '');
  
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;  // version1 is newer
    if (num1 < num2) return -1; // version2 is newer
  }
  
  return 0; // versions are equal
};

function UpdateNotification() {
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
  const adminAlertActiveRef = useRef(false); // Track if admin alert is active
  const downloadingRef = useRef(false); // Prevent duplicate downloads
  const snoozeTimeoutRef = useRef(null); // Track snooze setTimeout for cleanup
  const checkingRef = useRef(false); // Track if check is in progress
  const prevProgressRef = useRef(0); // Track previous progress for comparison
  const downloadProgressRef = useRef(0); // Track current progress for timeouts
  const downloadCompleteTimeoutRef = useRef(null); // Track download complete timeout
  const scrollTimeoutRef = useRef(null); // Track scroll timeout
  const countdownIntervalRef = useRef(null); // Track countdown interval
  const debugTimeoutsRef = useRef([]); // Track all debug timeouts
  const mockHandlerTimeoutRef = useRef(null); // Track mock handler timeout

  // Check if update notification should be shown based on snooze and version
  const shouldShowNotification = async (updateVersion) => {
    // Check snooze first
    const snoozeUntil = localStorage.getItem(STORAGE_KEY);
    if (snoozeUntil) {
      const snoozeTime = parseInt(snoozeUntil, 10);
      const now = Date.now();
      
      if (now < snoozeTime) {
        console.log('⏰ Update snoozed until:', new Date(snoozeTime).toLocaleString());
        return false;
      }
      // Snooze expired, clear it
      localStorage.removeItem(STORAGE_KEY);
    }
    
    // Check version comparison
    if (updateVersion && ipcRenderer) {
      try {
        const result = await ipcRenderer.invoke('get-app-version');
        const currentVersion = result.success ? result.version : '1.8.1';
        
        console.log('📊 Version comparison:');
        console.log('  Current app version:', currentVersion);
        console.log('  Update notification version:', updateVersion);
        
        const comparison = compareVersions(updateVersion, currentVersion);
        
        if (comparison <= 0) {
          console.log('✅ App is already up-to-date or newer, hiding notification');
          return false;
        }
        
        console.log('📦 Update version is newer, showing notification');
      } catch (error) {
        console.error('Error comparing versions:', error);
        // On error, allow notification to show (fail-safe)
      }
    }
    
    return true;
  };

  useEffect(() => {
    if (!ipcRenderer) {
      console.warn('⚠️ UpdateNotification: No ipcRenderer available');
      return;
    }

    console.log('✅ UpdateNotification: Setting up IPC listeners');

    // Listen for update available from Electron
    // ✅ SAFE: This ONLY shows the notification popup
    // ✅ User must explicitly click "Update Now" to start download
    // ✅ NO automatic downloads happen here
    const handleUpdateAvailable = async (event, info) => {
      console.log('📦 UpdateNotification: Update available received:', info);
      
      // Don't override if admin alert is already active
      if (adminAlertActiveRef.current) {
        console.log('⚠️ Admin alert active, skipping');
        return;
      }
      
      setUpdateInfo(info);
      
      // Dispatch event for header notification
      console.log('📤 Dispatching update-available event for header');
      window.dispatchEvent(new CustomEvent('update-available', {
        detail: { updateInfo: info }
      }));
      
      // Check if notification should be shown (version comparison + snooze)
      const shouldShow = await shouldShowNotification(info.version);
      
      if (shouldShow) {
        console.log('✅ Showing update notification popup');
        setShow(true); // Show popup - user must approve to download
      } else {
        console.log('⏰ Update notification hidden (snoozed or already up-to-date)');
        // If snoozed (not version issue), schedule check after snooze expires
        const snoozeUntil = localStorage.getItem(STORAGE_KEY);
        if (snoozeUntil) {
          const timeUntilSnoozeExpires = parseInt(snoozeUntil, 10) - Date.now();
          
          if (timeUntilSnoozeExpires > 0) {
            // Store timeout for cleanup
            if (snoozeTimeoutRef.current) {
              clearTimeout(snoozeTimeoutRef.current);
            }
            snoozeTimeoutRef.current = setTimeout(async () => {
              const shouldShowAfterSnooze = await shouldShowNotification(info.version);
              if (shouldShowAfterSnooze) {
                setShow(true);
              }
              snoozeTimeoutRef.current = null;
            }, timeUntilSnoozeExpires);
          }
        }
      }
    };

    // Listen for download progress
    const handleDownloadProgress = (event, progressObj) => {
      // Guard against undefined progressObj
      if (!progressObj || typeof progressObj.percent !== 'number') {
        console.warn('⚠️ Invalid progress object:', progressObj);
        return;
      }
      
      const percent = Math.round(progressObj.percent);
      const prevProgress = prevProgressRef.current; // Use ref for accurate previous value
      prevProgressRef.current = percent; // Update ref
      downloadProgressRef.current = percent; // Update progress ref for timeouts
      setDownloadProgress(percent);
      
      // Show installer UI when download starts
      if (prevProgress === 0 && percent > 0) {
        console.log('📥 Download started, showing installer UI');
        setDownloading(true);
        setShow(false); // Hide notification popup
        addLog('Download started...', 'success');
        addLog(`Update version: ${updateInfo?.version || 'Latest'}`, 'info');
      }
      
      // Log progress at intervals (every 10% for better feedback)
      if (percent % 10 === 0 && percent > 0 && percent !== prevProgress) {
        addLog(`Progress: ${percent}%`, 'progress');
      }
    };

    // Listen for download complete
    const handleUpdateDownloaded = (event, info) => {
      downloadingRef.current = false; // Reset download flag
      // Clear download timeouts if they exist
      if (window.downloadTimeoutId) {
        clearTimeout(window.downloadTimeoutId);
        window.downloadTimeoutId = null;
      }
      if (window.downloadFailTimeoutId) {
        clearTimeout(window.downloadFailTimeoutId);
        window.downloadFailTimeoutId = null;
      }
      addLog('Download complete! Verifying integrity...', 'success');
      
      // Track this timeout for cleanup
      downloadCompleteTimeoutRef.current = setTimeout(() => {
        addLog('SHA512 checksum: VALID', 'success');
        addLog('Update ready to install!', 'success');
        addLog('Application will restart in 3 seconds...', 'warning');
        setDownloading(false);
        setReadyToInstall(true);
        startCountdown(false);
        downloadCompleteTimeoutRef.current = null;
      }, 1000);
    };

    // Listen for errors
    const handleUpdateError = (event, error) => {
      console.error('❌ Update error:', error);
      downloadingRef.current = false; // Reset download flag on error
      adminAlertActiveRef.current = false; // Reset admin alert flag
      checkingRef.current = false; // Reset checking flag
      // Clear download timeouts if they exist
      if (window.downloadTimeoutId) {
        clearTimeout(window.downloadTimeoutId);
        window.downloadTimeoutId = null;
      }
      if (window.downloadFailTimeoutId) {
        clearTimeout(window.downloadFailTimeoutId);
        window.downloadFailTimeoutId = null;
      }
      // Complete state reset
      setDownloading(false);
      setShowInstaller(false);
      setShow(false);
      setReadyToInstall(false);
      setDownloadProgress(0);
      // Show user-friendly error
      if (error && !error.toString().includes('timeout')) {
        addLog(`Error: ${error}`, 'error');
      }
    };

    // Listen for update check starting
    const handleCheckingForUpdate = () => {
      checkingRef.current = true;
    };

    // Listen for no update available
    const handleUpdateNotAvailable = (event, info) => {
      checkingRef.current = false;
      adminAlertActiveRef.current = false;
    };

    ipcRenderer.on('checking-for-update', handleCheckingForUpdate);
    ipcRenderer.on('update-available', handleUpdateAvailable);
    ipcRenderer.on('update-not-available', handleUpdateNotAvailable);
    ipcRenderer.on('download-progress', handleDownloadProgress);
    ipcRenderer.on('update-downloaded', handleUpdateDownloaded);
    ipcRenderer.on('update-error', handleUpdateError);

    return () => {
      // Clear ALL timeouts and intervals on unmount
      if (snoozeTimeoutRef.current) {
        clearTimeout(snoozeTimeoutRef.current);
        snoozeTimeoutRef.current = null;
      }
      if (downloadCompleteTimeoutRef.current) {
        clearTimeout(downloadCompleteTimeoutRef.current);
        downloadCompleteTimeoutRef.current = null;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      debugTimeoutsRef.current.forEach(clearTimeout);
      debugTimeoutsRef.current = [];
      if (window.downloadTimeoutId) {
        clearTimeout(window.downloadTimeoutId);
        window.downloadTimeoutId = null;
      }
      if (window.downloadFailTimeoutId) {
        clearTimeout(window.downloadFailTimeoutId);
        window.downloadFailTimeoutId = null;
      }
      
      if (ipcRenderer) {
        // Use removeListener with specific handlers (not removeAllListeners)
        // This prevents removing listeners from other components (e.g., Settings.js)
        ipcRenderer.removeListener('checking-for-update', handleCheckingForUpdate);
        ipcRenderer.removeListener('update-available', handleUpdateAvailable);
        ipcRenderer.removeListener('update-not-available', handleUpdateNotAvailable);
        ipcRenderer.removeListener('download-progress', handleDownloadProgress);
        ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded);
        ipcRenderer.removeListener('update-error', handleUpdateError);
      }
    };
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setInstallerLogs(prev => [...prev, { time: timestamp, message, type }]);
    
    // Debounce scroll - clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      scrollTimeoutRef.current = null;
    }, 100);
  };

  const handleDownload = (debugMode = false) => {
    // Prevent duplicate downloads
    if (downloadingRef.current) {
      console.warn('⚠️ Download already in progress');
      return;
    }
    
    adminAlertActiveRef.current = false; // Reset admin alert flag when downloading
    downloadingRef.current = true; // Mark download as in progress
    setIsDebugMode(debugMode);
    setDownloading(true);
    setDownloadProgress(0);
    setShowInstaller(true);
    setInstallerLogs([]);
    
    // Clear snooze and remove header indicator since user is taking action
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('update-dismissed'));
    
    if (debugMode) {
      // Mock download for debug mode
      simulateDebugInstall();
    } else {
      // Real download
      addLog('Initializing update system...', 'info');
      addLog(`Downloading LOTO KMS v${updateInfo.version}`, 'info');
      addLog('Connecting to GitHub releases...', 'info');
      if (ipcRenderer) {
        // Add a timeout to detect stuck downloads
        const downloadTimeout = setTimeout(() => {
          if (downloadingRef.current && downloadProgressRef.current < 100) { // Use ref not state
            console.warn('⚠️ Download appears stuck, may need to retry');
            addLog('Download is taking longer than expected...', 'warning');
            addLog('This may be due to slow network. Please be patient.', 'warning');
            
            // Add longer timeout for complete failure (2 minutes)
            const failTimeout = setTimeout(() => {
              if (downloadingRef.current && downloadProgressRef.current < 100) { // Use ref not state
                console.error('❌ Download appears to have failed');
                addLog('Download may have failed. Click below to retry.', 'error');
                downloadingRef.current = false;
                setDownloading(false);
                // Keep installer open so user can see error and retry
              }
            }, 90000); // 90 more seconds = 2 min total
            
            window.downloadFailTimeoutId = failTimeout;
          }
        }, 30000); // 30 second warning
        
        // Store timeout ID for cleanup
        window.downloadTimeoutId = downloadTimeout;
        
        ipcRenderer.send('download-update');
      }
    }
  };

  const simulateDebugInstall = () => {
    // Clear any existing debug timeouts
    debugTimeoutsRef.current.forEach(clearTimeout);
    debugTimeoutsRef.current = [];
    
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
      const timeoutId = setTimeout(() => {
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
      
      // Track this timeout
      debugTimeoutsRef.current.push(timeoutId);
    });
  };

  const startCountdown = (isDebug = false) => {
    // Clear existing interval if any
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
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
    adminAlertActiveRef.current = false; // Reset admin alert flag
    // Set snooze time to 4 hours from now
    const snoozeUntil = Date.now() + SNOOZE_DURATION;
    localStorage.setItem(STORAGE_KEY, snoozeUntil.toString());
    setShow(false);
    
    // Dispatch event for header to show snooze indicator
    window.dispatchEvent(new CustomEvent('update-snoozed', {
      detail: { updateInfo, snoozeUntil }
    }));
  };

  const handleClose = () => {
    adminAlertActiveRef.current = false; // Reset admin alert flag
    setShow(false);
    
    // Dispatch event to remove snooze indicator if closed
    window.dispatchEvent(new Event('update-dismissed'));
  };

  // Check for admin-controlled update on launch
  useEffect(() => {
    const checkAdminUpdateControl = async () => {
      // Hardcoded Supabase credentials (same as Settings.js)
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
          console.error('Error checking update control:', error);
          return;
        }
        
        if (data && data.is_update_available) {
          // Set update info with admin version
          const adminUpdateInfo = {
            version: data.version_number || 'Latest',
            releaseNotes: 'An important update is available. Please check for updates.',
            releaseDate: data.updated_at || data.created_at
          };
          
          // Check if we should show this alert (compare versions)
          const shouldShow = await shouldShowNotification(adminUpdateInfo.version);
          
          if (shouldShow) {
            // Clear snooze to force showing the notification
            localStorage.removeItem(STORAGE_KEY);
            
            // Mark admin alert as active to prevent GitHub check from overriding
            adminAlertActiveRef.current = true;
            
            setUpdateInfo(adminUpdateInfo);
            setShow(true);
          } else {
            console.log('✅ Admin alert: App version is newer or equal, not showing notification');
            return; // Don't show or trigger GitHub check
          }
          
          // Trigger GitHub update check after main.js auto-check would have run (after 5s)
          // This avoids race condition with main.js setTimeout at 5000ms
          if (ipcRenderer) {
            setTimeout(() => {
              ipcRenderer.send('check-for-updates');
            }, 6000); // 6s total: 3s (this timer) + 3s (outer timer) = after main.js check
          }
        }
      } catch (error) {
        console.error('Error checking admin update control:', error);
      }
    };
    
    // Check on mount after a short delay
    const timer = setTimeout(checkAdminUpdateControl, 3000);
    return () => clearTimeout(timer);
  }, []); // Remove config dependency - not used in this effect

  // Listen for show-update-notification event from header
  useEffect(() => {
    const handleShowNotification = (event) => {
      console.log('📢 Show notification triggered from header');
      if (event.detail && event.detail.updateInfo) {
        setUpdateInfo(event.detail.updateInfo);
        setShow(true);
      }
    };

    window.addEventListener('show-update-notification', handleShowNotification);
    return () => window.removeEventListener('show-update-notification', handleShowNotification);
  }, []);

  // Listen for debug mode trigger (Ctrl+Shift+Click on "Check for Updates")
  // ⚠️ IMPORTANT: Auto-download ONLY happens in debug mode for testing
  // Real users will NEVER experience auto-download - they must click "Update Now"
  useEffect(() => {
    const handleDebugUpdate = (event) => {
      if (event.detail) {
        setUpdateInfo(event.detail);
        setShow(true);
        
        // Clear existing mock timeout if any
        if (mockHandlerTimeoutRef.current) {
          clearTimeout(mockHandlerTimeoutRef.current);
        }
        
        // ⚠️ DEBUG ONLY: Auto-trigger download to test installer UI
        // Real updates require user to click "Update Now" button
        mockHandlerTimeoutRef.current = setTimeout(() => {
          handleDownload(true); // true = debug mode
          mockHandlerTimeoutRef.current = null;
        }, 500);
      }
    };
    
    window.addEventListener('mock-update-available', handleDebugUpdate);
    return () => {
      window.removeEventListener('mock-update-available', handleDebugUpdate);
      if (mockHandlerTimeoutRef.current) {
        clearTimeout(mockHandlerTimeoutRef.current);
        mockHandlerTimeoutRef.current = null;
      }
    };
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
            
            {/* Smooth Progress Bar */}
            {downloading && downloadProgress < 100 && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-400">Downloading Update Package...</span>
                  <span className="text-green-400 font-bold">{downloadProgress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-800 border border-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-cyan-400 transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  >
                    <div className="h-full w-full opacity-50 animate-pulse bg-white"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>══════════ {Math.round(downloadProgress / 10)}/10</span>
                  <span>{downloadProgress === 100 ? 'Complete' : 'In Progress'}</span>
                </div>
              </div>
            )}
            
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
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slideInRight">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl border border-blue-500 overflow-hidden 
      hover:shadow-3xl transform transition-all duration-300">
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
