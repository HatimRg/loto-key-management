/**
 * Excel Import/Export Helper
 * Handles Excel file operations for importing and exporting data
 */

import * as XLSX from 'xlsx';

const { ipcRenderer } = window;

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the Excel sheet (optional)
 */
export const exportToExcel = async (data, filename, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert JSON data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const len = cell.v.toString().length;
          if (len > maxLen) maxLen = len;
        }
      }
      colWidths.push({ wch: Math.min(maxLen + 2, maxWidth) });
    }
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    if (ipcRenderer) {
      // Electron mode: Save file via dialog
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const base64 = btoa(
        new Uint8Array(excelBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      await ipcRenderer.invoke('export-excel', {
        fileName: `${filename}.xlsx`,
        data: base64
      });
    } else {
      // Browser mode: Download directly
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Failed to export Excel file: ' + error.message);
    return false;
  }
};

/**
 * Import data from Excel file
 * @returns {Promise<Array>} - Array of objects from Excel file
 */
export const importFromExcel = async () => {
  if (!ipcRenderer) {
    alert('Excel import only available in desktop app');
    return null;
  }

  try {
    const result = await ipcRenderer.invoke('select-excel-file');
    if (!result || !result.data) {
      return null;
    }

    // Parse Excel file
    const workbook = XLSX.read(result.data, { type: 'base64' });
    
    // Get first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,  // Get formatted values
      defval: ''   // Default value for empty cells
    });
    
    return data;
  } catch (error) {
    console.error('Error importing from Excel:', error);
    alert('Failed to import Excel file: ' + error.message);
    return null;
  }
};

/**
 * Parse Excel file from file input
 * @param {File} file - File object from input
 * @returns {Promise<Array>} - Array of objects from Excel file
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: true });
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get the range of cells
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const totalRows = range.e.r + 1;
        const totalCols = range.e.c + 1;
        console.log(`📊 Excel sheet detected: ${totalRows} rows x ${totalCols} columns (range: ${worksheet['!ref']})`);
        
        // Convert to JSON - using column headers from first row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,           // Get formatted values (not raw numbers/dates)
          defval: '',          // Default value for empty cells
          blankrows: false     // Skip completely blank rows
        });
        
        console.log(`📥 Initial parse: ${jsonData.length} rows (after skipping blank rows)`);
        
        // Debug: Log what columns were detected
        if (jsonData.length > 0) {
          const detectedColumns = Object.keys(jsonData[0]);
          console.log(`📋 Detected columns: ${detectedColumns.join(', ')}`);
        }
        
        // Filter out rows where ALL cells are empty or whitespace
        const filteredRows = jsonData.filter((row, index) => {
          const rowValues = Object.values(row);
          const hasContent = rowValues.some(val => 
            val !== null && val !== undefined && val.toString().trim() !== ''
          );
          
          if (!hasContent) {
            console.log(`⚠️ Row ${index + 2} has all empty cells, filtering out`);
          }
          
          return hasContent;
        });
        
        console.log(`✓ Final result: ${filteredRows.length} rows with actual content`);
        
        // Log any discrepancy
        if (filteredRows.length < totalRows - 1) {
          const skipped = (totalRows - 1) - filteredRows.length;
          console.log(`⚠️ WARNING: ${skipped} rows were skipped (empty or formatting issues)`);
        }
        
        resolve(filteredRows);
      } catch (error) {
        console.error('❌ Excel parsing error:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate breaker data from Excel import with advanced rules
 * @param {Array} data - Array of breaker objects
 * @returns {Object} - Validation result with valid, invalid arrays and failed rows for export
 */
export const validateBreakerExcel = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { valid: [], invalid: [], failedRows: [], errors: ['No data found in Excel file'] };
  }
  
  console.log(`\n🔍 Starting validation of ${data.length} breaker rows...`);
  
  const valid = [];
  const invalid = [];
  const failedRows = [];
  const errors = [];
  const importDate = new Date().toLocaleDateString('fr-FR'); // dd/mm/yyyy
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header
    const problems = [];
    
    // Debug: Show raw row data
    console.log(`\n📝 Row ${rowNum}:`, JSON.stringify(row, null, 2));
    
    // Normalize column names (handle different variations)
    const normalizedRow = {
      date: row['Date'] || row['date'] || '',
      name: (row['Breaker Name'] || row['breaker_name'] || row['name'] || '').toString().trim(),
      zone: (row['Zone'] || row['zone'] || '').toString().trim(),
      subzone: (row['Subzone'] || row['subzone'] || row['Subzone'] || '').toString().trim(),
      location: (row['Location'] || row['location'] || '').toString().trim(),
      specifique_area: (row['Specifique Area'] || row['specifique_area'] || row['specific_area'] || '').toString().trim(),
      state: (row['State'] || row['state'] || 'Off').toString().trim(),
      lock_key: (row['Key Number'] || row['key_number'] || row['lock_key'] || '').toString().trim(),
      general_breaker: (row['General Breaker'] || row['general_breaker'] || '').toString().trim()
    };
    
    // VALIDATION RULE 1: Check mandatory fields
    if (!normalizedRow.name) problems.push('Missing Breaker Name');
    if (!normalizedRow.zone) problems.push('Missing Zone');
    if (!normalizedRow.subzone) problems.push('Missing Subzone');
    if (!normalizedRow.location) problems.push('Missing Location');
    
    // VALIDATION RULE 2: Validate Zone values
    const validZones = ['Zone 1', 'Zone 2', 'Zone 3'];
    if (normalizedRow.zone && !validZones.includes(normalizedRow.zone)) {
      problems.push(`Invalid Zone: "${normalizedRow.zone}". Must be Zone 1, Zone 2, or Zone 3`);
    }
    
    // VALIDATION RULE 3: Validate Subzone values
    const validSubzones = ['R01', 'R02', 'R11', 'R12', 'R13', 'R14', 'R15', 'R21', 'R22'];
    if (normalizedRow.subzone && !validSubzones.includes(normalizedRow.subzone)) {
      problems.push(`Invalid Subzone: "${normalizedRow.subzone}". Must be one of: ${validSubzones.join(', ')}`);
    }
    
    // VALIDATION RULE 4: Validate Location values
    const validLocations = ['Poste de Transformation', 'Poste Génératrice', 'TGBT', 'Local Technique'];
    if (normalizedRow.location && !validLocations.includes(normalizedRow.location)) {
      problems.push(`Invalid Location: "${normalizedRow.location}". Must be one of: ${validLocations.join(', ')}`);
    }
    
    // VALIDATION RULE 5: Specifique Area only if Location = Local Technique
    if (normalizedRow.location !== 'Local Technique' && normalizedRow.specifique_area) {
      problems.push('Specifique Area can only be filled when Location = Local Technique');
    }
    if (normalizedRow.location === 'Local Technique' && !normalizedRow.specifique_area) {
      problems.push('Specifique Area is required when Location = Local Technique');
    }
    
    // VALIDATION RULE 6: Key Number only if State = Closed
    if (normalizedRow.state !== 'Closed' && normalizedRow.lock_key) {
      problems.push('Key Number can only be filled when State = Closed');
    }
    
    // VALIDATION RULE 7: Validate State values
    const validStates = ['Off', 'On', 'Closed'];
    if (normalizedRow.state && !validStates.includes(normalizedRow.state)) {
      problems.push(`Invalid State: "${normalizedRow.state}". Must be Off, On, or Closed`);
    }
    
    // LOGIC: Default date to import date if empty
    if (!normalizedRow.date || normalizedRow.date.toString().trim() === '') {
      normalizedRow.date = importDate;
    }
    
    // If there are problems, mark as invalid
    if (problems.length > 0) {
      console.log(`❌ Row ${rowNum} FAILED validation: ${problems.join('; ')}`);
      invalid.push({ row: rowNum, data: normalizedRow, reason: problems.join('; ') });
      errors.push(`Row ${rowNum}: ${problems.join('; ')}`);
      
      // Add to failed rows for export with Problem column
      failedRows.push({
        'Row': rowNum,
        'Date': normalizedRow.date,
        'Breaker Name': normalizedRow.name,
        'Zone': normalizedRow.zone,
        'Subzone': normalizedRow.subzone,
        'Location': normalizedRow.location,
        'Specifique Area': normalizedRow.specifique_area,
        'State': normalizedRow.state,
        'Key Number': normalizedRow.lock_key,
        'General Breaker': normalizedRow.general_breaker,
        'Problem': problems.join('; ')
      });
    } else {
      console.log(`✅ Row ${rowNum} PASSED validation`);
      valid.push(normalizedRow);
    }
  });
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid: ${valid.length} rows`);
  console.log(`   ❌ Invalid: ${invalid.length} rows`);
  console.log(`   📋 Total processed: ${data.length} rows`);
  
  return { valid, invalid, failedRows, errors };
};

/**
 * Validate personnel data from Excel import with advanced rules
 * @param {Array} data - Array of personnel objects
 * @returns {Object} - Validation result with failed rows for export
 */
export const validatePersonnelExcel = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { valid: [], invalid: [], failedRows: [], errors: ['No data found in Excel file'] };
  }
  
  console.log(`\n🔍 Starting validation of ${data.length} personnel rows...`);
  
  const valid = [];
  const invalid = [];
  const failedRows = [];
  const errors = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header
    const problems = [];
    
    // Debug: Show raw row data
    console.log(`\n📝 Row ${rowNum}:`, JSON.stringify(row, null, 2));
    
    // Normalize column names (handle different variations)
    const normalizedRow = {
      name: (row['First Name'] || row['first_name'] || row['name'] || row['Name'] || '').toString().trim(),
      lastname: (row['Last Name'] || row['last_name'] || row['lastname'] || row['Lastname'] || '').toString().trim(),
      id_card: (row['ID Card'] || row['id_card'] || row['ID'] || '').toString().trim(),
      company: (row['Company'] || row['company'] || '').toString().trim(),
      habilitation: (row['Habilitation'] || row['habilitation'] || '').toString().trim()
    };
    
    // VALIDATION RULE 1: Check mandatory fields
    if (!normalizedRow.name) problems.push('Missing First Name');
    if (!normalizedRow.lastname) problems.push('Missing Last Name');
    if (!normalizedRow.company) problems.push('Missing Company');
    if (!normalizedRow.habilitation) problems.push('Missing Habilitation');
    
    // VALIDATION RULE 2: Validate habilitation format (optional)
    const validHabilitations = ['B1V', 'B2V', 'H0V', 'BC', 'BR', 'B1', 'B2', 'H0', 'BE', 'HE'];
    if (normalizedRow.habilitation && !validHabilitations.some(h => normalizedRow.habilitation.toUpperCase().includes(h))) {
      // Warning but don't fail
      console.warn(`Row ${rowNum}: Unusual habilitation "${normalizedRow.habilitation}"`);
    }
    
    // If there are problems, mark as invalid
    if (problems.length > 0) {
      console.log(`❌ Row ${rowNum} FAILED validation: ${problems.join('; ')}`);
      invalid.push({ row: rowNum, data: normalizedRow, reason: problems.join('; ') });
      errors.push(`Row ${rowNum}: ${problems.join('; ')}`);
      
      // Add to failed rows for export with Problem column
      failedRows.push({
        'Row': rowNum,
        'First Name': normalizedRow.name,
        'Last Name': normalizedRow.lastname,
        'ID Card': normalizedRow.id_card,
        'Company': normalizedRow.company,
        'Habilitation': normalizedRow.habilitation,
        'Problem': problems.join('; ')
      });
    } else {
      console.log(`✅ Row ${rowNum} PASSED validation`);
      valid.push(normalizedRow);
    }
  });
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid: ${valid.length} rows`);
  console.log(`   ❌ Invalid: ${invalid.length} rows`);
  console.log(`   📋 Total processed: ${data.length} rows`);
  
  return { valid, invalid, failedRows, errors };
};

export default {
  exportToExcel,
  importFromExcel,
  parseExcelFile,
  validateBreakerExcel,
  validatePersonnelExcel
};
