import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from '@/paths';

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: { xs: 'flex', lg: 'grid' },
        flexDirection: 'column',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '100vh',
        bgcolor: '#0f172a',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          bgcolor: '#ffffff',
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
            <Box
              component="img"
              src="/assets/aboytes.svg"
              alt="Boneterias Aboytes Logo"
              sx={{ height: 48, width: 'auto' }}
            />
          </Box>
        </Box>
        <Box sx={{ alignItems: 'center', display: 'flex', flex: '1 1 auto', justifyContent: 'center', p: 3 }}>
          <Box sx={{ maxWidth: '450px', width: '100%' }}>{children}</Box>
        </Box>
      </Box>
      <Box
        sx={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1e2b49 0%, #0f172a 60%, #1e1b4b 100%)',
          color: 'var(--mui-palette-common-white)',
          display: { xs: 'none', lg: 'flex' },
          justifyContent: 'center',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-20%',
            right: '-20%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(25, 118, 210, 0.18) 0%, rgba(0, 0, 0, 0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack spacing={4} alignItems="center" sx={{ maxWidth: '480px', width: '100%', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 3,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            }}
          >
            <Box
              component="img"
              src="/assets/aboytes.svg"
              alt="Aboytes Logo"
              sx={{ height: 'auto', width: '100%', maxWidth: '360px', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.4))' }}
            />
          </Box>
          <Stack spacing={1} textAlign="center">
            <Typography color="inherit" sx={{ fontSize: '28px', fontWeight: 800, lineHeight: '36px', letterSpacing: '-0.5px' }} variant="h1">
              Bienvenido a{' '}
              <Box component="span" sx={{ background: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>
                Boneterías Aboytes
              </Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', fontWeight: 500 }}>
              Sistema Punto de Venta y Control de Inventarios
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
