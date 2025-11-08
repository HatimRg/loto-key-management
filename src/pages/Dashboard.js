import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { Lock, Zap, Package, Users, AlertCircle, Activity, Unlock, Settings, UserPlus, FileText, Upload, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import db from '../utils/database';

// Memoized StatCard component to prevent unnecessary re-renders
const StatCard = memo(({ stat, index }) => (
  <div 
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 
    hover-lift cursor-pointer transform transition-all duration-300 animate-fadeInUp stagger-${(index % 6) + 1}
    hover:border-blue-400 dark:hover:border-blue-500`}
    style={{ animationFillMode: 'both' }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium transition-colors duration-200">
          {stat.title}
        </p>
        <p className={`text-3xl font-bold ${stat.textColor} dark:opacity-90 transition-all duration-300 hover:scale-105 inline-block`}>
          {stat.value}
        </p>
      </div>
      <div className={`${stat.color} p-3 rounded-lg transform transition-transform duration-300 hover:rotate-12 hover:scale-110`}>
        <stat.icon className="w-8 h-8 text-white" />
      </div>
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

// Memoized ActivityItem component
const ActivityItem = memo(({ activity, onClick }) => {
  const timestamp = new Date(activity.timestamp);
  const formattedDate = timestamp.toLocaleDateString('en-CA');
  const formattedTime = timestamp.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const user = activity.user || activity.user_mode || 'Admin';
  
  // Determine icon and color
  let IconComponent = Activity;
  let iconColor = 'blue';
  
  if (activity.action.toLowerCase().includes('locked') || activity.action.toLowerCase().includes('lock ')) {
    IconComponent = Lock;
    iconColor = 'red';
  } else if (activity.action.toLowerCase().includes('unlock') || activity.action.toLowerCase().includes('released') || activity.action.toLowerCase().includes('opened')) {
    IconComponent = Unlock;
    iconColor = 'green';
  } else if (activity.action.toLowerCase().includes('breaker')) {
    IconComponent = Zap;
    iconColor = 'yellow';
  } else if (activity.action.toLowerCase().includes('personnel')) {
    IconComponent = UserPlus;
    iconColor = 'purple';
  } else if (activity.action.toLowerCase().includes('plan') || activity.action.toLowerCase().includes('uploaded')) {
    IconComponent = Upload;
    iconColor = 'indigo';
  } else if (activity.action.toLowerCase().includes('lock') && !activity.action.toLowerCase().includes('breaker')) {
    IconComponent = Package;
    iconColor = 'orange';
  }
  
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
    red: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
    orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
  };
  
  return (
    <div
      onClick={() => onClick(activity)}
      className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer 
      transition-all duration-200 transform hover:scale-[1.02] hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
    >
      <div className={`p-2 rounded-lg ${colorClasses[iconColor]} transform transition-transform duration-300 hover:rotate-6 hover:scale-110`}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {activity.action}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formattedDate} at {formattedTime}
          </p>
          <span className="text-xs text-gray-400">•</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            by {user}
          </p>
        </div>
        {activity.details && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {activity.details}
          </p>
        )}
      </div>
    </div>
  );
});
ActivityItem.displayName = 'ActivityItem';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBreakers: 0,
    lockedBreakers: 0,
    breakersOn: 0,
    totalLocks: 0,
    usedLocks: 0,
    totalPersonnel: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLimit, setActivityLimit] = useState(10);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  
  // Use refs to track previous data for comparison
  const prevStatsRef = useRef(null);
  const prevActivitiesRef = useRef(null);

  // Helper function to check if stats have changed
  const statsChanged = (newStats) => {
    if (!prevStatsRef.current) return true;
    return JSON.stringify(prevStatsRef.current) !== JSON.stringify(newStats);
  };

  // Helper function to check if activities have changed
  const activitiesChanged = (newActivities) => {
    if (!prevActivitiesRef.current) return true;
    if (prevActivitiesRef.current.length !== newActivities.length) return true;
    // Compare first and last items for quick check
    if (newActivities.length > 0) {
      const oldFirst = prevActivitiesRef.current[0];
      const newFirst = newActivities[0];
      return oldFirst?.id !== newFirst?.id || oldFirst?.timestamp !== newFirst?.timestamp;
    }
    return false;
  };

  // Stable loadDashboardData reference for useEffect
  const loadDashboardDataRef = useRef(null);
  
  useEffect(() => {
    // Initial load
    if (loadDashboardDataRef.current) {
      loadDashboardDataRef.current();
    }
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (loadDashboardDataRef.current) {
        loadDashboardDataRef.current();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activityLimit]); // Reload when activity limit changes

  // loadDashboardData with activityLimit dependency to capture limit changes
  const loadDashboardData = useCallback(async () => {
    console.log('[Dashboard] Loading dashboard data...');
    // Check if this is initial load by checking refs instead of state
    const isInitialLoad = !prevStatsRef.current;
    if (isInitialLoad) {
      console.log('[Dashboard] Initial load - showing loading state');
      setLoading(true);
    }
    
    try {
      // Load statistics from breakers (no sync needed - direct calculation)
      const statsResult = await db.getStatsFromBreakers();
      
      if (statsResult.success && statsResult.data) {
        // Only update if stats have actually changed
        if (statsChanged(statsResult.data)) {
          setStats(statsResult.data);
          prevStatsRef.current = statsResult.data;
        }
      } else {
        // Fallback: Load data manually
        await loadStatsManually();
      }

      // Load recent history with current limit
      const historyResult = await db.getHistory(activityLimit + 1); // Get one extra to check if there are more
      if (historyResult.success && historyResult.data) {
        const activities = historyResult.data.slice(0, activityLimit);
        setHasMoreActivities(historyResult.data.length > activityLimit);
        
        // Only update if activities have changed
        if (activitiesChanged(activities)) {
          setRecentActivities(activities);
          prevActivitiesRef.current = activities;
        }
      }
    } catch (error) {
      console.error('❌ Dashboard error:', error);
      await loadStatsManually();
    } finally {
      // CRITICAL: Always clear loading state, even on error
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [activityLimit]); // Add activityLimit to capture limit changes
  
  // Update ref when loadDashboardData changes
  loadDashboardDataRef.current = loadDashboardData;
  
  // Load more activities
  const handleLoadMore = useCallback(() => {
    setActivityLimit(prev => prev + 10);
  }, []);
  
  const loadStatsManually = async () => {
    try {
      // Get breakers
      const breakersResult = await db.getBreakers();
      const breakers = breakersResult.data || [];
      
      // Get locks
      const locksResult = await db.getLocks();
      const locks = locksResult.data || [];
      
      // Get personnel
      const personnelResult = await db.getPersonnel();
      const personnel = personnelResult.data || [];
      
      // Calculate locks in use from BREAKERS (not lock table)
      // A lock is "in use" if a breaker is Closed (locked) and has a lock_key
      const lockedBreakersWithLocks = breakers.filter(b => 
        b.state === 'Closed' && b.lock_key && b.lock_key.trim() !== ''
      );
      const usedLocksCount = lockedBreakersWithLocks.length;
      
      console.log(`📊 Manual stats: ${usedLocksCount} locks in use (from ${lockedBreakersWithLocks.length} locked breakers)`);
      
      // Calculate stats
      setStats({
        totalBreakers: breakers.length,
        breakersOn: breakers.filter(b => b.state === 'On').length,
        lockedBreakers: breakers.filter(b => b.state === 'Closed').length,
        totalLocks: locks.length,
        usedLocks: usedLocksCount,  // From breaker data
        totalPersonnel: personnel.length
      });
    } catch (error) {
      console.error('Manual stats loading error:', error);
    }
  };

  // Handle activity click - navigate to relevant page (memoized)
  const handleActivityClick = useCallback((activity) => {
    const actionLower = activity.action.toLowerCase();
    
    // Priority order: Check specific activity types
    
    // 1. Personnel activities
    if (actionLower.includes('personnel')) {
      const nameMatch = activity.action.match(/personnel\s+(\S+\s+\S+)/i);
      const searchName = nameMatch?.[1] || '';
      navigate('/personnel', { state: { searchTerm: searchName } });
    }
    
    // 2. Lock/Key activities (Storage page)
    else if (actionLower.includes('lock ') || 
             actionLower.includes('key ') || 
             actionLower.includes('released') ||
             actionLower.includes('in use') ||
             (actionLower.includes('added') && actionLower.includes('lock')) ||
             (actionLower.includes('deleted') && actionLower.includes('lock'))) {
      // Extract key number if available
      const keyMatch = activity.action.match(/(?:lock|key)\s+([A-Z0-9-]+)/i);
      const keyNumber = keyMatch?.[1] || '';
      navigate('/storage', { state: { searchTerm: keyNumber } });
    }
    
    // 3. Breaker activities (locked/opened/modified)
    else if (actionLower.includes('breaker')) {
      const breakerName = activity.action.match(/breaker\s+([^\s:,]+)/i)?.[1] || '';
      
      // Check if this is a "locked breaker" action - go to locks view
      if (actionLower.includes('locked') || actionLower.includes('closed')) {
        navigate('/locks', { state: { searchTerm: breakerName } });
      } 
      // Otherwise go to breakers view
      else {
        navigate('/breakers', { state: { searchTerm: breakerName } });
      }
    }
    
    // 4. Electrical plan activities
    else if (actionLower.includes('plan') || 
             actionLower.includes('electrical') ||
             (actionLower.includes('uploaded') && !actionLower.includes('personnel'))) {
      navigate('/plans');
    }
    
    // 5. Settings/Config activities
    else if (actionLower.includes('settings') || 
             actionLower.includes('config') ||
             actionLower.includes('database') ||
             actionLower.includes('refresh')) {
      navigate('/settings');
    }
    
    // 6. CSV Import activities - go to the relevant page based on what was imported
    else if (actionLower.includes('csv import')) {
      if (actionLower.includes('breaker')) {
        navigate('/breakers');
      } else if (actionLower.includes('lock')) {
        navigate('/storage');
      } else if (actionLower.includes('personnel')) {
        navigate('/personnel');
      } else {
        // Generic CSV import - go to breakers (most common)
        navigate('/breakers');
      }
    }
    
    // 7. Default: If action mentions specific entity but no match above
    // Only navigate to dashboard if truly unknown activity type
    else {
      console.log('Unknown activity type, staying on current page:', activity.action);
      // Don't navigate - stay on current page for unknown types
    }
  }, [navigate]);

  // Memoize stat cards to prevent recreation on every render
  const statCards = useMemo(() => [
    {
      title: 'Total Breakers',
      value: stats.totalBreakers,
      icon: Zap,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Breakers ON',
      value: stats.breakersOn,
      icon: Zap,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Breakers Locked',
      value: stats.lockedBreakers,
      icon: Lock,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      title: 'Personnel',
      value: stats.totalPersonnel,
      icon: Users,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Locks in Use',
      value: `${stats.usedLocks} / ${stats.totalLocks}`,
      icon: Package,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    }
  ], [stats]);

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay - Only on initial load */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6" data-tour="dashboard-stats">
        {statCards.map((stat, index) => (
          <StatCard key={stat.title} stat={stat} index={index} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700" data-tour="dashboard-charts">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activities</h2>
          </div>
        </div>
        <div className="p-6">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <ActivityItem
                  key={activity.id || `${activity.timestamp}-${activity.action}`}
                  activity={activity}
                  onClick={handleActivityClick}
                />
              ))}
            </div>
          )}
          
          {/* View More Button */}
          {hasMoreActivities && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
                <span>View More Activities</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Dashboard;
