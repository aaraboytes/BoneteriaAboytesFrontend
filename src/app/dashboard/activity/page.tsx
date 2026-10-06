'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { ActivityTable } from '@/components/dashboard/activity/activity-table';

export default function ActivityPage(): React.JSX.Element {
  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4, px: { xs: 2, sm: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Historial de Actividad
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Registro cronológico de eventos en el sistema. Haz clic en cualquier evento para ver sus detalles.
            </Typography>
          </Box>

          <ActivityTable />
        </Stack>
      </Container>
    </Box>
  );
}
