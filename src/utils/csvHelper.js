import Papa from 'papaparse';

const { ipcRenderer } = window;

export const exportToCSV = async (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const csv = Papa.unparse(data);
  
  if (ipcRenderer) {
    await ipcRenderer.invoke('export-csv', {
      fileName: filename,
      data: csv
    });
  } else {
    // Fallback for browser
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

export const importFromCSV = async () => {
  if (!ipcRenderer) {
    alert('CSV import only available in desktop app');
    return null;
  }

  const result = await ipcRenderer.invoke('import-csv');
  
  if (!result.success) {
    return null;
  }

  return new Promise((resolve) => {
    Papa.parse(result.data, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        resolve(null);
      }
    });
  });
};

export const validateBreakerCSV = (data) => {
  const requiredFields = ['name', 'zone', 'location', 'state'];
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { valid: false, error: 'No data found in CSV' };
  }

  const firstRow = data[0];
  const missingFields = requiredFields.filter(field => !(field in firstRow));
  
  if (missingFields.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }

  return { valid: true };
};

export default {
  exportToCSV,
  importFromCSV,
  validateBreakerCSV
};
