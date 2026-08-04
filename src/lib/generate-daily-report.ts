import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface DailyReportData {
  date: string;
  totalTransactions: number;
  cashRevenue: number;
  creditRevenue: number;
  debitRevenue: number;
  dayDiscounts: number;
  netRevenue: number;
  debtGenerated: number;
  transactions: any[];
  debtors: any[];
  discounts: any[];
}

export async function generateDailyReportExcel(data: DailyReportData): Promise<void> {
  const response = await fetch('/templates/dailyHistoryReport.xlsx');
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

  // 1. Replace scalars
  const replacements: Record<string, string> = {
    '{date}': data.date,
    '{totalTransactions}': String(data.totalTransactions),
    '{cashRevenue}': `${data.cashRevenue.toFixed(2)}`,
    '{creditRevenue}': `${data.creditRevenue.toFixed(2)}`,
    '{debitRevenue}': `${data.debitRevenue.toFixed(2)}`,
    '{dayDiscounts}': `${data.dayDiscounts.toFixed(2)}`,
    '{netRevenue}': `${data.netRevenue.toFixed(2)}`,
    '{debtGenerated}': `${data.debtGenerated.toFixed(2)}`
  };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'string') {
        let text = cell.value;
        let replaced = false;

        for (const [key, val] of Object.entries(replacements)) {
          if (text.includes(key)) {
            text = text.replace(key, val);
            replaced = true;
          }
        }

        if (replaced) {
          cell.value = text;
        }
      } else if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        let replaced = false;
        const richText = cell.value.richText;

        for (const rt of richText) {
          let text = rt.text;
          for (const [key, val] of Object.entries(replacements)) {
            if (text.includes(key)) {
              text = text.replace(key, val);
              replaced = true;
            }
          }
          rt.text = text;
        }

        if (replaced) {
          cell.value = { richText };
        }
      }
    });
  });

  const ledgerRowIdx = 22;
  const debtorsRowIdx = ledgerRowIdx + 4;
  const discountsRowIdx = debtorsRowIdx + 4;

  const lists = [
    { type: 'discounts', idx: discountsRowIdx },
    { type: 'debtors', idx: debtorsRowIdx },
    { type: 'ledger', idx: ledgerRowIdx }
  ].filter(l => l.idx > -1).sort((a, b) => b.idx - a.idx);

  for (const list of lists) {
    if (list.type === 'discounts') {
      fillList(worksheet, list.idx, data.discounts, (row, item) => {
        row.getCell(1).value = item.time;
        row.getCell(2).value = item.patient;
        row.getCell(3).value = item.initialAmount;
        row.getCell(4).value = item.discountAmount;
        row.getCell(5).value = item.finalAmount;
      });
    } else if (list.type === 'debtors') {
      fillList(worksheet, list.idx, data.debtors, (row, item) => {
        row.getCell(1).value = item.time;
        row.getCell(2).value = item.patient;
        row.getCell(3).value = item.todaysDebt;
        row.getCell(4).value = item.finalBalance;
      });
    } else if (list.type === 'ledger') {
      fillList(worksheet, list.idx, data.transactions, (row, item) => {
        row.getCell(1).value = item.time;
        row.getCell(2).value = item.transactionID;
        row.getCell(3).value = item.patient;
        row.getCell(4).value = item.description;
        row.getCell(5).value = item.cost;
        row.getCell(6).value = item.discount;
        row.getCell(7).value = item.initialBalance;
        row.getCell(8).value = item.paidBalance;
        row.getCell(9).value = item.cash;
        row.getCell(10).value = item.credit;
        row.getCell(11).value = item.debit;
        row.getCell(12).value = item.finalBalance;
        row.getCell(13).value = item.debt;
        row.getCell(14).value = item.revenue;
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Daily_Closing_${data.date.replaceAll('/', '-')}.xlsx`);
}

function fillList(worksheet: ExcelJS.Worksheet, templateRowIdx: number, items: any[], mapFn: (row: ExcelJS.Row, item: any) => void) {
  if (items.length === 0) {
    // Clear the template row if no data
    worksheet.getRow(templateRowIdx).values = [];
    return;
  }

  // Insert items.length - 1 rows after the template row
  if (items.length > 1) {
    worksheet.spliceRows(templateRowIdx + 1, 0, ...new Array(items.length - 1).fill([]));
  }

  const templateRow = worksheet.getRow(templateRowIdx);
  // Store the styles from the template row
  const styles: any[] = [];
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    styles[colNumber] = cell.style;
  });

  for (let i = 0; i < items.length; i++) {
    const row = worksheet.getRow(templateRowIdx + i);
    // Apply styles to all cells up to the max col number
    for (let col = 1; col < styles.length; col++) {
      if (styles[col]) {
        row.getCell(col).style = styles[col];
      }
    }

    mapFn(row, items[i]);
    row.commit();
  }
}
