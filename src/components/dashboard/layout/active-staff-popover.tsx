'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import apiClient from '@/lib/api-client';

export interface ActiveStaffPopoverProps {
  anchorEl: Element | null;
  onClose: () => void;
  open: boolean;
}

interface ShiftSchedule {
  dayOfWeek: number;
  entranceTime: string;
  endTime: string;
}

interface User {
  id: number;
  fullName: string;
  role: string;
  specialty: string;
  shiftSchedules: ShiftSchedule[];
}

export function ActiveStaffPopover({ anchorEl, onClose, open }: ActiveStaffPopoverProps): React.JSX.Element {
  const [staff, setStaff] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      apiClient.get<User[]>('/Users')
        .then((res) => {
          const now = new Date();
          const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
          // backend expects DayOfWeek enum where 0 is Sunday.
          const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

          const active = res.data.filter(user => {
            if (!user.shiftSchedules || user.shiftSchedules.length === 0) return false;
            
            return user.shiftSchedules.some(s => {
              if (s.dayOfWeek !== currentDay) return false;
              
              // Times are in "HH:mm" format from backend
              const ent = s.entranceTime.substring(0, 5);
              const end = s.endTime.substring(0, 5);
              
              return currentTimeStr >= ent && currentTimeStr <= end;
            });
          });

          setStaff(active);
        })
        .catch((err) => console.error('Failed to fetch active staff', err))
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: '320px', maxHeight: '400px' } } }}
      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <Typography variant="h6">Active Staff</Typography>
        <Typography variant="body2" color="text.secondary">Currently working based on schedules</Typography>
      </Box>

      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : staff.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">No staff currently working.</Typography>
        </Box>
      ) : (
        <List disablePadding>
          {staff.map((user) => (
            <ListItem key={user.id} divider>
              <ListItemAvatar>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      bgcolor: 'success.main',
                      borderRadius: '50%',
                      border: '2px solid var(--mui-palette-background-paper)'
                    }}
                  />
                </Box>
              </ListItemAvatar>
              <ListItemText
                primary={user.fullName || 'Unknown User'}
                secondary={
                  <React.Fragment>
                    <Typography variant="caption" display="block">
                      {user.role} {user.specialty && `• ${user.specialty}`}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Popover>
  );
}
