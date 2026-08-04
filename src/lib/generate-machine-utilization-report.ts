import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function generateMachineUtilizationReport(
  data: any[],
  machineNames: string[],
  startDate: string,
  endDate: string
): Promise<void> {
  const response = await fetch('/templates/machineUtilizationReport.xlsx');
  if (!response.ok) {
    throw new Error('Failed to load report template');
  }
  const arrayBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Template is empty');
  }

  // Set {startDate} and {endDate}
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) {
      const cell = worksheet.getRow(r).getCell(c);
      const val = cell.value?.toString() || '';
      
      let updated = false;
      let newVal = val;
      if (val.includes('{startDate}')) {
        newVal = newVal.replace('{startDate}', startDate);
        updated = true;
      }
      if (val.includes('{endDate}')) {
        newVal = newVal.replace('{endDate}', endDate);
        updated = true;
      }
      
      if (updated) {
        cell.value = newVal;
      }
    }
  }

  // Find header row (Date, {TechName})
  let headerRowIdx = 6;
  let techNameCellCol = 2;

  for (let r = 1; r <= 10; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= 5; c++) {
      if (row.getCell(c).value?.toString().includes('{TechName}')) {
        headerRowIdx = r;
        techNameCellCol = c;
        break;
      }
    }
  }

  const headerRow = worksheet.getRow(headerRowIdx);
  const headerStyle = headerRow.getCell(techNameCellCol).style;

  // Clear {TechName} cell and set machine names dynamically across columns
  for (let i = 0; i < machineNames.length; i++) {
    const cell = headerRow.getCell(techNameCellCol + i);
    cell.value = machineNames[i];
    cell.style = headerStyle;
  }

  // Find data row template
  const dataRowIdx = headerRowIdx + 1;
  const dataRowTemplate = worksheet.getRow(dataRowIdx);
  
  let dateCellCol = 1;
  let techAmountCellCol = 2;

  for (let c = 1; c <= 5; c++) {
    if (dataRowTemplate.getCell(c).value?.toString().includes('{date}')) dateCellCol = c;
    if (dataRowTemplate.getCell(c).value?.toString().includes('{techAmount}')) techAmountCellCol = c;
  }

  const dateStyle = dataRowTemplate.getCell(dateCellCol).style;
  const amountStyle = dataRowTemplate.getCell(techAmountCellCol).style;

  let currentRowIdx = dataRowIdx;
  
  // Clear template row before writing data
  dataRowTemplate.getCell(dateCellCol).value = '';
  dataRowTemplate.getCell(techAmountCellCol).value = '';

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    
    // If it is not the first row, insert a new row to shift the rest down
    if (idx > 0) {
      worksheet.insertRow(currentRowIdx, []);
    }
    
    const newRow = worksheet.getRow(currentRowIdx);
    
    const dateCell = newRow.getCell(dateCellCol);
    dateCell.value = row.date;
    dateCell.style = dateStyle;

    for (let i = 0; i < machineNames.length; i++) {
      const amtCell = newRow.getCell(techAmountCellCol + i);
      amtCell.value = row[machineNames[i]] || 0;
      amtCell.style = amountStyle;
    }

    currentRowIdx++;
  }

  if (data.length === 0) {
      const newRow = worksheet.getRow(currentRowIdx);
      newRow.getCell(dateCellCol).value = '';
      newRow.getCell(techAmountCellCol).value = '';
  }

  // Calculate and populate Totals
  let finalTotalRow = null;
  let totalCellCol = 2; // Column where {techSum} is located
  
  for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      for (let c = 1; c <= 5; c++) {
          const val = row.getCell(c).value?.toString();
          if (val && (val.includes('Total') || val.includes('{techSum}'))) {
              finalTotalRow = row;
              if (val.includes('{techSum}')) {
                  totalCellCol = c;
              }
              break;
          }
      }
      if (finalTotalRow) break;
  }

  if (finalTotalRow) {
      finalTotalRow.getCell(1).value = 'Total';
      const sumStyle = finalTotalRow.getCell(totalCellCol).style;

      // Calculate sums for each machine
      const totals: Record<string, number> = {};
      machineNames.forEach((name) => {
          totals[name] = 0;
      });
      data.forEach((row) => {
          machineNames.forEach((name) => {
              totals[name] += row[name] || 0;
          });
      });

      // Clear original {techSum} and populate each column with the sum
      for (let i = 0; i < machineNames.length; i++) {
          const sumCell = finalTotalRow.getCell(totalCellCol + i);
          sumCell.value = totals[machineNames[i]] || 0;
          sumCell.style = sumStyle;
      }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Machine_Utilization_${startDate}_to_${endDate}.xlsx`;
  saveAs(blob, filename);
}
