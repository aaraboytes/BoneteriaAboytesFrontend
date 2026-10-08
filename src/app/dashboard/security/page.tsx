import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { config } from '@/config';
import { CamerasPanel } from '@/components/dashboard/security/cameras-panel';

export const metadata = { title: `Seguridad | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4, px: { xs: 2, sm: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Seguridad
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Cámaras que detectan cuándo se abren y cierran las puertas.
            </Typography>
          </Box>
          <CamerasPanel />
        </Stack>
      </Container>
    </Box>
  );
}
