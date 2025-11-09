import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Zap, Search, Plus, Edit2, Trash2, AlertCircle, Download, Upload, FileDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Footer from '../components/Footer';
import ConfirmDialog from '../components/ConfirmDialog';
import QuickActionsBar from '../components/QuickActionsBar';
import BatchConfirmDialog from '../components/BatchConfirmDialog';
import LoadingOverlay from '../components/LoadingOverlay';
import { useMultiRowSelection } from '../hooks/useMultiRowSelection';
import { useDebounce } from '../hooks/useDebounce';
import db from '../utils/database';
import { exportToExcel, parseExcelFile, validateBreakerExcel } from '../utils/excelHelper';
import { generateBreakersTemplate, exportFailedRows } from '../utils/importTemplates';

const { ipcRenderer } = window;

function ViewByBreakers() {
  const location = useLocation();
  const { userMode, isOnline } = useApp();
  const { showToast } = useToast();
  const canEdit = userMode === 'AdminEditor' || userMode === 'RestrictedEditor';
  const canEditOnline = canEdit && isOnline;
  const fileInputRef = useRef(null);
  const [breakers, setBreakers] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 200); // Debounce search for performance
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBreaker, setEditingBreaker] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    name: '',
    zone: '',
    subzone: '',
    location: '',
    customLocation: '',
    state: 'Off',
    lock_key: '',
    general_breaker: ''
  });
  const [previousCustomLocations, setPreviousCustomLocations] = useState([]);
  const [availableGeneralBreakers, setAvailableGeneralBreakers] = useState([]);
  
  // Multi-row selection hook
  const {
    handleRowContextMenu,
    toggleRow, // For checkbox clicks
    selectAll,
    clearSelection,
    isRowSelected,
    getSelectedIds,
    hasSelection,
    selectionCount,
  } = useMultiRowSelection();
  
  // State for batch confirmation dialog
  const [batchConfirm, setBatchConfirm] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning',
  });
  
  // State for loading overlay (Excel import progress)
  const [loadingOverlay, setLoadingOverlay] = useState({
    show: false,
    title: '',
    message: '',
    progress: 0,
    type: 'processing',
    details: []
  });
  
  // Zone -> SubZone mapping
  const zoneSubzoneMap = {
    'Zone 1': ['R01', 'R02'],
    'Zone 2': ['R11', 'R13', 'R15'],
    'Zone 3': ['R12', 'R14', 'R21', 'R22']
  };
  
  const locationOptions = [
    'Poste de Transformation',
    'Poste Génératrice',
    'TGBT',
    'Local Technique'
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Handle navigation state separately to avoid triggering loadData
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const loadData = async () => {
    // Only show loading spinner on initial load, not on updates (preserves scroll)
    const isInitialLoad = breakers.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      const result = await db.getBreakers();
      if (result.success) {
        setBreakers(result.data);
      }

      const zoneList = await db.getZones();
      setZones(zoneList);

      const locationList = await db.getLocations();
      setLocations(locationList);
    } catch (error) {
      console.error('❌ Error loading breakers:', error);
    } finally {
      // CRITICAL: Always clear loading state, even on error
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const handleAdd = () => {
    setEditingBreaker(null);
    setFormData({
      name: '',
      zone: '',
      subzone: '',
      location: '',
      customLocation: '',
      state: 'Off',
      lock_key: '',
      general_breaker: ''
    });
    loadPreviousCustomLocations();
    setShowModal(true);
  };

  const handleEdit = (breaker) => {
    setEditingBreaker(breaker);
    
    setFormData({
      name: breaker.name,
      zone: breaker.zone || '',
      subzone: breaker.subzone || '',
      location: breaker.location || '',
      customLocation: breaker.special_use || '',
      state: breaker.state,
      lock_key: breaker.lock_key || '',
      general_breaker: breaker.general_breaker || ''
    });
    loadPreviousCustomLocations();
    loadGeneralBreakers(breaker.zone);
    setShowModal(true);
  };

  const handleDelete = (id, name) => {
    setConfirmDelete({ show: true, id, name });
  };

  const confirmDeleteBreaker = async () => {
    const { id } = confirmDelete;
    try {
      console.log('🗑️ Deleting breaker:', id);
      const result = await db.deleteBreaker(id);
      console.log('Delete result:', result);
      
      if (result.success) {
        await db.addHistory({
          breaker_id: id,
          action: 'Deleted breaker',
          user_mode: userMode
        });
        showToast('✓ Breaker deleted successfully', 'success');
        
        // Force reload data
        await loadData();
        
        // Notify other pages that breakers changed
        window.dispatchEvent(new CustomEvent('breakers-changed', { 
          detail: { type: 'delete', breakerId: id } 
        }));
      } else {
        console.error('❌ Delete failed:', result.error);
        showToast(`Failed to delete breaker: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      showToast(`Error deleting breaker: ${error.message}`, 'error');
    }
  };
  
  // Load previous custom locations for "Local Technique"
  const loadPreviousCustomLocations = async () => {
    const result = await db.getBreakers();
    if (result.success && result.data) {
      const customLocs = result.data
        .filter(b => b.location === 'Local Technique' && b.special_use)
        .map(b => b.special_use)
        .filter((v, i, arr) => arr.indexOf(v) === i); // unique values
      setPreviousCustomLocations(customLocs);
    }
  };
  
  // Load available general breakers for the selected zone
  const loadGeneralBreakers = async (zone) => {
    const result = await db.getBreakers();
    if (result.success && result.data) {
      const filtered = result.data.filter(b => 
        b.zone?.startsWith(zone) && (!editingBreaker || b.id !== editingBreaker.id)
      );
      setAvailableGeneralBreakers(filtered);
    }
  };
  
  // Handle zone change - reset subzone and load general breakers
  const handleZoneChange = (zone) => {
    setFormData({
      ...formData,
      zone,
      subzone: '',
      general_breaker: ''
    });
    loadGeneralBreakers(zone);
  };
  
  // Handle state change - check general breaker restriction
  const handleStateChange = (newState) => {
    // If general breaker is Off or Closed, this breaker cannot be On
    if (newState === 'On' && formData.general_breaker) {
      const generalBreaker = breakers.find(b => b.name === formData.general_breaker);
      if (generalBreaker && (generalBreaker.state === 'Off' || generalBreaker.state === 'Closed')) {
        showToast('Cannot turn On: General breaker is Off or Closed', 'error');
        return;
      }
    }
    
    setFormData({
      ...formData,
      state: newState,
      lock_key: newState === 'Closed' ? formData.lock_key : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        name: formData.name,
        zone: formData.zone,
        subzone: formData.subzone || null,
        location: formData.location,
        special_use: formData.location === 'Local Technique' ? formData.customLocation : null,
        state: formData.state,
        lock_key: formData.state === 'Closed' ? formData.lock_key : null,
        general_breaker: formData.general_breaker || null,
        date: new Date().toLocaleDateString('fr-FR')
      };
      
      if (editingBreaker) {
        const result = await db.updateBreaker(editingBreaker.id, {
          name: submitData.name,
          zone: submitData.zone,
          subzone: submitData.subzone,
          location: submitData.location,
          special_use: submitData.special_use,
          state: submitData.state,
          lock_key: submitData.lock_key,
          general_breaker: submitData.general_breaker,
          date: submitData.date
        });
        if (result.success) {
          await db.addHistory({
            breaker_id: editingBreaker.id,
            action: `Updated breaker: ${formData.name}`,
            user_mode: userMode,
            details: `State changed to ${formData.state}`
          });
          showToast('Breaker updated successfully', 'success');
          
          // Notify other pages (like ViewByLocks) that breakers changed
          window.dispatchEvent(new CustomEvent('breakers-changed', { 
            detail: { type: 'update', breakerId: editingBreaker.id, state: formData.state } 
          }));
        } else {
          showToast('Failed to update breaker', 'error');
        }
      } else {
        const result = await db.addBreaker(submitData);
        if (result.success) {
          await db.addHistory({
            breaker_id: result.data?.lastInsertRowid || result.data?.id,
            action: `Added new breaker: ${formData.name}`,
            user_mode: userMode
          });
          showToast('Breaker added successfully', 'success');
          
          // Notify other pages (like ViewByLocks) that breakers changed
          window.dispatchEvent(new CustomEvent('breakers-changed', { 
            detail: { type: 'add', state: submitData.state } 
          }));
        } else {
          showToast('Failed to add breaker', 'error');
        }
      }
      
      await loadData();
    } catch (error) {
      console.error('❌ Submit error:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      // CRITICAL: Always close modal even on error
      setShowModal(false);
    }
  };

  // Batch operation handlers
  const handleBatchDelete = () => {
    if (!canEdit) {
      showToast('Non disponible en mode Visiteur', 'error');
      return;
    }

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    // Show custom confirmation dialog
    setBatchConfirm({
      show: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete ${selectedIds.length} breaker(s)? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        setBatchConfirm({ ...batchConfirm, show: false });
        
        let successCount = 0;
        let failCount = 0;
        
        try {
          // Process all items with error handling for each
          for (const id of selectedIds) {
            try {
              const breaker = breakers.find(b => b.id === id);
              await db.deleteBreaker(id);
              await db.addHistory({
                action: `Deleted breaker: ${breaker?.name || 'Unknown'}`,
                user_mode: userMode,
                details: `Batch deletion`
              });
              successCount++;
            } catch (error) {
              console.error(`Failed to delete breaker ${id}:`, error);
              failCount++;
            }
          }
          
          // Show detailed result
          if (successCount > 0) {
            showToast(`✓ ${successCount}/${selectedIds.length} disjoncteur(s) supprimé(s)`, 'success');
          }
          if (failCount > 0) {
            showToast(`❌ ${failCount} suppression(s) échouée(s)`, 'error');
          }
          
          loadData();
          clearSelection();
        } catch (error) {
          showToast('Erreur lors de la suppression', 'error');
        }
      },
    });
  };

  const handleBatchSetState = (newState) => {
    if (!canEdit) {
      showToast('Non disponible en mode Visiteur', 'error');
      return;
    }

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    const stateText = newState === 'On' ? 'activer' : 'désactiver';
    const stateTextPast = newState === 'On' ? 'activé(s)' : 'désactivé(s)';
    
    // Show custom confirmation dialog
    setBatchConfirm({
      show: true,
      title: `Confirmer le changement d'état`,
      message: `Voulez-vous vraiment ${stateText} ${selectedIds.length} disjoncteur(s) ?`,
      type: 'warning',
      onConfirm: async () => {
        setBatchConfirm({ ...batchConfirm, show: false });
        
        let successCount = 0;
        let failCount = 0;
        
        try {
          console.log(`🔄 Starting batch update for ${selectedIds.length} breakers to state: ${newState}`);
          
          // Process all items with error handling for each
          for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            try {
              const breaker = breakers.find(b => b.id === id);
              console.log(`  ${i + 1}/${selectedIds.length}: Updating breaker ${id} (${breaker?.name})`);
              
              const updateResult = await db.updateBreaker(id, { state: newState });
              
              if (updateResult.success) {
                await db.addHistory({
                  breaker_id: id,
                  action: `State changed to ${newState}`,
                  user_mode: userMode,
                  details: `Batch operation on ${breaker?.name || 'Unknown'}`
                });
                successCount++;
                console.log(`  ✅ Success: ${id}`);
              } else {
                console.error(`  ❌ Update failed for ${id}:`, updateResult.error);
                failCount++;
              }
              
              // Small delay to prevent overwhelming the database
              if ((i + 1) % 10 === 0 && i < selectedIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            } catch (error) {
              console.error(`  ❌ Exception updating breaker ${id}:`, error);
              failCount++;
            }
          }
          
          console.log(`✅ Batch update complete: ${successCount} success, ${failCount} failed`);
          
          // Show detailed result
          if (successCount > 0) {
            showToast(`✓ ${successCount}/${selectedIds.length} disjoncteur(s) ${stateTextPast}`, 'success');
          }
          if (failCount > 0) {
            showToast(`❌ ${failCount} mise(s) à jour échouée(s)`, 'error');
          }
          
          // Reload data to reflect changes
          await loadData();
          clearSelection();
        } catch (error) {
          console.error('❌ Batch update error:', error);
          showToast('Erreur lors de la mise à jour', 'error');
        }
      },
    });
  };

  const handleExportExcel = async () => {
    // Map database fields to import template column names
    const exportData = filteredBreakers.map(breaker => ({
      'Date': breaker.date || new Date().toLocaleDateString('fr-FR'),
      'Breaker Name': breaker.name,
      'Zone': breaker.zone,
      'Subzone': breaker.subzone || '',
      'Location': breaker.location,
      'Specifique Area': breaker.special_use || '',
      'State': breaker.state,
      'Key Number': breaker.lock_key || '',
      'General Breaker': breaker.general_breaker || ''
    }));

    const filename = `breakers_export_${new Date().toISOString().split('T')[0]}`;
    const success = await exportToExcel(exportData, filename, 'Breakers');
    if (success) {
      showToast('Excel file exported successfully', 'success');
    }
  };

  const handleDownloadTemplate = async () => {
    const success = await generateBreakersTemplate();
    if (success) {
      showToast('✓ Import template downloaded with instructions!', 'success', 4000);
    } else {
      showToast('Failed to download template', 'error');
    }
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const details = [];
    const addDetail = (message, type = 'info') => {
      details.push({ message, type });
      setLoadingOverlay(prev => ({ ...prev, details: [...details] }));
    };

    try {
      // Show loading overlay
      setLoadingOverlay({
        show: true,
        title: 'Importing Excel File',
        message: 'Reading file...',
        progress: 5,
        type: 'import',
        details: []
      });
      addDetail(`📁 File selected: ${file.name}`, 'info');
      addDetail(`📊 File size: ${(file.size / 1024).toFixed(2)} KB`, 'info');
      
      const data = await parseExcelFile(file);
      setLoadingOverlay(prev => ({ ...prev, progress: 15, message: 'Parsing data...' }));
      addDetail(`✓ File read successfully`, 'success');
      
      if (!data || data.length === 0) {
        setLoadingOverlay({ show: false, title: '', message: '', progress: 0, type: 'processing', details: [] });
        showToast('No data found in Excel file', 'error');
        return;
      }

      addDetail(`📊 Found ${data.length} rows to process`, 'info');
      console.log(`📥 Processing ${data.length} rows from Excel...`);
      
      // Validate data with new advanced rules
      setLoadingOverlay(prev => ({ ...prev, progress: 25, message: 'Validating data...', type: 'validating' }));
      addDetail('🔍 Validating breaker data...', 'info');
      const validation = validateBreakerExcel(data);
      addDetail(`✓ Validation complete`, 'success');
      
      if (validation.errors.length > 0) {
        console.warn('⚠️  Validation warnings:', validation.errors.slice(0, 10));
      }

      // Import valid rows with deduplication
      let imported = 0;
      let failed = 0;
      let skipped = 0;

      // Get existing breakers for deduplication
      setLoadingOverlay(prev => ({ ...prev, progress: 30, message: 'Checking for duplicates...' }));
      addDetail('🔄 Loading existing breakers...', 'info');
      const existingBreakers = (await db.getBreakers()).data || [];
      const existingKeys = new Set(
        existingBreakers.map(b => `${b.name}|${b.zone}|${b.subzone || ''}|${b.location}`.toLowerCase())
      );
      addDetail(`✓ Found ${existingBreakers.length} existing breakers`, 'success');

      // Process in batches to prevent timeouts on large imports
      const BATCH_SIZE = 20;
      const totalRows = validation.valid.length;
      addDetail(`📝 ${totalRows} valid rows ready to import`, 'info');
      
      if (validation.invalid.length > 0) {
        addDetail(`⚠ ${validation.invalid.length} rows have validation errors`, 'warning');
      }
      
      setLoadingOverlay(prev => ({ ...prev, progress: 35, message: 'Importing breakers...', type: 'processing' }));
      addDetail('💾 Starting import process...', 'info');
      
      for (let i = 0; i < totalRows; i++) {
        const row = validation.valid[i];
        
        // Calculate progress (35% to 90%)
        const importProgress = 35 + Math.floor(((i + 1) / totalRows) * 55);
        setLoadingOverlay(prev => ({ 
          ...prev, 
          progress: importProgress,
          message: `Importing breaker ${i + 1} of ${totalRows}...`
        }));
        
        // Show progress for large imports
        if (totalRows > 50 && i % 10 === 0) {
          addDetail(`📊 Progress: ${i}/${totalRows} rows processed`, 'info');
          console.log(`📊 Progress: ${i}/${totalRows} rows processed...`);
        }
        
        // Check for duplicate (name + zone + subzone + location must all match)
        const key = `${row.name}|${row.zone}|${row.subzone || ''}|${row.location}`.toLowerCase();
        if (existingKeys.has(key)) {
          skipped++;
          console.log(`⊘ Duplicate found: ${row.name} (Zone: ${row.zone}, Subzone: ${row.subzone}, Location: ${row.location})`);
          
          // Add to failed rows for export
          validation.failedRows.push({
            'Row': i + 2,
            'Date': row.date,
            'Breaker Name': row.name,
            'Zone': row.zone,
            'Subzone': row.subzone,
            'Location': row.location,
            'Specifique Area': row.specifique_area || '',
            'State': row.state,
            'Key Number': row.lock_key || '',
            'General Breaker': row.general_breaker || '',
            'Problem': `Duplicate entry - breaker with same name, zone, subzone and location already exists`
          });
          continue;
        }

        const breakerData = {
          name: row.name,
          zone: row.zone,
          subzone: row.subzone || null,
          location: row.location,
          special_use: row.specifique_area || null,
          state: row.state || 'Off',
          lock_key: row.lock_key || null,
          general_breaker: row.general_breaker || null,
          date: row.date || new Date().toLocaleDateString('fr-FR'),
          active: 1
        };

        try {
          const result = await db.addBreaker(breakerData);
          if (result.success) {
            existingKeys.add(key); // Add to set to prevent duplicates within same import
            imported++;
            console.log(`✓ Row ${imported}/${totalRows}: ${breakerData.name}`);
          } else {
            failed++;
            console.error(`✗ Failed to add: ${breakerData.name}`, result.error);
          }
        } catch (error) {
          failed++;
          console.error(`✗ Exception adding row ${i + 1}:`, error);
        }
        
        // Brief pause every batch to prevent overwhelming database
        if ((i + 1) % BATCH_SIZE === 0 && i < totalRows - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`📊 Final: ${imported} imported, ${skipped} skipped, ${failed} failed out of ${totalRows} total rows`);
      
      // Update progress
      setLoadingOverlay(prev => ({ ...prev, progress: 90, message: 'Finalizing import...' }));
      addDetail(`✓ Import complete: ${imported} imported`, 'success');
      if (skipped > 0) addDetail(`⊘ ${skipped} duplicates skipped`, 'warning');
      if (failed > 0) addDetail(`✗ ${failed} rows failed`, 'error');

      // Export failed rows if any
      if (validation.failedRows && validation.failedRows.length > 0) {
        setLoadingOverlay(prev => ({ ...prev, progress: 95, message: 'Exporting error report...' }));
        addDetail('📤 Generating error report...', 'info');
        console.log(`📤 Exporting ${validation.failedRows.length} failed rows...`);
        const exported = await exportFailedRows(validation.failedRows, 'Breakers');
        if (exported) {
          showToast(
            `Import: ${imported} imported, ${skipped} skipped (duplicates), ${validation.failedRows.length} failed (errors file downloaded)`,
            'warning',
            6000
          );
        } else {
          showToast(
            `Import complete: ${imported} imported, ${validation.failedRows.length} failed`,
            'warning',
            4000
          );
        }
      } else if (imported > 0) {
        showToast(`✓ Successfully imported ${imported} breakers!`, 'success', 4000);
      } else {
        showToast('No valid rows to import', 'error');
      }

      // Reload data
      setLoadingOverlay(prev => ({ ...prev, progress: 98, message: 'Refreshing data...' }));
      addDetail('🔄 Reloading breaker list...', 'info');
      await loadData();
      addDetail('✓ Data refreshed successfully', 'success');
      
      // Notify other pages that breakers changed
      if (imported > 0) {
        window.dispatchEvent(new CustomEvent('breakers-changed', { 
          detail: { type: 'import', count: imported } 
        }));
      }
      
      // Complete
      setLoadingOverlay(prev => ({ ...prev, progress: 100, message: 'Import complete!' }));
      setTimeout(() => {
        setLoadingOverlay({ show: false, title: '', message: '', progress: 0, type: 'processing', details: [] });
      }, 1500);
      
    } catch (error) {
      console.error('Import error:', error);
      setLoadingOverlay({ show: false, title: '', message: '', progress: 0, type: 'processing', details: [] });
      showToast('Error reading Excel file: ' + error.message, 'error');
    }

    event.target.value = '';
  };

  // Memoize filtered breakers to prevent recalculation on every render
  // ⚡ PERFORMANCE: Use debounced search term to reduce filtering operations
  const filteredBreakers = useMemo(() => {
    return breakers.filter(breaker => {
      const matchesZone = !selectedZone || breaker.zone === selectedZone;
      const matchesLocation = !selectedLocation || breaker.location === selectedLocation;
      const matchesState = !selectedState || breaker.state === selectedState;
      const matchesSearch = !debouncedSearchTerm || 
        breaker.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        breaker.zone.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        breaker.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      return matchesZone && matchesLocation && matchesState && matchesSearch;
    });
  }, [breakers, selectedZone, selectedLocation, selectedState, debouncedSearchTerm]);

  const getStateColor = (state) => {
    switch (state) {
      case 'On':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'Off':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'Closed':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'On':
        return '🟢';
      case 'Off':
        return '⚪';
      case 'Closed':
        return '🔴';
      default:
        return '⚪';
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
      
      {/* Import Progress Overlay */}
      <LoadingOverlay
        show={loadingOverlay.show}
        title={loadingOverlay.title}
        message={loadingOverlay.message}
        progress={loadingOverlay.progress}
        type={loadingOverlay.type}
        details={loadingOverlay.details}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
          <Zap className="w-7 h-7 text-blue-600" />
          <span>All Breakers</span>
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          {canEdit && (
            <>
              <button
                onClick={isOnline ? handleDownloadTemplate : undefined}
                disabled={!isOnline}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
                  isOnline
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                }`}
                data-tour="download-template-breakers"
                title={isOnline ? 'Download import template with instructions and dropdown menus' : '⚠️ App is offline - Connect to internet to edit the database'}
              >
                <FileDown className="w-4 h-4" />
                <span>Get Template</span>
              </button>
              <button
                onClick={isOnline ? () => fileInputRef.current?.click() : undefined}
                disabled={!isOnline}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
                  isOnline
                    ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                }`}
                data-tour="import-excel-breakers"
                title={isOnline ? 'Import breakers from Excel' : '⚠️ App is offline - Connect to internet to edit the database'}
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
              <button
                onClick={isOnline ? handleAdd : undefined}
                disabled={!isOnline}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
                  isOnline
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                }`}
                title={isOnline ? 'Add new breaker' : '⚠️ App is offline - Connect to internet to edit the database'}
                data-tour="add-breaker"
              >
                <Plus className="w-4 h-4" />
                <span>Add Breaker</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search breakers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

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

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Locations</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All States</option>
            <option value="On">🟢 On</option>
            <option value="Off">⚪ Off</option>
            <option value="Closed">🔴 Closed</option>
          </select>
        </div>
      </div>

      {/* Quick Actions Bar - Appears when rows are selected */}
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden" data-tour="breakers-table">
        {filteredBreakers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {breakers.length === 0 ? 'No breakers found. Add one to get started!' : 'No breakers match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {/* Checkbox column - only visible when rows are selected */}
                  {hasSelection && (
                    <th className="px-4 py-3 w-12"></th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/5">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">Subzone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/6">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Lock Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">General Breaker</th>
                  {canEdit && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-y-gray-200 dark:divide-gray-700">
                {filteredBreakers.map((breaker) => (
                  <tr 
                    key={breaker.id} 
                    className={`transition-colors duration-150 hover:shadow-sm ${
                      isRowSelected(breaker.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onContextMenu={(e) => handleRowContextMenu(e, breaker.id)}
                    title="Double right-click to select"
                  >
                    {/* Checkbox - only visible when selection mode is active */}
                    {hasSelection && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isRowSelected(breaker.id)}
                          onChange={() => toggleRow(breaker.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          title="Select/Deselect"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white break-words">
                      {breaker.name}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {breaker.zone}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      {breaker.subzone || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 break-words">
                      {breaker.location === 'Local Technique' && breaker.special_use 
                        ? `Locale ${breaker.special_use}` 
                        : breaker.location}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(breaker.state)}`}>
                        {getStateIcon(breaker.state)} {breaker.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {breaker.lock_key || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 break-words">
                      {breaker.general_breaker || '-'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 whitespace-nowrap bg-inherit">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={isOnline ? () => handleEdit(breaker) : undefined}
                            disabled={!isOnline}
                            className={`p-2 rounded ${
                              isOnline
                                ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer'
                                : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                            title={isOnline ? 'Edit breaker' : '⚠️ App is offline - Connect to internet to edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={isOnline ? () => handleDelete(breaker.id, breaker.name) : undefined}
                            disabled={!isOnline}
                            className={`p-2 rounded ${
                              isOnline
                                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900 cursor-pointer'
                                : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                            title={isOnline ? 'Delete breaker' : '⚠️ App is offline - Connect to internet to edit'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Add/Edit Breaker */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingBreaker ? 'Edit Breaker' : 'Add New Breaker'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Breaker Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Breaker Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Main Power Breaker"
                  required
                />
              </div>
              
              {/* Zone Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    General Zone *
                  </label>
                  <select
                    value={formData.zone}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Zone</option>
                    {Object.keys(zoneSubzoneMap).map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                
                {/* SubZone Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SubZone *
                  </label>
                  <select
                    value={formData.subzone}
                    onChange={(e) => setFormData({...formData, subzone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!formData.zone}
                    required
                  >
                    <option value="">Select SubZone</option>
                    {formData.zone && zoneSubzoneMap[formData.zone]?.map(subzone => (
                      <option key={subzone} value={subzone}>{subzone}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location *
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value, customLocation: ''})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Location</option>
                  {locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              
              {/* Custom Location (if Local Technique selected) */}
              {formData.location === 'Local Technique' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Specify Area *
                  </label>
                  <input
                    type="text"
                    value={formData.customLocation}
                    onChange={(e) => setFormData({...formData, customLocation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter specific area name"
                    required
                  />
                  
                  {previousCustomLocations.length > 0 && (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Or select from previous:
                      </label>
                      <select
                        value=""
                        onChange={(e) => setFormData({...formData, customLocation: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">-- Select Previous Area --</option>
                        {previousCustomLocations.map((loc, idx) => (
                          <option key={idx} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              
              {/* State Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State *
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="On">🟢 On</option>
                  <option value="Off">⚪ Off</option>
                  <option value="Closed">🔴 Closed (Locked)</option>
                </select>
              </div>
              
              {/* Lock Key (only if Closed) */}
              {formData.state === 'Closed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lock Key Number *
                  </label>
                  <input
                    type="text"
                    value={formData.lock_key}
                    onChange={(e) => setFormData({...formData, lock_key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., KEY-001"
                    required
                  />
                </div>
              )}
              
              {/* General Breaker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  General Breaker (Optional)
                </label>
                <select
                  value={formData.general_breaker}
                  onChange={(e) => setFormData({...formData, general_breaker: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!formData.zone}
                >
                  <option value="">-- No General Breaker --</option>
                  {availableGeneralBreakers.map(breaker => (
                    <option key={breaker.id} value={breaker.name}>
                      {breaker.name} ({breaker.state})
                    </option>
                  ))}
                </select>
                {formData.general_breaker && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ⚠️ This breaker cannot be turned On if the general breaker is Off or Closed
                  </p>
                )}
              </div>
              
              {/* Form Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {editingBreaker ? '✔️ Update Breaker' : '➕ Add Breaker'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white py-2 rounded-lg font-medium transition-colors"
                >
                  ✖️ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, id: null, name: '' })}
        onConfirm={confirmDeleteBreaker}
        title="Delete Breaker"
        message={`Are you sure you want to delete breaker "${confirmDelete.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Batch Confirmation Dialog */}
      <BatchConfirmDialog
        show={batchConfirm.show}
        onConfirm={batchConfirm.onConfirm}
        onCancel={() => setBatchConfirm({ ...batchConfirm, show: false })}
        title={batchConfirm.title}
        message={batchConfirm.message}
        type={batchConfirm.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default ViewByBreakers;
