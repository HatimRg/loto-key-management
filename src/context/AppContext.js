import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [userMode, setUserMode] = useState(null); // 'AdminEditor', 'RestrictedEditor', or 'Visitor'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [config, setConfig] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Load config
    loadConfig();

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleConnectionStatusChange = (event) => {
      setIsOnline(event.detail.online);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connectionStatusChange', handleConnectionStatusChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connectionStatusChange', handleConnectionStatusChange);
    };
  }, []);

  const loadConfig = async () => {
    if (window.ipcRenderer) {
      const result = await window.ipcRenderer.invoke('get-config');
      if (result.success) {
        setConfig(result.data);
      }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  };

  const login = (mode) => {
    setUserMode(mode);
    setIsAuthenticated(true);
    localStorage.setItem('userMode', mode);
  };

  const logout = () => {
    setUserMode(null);
    setIsAuthenticated(false);
    localStorage.removeItem('userMode');
  };

  // Auto-restore session
  useEffect(() => {
    const savedMode = localStorage.getItem('userMode');
    if (savedMode) {
      setUserMode(savedMode);
      setIsAuthenticated(true);
    }
  }, []);

  const value = {
    userMode,
    isAuthenticated,
    darkMode,
    isOnline,
    config,
    syncStatus,
    setUserMode,
    setIsAuthenticated,
    toggleDarkMode,
    login,
    logout,
    setSyncStatus,
    loadConfig
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
