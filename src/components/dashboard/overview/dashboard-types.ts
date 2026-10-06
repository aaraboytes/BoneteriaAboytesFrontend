// Shapes of GET /api/Reports/dashboard (see DashboardService in the backend) and shared formatters.

export interface DashboardSummary {
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
  /** Share (0-1) of sold lines whose cost is known; margin is only computed over those. */
  costCoverage: number;
}

export interface DayRow {
  date: string; // yyyy-MM-dd
  salesCount: number;
  units: number;
  netSales: number;
  grossMargin: number;
  refunds: number;
}

export interface AmountRow {
  name: string;
  count: number;
  amount: number;
}

export interface HourRow {
  hour: number;
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

export interface LowStockRow {
  productVariantId: string;
  description: string;
  sku: string;
  size: string | null;
  color: string | null;
  storeId: number;
  storeName: string;
  stock: number;
}

export interface RecentSaleRow {
  id: number;
  folio: string | null;
  date: string;
  total: number;
  status: 'Completed' | 'Voided';
  cashierName: string | null;
  items: number;
}

export interface DashboardReport {
  from: string;
  to: string;
  storeId: number | null;
  storeName: string;
  generatedAt: string;
  openSessions: number;
  summary: DashboardSummary;
  previousFrom: string;
  previousTo: string;
  previous: DashboardSummary;
  byDay: DayRow[];
  byPaymentMethod: AmountRow[];
  byDepartment: AmountRow[];
  byCashier: AmountRow[];
  byHour: HourRow[];
  topProductsByUnits: ProductRow[];
  topProductsByAmount: ProductRow[];
  lowStockThreshold: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStock: LowStockRow[];
  inventoryCostValue: number;
  inventoryRetailValue: number;
  recentSales: RecentSaleRow[];
}

const moneyFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const moneyCompactFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });
const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

export const money = (n: number): string => moneyFormat.format(n);
export const moneyCompact = (n: number): string => moneyCompactFormat.format(n);
export const num = (n: number): string => numberFormat.format(n);

/** "12 oct" for a yyyy-MM-dd business date (built locally so the day never shifts with the time zone). */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function dateRangeLabel(from: string, to: string): string {
  return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
}

/** Percentage change versus the previous period; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
