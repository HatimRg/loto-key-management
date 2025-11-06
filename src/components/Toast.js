import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000, action = null }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleActionClick = () => {
    if (action && action.onClick) {
      action.onClick();
      onClose(); // Close toast after action
    }
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-up z-50 min-w-[300px] max-w-md`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {action && (
        <button
          onClick={handleActionClick}
          className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded font-medium transition-all"
        >
          {action.label}
        </button>
      )}
      <button onClick={onClose} className="hover:bg-white hover:bg-opacity-20 rounded p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
