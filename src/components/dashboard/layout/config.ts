import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [
  { key: 'overview', title: 'Overview', href: paths.dashboard.overview, icon: 'chart-pie' },
  { key: 'sales', title: 'Sales & Billing Desk', href: paths.dashboard.sales, icon: 'currency-dollar' },
  { key: 'inventory', title: 'Inventory & Stock', href: paths.dashboard.inventory, icon: 'stack' },
  { key: 'stores', title: 'Sucursales / Tiendas', href: paths.dashboard.stores, icon: 'buildings' },
  { key: 'cashClosing', title: 'Cash Closing', href: paths.dashboard.billing.cashClosing, icon: 'receipt' },
  { key: 'products', title: 'Products', href: paths.dashboard.products, icon: 'package' },
  { key: 'suppliers', title: 'Proveedores', href: paths.dashboard.suppliers, icon: 'truck' },
  { key: 'services', title: 'Services', href: paths.dashboard.services, icon: 'headset' },
  { key: 'customers', title: 'Customers', href: paths.dashboard.customers, icon: 'users' },
  { key: 'staff', title: 'Staff', href: paths.dashboard.staff, icon: 'user' },
  { key: 'settings', title: 'Settings', href: paths.dashboard.settings, icon: 'gear-six' },
  { key: 'account', title: 'Account', href: paths.dashboard.account, icon: 'user' },
] satisfies NavItemConfig[];
