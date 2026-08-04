import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

export interface RegisterClosingRow {
  id: number;
  date: string;
  initialFunds: {
    cash: number;
    card: number;
    transfer: number;
  };
  payments: {
    transactions: number;
    cash: number;
    card: number;
    transfer: number;
    total: number;
  };
  withdrawals: {
    cash: number;
    debit: number;
    transfer: number;
  };
  endFunds: {
    cash: number;
  };
  userName: string;
  comments: string;
}

export async function generateClosingsReport(closingsData: RegisterClosingRow[], startDate: string, endDate: string): Promise<void> {
  const response = await fetch('/templates/cashRegisterClosingsTemplate.xlsx');
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

  // Find the template row dynamically by looking for {cashClosingId}
  let templateRowIdx = 6;
  let templateRow = worksheet.getRow(templateRowIdx);

  for (let i = 1; i <= 15; i++) {
      const cell = worksheet.getRow(i).getCell(1).value?.toString();
      if (cell && cell.includes('{cashClosingId}')) {
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
  for (let idx = 0; idx < closingsData.length; idx++) {
    const row = closingsData[idx];
    
    // If it is not the first row, insert a new row to shift the rest down
    if (idx > 0) {
      worksheet.insertRow(currentRowIdx, []);
    }
    
    const newRow = worksheet.getRow(currentRowIdx);
    
    // Copy styles
    for (let col = 1; col <= 16; col++) {
      if (styles[col]) {
        newRow.getCell(col).style = styles[col];
      }
    }

    // Set values matching the template columns (1 to 16)
    newRow.getCell(1).value = row.id;
    newRow.getCell(2).value = row.date;
    newRow.getCell(3).value = row.initialFunds?.cash ?? 0;
    newRow.getCell(4).value = row.initialFunds?.card ?? 0;
    newRow.getCell(5).value = row.initialFunds?.transfer ?? 0;
    newRow.getCell(6).value = row.payments?.transactions ?? 0;
    newRow.getCell(7).value = row.payments?.cash ?? 0;
    newRow.getCell(8).value = row.payments?.card ?? 0;
    newRow.getCell(9).value = row.payments?.transfer ?? 0;
    newRow.getCell(10).value = row.payments?.total ?? 0;
    newRow.getCell(11).value = row.withdrawals?.cash ?? 0;
    newRow.getCell(12).value = row.withdrawals?.debit ?? 0;
    newRow.getCell(13).value = row.withdrawals?.transfer ?? 0;
    newRow.getCell(14).value = row.endFunds?.cash ?? 0;
    newRow.getCell(15).value = row.userName ?? '';
    newRow.getCell(16).value = row.comments ?? '';

    currentRowIdx++;
  }

  // Clear any remaining template rows if there were fewer records than template placeholders
  if (closingsData.length === 0) {
      const newRow = worksheet.getRow(currentRowIdx);
      for (let col = 1; col <= 16; col++) {
          newRow.getCell(col).value = '';
      }
  }

  // Calculate totals
  const totals = closingsData.reduce(
    (acc, c) => {
      acc.initialCash += c.initialFunds?.cash || 0;
      acc.initialCard += c.initialFunds?.card || 0;
      acc.initialTransfer += c.initialFunds?.transfer || 0;
      acc.paymentsTransactions += c.payments?.transactions || 0;
      acc.paymentsCash += c.payments?.cash || 0;
      acc.paymentsCard += c.payments?.card || 0;
      acc.paymentsTransfer += c.payments?.transfer || 0;
      acc.paymentsTotal += c.payments?.total || 0;
      acc.withdrawalsCash += c.withdrawals?.cash || 0;
      acc.withdrawalsDebit += c.withdrawals?.debit || 0;
      acc.withdrawalsTransfer += c.withdrawals?.transfer || 0;
      acc.endCash += c.endFunds?.cash || 0;
      return acc;
    },
    {
      initialCash: 0,
      initialCard: 0,
      initialTransfer: 0,
      paymentsTransactions: 0,
      paymentsCash: 0,
      paymentsCard: 0,
      paymentsTransfer: 0,
      paymentsTotal: 0,
      withdrawalsCash: 0,
      withdrawalsDebit: 0,
      withdrawalsTransfer: 0,
      endCash: 0
    }
  );

  // Find the Total row dynamically and fill in the values
  let finalTotalRow = null;
  for (let i = 1; i <= worksheet.rowCount; i++) {
      const cell3Val = worksheet.getRow(i).getCell(3).value?.toString();
      if (cell3Val && cell3Val.includes('{ifCashSum}')) {
          finalTotalRow = worksheet.getRow(i);
          break;
      }
  }

  if (finalTotalRow) {
      // Set total label in Column 1 and 2
      finalTotalRow.getCell(1).value = 'Total';
      finalTotalRow.getCell(2).value = '';
      
      // Set sums
      finalTotalRow.getCell(3).value = totals.initialCash;
      finalTotalRow.getCell(4).value = totals.initialCard;
      finalTotalRow.getCell(5).value = totals.initialTransfer;
      finalTotalRow.getCell(6).value = totals.paymentsTransactions;
      finalTotalRow.getCell(7).value = totals.paymentsCash;
      finalTotalRow.getCell(8).value = totals.paymentsCard;
      finalTotalRow.getCell(9).value = totals.paymentsTransfer;
      finalTotalRow.getCell(10).value = totals.paymentsTotal;
      finalTotalRow.getCell(11).value = totals.withdrawalsCash;
      finalTotalRow.getCell(12).value = totals.withdrawalsDebit;
      finalTotalRow.getCell(13).value = totals.withdrawalsTransfer;
      finalTotalRow.getCell(14).value = totals.endCash;
      
      // Clear userName and comments cells in the Total row
      finalTotalRow.getCell(15).value = '';
      finalTotalRow.getCell(16).value = '';
  }

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const dateRangeStr = startDate && endDate ? `${startDate}_to_${endDate}` : dayjs().format('YYYYMMDD');
  const filename = `Cash_Register_Closings_Report_${dateRangeStr}.xlsx`;
  saveAs(blob, filename);
}
