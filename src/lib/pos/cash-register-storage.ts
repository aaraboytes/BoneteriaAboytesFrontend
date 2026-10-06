// The cash drawer this device works with. Chosen once on the POS screen and remembered per
// browser, so the returns screen refunds from the same drawer.
const KEY = 'pos-cash-register-id';

export function getSelectedCashRegisterId(): number | null {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

// The cashier who identified at this drawer (one per shift). Kept per browser tab so a reload
// doesn't ask again; the server ends the ticket when the drawer is closed.
export interface StoredCashier {
  ticket: string;
  employeeId: number;
  employeeName: string;
}

const cashierKey = (registerId: number): string => `pos-cashier-${registerId}`;

export function getStoredCashier(registerId: number): StoredCashier | null {
  try {
    const raw = sessionStorage.getItem(cashierKey(registerId));
    return raw ? (JSON.parse(raw) as StoredCashier) : null;
  } catch {
    return null;
  }
}

export function storeCashier(registerId: number, cashier: StoredCashier | null): void {
  try {
    if (cashier) sessionStorage.setItem(cashierKey(registerId), JSON.stringify(cashier));
    else sessionStorage.removeItem(cashierKey(registerId));
  } catch {
    // Storage unavailable: the cashier is kept only until the page reloads.
  }
}

export function setSelectedCashRegisterId(id: number): void {
  try {
    localStorage.setItem(KEY, String(id));
  } catch {
    // Storage unavailable (private mode): the choice just isn't remembered.
  }
}
