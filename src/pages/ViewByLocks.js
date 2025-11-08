import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Search, AlertCircle } from 'lucide-react';
import Footer from '../components/Footer';
import QuickActionsBar from '../components/QuickActionsBar';
import { useMultiRowSelection } from '../hooks/useMultiRowSelection';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import db from '../utils/database';

function ViewByLocks() {
  const { userMode } = useApp();
  const { showToast } = useToast();
  const canEdit = userMode === 'AdminEditor' || userMode === 'RestrictedEditor';
  const [breakers, setBreakers] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Multi-row selection hook
  const {
    handleRowContextMenu,
    selectAll,
    clearSelection,
    isRowSelected,
    getSelectedIds,
    hasSelection,
    selectionCount,
  } = useMultiRowSelection();

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

  // Batch operation handlers
  const handleBatchDelete = async () => {
    if (!canEdit) {
      showToast('Non disponible en mode Visiteur', 'error');
      return;
    }

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Voulez-vous vraiment supprimer ${selectedIds.length} disjoncteur(s) verrouillé(s) ?`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const breaker = breakers.find(b => b.id === id);
        await db.deleteBreaker(id);
        await db.addHistory({
          action: `Deleted locked breaker: ${breaker?.name || 'Unknown'}`,
          user_mode: userMode,
          details: `Batch deletion from locks view`
        });
      }
      showToast(`✓ ${selectedIds.length} disjoncteur(s) supprimé(s)`, 'success');
      loadData();
      clearSelection();
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleBatchSetState = async (newState) => {
    if (!canEdit) {
      showToast('Non disponible en mode Visiteur', 'error');
      return;
    }

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    const stateText = newState === 'On' ? 'activer' : 'désactiver';
    if (!window.confirm(`Voulez-vous vraiment ${stateText} ${selectedIds.length} disjoncteur(s) ?`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const breaker = breakers.find(b => b.id === id);
        await db.updateBreaker(id, { state: newState });
        await db.addHistory({
          breaker_id: id,
          action: `State changed to ${newState}`,
          user_mode: userMode,
          details: `Batch operation on ${breaker?.name || 'Unknown'}`
        });
      }
      showToast(`✓ ${selectedIds.length} disjoncteur(s) ${newState === 'On' ? 'activé(s)' : 'désactivé(s)'}`, 'success');
      loadData();
      clearSelection();
      
      // Notify other pages
      window.dispatchEvent(new CustomEvent('breakers-changed', { 
        detail: { type: 'batch-update', count: selectedIds.length, state: newState } 
      }));
    } catch (error) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

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

      {/* Quick Actions Bar */}
      {hasSelection && (
        <QuickActionsBar
          selectionCount={selectionCount}
          onSelectAll={() => selectAll(filteredBreakers.map(b => b.id))}
          onClearSelection={clearSelection}
          onDelete={handleBatchDelete}
          onSetStateOn={() => handleBatchSetState('On')}
          onSetStateOff={() => handleBatchSetState('Off')}
          totalRows={filteredBreakers.length}
          showStateActions={true}
          userMode={userMode}
        />
      )}

      {/* Breakers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden" data-tour="locks-table">
        {filteredBreakers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {breakers.length === 0 ? 'No locked breakers found' : 'No breakers match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {hasSelection && (
                    <th className="px-4 py-3 w-12"></th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/5">
                    Breaker Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                    Zone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                    Subzone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                    Lock Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                    General Breaker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBreakers.map((breaker) => (
                  <tr 
                    key={breaker.id} 
                    className={`transition-colors duration-150 hover:shadow-sm ${
                      isRowSelected(breaker.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onContextMenu={(e) => handleRowContextMenu(e, breaker.id)}
                    title="Double clic droit pour sélectionner"
                  >
                    {hasSelection && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isRowSelected(breaker.id)}
                          onChange={() => handleRowContextMenu({ preventDefault: () => {}, type: 'click' }, breaker.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 break-words">
                        <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-white break-words">
                          {breaker.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {breaker.zone}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {breaker.subzone || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 break-words">
                      {breaker.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                        {breaker.lock_key || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 break-words">
                      {breaker.general_breaker || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
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
