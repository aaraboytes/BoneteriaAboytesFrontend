// Shape of GET /api/Reports/daily (see NewPosBackend Services/ReportService.cs).

export interface DailyReportSummary {
  salesCount: number;
  units: number;
  grossSales: number;
  discounts: number;
  tax: number;
  netSales: number;
  averageTicket: number;
  returnsCount: number;
  refunds: number;
  netAfterReturns: number;
  voidedCount: number;
  voidedTotal: number;
  revenueExTax: number;
  cost: number;
  grossMargin: number;
  /** Share (0-1) of sold lines whose cost is known; the margin covers only those. */
  costCoverage: number;
}

export interface AmountRow {
  name: string;
  count: number;
  amount: number;
}

export interface ProductRow {
  productVariantId: string;
  description: string;
  sku: string;
  units: number;
  amount: number;
}

export interface HourRow {
  hour: number;
  count: number;
  amount: number;
}

export interface CashMovementRow {
  type: 'Income' | 'Withdrawal';
  amount: number;
  reason: string;
  employeeName: string | null;
  approvedByName: string | null;
  createdAt: string;
}

export interface CashSessionRow {
  id: number;
  cashRegisterName: string;
  storeName: string;
  status: 'Open' | 'Closed';
  openedAt: string;
  openedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  countedCash: number | null;
  difference: number | null;
  summary: {
    openingAmount: number;
    saleCount: number;
    totalSales: number;
    cashSales: number;
    totalIncomes: number;
    totalWithdrawals: number;
    cashRefunds: number;
    expectedCash: number;
  };
  movements: CashMovementRow[];
}

export interface ReturnRow {
  id: number;
  saleId: number;
  saleFolio: string | null;
  date: string;
  amount: number;
  reason: string | null;
  employeeName: string | null;
}

export interface VoidRow {
  saleId: number;
  folio: string | null;
  total: number;
  reason: string | null;
  cashierName: string | null;
  approvedByName: string | null;
  voidedAt: string | null;
}

export interface InventoryRow {
  type: string;
  movements: number;
  units: number;
}

export interface DailyReport {
  date: string;
  storeId: number | null;
  storeName: string;
  fromLocal: string;
  toLocal: string;
  generatedAt: string;
  openSessions: number;
  summary: DailyReportSummary;
  byPaymentMethod: AmountRow[];
  byCashier: AmountRow[];
  byDepartment: AmountRow[];
  byHour: HourRow[];
  topProductsByUnits: ProductRow[];
  topProductsByAmount: ProductRow[];
  cashSessions: CashSessionRow[];
  returns: ReturnRow[];
  voids: VoidRow[];
  inventory: InventoryRow[];
}

export const inventoryTypeLabels: Record<string, string> = {
  Sale: 'Ventas',
  SaleReturn: 'Devoluciones de clientes',
  SaleVoid: 'Ventas canceladas',
  Intake: 'Entradas',
  Withdrawal: 'Retiros de inventario',
  TransferOut: 'Traspasos enviados',
  TransferIn: 'Traspasos recibidos',
  Adjustment: 'Ajustes',
  Loss: 'Mermas y daños',
  Count: 'Conteos físicos',
  Purchase: 'Compras',
  PurchaseReturn: 'Devoluciones a proveedor',
  Import: 'Importación',
};
