import React from 'react';
import { Trash2, Power, PowerOff, CheckSquare, Square, X } from 'lucide-react';

/**
 * Quick Actions Bar - appears above tables when rows are selected
 * Shows action buttons for batch operations
 */
const QuickActionsBar = ({
  selectionCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onSetStateOn,
  onSetStateOff,
  totalRows,
  showStateActions = false,
  userMode = 'visitor',
}) => {
  const isDisabled = userMode === 'visitor';

  return (
    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top duration-200">
      {/* Left side - Selection controls */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {selectionCount} {selectionCount === 1 ? 'ligne sélectionnée' : 'lignes sélectionnées'}
        </span>
        
        <div className="h-6 w-px bg-blue-300 dark:bg-blue-700 mx-2" />
        
        <button
          onClick={onSelectAll}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          title="Tout sélectionner"
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tout sélectionner ({totalRows})</span>
        </button>
        
        <button
          onClick={onClearSelection}
          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
          title="Annuler la sélection"
        >
          <Square className="w-4 h-4" />
          <span>Désélectionner</span>
        </button>
        
        <button
          onClick={onClearSelection}
          className="flex items-center space-x-1 px-2 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-md text-sm font-medium transition-colors"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Right side - Action buttons */}
      <div className="flex items-center space-x-2">
        {showStateActions && (
          <>
            <button
              onClick={onSetStateOn}
              disabled={isDisabled}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              title={isDisabled ? 'Non disponible en mode Visiteur' : 'Activer les disjoncteurs sélectionnés'}
            >
              <Power className="w-4 h-4" />
              <span>Activer ({selectionCount})</span>
            </button>
            
            <button
              onClick={onSetStateOff}
              disabled={isDisabled}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
              title={isDisabled ? 'Non disponible en mode Visiteur' : 'Désactiver les disjoncteurs sélectionnés'}
            >
              <PowerOff className="w-4 h-4" />
              <span>Désactiver ({selectionCount})</span>
            </button>
          </>
        )}
        
        <button
          onClick={onDelete}
          disabled={isDisabled}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isDisabled ? 'Non disponible en mode Visiteur' : 'Supprimer les éléments sélectionnés'}
        >
          <Trash2 className="w-4 h-4" />
          <span>Supprimer ({selectionCount})</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActionsBar;
