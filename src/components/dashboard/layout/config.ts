import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

// Items are grouped by the job the user is doing, not by technical module.
export const navGroups = ['Vender', 'Inventario', 'Administración'] as const;
export type NavGroup = (typeof navGroups)[number];

export const navItems = [
  { key: 'overview', title: 'Resumen', href: paths.dashboard.overview, icon: 'chart-pie', group: 'Vender' },
  { key: 'sales', title: 'Punto de Venta', href: paths.dashboard.sales, icon: 'currency-dollar', group: 'Vender' },
  { key: 'salesHistory', title: 'Historial de Ventas', href: paths.dashboard.salesHistory, icon: 'clipboard-text', group: 'Vender' },
  { key: 'returns', title: 'Devoluciones', href: paths.dashboard.returns, icon: 'arrow-counter-clockwise', group: 'Vender' },
  { key: 'cashClosing', title: 'Cortes de Caja', href: paths.dashboard.cashSessions, icon: 'receipt', group: 'Vender' },
  { key: 'reports', title: 'Reporte del Día', href: paths.dashboard.reports.daily, icon: 'file-text', group: 'Vender' },
  { key: 'inventory', title: 'Inventario y Stock', href: paths.dashboard.inventory, icon: 'stack', group: 'Inventario' },
  { key: 'products', title: 'Productos', href: paths.dashboard.products, icon: 'package', group: 'Inventario' },
  { key: 'suppliers', title: 'Proveedores', href: paths.dashboard.suppliers, icon: 'truck', group: 'Inventario' },
  { key: 'stores', title: 'Sucursales', href: paths.dashboard.stores, icon: 'buildings', group: 'Inventario' },
  { key: 'services', title: 'Servicios', href: paths.dashboard.services, icon: 'headset', group: 'Administración' },
  { key: 'customers', title: 'Clientes', href: paths.dashboard.customers, icon: 'users', group: 'Administración' },
  { key: 'staff', title: 'Personal', href: paths.dashboard.staff, icon: 'user', group: 'Administración' },
  { key: 'roles', title: 'Roles y Permisos', href: paths.dashboard.roles, icon: 'shield-check', group: 'Administración' },
  { key: 'activity', title: 'Actividad', href: paths.dashboard.activity, icon: 'pulse', group: 'Administración' },
  // Reachable from the user menu in the header; kept here so the header can show the page title.
  { key: 'settings', title: 'Configuración', href: paths.dashboard.settings, icon: 'gear-six', group: 'Administración', hidden: true },
  { key: 'account', title: 'Mi perfil', href: paths.dashboard.account, icon: 'user', group: 'Administración', hidden: true },
] satisfies (NavItemConfig & { group: NavGroup; hidden?: boolean })[];
