import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface TicketData {
  transId: string | number;
  patientId: string | number;
  patientName: string;
  appointmentDate: string;
  services: string;
  price: number;
  subtotal: number;
  discount: number;
  total: number;
  balancePay: number;
  cashPay: number;
  creditPay: number;
  debitPay: number;
  patientFinalBalance: number;
}

export async function generateTicketExcel(data: TicketData): Promise<void> {
  const response = await fetch('/templates/ticket.xlsx');
  if (!response.ok) {
    throw new Error('Failed to load ticket template');
  }
  const arrayBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Template is empty');
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX');
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  // Map of placeholders to values
  const replacements: Record<string, string> = {
    '{date}': dateStr,
    '{time}': timeStr,
    '{transId}': String(data.transId),
    '{patientId}': String(data.patientId),
    '{patientName}': data.patientName,
    '{appointmentDate}': data.appointmentDate,
    '{Services}': data.services,
    '{price}': `$${data.price.toFixed(2)}`,
    '{subtotal}': `$${data.subtotal.toFixed(2)}`,
    '{discount}': `$${data.discount.toFixed(2)}`,
    '{total}': `$${data.total.toFixed(2)}`,
    '{balancePay}': `$${data.balancePay.toFixed(2)}`,
    '{cashPay}': `$${data.cashPay.toFixed(2)}`,
    '{creditPay}': `$${data.creditPay.toFixed(2)}`,
    '{debitPay}': `$${data.debitPay.toFixed(2)}`,
    '{patientFinalBalance}': `$${data.patientFinalBalance.toFixed(2)}`
  };

  // Iterate over all rows and cells
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
        // Handle rich text
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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Recibo_${data.patientName.replaceAll(' ', '_')}_${dateStr.replaceAll('/', '-')}.xlsx`);
}
