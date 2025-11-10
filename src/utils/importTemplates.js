/**
 * Import Templates Generator
 * Creates Excel templates with dropdown menus and validation rules
 */

import * as XLSX from 'xlsx';

const { ipcRenderer } = window;

/**
 * Generate Breakers Import Template with dropdowns
 */
export const generateBreakersTemplate = async () => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Sample data with headers
    const sampleData = [
      {
        'Date': '01/11/2025',
        'Breaker Name': 'BR-001',
        'Zone': 'Zone 1',
        'Subzone': 'R01',
        'Location': 'Poste de Transformation',
        'Specifique Area': '',
        'State': 'Off',
        'Key Number': '',
        'General Breaker': 'GB-01'
      },
      {
        'Date': '',
        'Breaker Name': 'BR-002',
        'Zone': 'Zone 2',
        'Subzone': 'R11',
        'Location': 'Local Technique',
        'Specifique Area': 'Area A',
        'State': 'Closed',
        'Key Number': 'L-001',
        'General Breaker': 'GB-02'
      }
    ];
    
    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Breaker Name
      { wch: 12 }, // Zone
      { wch: 12 }, // Subzone
      { wch: 25 }, // Location
      { wch: 20 }, // Specifique Area
      { wch: 10 }, // State
      { wch: 15 }, // Key Number
      { wch: 20 }  // General Breaker
    ];
    
    // Add data validation (dropdowns) - Excel format
    // Note: xlsx library has limited support for data validation
    // We'll add it in comments and instructions
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Breakers Import');
    
    // Add instructions sheet
    const instructions = [
      ['BREAKERS IMPORT TEMPLATE - INSTRUCTIONS'],
      [''],
      ['COLUMN DEFINITIONS:'],
      ['Date', 'Import date (dd/mm/yyyy). Leave empty to use current date.'],
      ['Breaker Name', 'REQUIRED - Unique identifier for the breaker'],
      ['Zone', 'REQUIRED - Zone 1, Zone 2, or Zone 3'],
      ['Subzone', 'REQUIRED - R01, R02, R11, R12, R13, R14, R15, R21, R22'],
      ['Location', 'REQUIRED - Poste de Transformation, Poste Génératrice, TGBT, or Local Technique'],
      ['Specifique Area', 'Only fill if Location = Local Technique'],
      ['State', 'Off, On, or Closed (default: Off)'],
      ['Key Number', 'Only fill if State = Closed'],
      ['General Breaker', 'Parent/General breaker reference'],
      [''],
      ['VALIDATION RULES:'],
      ['✓ Breaker Name, Zone, Subzone, and Location are MANDATORY'],
      ['✓ Missing mandatory fields will skip the row'],
      ['✓ Specifique Area only used when Location = Local Technique'],
      ['✓ Key Number only used when State = Closed'],
      ['✓ Empty Date defaults to import date'],
      ['✓ Failed rows exported to separate file for review'],
      [''],
      ['DROPDOWN OPTIONS:'],
      ['Zone:', 'Zone 1, Zone 2, Zone 3'],
      ['Subzone:', 'R01, R02, R11, R12, R13, R14, R15, R21, R22'],
      ['Location:', 'Poste de Transformation, Poste Génératrice, TGBT, Local Technique'],
      ['State:', 'Off, On, Closed'],
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    // Export
    if (ipcRenderer) {
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const base64 = btoa(
        new Uint8Array(excelBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      await ipcRenderer.invoke('export-excel', {
        fileName: 'Breakers_Import_Template.xlsx',
        data: base64
      });
    } else {
      XLSX.writeFile(workbook, 'Breakers_Import_Template.xlsx');
    }
    
    return true;
  } catch (error) {
    console.error('Error generating breakers template:', error);
    return false;
  }
};

/**
 * Generate Personnel Import Template
 */
export const generatePersonnelTemplate = async () => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Sample data with headers
    const sampleData = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'ID Card': 'ID001',
        'Company': 'Company A',
        'Habilitation': 'B1V'
      },
      {
        'First Name': 'Jane',
        'Last Name': 'Smith',
        'ID Card': 'ID002',
        'Company': 'Company B',
        'Habilitation': 'B0H0V'
      },
      {
        'First Name': 'Ahmed',
        'Last Name': 'Hassan',
        'ID Card': '',
        'Company': 'Company C',
        'Habilitation': 'B1B1V'
      }
    ];
    
    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 12 }, // ID Card
      { wch: 20 }, // Company
      { wch: 15 }  // Habilitation
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Personnel Import');
    
    // Add instructions sheet
    const instructions = [
      ['PERSONNEL IMPORT TEMPLATE - INSTRUCTIONS'],
      [''],
      ['COLUMN DEFINITIONS:'],
      ['First Name', 'REQUIRED - Person\'s first name'],
      ['Last Name', 'REQUIRED - Person\'s last name'],
      ['ID Card', 'OPTIONAL - Person\'s ID card number (can be left empty)'],
      ['Company', 'REQUIRED - Company name'],
      ['Habilitation', 'REQUIRED - Habilitation type (e.g., B1V, B2V, B0H0V, B1B1V)'],
      [''],
      ['VALIDATION RULES:'],
      ['✓ First Name, Last Name, Company, and Habilitation are MANDATORY'],
      ['✓ ID Card is OPTIONAL and can be left empty'],
      ['✓ Missing mandatory fields will skip the row'],
      ['✓ Duplicate entries (same name + company) will be skipped'],
      ['✓ Failed rows exported to separate file for review'],
      [''],
      ['COMMON HABILITATION TYPES:'],
      ['B0H0V - Non-electrical worker with voltage awareness'],
      ['B1V - Low voltage execution'],
      ['B1B1V - Combined B1 + B1V certification'],
      ['B2V - Low voltage work leader'],
      ['H0V - Non-electrician voltage awareness'],
      ['BC - Consignment operations'],
      ['BR - Intervention operations'],
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    // Export
    if (ipcRenderer) {
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const base64 = btoa(
        new Uint8Array(excelBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      await ipcRenderer.invoke('export-excel', {
        fileName: 'Personnel_Import_Template.xlsx',
        data: base64
      });
    } else {
      XLSX.writeFile(workbook, 'Personnel_Import_Template.xlsx');
    }
    
    return true;
  } catch (error) {
    console.error('Error generating personnel template:', error);
    return false;
  }
};

/**
 * Export failed rows to Excel with Problem column
 */
export const exportFailedRows = async (failedRows, type = 'Breakers') => {
  try {
    if (!failedRows || failedRows.length === 0) {
      return false;
    }
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert failed rows to sheet
    const worksheet = XLSX.utils.json_to_sheet(failedRows);
    
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
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');
    
    // Export
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${type}_Import_Errors_${timestamp}.xlsx`;
    
    if (ipcRenderer) {
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const base64 = btoa(
        new Uint8Array(excelBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      await ipcRenderer.invoke('export-excel', {
        fileName: fileName,
        data: base64
      });
    } else {
      XLSX.writeFile(workbook, fileName);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting failed rows:', error);
    return false;
  }
};

export default {
  generateBreakersTemplate,
  generatePersonnelTemplate,
  exportFailedRows
};
