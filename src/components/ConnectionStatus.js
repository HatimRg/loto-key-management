import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleStatusChange = (event) => {
      const online = event.detail.online;
      setIsOnline(online);
      
      // Show notification for 5 seconds when status changes
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    };

    window.addEventListener('connectionStatusChange', handleStatusChange);

    return () => {
      window.removeEventListener('connectionStatusChange', handleStatusChange);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border-2 ${
        isOnline 
          ? 'bg-white dark:bg-gray-800 border-green-500 text-gray-900 dark:text-white' 
          : 'bg-white dark:bg-gray-800 border-orange-500 text-gray-900 dark:text-white'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-5 h-5 text-green-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Connected</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Using cloud data</span>
            </div>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5 text-orange-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Offline</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Using cached data</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
