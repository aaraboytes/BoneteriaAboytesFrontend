'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowSquareUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareUpRight';
import { CaretUpDownIcon } from '@phosphor-icons/react/dist/ssr/CaretUpDown';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { Logo } from '@/components/core/logo';

import { navItems } from './config';
import { navIcons } from './nav-icons';
import { useUser } from '@/hooks/use-user';
import { useSidebar } from '@/contexts/sidebar-context';

import sectionFlags from '@root/section_flags.json';

export function SideNav(): React.JSX.Element {
  const pathname = usePathname();
  const { user } = useUser();
  const { isCollapsed } = useSidebar();

  // Filter nav items based on section_flags.json toggle & role
  const filteredNavItems = navItems.filter((item) => {
    // Check if section is manually enabled in JSON config
    const isEnabled = (sectionFlags.sections as Record<string, boolean>)[item.key];
    if (isEnabled === false) {
      return false;
    }

    if (item.key === 'overview') {
      const roleLower = user?.role?.toLowerCase();
      return roleLower === 'admin' || roleLower === 'developer';
    }
    return true;
  });

  return (
    <Box
      sx={{
        '--SideNav-background': '#1e2b49',
        '--SideNav-color': '#ffffff',
        '--NavItem-color': '#cbd5e1',
        '--NavItem-hover-background': 'rgba(254, 226, 99, 0.12)',
        '--NavItem-active-background': '#fee263',
        '--NavItem-active-color': '#1e2b49',
        '--NavItem-disabled-color': '#64748b',
        '--NavItem-icon-color': '#94a3b8',
        '--NavItem-icon-active-color': '#1e2b49',
        '--NavItem-icon-disabled-color': '#475569',
        bgcolor: 'var(--SideNav-background)',
        color: 'var(--SideNav-color)',
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
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Logo height={60} width={200} />
        </Box>
      </Stack>
      <Divider sx={{ borderColor: 'var(--mui-palette-neutral-700)' }} />
      <Box component="nav" sx={{ flex: '1 1 auto', p: '12px' }}>
        {renderNavItems({ pathname, items: filteredNavItems })}
      </Box>
    </Box>
  );
}

function renderNavItems({ items = [], pathname }: { items?: NavItemConfig[]; pathname: string }): React.JSX.Element {
  const children = items.reduce((acc: React.ReactNode[], curr: NavItemConfig): React.ReactNode[] => {
    const { key, ...item } = curr;

    acc.push(<NavItem key={key} pathname={pathname} {...item} />);

    return acc;
  }, []);

  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {children}
    </Stack>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'items'> {
  pathname: string;
}

function NavItem({ disabled, external, href, icon, matcher, pathname, title }: NavItemProps): React.JSX.Element {
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const Icon = icon ? navIcons[icon] : null;

  return (
    <li>
      <Box
        {...(href
          ? {
            component: external ? 'a' : RouterLink,
            href,
            target: external ? '_blank' : undefined,
            rel: external ? 'noreferrer' : undefined,
          }
          : { role: 'button' })}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: 'var(--NavItem-color)',
          cursor: 'pointer',
          display: 'flex',
          flex: '0 0 auto',
          gap: 1,
          p: '6px 16px',
          position: 'relative',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          ...(disabled && {
            bgcolor: 'var(--NavItem-disabled-background)',
            color: 'var(--NavItem-disabled-color)',
            cursor: 'not-allowed',
          }),
          ...(active && { bgcolor: 'var(--NavItem-active-background)', color: 'var(--NavItem-active-color)' }),
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          {Icon ? (
            <Icon
              fill={active ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)'}
              fontSize="var(--icon-fontSize-md)"
              weight={active ? 'fill' : undefined}
            />
          ) : null}
        </Box>
        <Box sx={{ flex: '1 1 auto' }}>
          <Typography
            component="span"
            sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: 500, lineHeight: '28px' }}
          >
            {title}
          </Typography>
        </Box>
      </Box>
    </li>
  );
}
