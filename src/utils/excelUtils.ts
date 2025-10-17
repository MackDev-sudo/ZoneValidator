import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { FabricData, ValidationResult } from '../types';

export class ExcelUtils {
    /**
     * Read Excel file and parse fabric data
     */
    static async readExcelFile(file: File): Promise<FabricData[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Convert to JSON with expected column names
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length < 2) {
                        throw new Error('Excel file must contain headers and at least one data row');
                    }

                    const headers = jsonData[0] as string[];
                    const rows = jsonData.slice(1) as any[][];

                    // Map to FabricData objects
                    const fabricData: FabricData[] = rows.map(row => {
                        const obj: any = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index] || '';
                        });
                        return obj as FabricData;
                    }).filter(item => item.Fabric && item.Alias); // Filter out empty rows

                    resolve(fabricData);
                } catch (error) {
                    reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsBinaryString(file);
        });
    }

    /**
     * Export validation results to Excel file with WWN information and color coding
     */
    static exportToExcel(results: ValidationResult[], fileName = 'validation_report.xlsx') {
        // Create worksheet data with WWN column
        const headers = [
            'Host',
            'WWNs (Logged In Status)',
            'Server Type',
            'Total WWNs',
            'Fab A : Logged in Yes',
            'Fab A : Logged in No',
            'Validation-A',
            'Fab B : Logged in Yes',
            'Fab B : Logged in No',
            'Validation-B',
            'Final Validation'
        ];

        const data = [
            headers,
            ...results.map(result => {
                // Format WWNs with status information
                const wwnText = result.wwns.map(wwn =>
                    `${wwn.wwn} (${wwn.fabric}: ${wwn.isLoggedIn ? 'Logged In' : 'NOT LOGGED IN'})`
                ).join('\n');

                // Determine server type
                const serverType = result.wwns.length >= 8 ? 'AIX' :
                    result.wwns.length >= 2 ? 'RHEL/ESXi' : 'Unknown';

                return [
                    result.host,
                    wwnText,
                    serverType,
                    result.wwns.length,
                    result.fabA_LoggedInYes,
                    result.fabA_LoggedInNo,
                    result.validationA,
                    result.fabB_LoggedInYes,
                    result.fabB_LoggedInNo,
                    result.validationB,
                    result.finalValidation
                ];
            })
        ];

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Style definitions
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const errorStyle = {
            font: { color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "C5504B" } }
        };

        const warningStyle = {
            font: { color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "E07C24" } }
        };

        const goodStyle = {
            font: { color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "70AD47" } }
        };

        // Apply styling to header row
        for (let col = 0; col < headers.length; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = headerStyle;
            }
        }

        // Apply conditional formatting to data rows
        results.forEach((result, rowIndex) => {
            const excelRow = rowIndex + 1; // +1 because of header row

            // Color-code WWN cell based on logged-in status
            const wwnCellAddress = XLSX.utils.encode_cell({ r: excelRow, c: 1 }); // WWN column
            if (worksheet[wwnCellAddress]) {
                const hasNotLoggedIn = result.wwns.some(wwn => !wwn.isLoggedIn);
                if (hasNotLoggedIn) {
                    // Red background for cells with not logged in WWNs
                    worksheet[wwnCellAddress].s = {
                        fill: { fgColor: { rgb: "FFE6E6" } },
                        font: { color: { rgb: "C53030" } },
                        alignment: { wrapText: true, vertical: "top" }
                    };
                } else {
                    // Green background for all logged in WWNs
                    worksheet[wwnCellAddress].s = {
                        fill: { fgColor: { rgb: "E6F4EA" } },
                        font: { color: { rgb: "276749" } },
                        alignment: { wrapText: true, vertical: "top" }
                    };
                }
            }

            // Color-code final validation column
            const finalValidationCol = 10; // Final Validation column index
            const finalCellAddress = XLSX.utils.encode_cell({ r: excelRow, c: finalValidationCol });
            if (worksheet[finalCellAddress]) {
                switch (result.finalValidation) {
                    case 'Good':
                        worksheet[finalCellAddress].s = goodStyle;
                        break;
                    case 'Both FABs Are BAD':
                        worksheet[finalCellAddress].s = errorStyle;
                        break;
                    case 'FAB-A Is BAD':
                    case 'FAB-B Is BAD':
                        worksheet[finalCellAddress].s = warningStyle;
                        break;
                }
            }
        });

        // Auto-size columns with special handling for WWN column
        const colWidths = headers.map((header, index) => {
            if (index === 1) { // WWN column
                return { width: 60 }; // Wider column for WWNs
            }

            const maxLength = Math.max(
                header.length,
                ...results.map(result => {
                    const values = [
                        result.host,
                        '', // Skip WWN column for auto-sizing
                        result.wwns.length >= 8 ? 'AIX' : 'RHEL/ESXi',
                        result.wwns.length.toString(),
                        result.fabA_LoggedInYes.toString(),
                        result.fabA_LoggedInNo.toString(),
                        result.validationA,
                        result.fabB_LoggedInYes.toString(),
                        result.fabB_LoggedInNo.toString(),
                        result.validationB,
                        result.finalValidation
                    ];
                    return values[index]?.toString().length || 0;
                })
            );
            return { width: Math.min(Math.max(maxLength + 2, 10), 30) };
        });

        worksheet['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Report');

        // Generate Excel file and download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, fileName);
    }

    /**
     * Validate Excel file structure
     */
    static validateExcelStructure(data: any[]): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!Array.isArray(data) || data.length === 0) {
            errors.push('Excel file is empty or invalid');
            return { isValid: false, errors };
        }

        const requiredColumns = ['Fabric', 'Alias', 'Logged In'];
        const sampleRow = data[0];

        requiredColumns.forEach(column => {
            if (!sampleRow.hasOwnProperty(column)) {
                errors.push(`Missing required column: ${column}`);
            }
        });

        // Check for valid fabric values
        const validFabrics = ['FAB-A', 'FAB-B'];
        const invalidFabrics = data
            .map(row => row.Fabric)
            .filter(fabric => fabric && !validFabrics.includes(fabric))
            .filter((value, index, self) => self.indexOf(value) === index);

        if (invalidFabrics.length > 0) {
            errors.push(`Invalid fabric values found: ${invalidFabrics.join(', ')}. Expected: ${validFabrics.join(', ')}`);
        }

        return { isValid: errors.length === 0, errors };
    }
}