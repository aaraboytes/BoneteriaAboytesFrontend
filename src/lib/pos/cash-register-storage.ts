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

export function setSelectedCashRegisterId(id: number): void {
  try {
    localStorage.setItem(KEY, String(id));
  } catch {
    // Storage unavailable (private mode): the choice just isn't remembered.
  }
}
