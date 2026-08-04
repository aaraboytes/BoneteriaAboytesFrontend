'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Calendar,
  CaretRight,
  X,
  DownloadSimple
} from '@phosphor-icons/react';

import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';
import { generateAppointmentsReport, AppointmentFunnelRow } from '@/lib/generate-appointments-report';
import { AppointmentsDailyDialog } from '@/components/dashboard/appointments/appointments-daily-dialog';

interface AppointmentsResumeDialogProps {
  open: boolean;
  onClose: () => void;
}

type TimeframeType = 'today' | 'week' | 'month' | 'custom';

function MobileFunnelCard({ row, onOpenDetails }: { row: any; onOpenDetails: () => void }) {
  const statuses = [
    { label: 'Scheduled', value: row.scheduled, bg: '#e3f2fd', text: '#1565c0' },
    { label: 'Delayed', value: row.delayed, bg: '#e0e7ff', text: '#4338ca' },
    { label: 'Waiting', value: row.waiting, bg: '#fff3e0', text: '#e65100' },
    { label: 'In Progress', value: row.inProgress, bg: '#f3e5f5', text: '#7b1fa2' },
    { label: 'Done', value: row.done, bg: '#e8f5e9', text: '#1b5e20' },
    { label: 'Canceled', value: row.canceled, bg: '#ffebee', text: '#b71c1c' },
    { label: 'Absent', value: row.absent, bg: '#ffebee', text: '#b71c1c' },
    { label: 'Rescheduled', value: row.rescheduled, bg: '#f3f4f6', text: '#4b5563' }
  ];

  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Calendar size={18} color="#64748b" />
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.9rem' }}>
                {row.date}
              </Typography>
            </Stack>
            <Chip 
              label={`Total: ${row.total}`} 
              size="small" 
              sx={{ 
                bgcolor: '#0f172a', 
                fontWeight: 700, 
                color: '#fff', 
                height: 24,
                fontSize: '0.75rem',
                borderRadius: '6px'
              }} 
            />
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Grid container spacing={1}>
            {statuses.map((item, i) => {
              const active = item.value > 0;
              return (
                <Grid size={{ xs: 6 }} key={i}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      borderRadius: '8px',
                      bgcolor: active ? item.bg : '#f8fafc',
                      border: '1px solid',
                      borderColor: active ? 'transparent' : '#f1f5f9',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: active ? item.text : '#e2e8f0',
                        color: active ? '#fff' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        px: 0.5,
                      }}
                    >
                      {item.value}
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={active ? 700 : 500}
                      sx={{
                        fontSize: '0.75rem',
                        color: active ? item.text : '#64748b',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={onOpenDetails}
            endIcon={<CaretRight size={16} weight="bold" />}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
              fontSize: '0.8rem',
              py: 1,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' }
            }}
          >
            View Daily Appointments
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AppointmentsResumeDialog({ open, onClose }: AppointmentsResumeDialogProps): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [timeframe, setTimeframe] = React.useState<TimeframeType>('today');
  const [customStartDate, setCustomStartDate] = React.useState<string>(dayjs().format('YYYY-MM-DD'));
  const [customEndDate, setCustomEndDate] = React.useState<string>(dayjs().format('YYYY-MM-DD'));
  
  const [funnelData, setFunnelData] = React.useState<AppointmentFunnelRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Daily Detail modal states
  const [appointmentsDialogOpen, setAppointmentsDialogOpen] = React.useState(false);
  const [selectedAppointmentsDate, setSelectedAppointmentsDate] = React.useState('');
  const [selectedAppointmentsRawDate, setSelectedAppointmentsRawDate] = React.useState('');

  const fetchFunnelData = React.useCallback(async () => {
    setLoading(true);
    try {
      let url = `/Analytics/dashboard-pulse?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        if (!customStartDate || !customEndDate) return;
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      const response = await apiClient.get(url);
      if (response.data?.daily?.funnel) {
        setFunnelData(response.data.daily.funnel);
      } else {
        setFunnelData([]);
      }
    } catch (error) {
      console.error('Failed to fetch funnel analytics', error);
      setFunnelData([]);
    } finally {
      setLoading(false);
    }
  }, [timeframe, customStartDate, customEndDate]);

  React.useEffect(() => {
    if (open) {
      fetchFunnelData();
    }
  }, [open, fetchFunnelData]);

  const funnelTotals = React.useMemo(() => {
    return funnelData.reduce((acc: any, row: any) => {
      acc.total += row.total || 0;
      acc.scheduled += row.scheduled || 0;
      acc.delayed += row.delayed || 0;
      acc.waiting += row.waiting || 0;
      acc.inProgress += row.inProgress || 0;
      acc.done += row.done || 0;
      acc.canceled += row.canceled || 0;
      acc.absent += row.absent || 0;
      acc.rescheduled += row.rescheduled || 0;
      return acc;
    }, {
      total: 0,
      scheduled: 0,
      delayed: 0,
      waiting: 0,
      inProgress: 0,
      done: 0,
      canceled: 0,
      absent: 0,
      rescheduled: 0
    });
  }, [funnelData]);

  const handleExport = async () => {
    try {
      await generateAppointmentsReport(funnelData, timeframe);
    } catch (err) {
      console.error('Failed to export appointments excel report', err);
      window.alert('Failed to generate Excel report. Please make sure the templates are set up.');
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#f8fafc'
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          <Typography component="span" variant="h5" fontWeight={700} color="#0f172a">
            Appointments Status
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Filter controls row */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              sx={{ 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                bgcolor: '#fff',
                p: 2,
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}
            >
              {timeframe === 'custom' && (
                <Stack direction="row" spacing={1} sx={{ bgcolor: '#f8fafc', p: 0.5, borderRadius: 2, border: '1px solid #e2e8f0', width: { xs: '100%', sm: 'auto' } }}>
                  <TextField
                    type="date"
                    size="small"
                    label="Start Date"
                    InputLabelProps={{ shrink: true }}
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    label="End Date"
                    InputLabelProps={{ shrink: true }}
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                  />
                </Stack>
              )}
              <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
                <InputLabel id="resume-timeframe-label">Timeframe</InputLabel>
                <Select
                  labelId="resume-timeframe-label"
                  value={timeframe}
                  label="Timeframe"
                  onChange={(e) => setTimeframe(e.target.value as TimeframeType)}
                  sx={{
                    bgcolor: '#fff',
                    fontWeight: 600,
                    color: '#334155',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' }
                  }}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
              
              {funnelData.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadSimple size={18} />}
                  onClick={handleExport}
                  sx={{ 
                    fontWeight: 700, 
                    py: 1, 
                    px: 2, 
                    borderRadius: '8px',
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  Export Excel
                </Button>
              )}
            </Stack>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : isMobile ? (
              <Stack spacing={2}>
                {funnelData.map((row: any, idx: number) => (
                  <MobileFunnelCard
                    key={idx}
                    row={row}
                    onOpenDetails={() => {
                      setSelectedAppointmentsDate(row.date);
                      setSelectedAppointmentsRawDate(row.rawDate);
                      setAppointmentsDialogOpen(true);
                    }}
                  />
                ))}
                {funnelData.length === 0 && (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary', bgcolor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    No appointments found for the selected timeframe.
                  </Box>
                )}
              </Stack>
            ) : (
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table sx={{ minWidth: 800 }} stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, py: 2 } }}>
                        <TableCell>Date</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Scheduled</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Delayed</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Waiting</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#f3e5f5', color: '#7b1fa2', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>In Progress</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Done</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Canceled</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Absent</Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-block', px: 1, py: 0.5, borderRadius: 1, bgcolor: '#f3f4f6', color: '#4b5563', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Rescheduled</Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {funnelData.map((row: any, idx: number) => (
                        <TableRow
                          key={idx}
                          hover
                          onClick={() => {
                            setSelectedAppointmentsDate(row.date);
                            setSelectedAppointmentsRawDate(row.rawDate);
                            setAppointmentsDialogOpen(true);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{row.date}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{row.total}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.scheduled > 0 ? '#e3f2fd' : 'transparent', color: row.scheduled > 0 ? '#1565c0' : 'text.disabled', fontWeight: 600 }}>{row.scheduled}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.delayed > 0 ? '#e0e7ff' : 'transparent', color: row.delayed > 0 ? '#4338ca' : 'text.disabled', fontWeight: 600 }}>{row.delayed}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.waiting > 0 ? '#fff3e0' : 'transparent', color: row.waiting > 0 ? '#e65100' : 'text.disabled', fontWeight: 600 }}>{row.waiting}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.inProgress > 0 ? '#f3e5f5' : 'transparent', color: row.inProgress > 0 ? '#7b1fa2' : 'text.disabled', fontWeight: 600 }}>{row.inProgress}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.done > 0 ? '#e8f5e9' : 'transparent', color: row.done > 0 ? '#1b5e20' : 'text.disabled', fontWeight: 600 }}>{row.done}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.canceled > 0 ? '#ffebee' : 'transparent', color: row.canceled > 0 ? '#b71c1c' : 'text.disabled', fontWeight: 600 }}>{row.canceled}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.absent > 0 ? '#ffebee' : 'transparent', color: row.absent > 0 ? '#b71c1c' : 'text.disabled', fontWeight: 600 }}>{row.absent}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: row.rescheduled > 0 ? '#f3f4f6' : 'transparent', color: row.rescheduled > 0 ? '#4b5563' : 'text.disabled', fontWeight: 600 }}>{row.rescheduled}</TableCell>
                        </TableRow>
                      ))}
                      {funnelData.length > 0 && (
                        <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #cbd5e1', '&:hover': { bgcolor: '#f1f5f9' } }}>
                          <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>{funnelTotals.total}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.scheduled > 0 ? '#e3f2fd' : 'transparent', color: funnelTotals.scheduled > 0 ? '#1565c0' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.scheduled}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.delayed > 0 ? '#e0e7ff' : 'transparent', color: funnelTotals.delayed > 0 ? '#4338ca' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.delayed}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.waiting > 0 ? '#fff3e0' : 'transparent', color: funnelTotals.waiting > 0 ? '#e65100' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.waiting}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.inProgress > 0 ? '#f3e5f5' : 'transparent', color: funnelTotals.inProgress > 0 ? '#7b1fa2' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.inProgress}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.done > 0 ? '#e8f5e9' : 'transparent', color: funnelTotals.done > 0 ? '#1b5e20' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.done}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.canceled > 0 ? '#ffebee' : 'transparent', color: funnelTotals.canceled > 0 ? '#b71c1c' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.canceled}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.absent > 0 ? '#ffebee' : 'transparent', color: funnelTotals.absent > 0 ? '#b71c1c' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.absent}</TableCell>
                          <TableCell align="center" sx={{ bgcolor: funnelTotals.rescheduled > 0 ? '#f3f4f6' : 'transparent', color: funnelTotals.rescheduled > 0 ? '#4b5563' : 'text.disabled', fontWeight: 700 }}>{funnelTotals.rescheduled}</TableCell>
                        </TableRow>
                      )}
                      {funnelData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            No appointments found for the selected timeframe.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* APPOINTMENTS DAILY DETAIL DIALOG */}
      <AppointmentsDailyDialog
        open={appointmentsDialogOpen}
        onClose={() => setAppointmentsDialogOpen(false)}
        date={selectedAppointmentsDate}
        rawDate={selectedAppointmentsRawDate}
      />
    </>
  );
}
