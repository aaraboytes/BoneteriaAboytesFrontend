'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
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
import { NotificationsPopover, type NotificationRecord } from './notifications-popover';
import apiClient from '@/lib/api-client';

export function MainNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const { user } = useUser();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const userPopover = usePopover<HTMLDivElement>();
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
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <IconButton
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' } }}
            >
              <ListIcon />
            </IconButton>
            <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton
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
              <Logo color="dark" height={42} width={150} />
            </Box>
          </Stack>
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <Tooltip title="Active Staff">
              <IconButton onClick={activeStaffPopover.handleOpen} ref={activeStaffPopover.anchorRef}>
                <UsersIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton onClick={notificationsPopover.handleOpen} ref={notificationsPopover.anchorRef}>
                <Badge badgeContent={notifications.length} color="success" variant="standard">
                  <BellIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Avatar
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              src={user?.avatarUrl || '/assets/avatar.png'}
              sx={{ cursor: 'pointer' }}
            >
              {user?.fullName?.charAt(0)}
            </Avatar>
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
