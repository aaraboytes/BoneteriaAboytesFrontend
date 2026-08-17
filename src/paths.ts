export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in', signUp: '/auth/sign-up', resetPassword: '/auth/reset-password' },
  dashboard: {
    overview: '/dashboard/overview',
    sales: '/dashboard/sales',
    inventory: '/dashboard/inventory',
    stores: '/dashboard/stores',
    storeMap: (id: string | number) => `/dashboard/stores/${id}/map`,
    products: '/dashboard/products',
    suppliers: '/dashboard/suppliers',
    services: '/dashboard/services',
    customers: '/dashboard/customers',
    staff: '/dashboard/staff',
    settings: '/dashboard/settings',
    account: '/dashboard/account',
    billing: {
      cashClosing: '/dashboard/billing/cash-closing',
    },
  },
  errors: { notFound: '/errors/not-found' },
} as const;
