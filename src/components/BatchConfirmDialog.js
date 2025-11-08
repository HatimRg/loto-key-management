import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Custom confirmation dialog for batch operations
 * Replaces window.confirm with a nicer UI
 */
const BatchConfirmDialog = ({
  show,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning', // 'warning', 'danger', 'info'
}) => {
  if (!show) return null;

  const colors = {
    warning: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-600 dark:text-orange-400',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const colorScheme = colors[type] || colors.warning;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${colorScheme.border}`}>
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`w-6 h-6 ${colorScheme.icon}`} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className={`p-6 ${colorScheme.bg} border-l-4 ${colorScheme.border}`}>
          <p className="text-gray-700 dark:text-gray-300 text-base">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 
            text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${colorScheme.button} text-white rounded-lg font-medium 
            transition-all duration-200 hover:scale-105 hover:shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchConfirmDialog;
