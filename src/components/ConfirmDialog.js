import React from 'react';
import { AlertTriangle } from 'lucide-react';

function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  icon = <AlertTriangle className="w-8 h-8 text-red-600" />
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-scaleIn">
        {/* Header with Icon */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200 dark:border-gray-700">
          {icon}
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {title}
          </h2>
        </div>

        {/* Message Body */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 p-6 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 ${confirmButtonClass} text-white rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
