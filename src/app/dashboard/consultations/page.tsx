import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { config } from '@/config';
import { ConsultationsTable } from '@/components/dashboard/consultations/consultations-table';

export const metadata = { title: `Consultations | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">All Consultations</Typography>
      </Box>
      <ConsultationsTable />
    </Stack>
  );
}
