'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { X, DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { generateDayAppointmentsReport } from '@/lib/generate-day-appointments-report';

interface AppointmentsDailyDialogProps {
  open: boolean;
  onClose: () => void;
  date: string | null;
  rawDate: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: '#e3f2fd', text: '#1565c0' }, // Blue
  waiting: { bg: '#fff3e0', text: '#e65100' }, // Orange
  in_progress: { bg: '#f3e5f5', text: '#7b1fa2' }, // Purple
  done: { bg: '#e8f5e9', text: '#1b5e20' }, // Green
  canceled: { bg: '#ffebee', text: '#b71c1c' }, // Red
  absent: { bg: '#ffebee', text: '#b71c1c' }, // Red
  delayed: { bg: '#e0e7ff', text: '#4338ca' }, // Indigo
  rescheduled: { bg: '#f3f4f6', text: '#4b5563' } // Gray
};

// ---------------------------------------------------------
// REUSABLE MOBILE CARD COMPONENT
// ---------------------------------------------------------

function MobileAppointmentCard({ app, getStatusDisplay }: { app: any; getStatusDisplay: (status: string) => React.ReactNode }) {
  const servicesText = app.services && app.services.length > 0
    ? app.services.map((s: any) => s.name).join(', ')
    : (app.treatmentType || 'None');

  const patientName = app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Unknown';
  const balance = app.patient?.balance || 0;
  const timeStr = dayjs(app.appointmentDate).format('HH:mm');

  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                {timeStr} | Appt #{app.id}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.85rem' }}>
                {patientName}
              </Typography>
            </Box>
            {getStatusDisplay(app.status)}
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Grid container spacing={1} alignItems="center">
            <Grid size={{ xs: 8 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>Services</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {servicesText}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }} sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>Balance</Typography>
              <Typography 
                variant="body2" 
                fontWeight={700} 
                sx={{ 
                  fontSize: '0.85rem', 
                  color: balance < 0 ? '#d32f2f' : (balance > 0 ? '#2e7d32' : 'inherit') 
                }}
              >
                {balance < 0 ? `-$${Math.abs(balance).toFixed(2)}` : `$${balance.toFixed(2)}`}
              </Typography>
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

import Stack from '@mui/material/Stack';

export function AppointmentsDailyDialog({ open, onClose, date, rawDate }: AppointmentsDailyDialogProps): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (open && rawDate) {
      fetchAppointments(rawDate);
    } else {
      setAppointments([]);
    }
  }, [open, rawDate]);

  const fetchAppointments = async (selectedDate: string) => {
    setLoading(true);
    try {
      // Assuming date is in a parseable format, generate start and end of that day in UTC
      const startOfDay = dayjs(selectedDate).startOf('day').toISOString();
      const endOfDay = dayjs(selectedDate).endOf('day').toISOString();

      const response = await apiClient.get(`/Appointments/with-balance?rangeStart=${startOfDay}&rangeEnd=${endOfDay}`);
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const key = status?.toLowerCase() || 'scheduled';
    const color = STATUS_COLORS[key] || STATUS_COLORS.scheduled;
    const label = status?.replace('_', ' ') || 'Scheduled';

    return (
      <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: color.bg, color: color.text, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
        {label}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? '0px' : '16px' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: isMobile ? 1.5 : 2,
          pt: isMobile ? 2 : 3,
          px: isMobile ? 2 : 4,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
          Appointments for {date}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X weight="bold" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: isMobile ? 2 : 4, pb: isMobile ? 2 : 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : isMobile ? (
          appointments.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No appointments found.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {appointments.map((app) => (
                <MobileAppointmentCard key={app.id} app={app} getStatusDisplay={getStatusDisplay} />
              ))}
            </Stack>
          )
        ) : (
          <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, py: 2 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Appointment #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Services</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Patient Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No appointments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((app) => {
                    const servicesText = app.services && app.services.length > 0
                      ? app.services.map((s: any) => s.name).join(', ')
                      : (app.treatmentType || 'None');

                    const patientName = app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Unknown';
                    const balance = app.patient?.balance || 0;

                    return (
                      <TableRow key={app.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{dayjs(app.appointmentDate).format('HH:mm')}</TableCell>
                        <TableCell>{app.id}</TableCell>
                        <TableCell>{patientName}</TableCell>
                        <TableCell>{servicesText}</TableCell>
                        <TableCell>{getStatusDisplay(app.status)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: balance < 0 ? '#d32f2f' : (balance > 0 ? '#2e7d32' : 'inherit') }}>
                          {balance < 0 ? `-$${Math.abs(balance).toFixed(2)}` : `$${balance.toFixed(2)}`}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        )}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            color="primary"
            startIcon={<DownloadSimple />}
            onClick={() => {
              if (date && rawDate) {
                generateDayAppointmentsReport(appointments, date, rawDate);
              }
            }}
            disabled={loading || appointments.length === 0}
            sx={{ fontWeight: 700, width: isMobile ? '100%' : 'auto' }}
          >
            Export Report
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
