'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { Cake as CakeIcon } from '@phosphor-icons/react/dist/ssr/Cake';
import { Umbrella as UmbrellaIcon } from '@phosphor-icons/react/dist/ssr/Umbrella';
import { Stethoscope as StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

import apiClient from '@/lib/api-client';

export interface NotificationRecord {
  type: string;
  message: string;
  date: string;
}

interface NotificationsPopoverProps {
  anchorEl: Element | null;
  onClose: () => void;
  open: boolean;
  notifications: NotificationRecord[];
  loading: boolean;
}

export function NotificationsPopover({ anchorEl, onClose, open, notifications, loading }: NotificationsPopoverProps): React.JSX.Element {
  
  const getIconForType = (type: string) => {
    switch (type) {
      case 'staff_birthday':
      case 'patient_birthday':
        return <CakeIcon color="var(--mui-palette-secondary-main)" size={24} weight="fill" />;
      case 'staff_vacation':
        return <UmbrellaIcon color="var(--mui-palette-info-main)" size={24} weight="fill" />;
      case 'evaluations':
        return <StethoscopeIcon color="var(--mui-palette-primary-main)" size={24} weight="fill" />;
      case 'tech_maintenance':
        return <WrenchIcon color="var(--mui-palette-warning-main)" size={24} weight="fill" />;
      default:
        return <BellIcon size={24} />;
    }
  };

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: '360px', maxHeight: '420px' } } }}
      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <Typography variant="h6">Notifications</Typography>
        <Typography variant="body2" color="text.secondary">Today's active alerts and events</Typography>
      </Box>

      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">You're all caught up!</Typography>
        </Box>
      ) : (
        <List disablePadding>
          {notifications.map((notif, idx) => (
            <React.Fragment key={idx}>
              <ListItem sx={{ py: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getIconForType(notif.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notif.message}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondary={new Date(notif.date).toLocaleDateString()}
                  secondaryTypographyProps={{ variant: 'caption', display: 'block', mt: 0.5 }}
                />
              </ListItem>
              {idx < notifications.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Popover>
  );
}
