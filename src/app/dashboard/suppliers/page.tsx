import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { config } from '@/config';
import { SuppliersTable } from '@/components/dashboard/suppliers/suppliers-table';

export const metadata = { title: `Proveedores | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={3} justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Proveedores</Typography>
        </Stack>
        <SuppliersTable />
      </Stack>
    </Box>
  );
}
