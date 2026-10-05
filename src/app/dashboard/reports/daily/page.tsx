import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { config } from '@/config';
import { DailyReportView } from '@/components/dashboard/reports/daily-report-view';

export const metadata = { title: `Reporte del Día | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h4" className="no-print">
          Reporte del Día
        </Typography>
        <DailyReportView />
      </Stack>
    </Box>
  );
}
