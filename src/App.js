import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ConnectionStatus from './components/ConnectionStatus';
import UpdateNotification from './components/UpdateNotification';
import ChangelogModal from './components/ChangelogModal';
import hybridDB from './utils/hybridDatabase';
import Dashboard from './pages/Dashboard';
import ViewByLocks from './pages/ViewByLocks';
import ViewByBreakers from './pages/ViewByBreakers';
import Storage from './pages/Storage';
import Personnel from './pages/Personnel';
import ElectricalPlans from './pages/ElectricalPlans';
import Settings from './pages/Settings';
import AboutMe from './pages/AboutMe';
import SupabaseSettings from './pages/SupabaseSettings';

function AppRoutes() {
  const { isAuthenticated } = useApp();

  useEffect(() => {
    // Initialize hybrid database on mount
    hybridDB.init().then(result => {
      if (result.success) {
        console.log('✅ Hybrid database initialized - cloud-first mode');
      } else {
        console.warn('⚠️ Hybrid database init failed, using local only');
      }
    });
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/locks" element={<ViewByLocks />} />
        <Route path="/breakers" element={<ViewByBreakers />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/personnel" element={<Personnel />} />
        <Route path="/plans" element={<ElectricalPlans />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<AboutMe />} />
        <Route path="/supabase" element={<SupabaseSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ConnectionStatus />
          <UpdateNotification />
          <ChangelogModal />
          <AppRoutes />
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
