'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { isNavItemActive } from '@/lib/is-nav-item-active';

import { navIcons } from './nav-icons';
import { useNavItems } from './use-nav-items';

export const navColorVars = {
  '--NavItem-color': '#cbd5e1',
  '--NavItem-hover-background': 'rgba(254, 226, 99, 0.12)',
  '--NavItem-active-background': '#fee263',
  '--NavItem-active-color': '#1e2b49',
  '--NavItem-icon-color': '#94a3b8',
  '--NavItem-icon-active-color': '#1e2b49',
} as const;

// Grouped navigation shared by the desktop sidebar and the mobile drawer.
export function NavList({ onNavigate }: { onNavigate?: () => void }): React.JSX.Element {
  const pathname = usePathname();
  const { groups } = useNavItems();

  return (
    <Stack component="nav" aria-label="Navegación principal" spacing={2.5} sx={{ flex: '1 1 auto', p: '12px', overflowY: 'auto' }}>
      {groups.map((group) => (
        <Box key={group.title} component="section" aria-labelledby={`nav-group-${group.title}`}>
          <Typography
            id={`nav-group-${group.title}`}
            sx={{ color: '#94a3b8', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', px: 2, pb: 0.75, textTransform: 'uppercase' }}
          >
            {group.title}
          </Typography>
          <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {group.items.map((item) => {
              const active = isNavItemActive({ href: item.href, pathname });
              const Icon = navIcons[item.icon];
              return (
                <li key={item.key}>
                  <Box
                    component={RouterLink}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      alignItems: 'center',
                      borderRadius: 1,
                      color: active ? 'var(--NavItem-active-color)' : 'var(--NavItem-color)',
                      bgcolor: active ? 'var(--NavItem-active-background)' : 'transparent',
                      display: 'flex',
                      fontSize: '0.875rem',
                      fontWeight: active ? 700 : 500,
                      gap: 1.5,
                      minHeight: 44,
                      px: 2,
                      textDecoration: 'none',
                      '&:hover': { bgcolor: active ? 'var(--NavItem-active-background)' : 'var(--NavItem-hover-background)' },
                      '&:focus-visible': { outline: '2px solid #fee263', outlineOffset: 2 },
                    }}
                  >
                    {Icon ? (
                      <Icon
                        aria-hidden
                        fill={active ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)'}
                        fontSize="var(--icon-fontSize-md)"
                        weight={active ? 'fill' : undefined}
                      />
                    ) : null}
                    {item.title}
                  </Box>
                </li>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
