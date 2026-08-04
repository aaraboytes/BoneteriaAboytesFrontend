import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

export interface AppointmentFunnelRow {
  date: string;
  total: number;
  scheduled: number;
  delayed: number;
  waiting: number;
  inProgress: number;
  done: number;
  canceled: number;
  absent: number;
  rescheduled: number;
}

export async function generateAppointmentsReport(funnelData: AppointmentFunnelRow[], timeframe: string): Promise<void> {
  const response = await fetch('/templates/appointmentsReport.xlsx');
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

  // Find the template row dynamically by looking for {day}
  let templateRowIdx = 4;
  let templateRow = worksheet.getRow(templateRowIdx);

  for (let i = 1; i <= 10; i++) {
      const cell = worksheet.getRow(i).getCell(1).value?.toString();
      if (cell && cell.includes('{day}')) {
          templateRowIdx = i;
          templateRow = worksheet.getRow(i);
          break;
      }
  }

  // Save styles to duplicate
  const styles: any[] = [];
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    styles[colNumber] = cell.style;
  });

  // Insert data
  let currentRowIdx = templateRowIdx;
  for (let idx = 0; idx < funnelData.length; idx++) {
    const row = funnelData[idx];
    
    // If it is not the first row, insert a new row to shift the rest down
    if (idx > 0) {
      worksheet.insertRow(currentRowIdx, []);
    }
    
    const newRow = worksheet.getRow(currentRowIdx);
    
    // Copy styles
    for (let col = 1; col <= 10; col++) {
      if (styles[col]) {
        newRow.getCell(col).style = styles[col];
      }
    }

    // Set values matching the template columns
    newRow.getCell(1).value = row.date;
    newRow.getCell(2).value = row.total;
    newRow.getCell(3).value = row.scheduled;
    newRow.getCell(4).value = row.delayed;
    newRow.getCell(5).value = row.waiting;
    newRow.getCell(6).value = row.inProgress;
    newRow.getCell(7).value = row.done;
    newRow.getCell(8).value = row.canceled;
    newRow.getCell(9).value = row.absent;
    newRow.getCell(10).value = row.rescheduled;

    currentRowIdx++;
  }

  // Clear any remaining template rows if there were fewer records than template placeholders
  // (In this case, there's only 1 template row, but we still clear it if funnelData is empty)
  if (funnelData.length === 0) {
      const newRow = worksheet.getRow(currentRowIdx);
      for (let col = 1; col <= 10; col++) {
          newRow.getCell(col).value = '';
      }
  }

  // Calculate totals
  const totals = funnelData.reduce(
    (acc, row) => {
      acc.total += row.total || 0;
      acc.scheduled += row.scheduled || 0;
      acc.delayed += row.delayed || 0;
      acc.waiting += row.waiting || 0;
      acc.inProgress += row.inProgress || 0;
      acc.done += row.done || 0;
      acc.canceled += row.canceled || 0;
      acc.absent += row.absent || 0;
      acc.rescheduled += row.rescheduled || 0;
      return acc;
    },
    {
      total: 0,
      scheduled: 0,
      delayed: 0,
      waiting: 0,
      inProgress: 0,
      done: 0,
      canceled: 0,
      absent: 0,
      rescheduled: 0
    }
  );

  // Find the Total row dynamically and fill in the values
  let finalTotalRow = null;
  for (let i = 1; i <= worksheet.rowCount; i++) {
      const cell1Val = worksheet.getRow(i).getCell(1).value?.toString();
      const cell2Val = worksheet.getRow(i).getCell(2).value?.toString();
      if ((cell1Val && cell1Val.includes('Total')) || (cell2Val && cell2Val.includes('{totalSum}'))) {
          finalTotalRow = worksheet.getRow(i);
          break;
      }
  }

  if (finalTotalRow) {
      finalTotalRow.getCell(1).value = 'Total';
      finalTotalRow.getCell(2).value = totals.total;
      finalTotalRow.getCell(3).value = totals.scheduled;
      finalTotalRow.getCell(4).value = totals.delayed;
      finalTotalRow.getCell(5).value = totals.waiting;
      finalTotalRow.getCell(6).value = totals.inProgress;
      finalTotalRow.getCell(7).value = totals.done;
      finalTotalRow.getCell(8).value = totals.canceled;
      finalTotalRow.getCell(9).value = totals.absent;
      finalTotalRow.getCell(10).value = totals.rescheduled;
  }

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Appointments_Report_${timeframe}_${dayjs().format('YYYYMMDD')}.xlsx`;
  saveAs(blob, filename);
}
