export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in', signUp: '/auth/sign-up', resetPassword: '/auth/reset-password' },
  dashboard: {
    overview: '/dashboard/overview',
    sales: '/dashboard/sales',
    inventory: '/dashboard/inventory',
    stores: '/dashboard/stores',
    products: '/dashboard/products',
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
