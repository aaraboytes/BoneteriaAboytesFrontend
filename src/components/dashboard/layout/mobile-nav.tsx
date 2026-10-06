'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { Logo } from '@/components/core/logo';

import { NavList, navColorVars } from './nav-list';

export interface MobileNavProps {
  onClose?: () => void;
  open?: boolean;
  items?: NavItemConfig[];
}

export function MobileNav({ open, onClose }: MobileNavProps): React.JSX.Element {
  return (
    <Drawer
      PaperProps={{
        sx: {
          ...navColorVars,
          bgcolor: '#1e2b49',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100%',
          width: 'var(--MobileNav-width)',
          zIndex: 'var(--MobileNav-zIndex)',
        },
      }}
      onClose={onClose}
      open={open}
    >
      <Stack spacing={2} sx={{ p: 2, pb: 1, alignItems: 'center' }}>
        <Box component={RouterLink} href={paths.home} onClick={onClose} aria-label="Ir al inicio" sx={{ display: 'inline-flex', alignItems: 'center' }}>
          <Logo color="light" height={60} width={200} />
        </Box>
      </Stack>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      {/* Close the drawer after choosing a destination. */}
      <NavList onNavigate={onClose} />
    </Drawer>
  );
}
