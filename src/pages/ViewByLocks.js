import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Search, AlertCircle } from 'lucide-react';
import Footer from '../components/Footer';
import db from '../utils/database';

function ViewByLocks() {
  const [breakers, setBreakers] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Listen for breaker changes from ViewByBreakers page
    const handleBreakersChanged = (event) => {
      console.log('🔄 Breakers changed event received:', event.detail);
      // Reload data immediately when breakers are added/updated
      loadData();
    };
    
    window.addEventListener('breakers-changed', handleBreakersChanged);
    
    // Auto-refresh every 30 seconds as fallback (reduced from 2s to prevent constant blinking)
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 seconds
    
    return () => {
      window.removeEventListener('breakers-changed', handleBreakersChanged);
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    // Only show loading spinner on initial load, not on updates (preserves scroll)
    const isInitialLoad = breakers.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      // Load locked breakers
      const result = await db.getLockedBreakers();
      if (result.success) {
        setBreakers(result.data);
        
        // Extract unique zones
        const uniqueZones = [...new Set(result.data.map(b => b.zone))];
        setZones(uniqueZones);
        
        // Extract unique locations
        const uniqueLocations = [...new Set(result.data.map(b => b.location))];
        setLocations(uniqueLocations);
      }
    } catch (error) {
      console.error('❌ Error loading locked breakers:', error);
    } finally {
      // CRITICAL: Always clear loading state, even on error
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // Memoize filtered breakers to prevent recalculation on every render
  const filteredBreakers = useMemo(() => {
    return breakers.filter(breaker => {
      const matchesZone = !selectedZone || breaker.zone === selectedZone;
      const matchesLocation = !selectedLocation || breaker.location === selectedLocation;
      const matchesSearch = !searchTerm || 
        breaker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        breaker.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        breaker.lock_key?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesZone && matchesLocation && matchesSearch;
    });
  }, [breakers, selectedZone, selectedLocation, searchTerm]);

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay - Only on initial load */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
          <Lock className="w-7 h-7 text-red-600" />
          <span>Locked Breakers</span>
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredBreakers.length} locked breaker(s)
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, location, or key..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Zones</option>
            {zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[200px]"
          >
            <option value="">All Locations</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Breakers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredBreakers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {breakers.length === 0 ? 'No locked breakers found' : 'No breakers match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Breaker Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lock Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    General Breaker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBreakers.map((breaker) => (
                  <tr key={breaker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {breaker.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {breaker.zone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {breaker.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                        {breaker.lock_key || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {breaker.general_breaker || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(breaker.last_updated).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default ViewByLocks;
