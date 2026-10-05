import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { inventoryTypeLabels, type DailyReport } from '@/types/daily-report';

const MONEY = '"$"#,##0.00';

function addTable(sheet: ExcelJS.Worksheet, title: string, header: string[], rows: (string | number | null)[][], moneyColumns: number[] = []): void {
  if (sheet.rowCount > 0) sheet.addRow([]);
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 12 };
  const headerRow = sheet.addRow(header);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  });
  for (const values of rows) {
    const row = sheet.addRow(values);
    for (const col of moneyColumns) row.getCell(col).numFmt = MONEY;
  }
  if (rows.length === 0) sheet.addRow(['Sin datos']);
}

const time = (iso: string | null): string => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '');

// One workbook with the whole end-of-day report: summary, cash drawers, payments, cashiers,
// products, departments, hours, returns, cancellations and stock movements.
export async function exportDailyReport(report: DailyReport): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const s = report.summary;

  const summary = wb.addWorksheet('Resumen');
  summary.columns = [{ width: 34 }, { width: 18 }];
  const head = summary.addRow([`Reporte del día ${report.date} · ${report.storeName}`]);
  head.font = { bold: true, size: 14 };
  summary.addRow([`Del ${time(report.fromLocal)} al ${time(report.toLocal)} · Generado ${time(report.generatedAt)}`]);
  if (report.openSessions > 0) summary.addRow([`Atención: ${report.openSessions} caja(s) siguen abiertas; las cifras pueden cambiar.`]);
  addTable(
    summary,
    'Resumen de ventas',
    ['Concepto', 'Valor'],
    [
      ['Ventas', s.salesCount],
      ['Artículos', s.units],
      ['Ventas brutas', s.grossSales],
      ['Descuentos', -s.discounts],
      ['Impuestos', s.tax],
      ['Ventas netas', s.netSales],
      ['Ticket promedio', s.averageTicket],
      [`Devoluciones (${s.returnsCount})`, -s.refunds],
      ['Neto después de devoluciones', s.netAfterReturns],
      [`Ventas canceladas (${s.voidedCount})`, s.voidedTotal],
      ['Ingreso sin impuestos', s.revenueExTax],
      ['Costo', s.cost],
      ['Utilidad bruta', s.grossMargin],
    ],
    [2]
  );
  // Counts are not money.
  summary.eachRow((row) => {
    if (row.getCell(1).value === 'Ventas' || row.getCell(1).value === 'Artículos') row.getCell(2).numFmt = '0';
  });

  const cash = wb.addWorksheet('Cajas');
  cash.columns = [16, 22, 12, 18, 18, 14, 14, 14, 14, 14, 14, 14, 14].map((width) => ({ width }));
  addTable(
    cash,
    'Cortes de caja',
    ['Caja', 'Sucursal', 'Estado', 'Abrió', 'Cerró', 'Fondo', 'Ventas efectivo', 'Ingresos', 'Retiros', 'Reembolsos', 'Esperado', 'Contado', 'Diferencia'],
    report.cashSessions.map((c) => [
      c.cashRegisterName,
      c.storeName,
      c.status === 'Open' ? 'Abierta' : 'Cerrada',
      `${c.openedBy ?? ''} ${time(c.openedAt)}`,
      c.closedAt ? `${c.closedBy ?? ''} ${time(c.closedAt)}` : '',
      c.summary.openingAmount,
      c.summary.cashSales,
      c.summary.totalIncomes,
      c.summary.totalWithdrawals,
      c.summary.cashRefunds,
      c.summary.expectedCash,
      c.countedCash,
      c.difference,
    ]),
    [6, 7, 8, 9, 10, 11, 12, 13]
  );
  addTable(
    cash,
    'Movimientos de efectivo',
    ['Caja', 'Hora', 'Tipo', 'Motivo', 'Registró', 'Autorizó', 'Monto'],
    report.cashSessions.flatMap((c) =>
      c.movements.map((m) => [
        c.cashRegisterName,
        time(m.createdAt),
        m.type === 'Withdrawal' ? 'Retiro' : 'Ingreso',
        m.reason,
        m.employeeName,
        m.approvedByName,
        m.type === 'Withdrawal' ? -m.amount : m.amount,
      ])
    ),
    [7]
  );

  const breakdown = wb.addWorksheet('Desglose');
  breakdown.columns = [{ width: 30 }, { width: 12 }, { width: 16 }];
  addTable(breakdown, 'Formas de pago', ['Forma de pago', 'Pagos', 'Monto'], report.byPaymentMethod.map((r) => [r.name, r.count, r.amount]), [3]);
  addTable(breakdown, 'Por cajero', ['Cajero', 'Ventas', 'Monto'], report.byCashier.map((r) => [r.name, r.count, r.amount]), [3]);
  addTable(breakdown, 'Por departamento', ['Departamento', 'Artículos', 'Monto'], report.byDepartment.map((r) => [r.name, r.count, r.amount]), [3]);
  addTable(
    breakdown,
    'Por hora',
    ['Hora', 'Ventas', 'Monto'],
    report.byHour.map((h) => [`${String(h.hour).padStart(2, '0')}:00`, h.count, h.amount]),
    [3]
  );

  const products = wb.addWorksheet('Productos');
  products.columns = [{ width: 44 }, { width: 16 }, { width: 12 }, { width: 16 }];
  addTable(products, 'Más vendidos (unidades)', ['Producto', 'SKU', 'Unidades', 'Monto'], report.topProductsByUnits.map((p) => [p.description, p.sku, p.units, p.amount]), [4]);
  addTable(products, 'Más vendidos (monto)', ['Producto', 'SKU', 'Unidades', 'Monto'], report.topProductsByAmount.map((p) => [p.description, p.sku, p.units, p.amount]), [4]);

  const other = wb.addWorksheet('Devoluciones e inventario');
  other.columns = [{ width: 20 }, { width: 18 }, { width: 18 }, { width: 30 }, { width: 18 }, { width: 14 }];
  addTable(
    other,
    'Devoluciones',
    ['Venta', 'Hora', 'Atendió', 'Motivo', '', 'Monto'],
    report.returns.map((r) => [r.saleFolio ?? `#${r.saleId}`, time(r.date), r.employeeName, r.reason, '', r.amount]),
    [6]
  );
  addTable(
    other,
    'Ventas canceladas',
    ['Venta', 'Hora', 'Cajero', 'Motivo', 'Autorizó', 'Monto'],
    report.voids.map((v) => [v.folio ?? `#${v.saleId}`, time(v.voidedAt), v.cashierName, v.reason, v.approvedByName, v.total]),
    [6]
  );
  addTable(
    other,
    'Movimientos de inventario',
    ['Tipo', 'Movimientos', 'Unidades'],
    report.inventory.map((r) => [inventoryTypeLabels[r.type] ?? r.type, r.movements, r.units])
  );

  const buffer = await wb.xlsx.writeBuffer();
  const suffix = report.storeId ? `-sucursal-${report.storeId}` : '';
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `reporte-del-dia-${report.date}${suffix}.xlsx`);
}
