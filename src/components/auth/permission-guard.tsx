'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';

import { useUser } from '@/hooks/use-user';

export interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

// Hides a page from users without the permission. The API enforces the same permission; this
// only avoids showing a page whose requests would all be refused.
export function PermissionGuard({ permission, children }: PermissionGuardProps): React.JSX.Element | null {
  const { user, isLoading } = useUser();

  if (isLoading) return null;
  if (!user?.permissions?.includes(permission)) {
    return <Alert severity="warning">No tienes permiso para ver esta sección.</Alert>;
  }
  return <>{children}</>;
}
