/**
 * Universal Download Helper for LOTO KMS
 * Handles all file downloads (CSV, PDF, logs, templates)
 */

/**
 * Download any text content as a file
 */
export const downloadTextFile = (content, filename, mimeType = 'text/plain') => {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download CSV data
 */
export const downloadCSV = (data, filename) => {
  try {
    // If data is already a string, use it directly
    if (typeof data === 'string') {
      return downloadTextFile(data, filename, 'text/csv;charset=utf-8;');
    }

    // If data is array, convert to CSV using Papa Parse
    const Papa = require('papaparse');
    const csv = Papa.unparse(data, {
      quotes: true,
      header: true
    });
    
    return downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
  } catch (error) {
    console.error('CSV download error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download blob (for PDFs, images, etc.)
 */
export const downloadBlob = (blob, filename) => {
  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('Blob download error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download from URL (fetch and download)
 */
export const downloadFromURL = async (url, filename) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const blob = await response.blob();
    return downloadBlob(blob, filename);
  } catch (error) {
    console.error('URL download error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download template file from public folder
 */
export const downloadTemplate = async (templateName) => {
  try {
    const url = `/templates/${templateName}`;
    const filename = templateName;
    return await downloadFromURL(url, filename);
  } catch (error) {
    console.error('Template download error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download activity log (last 10 minutes of console logs)
 */
export const downloadActivityLog = async () => {
  try {
    // Import logger to get recent logs
    const logger = (await import('./logger')).default;
    
    // Get all logs from memory
    const allLogs = await logger.getRecentLogs(1000);
    
    // Filter logs from last 10 minutes
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentLogs = allLogs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= tenMinutesAgo;
    });
    
    // Format logs as readable text
    let logContent = '=== LOTO KMS - Activity Log ===\n';
    logContent += `Generated: ${new Date().toLocaleString()}\n`;
    logContent += `Time Range: Last 10 minutes\n`;
    logContent += `Total Entries: ${recentLogs.length}\n`;
    logContent += '=' .repeat(50) + '\n\n';
    
    if (recentLogs.length === 0) {
      logContent += 'No activity in the last 10 minutes.\n';
    } else {
      recentLogs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        logContent += `[${timestamp}] [${log.level}] ${log.action}\n`;
        
        if (log.details && Object.keys(log.details).length > 0) {
          logContent += `  Details: ${JSON.stringify(log.details, null, 2)}\n`;
        }
        
        logContent += '\n';
      });
    }
    
    const filename = `loto_activity_log_${Date.now()}.txt`;
    return downloadTextFile(logContent, filename, 'text/plain');
    
  } catch (error) {
    console.error('Log download error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download PDF file from local storage
 */
export const downloadPDF = async (pdfPath, filename) => {
  try {
    // If it's a blob URL or data URL
    if (pdfPath.startsWith('blob:') || pdfPath.startsWith('data:')) {
      const response = await fetch(pdfPath);
      const blob = await response.blob();
      return downloadBlob(blob, filename);
    }
    
    // If it's a relative path
    if (pdfPath.startsWith('/')) {
      return await downloadFromURL(pdfPath, filename);
    }
    
    // Otherwise treat as URL
    return await downloadFromURL(pdfPath, filename);
  } catch (error) {
    console.error('PDF download error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  downloadTextFile,
  downloadCSV,
  downloadBlob,
  downloadFromURL,
  downloadTemplate,
  downloadActivityLog,
  downloadPDF
};
