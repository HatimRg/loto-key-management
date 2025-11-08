import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import db from '../utils/database';
import VisitorWalkthrough from './VisitorWalkthrough';
// syncManager removed - local database only
import {
  Home,
  Lock,
  Zap,
  Package,
  Users,
  FileText,
  Settings as SettingsIcon,
  User,
  LogOut,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Menu,
  X,
  Cloud,
  Bell,
  HelpCircle
} from 'lucide-react';

function Layout({ children }) {
  const { userMode, darkMode, isOnline, toggleDarkMode, logout } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [updateSnoozed, setUpdateSnoozed] = useState(false);
  const [snoozedUpdateInfo, setSnoozedUpdateInfo] = useState(null);
  // syncing state removed - no cloud sync

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Listen for update events
  useEffect(() => {
    const handleUpdateAvailable = (event) => {
      console.log('🔔 Update available - showing header indicator');
      setUpdateSnoozed(true);
      setSnoozedUpdateInfo(event.detail?.updateInfo);
    };

    const handleUpdateSnoozed = (event) => {
      console.log('🔔 Update snoozed - showing header indicator');
      setUpdateSnoozed(true);
      setSnoozedUpdateInfo(event.detail?.updateInfo);
    };

    const handleUpdateDismissed = () => {
      console.log('✖️ Update dismissed - removing header indicator');
      setUpdateSnoozed(false);
      setSnoozedUpdateInfo(null);
    };

    window.addEventListener('update-available', handleUpdateAvailable);
    window.addEventListener('update-snoozed', handleUpdateSnoozed);
    window.addEventListener('update-dismissed', handleUpdateDismissed);

    // Check if already snoozed on mount
    const snoozeUntil = localStorage.getItem('update_snooze_until');
    if (snoozeUntil) {
      const now = Date.now();
      const snoozeTime = parseInt(snoozeUntil, 10);
      if (now < snoozeTime) {
        setUpdateSnoozed(true);
      }
    }

    return () => {
      window.removeEventListener('update-available', handleUpdateAvailable);
      window.removeEventListener('update-snoozed', handleUpdateSnoozed);
      window.removeEventListener('update-dismissed', handleUpdateDismissed);
    };
  }, []);

  const handleSnoozeClick = () => {
    console.log('🔔 Update indicator clicked - showing update notification');
    // Clear the snooze
    localStorage.removeItem('update_snooze_until');
    setUpdateSnoozed(false);
    setSnoozedUpdateInfo(null);
    // Trigger event to show the update notification UI directly
    window.dispatchEvent(new CustomEvent('show-update-notification', {
      detail: { updateInfo: snoozedUpdateInfo }
    }));
  };

  const handleStartWalkthrough = () => {
    console.log('🎓 Starting walkthrough from button');
    // Clear completion flag so walkthrough can restart
    localStorage.removeItem('visitor_walkthrough_completed');
    window.dispatchEvent(new Event('restart-walkthrough'));
    showToast('🎓 Démarrage de la visite guidée...', 'info');
  };

  // handleForceSync removed - local database only mode

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/locks', icon: Lock, label: 'View by Locks' },
    { path: '/breakers', icon: Zap, label: 'View by Breakers' },
    { path: '/storage', icon: Package, label: 'Storage' },
    { path: '/personnel', icon: Users, label: 'Personnel' },
    { path: '/plans', icon: FileText, label: 'Electrical Plans' },
    { path: '/supabase', icon: Cloud, label: 'Cloud Sync' },
    { path: '/about', icon: User, label: 'About Me' }, // Dedicated button for all users
    { path: '/settings', icon: SettingsIcon, label: 'Settings' }, // Available to all users
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-20'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-900 dark:bg-gray-700 rounded p-1.5 flex items-center justify-center">
                <img 
                  src="./company-logo.png"
                  alt="SGTM Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <Lock className="w-6 h-6 text-white" style={{ display: 'none' }} />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">LOTO KMS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userMode}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4" data-tour="nav-sidebar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-2 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 hover:shadow-sm'
                }`
              }
              title={!sidebarOpen ? item.label : ''}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleDarkMode}
            data-tour="theme-toggle"
            className="flex items-center space-x-3 w-full px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title={!sidebarOpen ? (darkMode ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {sidebarOpen && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>

          {sidebarOpen && (
            <div className="text-center pt-2">
              <a
                href="https://www.linkedin.com/in/hatim-raghib-5b85362a5/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg py-1 transition-colors group cursor-pointer"
              >
                <img 
                  src="./icon.jpg"
                  alt="Developer" 
                  className="w-6 h-6 rounded-full object-cover group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 hover:underline transition-all">
                  Made by <span className="font-semibold">Hatim RG</span>
                </p>
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white select-none">
                {navItems.find(item => window.location.pathname === item.path)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Walkthrough Button - Visible for Visitor and RestrictedEditor */}
              {(userMode === 'Visitor' || userMode === 'RestrictedEditor') && (
                <button
                  onClick={handleStartWalkthrough}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 
                  rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-200 hover:scale-105"
                  title="Démarrer la visite guidée"
                  data-tour="help-button"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-sm font-medium hidden lg:inline">Aide</span>
                </button>
              )}
              
              {/* Update Snoozed Indicator */}
              {updateSnoozed && (
                <button
                  onClick={handleSnoozeClick}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 
                  rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 animate-pulse"
                  title="Update available - Click to view"
                >
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium hidden lg:inline">Update Available</span>
                </button>
              )}
              
              {/* Signal Strength Icon - Full bars when online, empty bars with cross when offline */}
              <div className="flex items-center space-x-2 select-none" title={isOnline ? 'Connected to Cloud' : 'Offline - Using Cached Data'}>
                {isOnline ? (
                  <>
                    <Wifi className="w-6 h-6 text-green-500 dark:text-green-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 hidden lg:inline">Cloud</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 hidden lg:inline">Offline</span>
                  </>
                )}
              </div>

              {/* User Badge */}
              <div data-tour="user-mode-badge" className={`px-3 py-1 rounded-full text-sm font-medium select-none ${
                userMode === 'Editor' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {userMode}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg flex items-center space-x-2 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
      
      {/* Visitor Walkthrough */}
      <VisitorWalkthrough userMode={userMode} />
    </div>
  );
}

export default Layout;
