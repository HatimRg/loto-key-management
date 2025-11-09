import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, AlertCircle, Search, Upload, Download, FileText, X, Eye, FileDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Footer from '../components/Footer';
import ConfirmDialog from '../components/ConfirmDialog';
import QuickActionsBar from '../components/QuickActionsBar';
import { useMultiRowSelection } from '../hooks/useMultiRowSelection';
import db from '../utils/database';
import { exportToExcel, parseExcelFile, validatePersonnelExcel } from '../utils/excelHelper';
import { generatePersonnelTemplate, exportFailedRows } from '../utils/importTemplates';
import { saveFileDualWrite } from '../utils/fileSync';
import { FILE_CONFIG } from '../utils/constants';

const { ipcRenderer } = window;

function Personnel() {
  const location = useLocation();
  const { userMode, isOnline } = useApp();
  const { showToast } = useToast();
  const canEdit = userMode === 'AdminEditor' || userMode === 'RestrictedEditor';
  const csvInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [personnel, setPersonnel] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, name: '' });
  const [viewingPDF, setViewingPDF] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    lastname: '',
    id_card: '',
    company: '',
    habilitation: '',
    pdf_path: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  
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
  }, []);

  // Handle navigation state separately to avoid triggering loadData
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const loadData = async () => {
    // Only show loading spinner on initial load, not on updates (preserves scroll)
    const isInitialLoad = personnel.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      const result = await db.getPersonnel();
      if (result.success) {
        setPersonnel(result.data);
      }
    } catch (error) {
      console.error('❌ Error loading personnel:', error);
    } finally {
      // CRITICAL: Always clear loading state, even on error
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const handleAdd = () => {
    setEditingPerson(null);
    setFormData({
      name: '',
      lastname: '',
      id_card: '',
      company: '',
      habilitation: '',
      pdf_path: ''
    });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      lastname: person.lastname,
      id_card: person.id_card,
      company: person.company || '',
      habilitation: person.habilitation || '',
      pdf_path: person.pdf_path || ''
    });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleDelete = (id, name, lastname) => {
    setConfirmDelete({ show: true, id, name: `${name} ${lastname}` });
  };

  const confirmDeletePersonnel = async () => {
    const { id } = confirmDelete;
    // Get person info before deleting for history log
    const person = personnel.find(p => p.id === id);
    const result = await db.deletePersonnel(id);
    if (result.success) {
      // Log to history
      await db.addHistory({
        action: `Deleted personnel: ${person?.name || ''} ${person?.lastname || ''}`,
        user_mode: userMode,
        details: `ID Card: ${person?.id_card || 'N/A'}`
      });
      showToast('✓ Personnel deleted successfully', 'success');
      loadData();
    } else {
      showToast('Failed to delete personnel', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    const success = await generatePersonnelTemplate();
    if (success) {
      showToast('✓ Import template downloaded with instructions!', 'success', 4000);
    } else {
      showToast('Failed to download template', 'error');
    }
  };

  const handleExportExcel = async () => {
    // Map database fields to import template column names (exclude PDFs)
    const exportData = filteredPersonnel.map(person => ({
      'First Name': person.name,
      'Last Name': person.lastname,
      'ID Card': person.id_card || '',
      'Company': person.company,
      'Habilitation': person.habilitation
    }));

    const filename = `personnel_export_${new Date().toISOString().split('T')[0]}`;
    const success = await exportToExcel(exportData, filename, 'Personnel');
    if (success) {
      showToast('Excel file exported successfully', 'success');
    }
  };

  // Handle Excel Import
  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      showToast('Processing Excel import...', 'info', 1500);

      const data = await parseExcelFile(file);
      
      if (!data || data.length === 0) {
        showToast('No data found in Excel file', 'error');
        return;
      }

      // Validate with new advanced rules
      const validation = validatePersonnelExcel(data);
      
      if (validation.errors.length > 0) {
        console.warn('⚠️  Validation warnings:', validation.errors.slice(0, 10));
      }

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      // Process in batches to prevent timeouts on large imports
      const BATCH_SIZE = 20;
      const totalRows = validation.valid.length;

      for (let i = 0; i < totalRows; i++) {
        const row = validation.valid[i];
        
        const personData = {
          name: row.name,
          lastname: row.lastname,
          id_card: row.id_card || '',
          company: row.company,
          habilitation: row.habilitation,
          pdf_path: ''
        };

        // Check for duplicates (name + company)
        const isDuplicate = personnel.some(p => 
          p.name.toLowerCase() === personData.name.toLowerCase() &&
          p.lastname.toLowerCase() === personData.lastname.toLowerCase() &&
          p.company.toLowerCase() === personData.company.toLowerCase()
        );

        if (isDuplicate) {
          skipped++;
          // Add to failed rows for tracking
          validation.failedRows.push({
            'Row': i + 2,
            'First Name': personData.name,
            'Last Name': personData.lastname,
            'ID Card': personData.id_card,
            'Company': personData.company,
            'Habilitation': personData.habilitation,
            'Problem': 'Duplicate entry (same name + company already exists)'
          });
          continue;
        }

        // Add personnel
        try {
          const result = await db.addPersonnel(personData);
          if (result.success) {
            imported++;
          } else {
            failed++;
            console.error(`✗ Failed to add: ${personData.name}`, result.error);
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
      
      // Export failed rows if any
      if (validation.failedRows && validation.failedRows.length > 0) {
        const exported = await exportFailedRows(validation.failedRows, 'Personnel');
        if (exported) {
          let message = [];
          if (imported > 0) message.push(`✓ Imported: ${imported}`);
          if (skipped > 0) message.push(`⊘ Skipped (duplicates): ${skipped}`);
          if (validation.failedRows.length > 0) message.push(`✗ Failed: ${validation.failedRows.length} (errors file downloaded)`);
          
          showToast(message.join(' • '), 'warning', 6000);
        }
      } else if (imported > 0) {
        showToast(`✓ Successfully imported ${imported} personnel record${imported !== 1 ? 's' : ''}!`, 'success', 4000);
      } else {
        showToast('No valid rows to import', 'error');
      }

      // Reload data
      await loadData();
    } catch (error) {
      showToast(`Import error: ${error.message}`, 'error');
      console.error('Import error:', error);
    }

    event.target.value = '';
  };

  // Handle PDF file selection (browser compatible)
  const handlePDFSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Please select a PDF file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > FILE_CONFIG.maxPersonnelPdfSize) {
      showToast('PDF file must be less than 5MB', 'error');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedFile({
        name: file.name,
        data: e.target?.result,
        type: file.type
      });
      showToast(`PDF selected: ${file.name}`, 'success');
    };
    reader.onerror = () => {
      showToast('Failed to read PDF file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let pdfCloudUrl = formData.pdf_path; // Use existing cloud URL if no new file
      
      // Upload file to Supabase Storage if new one was selected
      if (selectedFile) {
        const saveResult = await saveFileDualWrite(
          `${formData.id_card}_${selectedFile.name}`,
          selectedFile.data,
          'personnel'  // Upload to personnel-certificates bucket
        );
        
        if (saveResult.success) {
          pdfCloudUrl = saveResult.cloudUrl;
        } else {
          console.error('❌ Failed to upload file:', saveResult.error);
          showToast('Failed to upload file: ' + saveResult.error, 'error');
          return;
        }
      }
      
      // Store cloud URL in database
      const personData = { ...formData, pdf_path: pdfCloudUrl };
      
      if (editingPerson) {
        const result = await db.updatePersonnel(editingPerson.id, personData);
        if (result.success) {
          // Log to history
          await db.addHistory({
            action: `Updated personnel: ${personData.name} ${personData.lastname}`,
            user_mode: userMode,
            details: `ID Card: ${personData.id_card}, Company: ${personData.company}`
          });
          showToast('Personnel updated successfully', 'success');
        } else {
          console.error('❌ Failed to update personnel:', result.error);
          showToast('Failed to update personnel', 'error');
        }
      } else {
        const result = await db.addPersonnel(personData);
        if (result.success) {
          // Log to history
          await db.addHistory({
            action: `Added personnel: ${personData.name} ${personData.lastname}`,
            user_mode: userMode,
            details: `ID Card: ${personData.id_card}, Company: ${personData.company}`
          });
          showToast('Personnel added successfully', 'success');
        } else {
          console.error('❌ Failed to add personnel:', result.error);
          showToast('Failed to add personnel', 'error');
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

  const handleViewPDF = async (pdfPath, personName) => {
    if (!pdfPath) {
      console.error('❌ No PDF path provided');
      showToast('No PDF available', 'error');
      return;
    }

    try {
      // Check if it's a Supabase cloud URL (https://)
      if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
        setViewingPDF({ url: pdfPath, name: personName });
        setShowPDFViewer(true);
        return;
      }
      
      // Check if it's a data URL (browser mode)
      if (pdfPath.startsWith('data:')) {
        setViewingPDF({ url: pdfPath, name: personName });
        setShowPDFViewer(true);
        return;
      }
      
      // Local file path - read via IPC (Electron)
      if (ipcRenderer) {
        const result = await ipcRenderer.invoke('read-file', pdfPath);
        if (result.success) {
          // Convert base64 to blob (browser-compatible)
          const binaryString = atob(result.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          setViewingPDF({ url, name: personName });
          setShowPDFViewer(true);
        } else {
          console.error('❌ Failed to read file:', result.error);
          showToast(`Could not open file: ${result.error || 'File not found'}`, 'error');
        }
      } else {
        console.error('❌ No IPC available and not a cloud/data URL');
        showToast('PDF viewing not available', 'error');
      }
    } catch (error) {
      console.error('❌ Exception viewing PDF:', error);
      showToast(`Error loading PDF: ${error.message}`, 'error');
    }
  };

  const handleDownloadPDF = async (pdfPath, idCard) => {
    if (!pdfPath) return;

    try {
      // Check if it's a Supabase cloud URL
      if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
        const a = document.createElement('a');
        a.href = pdfPath;
        a.download = `certificate_${idCard}.pdf`;
        a.target = '_blank';
        a.click();
        showToast('PDF download started', 'success');
        return;
      }
      
      // Check if it's a data URL (browser mode)
      if (pdfPath.startsWith('data:')) {
        // Create download link from data URL
        const a = document.createElement('a');
        a.href = pdfPath;
        a.download = `certificate_${idCard}.pdf`;
        a.click();
        showToast('PDF downloaded', 'success');
        return;
      }
      
      // Local file - read via IPC (Electron)
      if (ipcRenderer) {
        const result = await ipcRenderer.invoke('read-file', pdfPath);
        if (result.success) {
          // Convert base64 to blob (browser-compatible)
          const binaryString = atob(result.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `certificate_${idCard}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          showToast('PDF downloaded', 'success');
        } else {
          showToast('Failed to download PDF', 'error');
        }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast('Error downloading PDF', 'error');
    }
  };

  // Memoize filtered personnel to prevent recalculation on every render
  const filteredPersonnel = useMemo(() => {
    return personnel.filter(person => {
      const searchLower = searchTerm.toLowerCase();
      return !searchTerm || 
        person.name.toLowerCase().includes(searchLower) ||
        person.lastname.toLowerCase().includes(searchLower) ||
        person.id_card.toLowerCase().includes(searchLower) ||
        person.company?.toLowerCase().includes(searchLower);
    });
  }, [personnel, searchTerm]);

  // Batch delete handler
  const handleBatchDelete = async () => {
    if (!canEdit) {
      showToast('Non disponible en mode Visiteur', 'error');
      return;
    }

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} person(s)?`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const person = personnel.find(p => p.id === id);
        const result = await db.deletePersonnel(id);
        if (result.success) {
          await db.addHistory({
            action: `Deleted personnel: ${person?.name || ''} ${person?.lastname || ''}`,
            user_mode: userMode,
            details: `Batch deletion - ID Card: ${person?.id_card || 'N/A'}`
          });
        }
      }
      showToast(`✓ ${selectedIds.length} personne(s) supprimé(s)`, 'success');
      loadData();
      clearSelection();
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
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
      {/* Hidden File Inputs */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelImport}
        className="hidden"
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        onChange={handlePDFSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
          <Users className="w-7 h-7 text-green-600" />
          <span>Personnel Access Control</span>
        </h1>
        <div className="flex space-x-2">
          {/* Export is available to ALL users including Visitor */}
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
            title="Export personnel data to Excel (without PDFs)"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          
          {/* Add/Import/Template only for editors */}
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
                title={isOnline ? 'Download Excel template with instructions' : '⚠️ App is offline - Connect to internet to edit the database'}
                data-tour="download-template-personnel"
              >
                <FileDown className="w-4 h-4" />
                <span>Get Template</span>
              </button>
              <button
                onClick={isOnline ? () => csvInputRef.current?.click() : undefined}
                disabled={!isOnline}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
                  isOnline
                    ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                }`}
                title={isOnline ? 'Import personnel from Excel file' : '⚠️ App is offline - Connect to internet to edit the database'}
                data-tour="import-excel-personnel"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>
              <button
                onClick={isOnline ? handleAdd : undefined}
                disabled={!isOnline}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
                  isOnline
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
                }`}
                title={isOnline ? 'Add new personnel member' : '⚠️ App is offline - Connect to internet to edit the database'}
                data-tour="add-personnel"
              >
                <Plus className="w-4 h-4" />
                <span>Add Personnel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search personnel by name, ID card, or company..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      {hasSelection && (
        <QuickActionsBar
          selectionCount={selectionCount}
          onSelectAll={() => selectAll(filteredPersonnel.map(p => p.id))}
          onClearSelection={clearSelection}
          onDelete={handleBatchDelete}
          totalRows={filteredPersonnel.length}
          showStateActions={false}
          userMode={userMode}
        />
      )}

      {/* Personnel Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden" data-tour="personnel-table">
        {filteredPersonnel.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {personnel.length === 0 ? 'No personnel records found. Add one to get started!' : 'No personnel match your search'}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                    ID Card
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/5">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
                    Habilitation
                  </th>
                  {canEdit && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPersonnel.map((person) => (
                  <tr 
                    key={person.id} 
                    className={`transition-colors duration-150 hover:shadow-sm ${
                      isRowSelected(person.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onContextMenu={(e) => handleRowContextMenu(e, person.id)}
                    title="Double right-click to select"
                  >
                    {hasSelection && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isRowSelected(person.id)}
                          onChange={() => handleRowContextMenu({ preventDefault: () => {}, type: 'click' }, person.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white break-words">
                        {person.name} {person.lastname}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {person.id_card || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 break-words">
                      {person.company}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 break-words">
                      {person.habilitation}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 whitespace-nowrap bg-inherit">
                        <div className="flex items-center space-x-2">
                          {person.pdf_path && (
                            <>
                              <button
                                onClick={() => handleViewPDF(person.pdf_path, `${person.name} ${person.lastname}`)}
                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900 rounded"
                                title="View certificate"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(person.pdf_path, person.id_card)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                                title="Download certificate"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={isOnline ? () => handleEdit(person) : undefined}
                            disabled={!isOnline}
                            className={`p-2 rounded ${
                              isOnline
                                ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer'
                                : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                            title={isOnline ? 'Edit person' : '⚠️ App is offline - Connect to internet to edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={isOnline ? () => handleDelete(person.id, person.name, person.lastname) : undefined}
                            disabled={!isOnline}
                            className={`p-2 rounded ${
                              isOnline
                                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900 cursor-pointer'
                                : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                            title={isOnline ? 'Delete person' : '⚠️ App is offline - Connect to internet to edit'}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingPerson ? 'Edit Personnel' : 'Add New Personnel'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastname}
                    onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Card <span className="text-gray-400 text-xs">(Optional)</span></label>
                <input
                  type="text"
                  value={formData.id_card}
                  onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Habilitation</label>
                <input
                  type="text"
                  value={formData.habilitation}
                  onChange={(e) => setFormData({...formData, habilitation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PDF Certificate (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Upload className="w-5 h-5" />
                  <span>{selectedFile ? `✓ ${selectedFile.name}` : 'Click to upload PDF'}</span>
                </button>
                {formData.pdf_path && !selectedFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>Current: {formData.pdf_path.split(/[\\/]/).pop()}</span>
                  </p>
                )}
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {editingPerson ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPDFViewer && viewingPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Certificate: {viewingPDF.name}</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const person = personnel.find(p => `${p.name} ${p.lastname}` === viewingPDF.name);
                    if (person) handleDownloadPDF(person.pdf_path, person.id_card);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    setShowPDFViewer(false);
                    if (viewingPDF.url && !viewingPDF.url.startsWith('data:')) {
                      window.URL.revokeObjectURL(viewingPDF.url);
                    }
                    setViewingPDF(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            
            {/* PDF Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={viewingPDF.url}
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, id: null, name: '' })}
        onConfirm={confirmDeletePersonnel}
        title="Delete Personnel"
        message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Personnel;
