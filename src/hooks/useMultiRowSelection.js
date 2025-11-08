import { useState, useCallback } from 'react';

/**
 * Custom hook for multi-row selection in tables
 * Supports double-right-click to select rows
 */
export const useMultiRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [lastClickTime, setLastClickTime] = useState({});
  const [selectionActive, setSelectionActive] = useState(false); // Track if selection mode is active

  // Toggle a single row selection
  const toggleRow = useCallback((rowId) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
        setSelectionActive(true); // Activate selection mode on first selection
      }
      return newSet;
    });
  }, []);

  // Handle double right-click on a row (or single click if selection already active)
  const handleRowContextMenu = useCallback((e, rowId) => {
    e.preventDefault(); // Prevent default context menu

    // If selection mode is already active, allow single right-click
    if (selectionActive && selectedRows.size > 0) {
      toggleRow(rowId);
      return;
    }

    // Otherwise require double-click to initiate selection
    const now = Date.now();
    const lastClick = lastClickTime[rowId] || 0;
    
    // Check if it's a double click (within 300ms)
    if (now - lastClick < 300) {
      toggleRow(rowId);
      setLastClickTime(prev => ({ ...prev, [rowId]: 0 }));
    } else {
      // Store click time
      setLastClickTime(prev => ({ ...prev, [rowId]: now }));
    }
  }, [lastClickTime, selectionActive, selectedRows.size, toggleRow]);

  // Select all rows
  const selectAll = useCallback((allRowIds) => {
    setSelectedRows(new Set(allRowIds));
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    setSelectionActive(false); // Deactivate selection mode
  }, []);

  // Check if a row is selected
  const isRowSelected = useCallback((rowId) => {
    return selectedRows.has(rowId);
  }, [selectedRows]);

  // Get array of selected row IDs
  const getSelectedIds = useCallback(() => {
    return Array.from(selectedRows);
  }, [selectedRows]);

  return {
    selectedRows,
    handleRowContextMenu,
    toggleRow, // Export for checkbox clicks
    selectAll,
    clearSelection,
    isRowSelected,
    getSelectedIds,
    hasSelection: selectedRows.size > 0,
    selectionCount: selectedRows.size,
    selectionActive,
  };
};
