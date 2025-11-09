import React, { useEffect, useState } from 'react';
import { Loader2, FileCheck, Upload, Download, Database, AlertCircle } from 'lucide-react';

/**
 * LoadingOverlay - A beautiful, full-screen loading indicator for long-running operations
 * 
 * Features:
 * - Animated progress bar
 * - Custom messages
 * - Different operation types (import, upload, processing, etc.)
 * - Detailed status updates
 * - Estimated time remaining
 * - Cancellable operations
 * 
 * @param {Object} props
 * @param {boolean} props.show - Show/hide the overlay
 * @param {string} props.title - Main title (e.g., "Importing Excel File")
 * @param {string} props.message - Current status message
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {string} props.type - Operation type: 'import', 'upload', 'download', 'processing'
 * @param {Array} props.details - Array of status lines to display
 * @param {Function} props.onCancel - Optional cancel callback
 * @param {boolean} props.cancellable - Whether operation can be cancelled
 */
const LoadingOverlay = ({
  show,
  title = 'Processing...',
  message = 'Please wait',
  progress = 0,
  type = 'processing',
  details = [],
  onCancel,
  cancellable = false
}) => {
  const [elapsed, setElapsed] = useState(0);

  // Track elapsed time
  useEffect(() => {
    if (!show) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  // Get icon based on operation type
  const getIcon = () => {
    switch (type) {
      case 'import':
        return <Download className="w-8 h-8 text-blue-400" />;
      case 'upload':
        return <Upload className="w-8 h-8 text-green-400" />;
      case 'processing':
        return <Database className="w-8 h-8 text-purple-400" />;
      case 'validating':
        return <FileCheck className="w-8 h-8 text-yellow-400" />;
      default:
        return <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />;
    }
  };

  // Format elapsed time
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-200 dark:border-gray-700">
        {/* Header with Icon */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl animate-pulse">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {message}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {Math.round(progress)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(elapsed)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite'
                }}
              />
            </div>
            
            {/* Progress segments */}
            <div className="absolute inset-0 flex items-center">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 border-r border-gray-300/20 dark:border-gray-600/20 last:border-r-0 h-full"
                />
              ))}
            </div>
          </div>
          
          {/* Progress Labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Details Section */}
        {details && details.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {details.map((detail, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-2 text-sm"
                >
                  <span className="text-gray-400 dark:text-gray-600 select-none">
                    {detail.type === 'success' && '✓'}
                    {detail.type === 'error' && '✗'}
                    {detail.type === 'warning' && '⚠'}
                    {detail.type === 'info' && '→'}
                    {!detail.type && '•'}
                  </span>
                  <span className={`flex-1 ${
                    detail.type === 'success' ? 'text-green-600 dark:text-green-400' :
                    detail.type === 'error' ? 'text-red-600 dark:text-red-400' :
                    detail.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-700 dark:text-gray-300'
                  }`}>
                    {detail.message || detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Animated Status Dots */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Cancel Button */}
        {cancellable && onCancel && (
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Cancel Operation</span>
            </button>
          </div>
        )}

        {/* Helpful Tip */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          💡 Large files may take a few moments to process
        </div>
      </div>

      {/* Add shimmer animation to global styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
