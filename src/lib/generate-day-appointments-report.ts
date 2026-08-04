import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

export async function generateDayAppointmentsReport(appointments: any[], displayDate: string, rawDate: string): Promise<void> {
  const response = await fetch('/templates/dayAppointmentsReport.xlsx');
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

  // Set {Date} -> usually row 2, col 1
  for (let i = 1; i <= 5; i++) {
      const cell = worksheet.getRow(i).getCell(1);
      if (cell.value?.toString().includes('{Date}')) {
          cell.value = displayDate;
          break;
      }
  }

  // Find {time} -> template row
  let templateRowIdx = 5;
  let templateRow = worksheet.getRow(templateRowIdx);

  for (let i = 1; i <= 10; i++) {
      const cell = worksheet.getRow(i).getCell(1).value?.toString();
      if (cell && cell.includes('{time}')) {
          templateRowIdx = i;
          templateRow = worksheet.getRow(i);
          break;
      }
  }

  const styles: any[] = [];
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    styles[colNumber] = cell.style;
  });

  let currentRowIdx = templateRowIdx;
  for (const app of appointments) {
    const newRow = worksheet.getRow(currentRowIdx);
    
    for (let col = 1; col <= 6; col++) {
      if (styles[col]) {
        newRow.getCell(col).style = styles[col];
      }
    }

    const servicesText = app.services && app.services.length > 0 
        ? app.services.map((s: any) => s.name).join(', ') 
        : (app.treatmentType || 'None');
    const patientName = app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Unknown';
    const balance = app.patient?.balance || 0;
    const time = dayjs(app.appointmentDate).format('HH:mm');

    newRow.getCell(1).value = time;
    newRow.getCell(2).value = app.id;
    newRow.getCell(3).value = patientName;
    newRow.getCell(4).value = servicesText;
    newRow.getCell(5).value = (app.status?.replace('_', ' ') || 'Scheduled').toUpperCase();
    newRow.getCell(6).value = balance;

    currentRowIdx++;
  }

  if (appointments.length === 0) {
      const newRow = worksheet.getRow(currentRowIdx);
      for (let col = 1; col <= 6; col++) {
          newRow.getCell(col).value = '';
      }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Day_Appointments_${rawDate}.xlsx`;
  saveAs(blob, filename);
}
