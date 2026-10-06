'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { usePathname } from 'next/navigation';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import { usePopover } from '@/hooks/use-popover';
import { useUser } from '@/hooks/use-user';
import { useSidebar } from '@/contexts/sidebar-context';

import RouterLink from 'next/link';
import { paths } from '@/paths';
import { Logo } from '@/components/core/logo';
import { MobileNav } from './mobile-nav';
import { UserPopover } from './user-popover';
import { ActiveStaffPopover } from './active-staff-popover';
import { ColorModeToggle } from './color-mode-toggle';
import { NotificationsPopover, type NotificationRecord } from './notifications-popover';
import apiClient from '@/lib/api-client';
import { navItems } from './config';

export function MainNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const { user } = useUser();
  const pathname = usePathname();
  const pageTitle = navItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.title;
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const userPopover = usePopover<HTMLButtonElement>();
  const activeStaffPopover = usePopover<HTMLButtonElement>();
  const notificationsPopover = usePopover<HTMLButtonElement>();
  
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [loadingNotifications, setLoadingNotifications] = React.useState(true);

  React.useEffect(() => {
    // initial fetch of notifications when nav loads
    apiClient.get<NotificationRecord[]>('/Notifications')
      .then(res => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoadingNotifications(false));
  }, []);

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-paper)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}
        >
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={{ xs: 0.5, sm: 2 }}>
            <IconButton
              aria-label="Abrir menú"
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' } }}
            >
              <ListIcon />
            </IconButton>
            <Tooltip title={isCollapsed ? 'Mostrar menú' : 'Ocultar menú'}>
              <IconButton
                aria-label={isCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
                onClick={toggleCollapsed}
                sx={{ display: { xs: 'none', lg: 'inline-flex' } }}
              >
                <ListIcon />
              </IconButton>
            </Tooltip>

            <Box
              component={RouterLink}
              href={paths.home}
              sx={{
                display: { xs: 'inline-flex', lg: isCollapsed ? 'inline-flex' : 'none' },
                alignItems: 'center',
                ml: 1,
              }}
            >
              <Logo color="dark" height={42} width={150} sx={{ width: { xs: 104, sm: 150 } }} />
            </Box>
            {pageTitle ? (
              <Typography component="h1" variant="subtitle1" noWrap sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
                {pageTitle}
              </Typography>
            ) : null}
          </Stack>
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={{ xs: 0.5, sm: 2 }}>
            <ColorModeToggle />
            <Tooltip title="Personal activo">
              <IconButton aria-label="Personal activo" onClick={activeStaffPopover.handleOpen} ref={activeStaffPopover.anchorRef}>
                <UsersIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notificaciones">
              <IconButton aria-label={`Notificaciones${notifications.length > 0 ? `, ${notifications.length} sin leer` : ''}`} onClick={notificationsPopover.handleOpen} ref={notificationsPopover.anchorRef}>
                <Badge badgeContent={notifications.length} color="success" variant="standard">
                  <BellIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <ButtonBase
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              aria-label="Menú de usuario"
              aria-haspopup="menu"
              sx={{ borderRadius: 1, gap: 1.25, p: 0.5, pr: { sm: 1.5 } }}
            >
              <Avatar src={user?.avatarUrl || '/assets/avatar.png'}>{user?.fullName?.charAt(0)}</Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.role}
                </Typography>
              </Box>
            </ButtonBase>
          </Stack>
        </Stack>
      </Box>
      <UserPopover anchorEl={userPopover.anchorRef.current} onClose={userPopover.handleClose} open={userPopover.open} />
      <ActiveStaffPopover anchorEl={activeStaffPopover.anchorRef.current} onClose={activeStaffPopover.handleClose} open={activeStaffPopover.open} />
      <NotificationsPopover 
        anchorEl={notificationsPopover.anchorRef.current} 
        onClose={notificationsPopover.handleClose} 
        open={notificationsPopover.open} 
        notifications={notifications}
        loading={loadingNotifications}
      />
      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
      />
    </React.Fragment>
  );
}
