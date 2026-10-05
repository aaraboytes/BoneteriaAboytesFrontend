import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { config } from '@/config';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { CashSessionsTable } from '@/components/dashboard/cash-sessions/cash-sessions-table';

export const metadata = { title: `Cortes de Caja | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Cortes de Caja</Typography>
        <PermissionGuard permission="reports.view">
          <CashSessionsTable />
        </PermissionGuard>
      </Stack>
    </Box>
  );
}
