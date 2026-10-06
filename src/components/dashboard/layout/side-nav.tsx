'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

import { paths } from '@/paths';
import { Logo } from '@/components/core/logo';
import { useSidebar } from '@/contexts/sidebar-context';

import { NavList, navColorVars } from './nav-list';

export function SideNav(): React.JSX.Element {
  const { isCollapsed } = useSidebar();

  return (
    <Box
      component="aside"
      // A collapsed sidebar is off-screen: hide it from keyboard and screen readers too.
      inert={isCollapsed ? true : undefined}
      sx={{
        ...navColorVars,
        bgcolor: '#1e2b49',
        color: '#ffffff',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        height: '100%',
        left: 0,
        maxWidth: '100%',
        position: 'fixed',
        scrollbarWidth: 'none',
        top: 0,
        width: 'var(--SideNav-width)',
        zIndex: 'var(--SideNav-zIndex)',
        transform: { lg: isCollapsed ? 'translateX(-100%)' : 'translateX(0)' },
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack spacing={2} sx={{ p: 2, pb: 1, alignItems: 'center' }}>
        <Box component={RouterLink} href={paths.home} aria-label="Ir al inicio" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Logo color="light" height={60} width={200} />
        </Box>
      </Stack>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <NavList />
    </Box>
  );
}
