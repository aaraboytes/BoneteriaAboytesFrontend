'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import { Box, CircularProgress } from '@mui/material';

export default function Page(): React.JSX.Element {
  const router = useRouter();

  React.useEffect(() => {
    router.replace(paths.dashboard.overview);
  }, [router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}
