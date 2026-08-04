import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DailyCashClosingReport } from '@/components/dashboard/billing/daily-cash-closing-report';

export const metadata = { title: `Cash Closing | Dashboard` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4">Daily Cash Closing Report</Typography>
      </div>
      <DailyCashClosingReport />
    </Stack>
  );
}
