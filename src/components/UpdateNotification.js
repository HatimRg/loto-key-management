import React, { useEffect, useState } from 'react';
import { Download, AlertCircle, X, RefreshCw } from 'lucide-react';

const { ipcRenderer } = window;

const SNOOZE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const STORAGE_KEY = 'update_snooze_until';

function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [show, setShow] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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
      setDownloadProgress(Math.round(progressObj.percent));
    };

    // Listen for download complete
    const handleUpdateDownloaded = (event, info) => {
      console.log('✅ Update downloaded:', info);
      setDownloading(false);
      setReadyToInstall(true);
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

  const handleDownload = () => {
    setDownloading(true);
    setDownloadProgress(0);
    if (ipcRenderer) {
      ipcRenderer.send('download-update');
    }
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

  if (!updateInfo || !show) return null;

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
                    onClick={handleDownload}
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
