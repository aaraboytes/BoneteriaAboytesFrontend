import * as React from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import dayjs from 'dayjs';

export interface Prescription {
  id: number;
  prescriptionText: string;
  number: number;
  date: string;
}

interface PrescriptionPopoverProps {
  prescription: Prescription | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function PrescriptionPopover({ prescription, anchorEl, onClose }: PrescriptionPopoverProps): React.JSX.Element {
  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: { width: '350px', p: 2, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
        }
      }}
    >
      {prescription ? (
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
            Prescription #{prescription.number}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Date: {dayjs(prescription.date).format('DD/MM/YYYY HH:mm')}
          </Typography>
          <Divider />
          <Box>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {prescription.prescriptionText}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Typography variant="body2">No prescription selected</Typography>
      )}
    </Popover>
  );
}
