'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
  Avatar,
  SelectChangeEvent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Collapse
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Calendar,
  CashRegister,
  ChartBar,
  ChartDonut,
  ChartLine,
  CheckCircle,
  Clock,
  Coins,
  CreditCard,
  CurrencyDollar,
  HandCoins,
  Info,
  Monitor,
  User,
  Users,
  Wrench,
  CaretRight,
  CaretDown,
  CaretUp,
  X,
  Printer,
  Receipt,
  Money,
  Bank,
  WarningCircle,
  ChartLineUp,
  Vault,
  TrendUp,
  DownloadSimple
} from '@phosphor-icons/react';

import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';
import { generateAppointmentsReport } from '@/lib/generate-appointments-report';
import { generateClosingsReport } from '@/lib/generate-closings-report';
import { DailyHistoryDialog } from '@/components/dashboard/sales/daily-history-dialog';
import { Chart } from '@/components/core/chart';
import { Logo } from '@/components/core/logo';
import { AppointmentsDailyDialog } from '@/components/dashboard/appointments/appointments-daily-dialog';
import { generateMachineUtilizationReport } from '@/lib/generate-machine-utilization-report';
import type { ApexOptions } from 'apexcharts';

type TabType = 'daily' | 'financial' | 'reports';
type TimeframeType = 'today' | 'week' | 'month' | 'custom';

// ---------------------------------------------------------
// REUSABLE MOBILE CARD COMPONENTS
// ---------------------------------------------------------

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

function MobileClosingCard({ c, formatCurrency, onRowClick }: { c: any; formatCurrency: (v: number) => string; onRowClick: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <Card 
      sx={{ 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0', 
        boxShadow: 'none',
        transition: 'all 0.2s',
        '&:hover': { borderColor: 'primary.main' }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                Closing #{c.id}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                {c.date}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                Cashier
              </Typography>
              <Typography variant="subtitle2" fontWeight={600} color="#334155">
                {c.userName}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Grid container spacing={1}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Payments Total</Typography>
              <Typography variant="body2" fontWeight={700} color="success.main">
                {formatCurrency(c.payments.total)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>End Cash</Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {formatCurrency(c.endFunds.cash)}
              </Typography>
            </Grid>
          </Grid>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Stack spacing={1.5} sx={{ pt: 1.5 }}>
              <Divider sx={{ borderStyle: 'dashed' }} />
              
              <Typography variant="caption" fontWeight={700} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Initial Funds</Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Cash</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{formatCurrency(c.initialFunds.cash)}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Card</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{formatCurrency(c.initialFunds.card)}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Transfer</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{formatCurrency(c.initialFunds.transfer)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ borderStyle: 'dashed' }} />
              
              <Typography variant="caption" fontWeight={700} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payments Breakdown</Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Tx Count</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{c.payments.transactions}</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Cash</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{formatCurrency(c.payments.cash)}</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Card</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{formatCurrency(c.payments.card)}</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Transfer</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{formatCurrency(c.payments.transfer)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Typography variant="caption" fontWeight={700} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Withdrawals</Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Cash</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', color: 'error.main' }}>{formatCurrency(c.withdrawals.cash)}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Debit</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', color: 'error.main' }}>{formatCurrency(c.withdrawals.debit)}</Typography>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Transfer</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', color: 'error.main' }}>{formatCurrency(c.withdrawals.transfer)}</Typography>
                </Grid>
              </Grid>

              {c.comments && (
                <>
                  <Divider sx={{ borderStyle: 'dashed' }} />
                  <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Comments</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>{c.comments}</Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Collapse>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Button 
              size="small" 
              variant="text" 
              color="inherit"
              onClick={() => setExpanded(!expanded)}
              startIcon={expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
              sx={{ fontWeight: 600, color: '#64748b', textTransform: 'none', fontSize: '0.75rem', p: 0 }}
            >
              {expanded ? 'Hide details' : 'Show details'}
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={onRowClick}
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem', py: 0.5 }}
            >
              View transactions
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPulsePage(): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = React.useState<TabType>('daily');
  const [timeframe, setTimeframe] = React.useState<TimeframeType>('today');
  const [clinicOpen, setClinicOpen] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  // ---------------------------------------------------------
  // EMPTY INITIAL STATE
  // ---------------------------------------------------------
  const emptyTelemetry = React.useMemo(() => {
    return {
      daily: {
        funnel: [] as any[],
        machines: [] as any[],
        staffLoad: [] as any[]
      },
      financial: {
        terminal: {
          totalTransactions: 0,
          cashRevenue: 0,
          debitRevenue: 0,
          creditRevenue: 0,
          debtGenerated: 0,
          netRevenue: 0,
          discounts: 0,
          totalEarnings: 0,
          chartData: [] as any[]
        },
        ledger: {
          earned: 0,
          unapplied: 0
        },
        outstanding: [] as any[]
      },
      reports: {
        week: {
          roi: [] as any[],
          peakHours: [] as any[],
          payments: [] as any[]
        },
        month: {
          roi: [] as any[],
          peakHours: [] as any[],
          payments: [] as any[]
        }
      }
    };
  }, []);

  const [telemetry, setTelemetry] = React.useState(emptyTelemetry);

  const [closingsStartDate, setClosingsStartDate] = React.useState('');
  const [closingsEndDate, setClosingsEndDate] = React.useState('');
  const [closingsData, setClosingsData] = React.useState<any[]>([]);

  const [transactionModalOpen, setTransactionModalOpen] = React.useState(false);
  const [selectedSessionId, setSelectedSessionId] = React.useState<number | undefined>(undefined);

  const [appointmentsDialogOpen, setAppointmentsDialogOpen] = React.useState(false);
  const [selectedAppointmentsDate, setSelectedAppointmentsDate] = React.useState<string | null>(null);
  const [selectedAppointmentsRawDate, setSelectedAppointmentsRawDate] = React.useState<string | null>(null);

  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [currentReceiptData, setCurrentReceiptData] = React.useState<any>(null);

  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');

  const [machineUtilData, setMachineUtilData] = React.useState<any[]>([]);
  const [machineUtilNames, setMachineUtilNames] = React.useState<string[]>([]);
  const [machineUtilStartDate, setMachineUtilStartDate] = React.useState<string>(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [machineUtilEndDate, setMachineUtilEndDate] = React.useState<string>(dayjs().format('YYYY-MM-DD'));

  const fetchMachineUtilization = React.useCallback(async () => {
    try {
      const response = await apiClient.get(`/Analytics/machine-utilization?startDate=${machineUtilStartDate}&endDate=${machineUtilEndDate}`);
      if (response && response.data) {
        setMachineUtilNames(response.data.machineNames || []);
        setMachineUtilData(response.data.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch machine utilization analytics:', err);
    }
  }, [machineUtilStartDate, machineUtilEndDate]);

  React.useEffect(() => {
    fetchMachineUtilization();
  }, [fetchMachineUtilization]);

  // Fetch real data if available from the backend API
  const fetchTelemetry = React.useCallback(async () => {
    try {
      let url = `/Analytics/dashboard-pulse?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        if (!customStartDate || !customEndDate) return;
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      const response = await apiClient.get(url);
      if (response.data) {
        setTelemetry(prev => ({
          ...prev,
          ...response.data
        }));
      }
    } catch (error) {
      console.warn('Backend pulse endpoint not fully configured yet. Rendering ultra-fidelity UI design using static telemetry parameters.', error);
    }
  }, [timeframe, customStartDate, customEndDate]);

  const fetchClosings = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (closingsStartDate) params.append('startDate', closingsStartDate);
      if (closingsEndDate) params.append('endDate', closingsEndDate);

      const response = await apiClient.get(`/Analytics/register-closings?${params.toString()}`);
      if (response.data) {
        setClosingsData(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch closings data', error);
    }
  }, [closingsStartDate, closingsEndDate]);

  const handleRowClick = React.useCallback((sessionId: number) => {
    setSelectedSessionId(sessionId);
    setTransactionModalOpen(true);
  }, []);

  React.useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  React.useEffect(() => {
    if (activeTab === 'financial') {
      fetchClosings();
    }
  }, [activeTab, fetchClosings]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: TabType) => {
    setActiveTab(newValue);
  };

  const handleTimeframeChange = (event: SelectChangeEvent<TimeframeType>) => {
    setTimeframe(event.target.value as TimeframeType);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const todayStr = React.useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const funnelTotals = React.useMemo(() => {
    const funnel = telemetry.daily.funnel || [];
    return funnel.reduce(
      (acc, row) => {
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
      },
      {
        total: 0,
        scheduled: 0,
        delayed: 0,
        waiting: 0,
        inProgress: 0,
        done: 0,
        canceled: 0,
        absent: 0,
        rescheduled: 0
      }
    );
  }, [telemetry.daily.funnel]);

  const closingsTotals = React.useMemo(() => {
    return closingsData.reduce(
      (acc, c) => {
        acc.initialCash += c.initialFunds?.cash || 0;
        acc.initialCard += c.initialFunds?.card || 0;
        acc.initialTransfer += c.initialFunds?.transfer || 0;
        acc.paymentsTransactions += c.payments?.transactions || 0;
        acc.paymentsCash += c.payments?.cash || 0;
        acc.paymentsCard += c.payments?.card || 0;
        acc.paymentsTransfer += c.payments?.transfer || 0;
        acc.paymentsTotal += c.payments?.total || 0;
        acc.withdrawalsCash += c.withdrawals?.cash || 0;
        acc.withdrawalsDebit += c.withdrawals?.debit || 0;
        acc.withdrawalsTransfer += c.withdrawals?.transfer || 0;
        acc.endCash += c.endFunds?.cash || 0;
        return acc;
      },
      {
        initialCash: 0,
        initialCard: 0,
        initialTransfer: 0,
        paymentsTransactions: 0,
        paymentsCash: 0,
        paymentsCard: 0,
        paymentsTransfer: 0,
        paymentsTotal: 0,
        withdrawalsCash: 0,
        withdrawalsDebit: 0,
        withdrawalsTransfer: 0,
        endCash: 0
      }
    );
  }, [closingsData]);

  const machineUtilTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    machineUtilNames.forEach((name) => {
      totals[name] = 0;
    });
    machineUtilData.forEach((row) => {
      machineUtilNames.forEach((name) => {
        totals[name] += row[name] || 0;
      });
    });
    return totals;
  }, [machineUtilData, machineUtilNames]);

  // Settle Balance action handler (interactive UX feedback)
  const handleSettleBalance = (patientName: string, amount: number) => {
    alert(`Initiating terminal settlement for ${patientName} of amount ${formatCurrency(amount)}...`);
  };

  // ---------------------------------------------------------
  // APEX CHARTS OPTIONS DEFINITIONS (TAB 3)
  // ---------------------------------------------------------
  const currentReportsData = activeTab === 'reports' ? ((telemetry.reports as any)[timeframe] || telemetry.reports.week) : null;

  const roiChartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: true, formatter: (val) => `${val}%`, style: { colors: ['#fff'] } },
    xaxis: {
      categories: currentReportsData?.roi.map((r: any) => r.machine) || [],
      labels: { formatter: (val) => `${val}%` },
      max: 100
    },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    theme: { mode: 'light' }
  };

  const roiChartSeries = [{
    name: 'Utilization',
    data: currentReportsData?.roi.map((r: any) => r.value) || []
  }];

  const peakChartOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 3 },
    colors: [theme.palette.info.main],
    markers: { size: 4 },
    xaxis: { categories: currentReportsData?.peakHours.map((p: any) => p.hour) || [] },
    yaxis: { title: { text: 'Patient Check-ins' } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    fill: {
      type: 'gradient',
      gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.5, opacityFrom: 0.3, opacityTo: 0.1 }
    }
  };

  const peakChartSeries = [{
    name: 'Patients',
    data: currentReportsData?.peakHours.map((p: any) => p.volume) || []
  }];

  const paymentChartOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: currentReportsData?.payments.map((p: any) => p.method) || [],
    colors: [theme.palette.success.main, theme.palette.info.main, theme.palette.primary.main],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Share' } } } } },
    dataLabels: { enabled: false }
  };

  const paymentChartSeries = currentReportsData?.payments.map((p: any) => p.value) || [];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      {/* ---------------------------------------------------------
          TOP CLINIC STATUS HEADER
         --------------------------------------------------------- */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: { xs: 3, md: 4 },
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Operational Dashboard
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Calendar size={18} color="#64748b" />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {todayStr}
            </Typography>
          </Stack>
        </Stack>

        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ 
            width: { xs: '100%', md: 'auto' }, 
            alignItems: 'center', 
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            flexWrap: 'wrap',
            gap: 1.5
          }}
        >
          {/* Clinic status switch indicator */}
          <Chip
            avatar={
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: clinicOpen ? '#10b981' : '#ef4444',
                  boxShadow: clinicOpen ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                  animation: 'pulse 2s infinite'
                }}
              />
            }
            label={clinicOpen ? 'Clinic Open' : 'Clinic Closed'}
            variant="outlined"
            onClick={() => setClinicOpen(!clinicOpen)}
            sx={{
              fontWeight: 600,
              cursor: 'pointer',
              bgcolor: clinicOpen ? '#f0fdf4' : '#fef2f2',
              borderColor: clinicOpen ? '#bbf7d0' : '#fecaca',
              color: clinicOpen ? '#15803d' : '#b91c1c',
              '&:hover': { bgcolor: clinicOpen ? '#dcfce7' : '#fee2e2' }
            }}
          />

          {/* Timeframe selector strictly for Reports tab */}
          {activeTab === 'reports' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-select-label"
                value={timeframe}
                label="Timeframe"
                onChange={handleTimeframeChange}
                sx={{ bgcolor: '#fff', borderRadius: '8px' }}
              >
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Professional Admin Avatar Profile Dropdown */}
          <Stack 
            direction="row" 
            spacing={1.5} 
            sx={{ 
              alignItems: 'center', 
              pl: { xs: 0, sm: 1.5 }, 
              borderLeft: { xs: 'none', sm: '1px solid #cbd5e1' }
            }}
          >
            <Avatar
              sx={{
                bgcolor: theme.palette.primary.main,
                width: 38,
                height: 38,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
            >
              AD
            </Avatar>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Typography variant="subtitle2" fontWeight={600} color="#0f172a">
                Admin Director
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Systems Overlord
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* ---------------------------------------------------------
          MAIN TELEMETRY TABS SWITCHER
         --------------------------------------------------------- */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons={isMobile ? "auto" : undefined}
        allowScrollButtonsMobile
        sx={{
          mb: 4,
          p: 0.5,
          bgcolor: '#e2e8f0',
          borderRadius: '12px',
          minHeight: 'auto',
          '& .MuiTabs-indicator': {
            bgcolor: '#fff',
            borderRadius: '10px',
            height: '100%',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
          },
          '& .MuiTab-root': {
            minHeight: 'auto',
            py: 1.5,
            px: { xs: 2, sm: 3 },
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#64748b',
            borderRadius: '10px',
            zIndex: 1,
            textTransform: 'none',
            transition: 'color 0.2s',
            whiteSpace: 'nowrap',
            '&.Mui-selected': { color: '#0f172a' }
          }
        }}
      >
        <Tab value="daily" label="Appointments Analysis" />
        <Tab value="financial" label="Financial Ledger" />
        <Tab value="reports" label="Utilization Reports" />
      </Tabs>

      {/* ---------------------------------------------------------
          TAB 1: DAILY PULSE (REAL-TIME OPERATIONS)
         --------------------------------------------------------- */}
      {activeTab === 'daily' && (
        <Stack spacing={4}>
          {/* Top Row: Patient Flow KPIs */}
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="h5" fontWeight={700} color="#0f172a">
                  Appointments Status
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'stretch', width: { xs: '100%', sm: 'auto' } }}>
                {timeframe === 'custom' && (
                  <Stack direction="row" spacing={1} sx={{ bgcolor: '#f8fafc', p: 0.5, borderRadius: 2, border: '1px solid #e2e8f0', width: '100%' }}>
                    <TextField
                      type="date"
                      size="small"
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                    />
                    <TextField
                      type="date"
                      size="small"
                      label="End Date"
                      InputLabelProps={{ shrink: true }}
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                    />
                  </Stack>
                )}
                <FormControl size="small" sx={{ minWidth: 140, width: { xs: '100%', sm: 'auto' } }}>
                  <InputLabel id="daily-timeframe-label">Timeframe</InputLabel>
                  <Select
                    labelId="daily-timeframe-label"
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
              </Stack>
            </Stack>

            {isMobile ? (
              <Stack spacing={2}>
                {telemetry.daily.funnel.map((row: any, idx: number) => (
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
                {telemetry.daily.funnel.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    No appointments found for the selected timeframe.
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    startIcon={<DownloadSimple />}
                    onClick={() => generateAppointmentsReport(telemetry.daily.funnel, timeframe)}
                    sx={{ fontWeight: 700, py: 1.2, borderRadius: '8px', mt: 1 }}
                  >
                    Export Report
                  </Button>
                )}
              </Stack>
            ) : (
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <TableContainer>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 700, py: 2 }}>Date</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, py: 2 }}>Total</TableCell>
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
                      {telemetry.daily.funnel.map((row: any, idx: number) => (
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
                      {telemetry.daily.funnel.length > 0 && (
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
                      {telemetry.daily.funnel.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            No appointments found for the selected timeframe.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', bgcolor: '#f8fafc' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    startIcon={<DownloadSimple />}
                    onClick={() => generateAppointmentsReport(telemetry.daily.funnel, timeframe)}
                    sx={{ fontWeight: 700 }}
                  >
                    Export Report
                  </Button>
                </Box>
              </Card>
            )}
          </Box>

          {/* Middle Row: Technology Status Grid */}
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
              <Monitor size={24} color="#6366f1" />
              <Typography variant="h5" fontWeight={700} color="#0f172a">
                Technology Status
              </Typography>
            </Stack>
            <Grid container spacing={3}>
              {telemetry.daily.machines.map((machine) => {
                const available = machine.status === 'Available';
                const maintenance = machine.status === 'Maintenance';
                const inUse = machine.status === 'In Use';

                return (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={machine.id}>
                    <Card
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid',
                        borderColor: available ? '#bbf7d0' : inUse ? '#fde68a' : '#fecaca',
                        bgcolor: available ? '#f8fafc' : inUse ? '#fffdf5' : '#fffafb',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: machine.color }} />
                              <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                                {machine.name}
                              </Typography>
                            </Stack>
                            <Chip
                              label={machine.status}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                bgcolor: available ? '#d1fae5' : inUse ? '#fef3c7' : '#fee2e2',
                                color: available ? '#065f46' : inUse ? '#92400e' : '#991b1b'
                              }}
                            />
                          </Stack>

                          <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            Machine ID: <span style={{ fontFamily: 'monospace' }}>{machine.alias}</span>
                          </Typography>

                          <Divider sx={{ borderStyle: 'dashed' }} />

                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {inUse ? (
                              <>
                                <User size={18} color="#d97706" />
                                <Typography variant="body2" fontWeight={600} color="#78350f">
                                  Operator: {machine.staff}
                                </Typography>
                              </>
                            ) : maintenance ? (
                              <>
                                <Wrench size={18} color="#dc2626" />
                                <Typography variant="body2" fontWeight={600} color="#991b1b">
                                  Undergoing EOD Diagnostics
                                </Typography>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} color="#16a34a" />
                                <Typography variant="body2" fontWeight={600} color="#166534">
                                  Idle — Ready for Patient
                                </Typography>
                              </>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Bottom Section: Active Staff Load Table */}
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Users size={22} color="#06b6d4" />
                  <Typography variant="h5" fontWeight={700}>
                    Active Staff Load
                  </Typography>
                </Stack>
              }
              subheader="Real-time shift log and productivity metric trackers"
              sx={{ p: 3, pb: 0 }}
            />
            <CardContent sx={{ p: 3 }}>
              {isMobile ? (
                <Stack spacing={2}>
                  {telemetry.daily.staffLoad.map((staff) => (
                    <Card key={staff.id} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                bgcolor: theme.palette.primary.main,
                                width: 36,
                                height: 36,
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)'
                              }}
                            >
                              {staff.name.split(' ').map((n: string) => n[0]).join('')}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.85rem' }}>
                                {staff.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {staff.role}
                              </Typography>
                            </Box>
                          </Stack>
                          
                          <Stack spacing={1} alignItems="flex-end">
                            <Chip
                              label={staff.assignedPatient ? 'Occupied' : 'Available'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                bgcolor: staff.assignedPatient ? '#eff6ff' : '#ecfdf5',
                                color: staff.assignedPatient ? '#2563eb' : '#059669',
                                height: 20
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Done: <strong style={{ color: '#0f172a' }}>{staff.doneToday}</strong>
                            </Typography>
                          </Stack>
                        </Stack>
                        
                        {staff.assignedPatient && (
                          <Box sx={{ mt: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>Current Patient</Typography>
                            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.8rem' }}>{staff.assignedPatient}</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Specialty</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Current Patient</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Patients Done Today</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {telemetry.daily.staffLoad.map((staff) => (
                        <TableRow
                          key={staff.id}
                          sx={{
                            transition: 'background-color 0.2s',
                            '&:hover': { bgcolor: '#f1f5f9', cursor: 'pointer' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{staff.name}</TableCell>
                          <TableCell>{staff.role}</TableCell>
                          <TableCell>
                            {staff.assignedPatient ? (
                              <Chip label={staff.assignedPatient} size="small" variant="outlined" color="primary" sx={{ fontWeight: 600 }} />
                            ) : (
                              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                None
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={staff.assignedPatient ? 'Occupied' : 'Available'}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                bgcolor: staff.assignedPatient ? '#eff6ff' : '#ecfdf5',
                                color: staff.assignedPatient ? '#2563eb' : '#059669'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, pr: 4 }}>
                            {staff.doneToday}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ---------------------------------------------------------
          TAB 2: FINANCIAL LEDGER (EOD & CASHFLOW)
         --------------------------------------------------------- */}
      {activeTab === 'financial' && (
        <Stack spacing={4}>
          {/* Top Row: Cash Drawer Terminal Status */}
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <CashRegister size={24} color="#10b981" />
                <Typography variant="h5" fontWeight={700} color="#0f172a">
                  Cash Terminal Status
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'stretch', width: { xs: '100%', sm: 'auto' } }}>
                {timeframe === 'custom' && (
                  <Stack direction="row" spacing={1} sx={{ bgcolor: '#f8fafc', p: 0.5, borderRadius: 2, border: '1px solid #e2e8f0', width: '100%' }}>
                    <TextField type="date" size="small" label="Start Date" InputLabelProps={{ shrink: true }} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }} />
                    <TextField type="date" size="small" label="End Date" InputLabelProps={{ shrink: true }} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }} />
                  </Stack>
                )}
                <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', sm: 'auto' } }}>
                  <InputLabel>Timeframe</InputLabel>
                  <Select value={timeframe} label="Timeframe" onChange={handleTimeframeChange} sx={{ bgcolor: '#fff' }}>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
            {telemetry.financial.terminal.totalTransactions === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Typography color="text.secondary" variant="subtitle1" fontWeight={500}>
                  There are no transactions today.
                </Typography>
              </Box>
            ) : (
              <>
                <Grid container spacing={isMobile ? 1.5 : 1}>
                  {[
                    { title: 'Total Transactions', value: telemetry.financial.terminal.totalTransactions, icon: Receipt, color: '#0ea5e9', bg: '#e0f2fe' },
                    { title: 'Cash Revenue', value: formatCurrency(telemetry.financial.terminal.cashRevenue), icon: Money, color: '#10b981', bg: '#d1fae5' },
                    { title: 'Credit Revenue', value: formatCurrency(telemetry.financial.terminal.creditRevenue), icon: CreditCard, color: '#3b82f6', bg: '#dbeafe' },
                    { title: 'Debit Revenue', value: formatCurrency(telemetry.financial.terminal.debitRevenue), icon: Bank, color: '#f59e0b', bg: '#fef3c7' },
                    { title: 'Discounts', value: formatCurrency(telemetry.financial.terminal.discounts), icon: Money, color: '#ef4444', bg: '#fee2e2' },
                    { title: 'Net Revenue', value: formatCurrency(telemetry.financial.terminal.netRevenue), icon: ChartLineUp, color: '#64748b', bg: '#f1f5f9' },
                  ].map((kpi, idx) => (
                    <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={idx}>
                      <Card sx={{
                        borderRadius: 3,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%'
                      }}>
                        <CardContent sx={{ p: { xs: '16px !important', sm: '24px !important' } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                            <Box>
                              <Typography variant="overline" color="text.secondary" fontWeight={700} lineHeight={1.2} display="block" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                {kpi.title}
                              </Typography>
                              <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                                {kpi.value}
                              </Typography>
                            </Box>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: kpi.bg, color: kpi.color, display: { xs: 'none', sm: 'flex' } }}>
                              <kpi.icon weight="duotone" size={24} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Middle Row: Revenue vs Liabilities contrasting cards */}
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {/* Card A: Earned Revenue */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid #bbf7d0',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.03)'
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                        <Stack spacing={{ xs: 2, sm: 3 }}>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <TrendUp size={24} color="#10b981" />
                              <Typography variant="h6" fontWeight={700} color="#166534" sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                Earned Revenue (Revenue - Debt)
                              </Typography>
                            </Stack>
                          </Stack>

                          <Typography variant="h3" fontWeight={900} color="#15803d" sx={{ fontSize: { xs: '1.8rem', sm: '3rem' } }}>
                            {formatCurrency(telemetry.financial.terminal.totalEarnings)}
                          </Typography>

                          <Typography variant="body2" color="#166534" fontWeight={500}>
                            Sum of income minus daily debt.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Card B: Unapplied Credits / Prepayments (Styled as liability/held fund) */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid #fde68a',
                        background: 'linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.03)'
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                        <Stack spacing={{ xs: 2, sm: 3 }}>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <HandCoins size={24} color="#f59e0b" />
                              <Typography variant="h6" fontWeight={700} color="#92400e" sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                Total Remaining Debt
                              </Typography>
                            </Stack>
                          </Stack>

                          <Typography variant="h3" fontWeight={900} color="#b45309" sx={{ fontSize: { xs: '1.8rem', sm: '3rem' } }}>
                            {formatCurrency(telemetry.financial.terminal.debtGenerated)}
                          </Typography>

                          <Typography variant="body2" color="#92400e" fontWeight={500}>
                            It reflects the daily sum of patient debt.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
          {/* Timeseries Area Chart */}
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <ChartLineUp size={22} color="#64748b" />
                  <Typography variant="h5" fontWeight={700}>
                    Financial Performance
                  </Typography>
                </Stack>
              }
              subheader="Tracking earned revenue, debt, and net revenue"
              sx={{ p: 3, pb: 0 }}
            />
            <CardContent sx={{ p: 3 }}>
              {telemetry.financial.terminal.chartData && telemetry.financial.terminal.chartData.length > 0 ? (
                <Chart
                  height={isMobile ? 260 : 350}
                  options={{
                    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
                    colors: ['#10b981', '#f59e0b', '#64748b'],
                    dataLabels: { enabled: false },
                    stroke: { curve: 'smooth', width: 3 },
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
                    xaxis: {
                      categories: telemetry.financial.terminal.chartData.map((d: any) => d.time),
                      tooltip: { enabled: false },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      labels: { style: { colors: '#64748b' } }
                    },
                    yaxis: {
                      labels: {
                        formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val),
                        style: { colors: '#64748b' }
                      }
                    },
                    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
                    legend: { position: 'top', horizontalAlign: 'right' },
                    tooltip: {
                      y: { formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val) }
                    }
                  }}
                  series={[
                    { name: 'Earned Revenue', data: telemetry.financial.terminal.chartData.map((d: any) => d.earned) },
                    { name: 'Total Remaining Debt', data: telemetry.financial.terminal.chartData.map((d: any) => d.debt) },
                    { name: 'Net Revenue', data: telemetry.financial.terminal.chartData.map((d: any) => d.net) }
                  ]}
                  type="area"
                />
              ) : (
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                  <Typography color="text.secondary" variant="subtitle1" fontWeight={500}>
                    No data available for the selected timeframe.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Bottom Section: Cash Register Closings */}
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <CashRegister size={22} color="#10b981" />
                  <Typography variant="h5" fontWeight={700}>
                    Cash Register Closings
                  </Typography>
                </Stack>
              }
              subheader="Filter and review EOD terminal settlements"
              sx={{ p: 3, pb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}
              action={
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: { xs: 0, md: 1 }, pr: { xs: 0, md: 1 }, width: '100%' }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    size="small"
                    value={closingsStartDate}
                    onChange={(e) => setClosingsStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    size="small"
                    value={closingsEndDate}
                    onChange={(e) => setClosingsEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                  />
                </Stack>
              }
            />
            <CardContent sx={{ p: 3, pt: 0 }}>
              {isMobile ? (
                <Stack spacing={2}>
                  {closingsData.map((c) => (
                    <MobileClosingCard
                      key={c.id}
                      c={c}
                      formatCurrency={formatCurrency}
                      onRowClick={() => handleRowClick(c.id)}
                    />
                  ))}
                  {closingsData.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                      No register closings found for this date range.
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      startIcon={<DownloadSimple />}
                      onClick={() => generateClosingsReport(closingsData, closingsStartDate, closingsEndDate)}
                      sx={{ fontWeight: 700, py: 1.2, borderRadius: '8px', mt: 1 }}
                    >
                      Export Report
                    </Button>
                  )}
                </Stack>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>General Data</TableCell>
                        <TableCell colSpan={3} align="center" sx={{ fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Initial Funds</TableCell>
                        <TableCell colSpan={5} align="center" sx={{ fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Payments</TableCell>
                        <TableCell colSpan={3} align="center" sx={{ fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Withdrawals</TableCell>
                        <TableCell colSpan={1} align="center" sx={{ fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>End Funds</TableCell>
                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Person in charge</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Cash</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Card</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>Transfer</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Transactions</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Cash</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Card</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Transfer</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Cash</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Debit</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>Transfer</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>Cash</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>User name</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>Comments</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {closingsData.map((c) => (
                        <TableRow
                          key={c.id}
                          onClick={() => handleRowClick(c.id)}
                          sx={{ transition: 'background-color 0.2s', '&:hover': { bgcolor: '#f1f5f9', cursor: 'pointer' } }}
                        >
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a' }}>{c.id}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>{c.date}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#10b981' }}>{formatCurrency(c.initialFunds.cash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#10b981' }}>{formatCurrency(c.initialFunds.card)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#10b981', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(c.initialFunds.transfer)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a' }}>{c.payments.transactions}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a' }}>{formatCurrency(c.payments.cash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a' }}>{formatCurrency(c.payments.card)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a' }}>{formatCurrency(c.payments.transfer)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>{formatCurrency(c.payments.total)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#ef4444' }}>{formatCurrency(c.withdrawals.cash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#ef4444' }}>{formatCurrency(c.withdrawals.debit)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#ef4444', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(c.withdrawals.transfer)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#6366f1', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(c.endFunds.cash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#0f172a' }}>{c.userName}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{c.comments}</TableCell>
                        </TableRow>
                      ))}
                      {closingsData.length > 0 && (
                        <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #cbd5e1', '&:hover': { bgcolor: '#f1f5f9' } }}>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Total</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', borderRight: '1px solid #e2e8f0' }} />
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(closingsTotals.initialCash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(closingsTotals.initialCard)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(closingsTotals.initialTransfer)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{closingsTotals.paymentsTransactions}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(closingsTotals.paymentsCash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(closingsTotals.paymentsCard)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(closingsTotals.paymentsTransfer)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(closingsTotals.paymentsTotal)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(closingsTotals.withdrawalsCash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(closingsTotals.withdrawalsDebit)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(closingsTotals.withdrawalsTransfer)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(closingsTotals.endCash)}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }} />
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }} />
                        </TableRow>
                      )}
                      {closingsData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={16} align="center" sx={{ py: 4, color: '#64748b' }}>
                            No register closings found for this date range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
            {!isMobile && (
              <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', bgcolor: '#f8fafc' }}>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<DownloadSimple />}
                  onClick={() => generateClosingsReport(closingsData, closingsStartDate, closingsEndDate)}
                  sx={{ fontWeight: 700 }}
                >
                  Export Report
                </Button>
              </Box>
            )}
          </Card>
        </Stack>
      )}

      {/* ---------------------------------------------------------
          TAB 3: UTILIZATION REPORTS (WEEKLY & MONTHLY TRENDS)
         --------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <Stack spacing={4}>
          {/* Top Section: Machine ROI */}
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardHeader
              title={
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <ChartBar size={22} color="#6366f1" />
                  <Typography variant="h5" fontWeight={700}>
                    Machine Utilization ROI
                  </Typography>
                </Stack>
              }
              subheader={`Aggregate percentage usage against clinic runtime timeframe (${timeframe === 'week' ? 'This Week' : 'This Month'})`}
              sx={{ p: 3, pb: 0 }}
            />
            <CardContent sx={{ p: 3 }}>
              <Chart
                height={isMobile ? 280 : 350}
                options={roiChartOptions}
                series={roiChartSeries}
                type="bar"
                width="100%"
              />
            </CardContent>
          </Card>

          {/* Bottom Row split charts */}
          <Grid container spacing={3}>
            {/* Bottom Left: Peak hours line chart */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <ChartLine size={22} color="#06b6d4" />
                      <Typography variant="h5" fontWeight={700}>
                        Patient Peak Hours
                      </Typography>
                    </Stack>
                  }
                  subheader="Aggregate check-in flow mapped by hour intervals"
                  sx={{ p: 3, pb: 0 }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Chart
                    height={isMobile ? 250 : 300}
                    options={peakChartOptions}
                    series={peakChartSeries}
                    type="line"
                    width="100%"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Bottom Right: Payment method breakdown donut */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <ChartDonut size={22} color="#2910b9f" />
                      <Typography variant="h5" fontWeight={700}>
                        Payment Trend Splits
                      </Typography>
                    </Stack>
                  }
                  subheader="Historical transaction channel distribution"
                  sx={{ p: 3, pb: 0 }}
                />
                <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ width: '100%', maxWidth: 360 }}>
                    <Chart
                      height={isMobile ? 280 : 320}
                      options={paymentChartOptions}
                      series={paymentChartSeries}
                      type="donut"
                      width="100%"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Machine Utilization Table */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Wrench size={22} color="#8b5cf6" />
                      <Typography variant="h5" fontWeight={700}>
                        Machine Utilization
                      </Typography>
                    </Stack>
                  }
                  subheader="Compare the amount of services performed with each machine per day."
                  action={
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: { xs: 0, sm: 2 }, width: '100%' }}>
                      <TextField
                        type="date"
                        label="Start Date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={machineUtilStartDate}
                        onChange={(e) => setMachineUtilStartDate(e.target.value)}
                        sx={{ width: { xs: '100%', sm: 160 } }}
                      />
                      <TextField
                        type="date"
                        label="End Date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={machineUtilEndDate}
                        onChange={(e) => setMachineUtilEndDate(e.target.value)}
                        sx={{ width: { xs: '100%', sm: 160 } }}
                      />
                    </Stack>
                  }
                  sx={{ p: 3, pb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}
                />
                {isMobile ? (
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {machineUtilData.map((row: any, rIdx: number) => (
                        <Card key={rIdx} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack spacing={1.5}>
                              <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                                {row.date}
                              </Typography>
                              <Divider sx={{ borderStyle: 'dashed' }} />
                              <Grid container spacing={1}>
                                {machineUtilNames.map((name, cIdx) => (
                                  <Grid size={{ xs: 6 }} key={cIdx}>
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.75rem', maxWidth: '75%' }}>
                                        {name}
                                      </Typography>
                                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }} color={row[name] > 0 ? '#10b981' : 'text.disabled'}>
                                        {row[name] || 0}
                                      </Typography>
                                    </Stack>
                                  </Grid>
                                ))}
                              </Grid>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                      {machineUtilData.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                          No utilization data found for this timeframe.
                        </Box>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          startIcon={<DownloadSimple />}
                          onClick={() => {
                            generateMachineUtilizationReport(machineUtilData, machineUtilNames, machineUtilStartDate, machineUtilEndDate);
                          }}
                          disabled={machineUtilData.length === 0}
                          sx={{ fontWeight: 700, py: 1.2, borderRadius: '8px', mt: 1 }}
                        >
                          Export Report
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                ) : (
                  <>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell sx={{ fontWeight: 700, py: 2 }}>Date</TableCell>
                            {machineUtilNames.map((name, idx) => (
                              <TableCell key={idx} align="center" sx={{ fontWeight: 700 }}>{name}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {machineUtilData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={machineUtilNames.length + 1} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No utilization data found for this timeframe.
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {machineUtilData.map((row: any, rIdx: number) => (
                                <TableRow key={rIdx} hover>
                                  <TableCell sx={{ fontWeight: 600 }}>{row.date}</TableCell>
                                  {machineUtilNames.map((name, cIdx) => (
                                    <TableCell key={cIdx} align="center" sx={{ color: row[name] > 0 ? '#10b981' : 'text.disabled', fontWeight: row[name] > 0 ? 700 : 400 }}>
                                      {row[name] || 0}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                              <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #cbd5e1', '&:hover': { bgcolor: '#f1f5f9' } }}>
                                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                {machineUtilNames.map((name, cIdx) => (
                                  <TableCell key={cIdx} align="center" sx={{ color: machineUtilTotals[name] > 0 ? '#10b981' : 'text.disabled', fontWeight: 700 }}>
                                    {machineUtilTotals[name] || 0}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={<DownloadSimple />}
                        onClick={() => {
                          generateMachineUtilizationReport(machineUtilData, machineUtilNames, machineUtilStartDate, machineUtilEndDate);
                        }}
                        disabled={machineUtilData.length === 0}
                        sx={{ fontWeight: 700 }}
                      >
                        Export Report
                      </Button>
                    </Box>
                  </>
                )}
              </Card>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* ---------------------------------------------------------
          TRANSACTION DETAILS MODAL
         --------------------------------------------------------- */}
      <DailyHistoryDialog
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        sessionId={selectedSessionId}
      />

      {/* ---------------------------------------------------------
          RECEIPT MODAL
         --------------------------------------------------------- */}
      <Dialog
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#f1f5f9', borderRadius: '4px' } }}
      >
        {/* Header */}
        <DialogTitle className="no-print" sx={{ m: 0, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0f4c75', color: '#fff' }}>
          <Typography variant="subtitle1" component="span" fontWeight={600}>
            Recibo
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => window.print()} sx={{ color: '#fff', p: 0.5 }}>
              <Printer size={20} />
            </IconButton>
            <IconButton onClick={() => setReceiptModalOpen(false)} sx={{ color: '#fff', p: 0.5 }}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent id="receipt-print-area" sx={{ p: 4 }}>
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden;
                }
                .no-print {
                  display: none !important;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible;
                }
                #receipt-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
              }
            `}
          </style>
          {currentReceiptData && (
            <Box sx={{ bgcolor: '#f1f5f9' }}>
              {/* Logo Area */}
              <Stack alignItems="center" sx={{ mb: 4 }}>
                <Logo color="dark" height={60} width={200} />
              </Stack>

              {/* Patient and Folio Details */}
              <Box sx={{ mb: 2 }}>
                <Typography align="right" sx={{ fontSize: '1.1rem', color: '#334155', mb: 0.5 }}>
                  Folio: {currentReceiptData.folio}
                </Typography>
                <Typography sx={{ fontSize: '1.1rem', color: '#334155', mb: 0.5 }}>
                  Fecha: {currentReceiptData.date}
                </Typography>
                <Typography sx={{ fontSize: '1.1rem', color: '#334155', mb: 0.5 }}>
                  No. Paciente: {currentReceiptData.patientId}
                </Typography>
                <Typography sx={{ fontSize: '1.1rem', color: '#334155' }}>
                  Nombre: {currentReceiptData.patientName}
                </Typography>
              </Box>

              {/* Items Table */}
              <Box sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', mb: 4 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '10%', borderRight: '1px solid #e2e8f0', p: 1 }}>Cant</TableCell>
                      <TableCell sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', p: 1 }}>Servicio</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', p: 1 }}>Costo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, p: 1 }}>Importe</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentReceiptData.items && currentReceiptData.items.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell align="center" sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 600, borderRight: '1px solid #e2e8f0', p: 1 }}>
                          {item.quantity}
                        </TableCell>
                        <TableCell sx={{ borderRight: '1px solid #e2e8f0', p: 1, fontSize: '0.85rem' }}>
                          {item.service}
                        </TableCell>
                        <TableCell align="right" sx={{ borderRight: '1px solid #e2e8f0', p: 1 }}>
                          {formatCurrency(item.cost)}
                        </TableCell>
                        <TableCell align="right" sx={{ p: 1 }}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Footer Summary */}
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <Box sx={{ width: '50%' }}>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontSize: '0.95rem', color: '#334155' }}>
                      Cant: {currentReceiptData.items?.length || 0}
                    </Typography>
                    <Typography sx={{ fontSize: '0.95rem', color: '#334155' }}>
                      Fecha: {currentReceiptData.date}
                    </Typography>
                    <Typography sx={{ fontSize: '0.95rem', color: '#334155' }}>
                      Recibido: {formatCurrency(currentReceiptData.paid)} {currentReceiptData.paymentMethod}
                    </Typography>
                    <Typography sx={{ fontSize: '0.95rem', color: '#334155' }}>
                      Pagado: {formatCurrency(currentReceiptData.paid)} M.N.
                    </Typography>
                    <Typography sx={{ fontSize: '0.95rem', color: '#334155' }}>
                      Cambio: {formatCurrency(currentReceiptData.change)} M.N.
                    </Typography>
                  </Stack>
                </Box>

                <Box sx={{ width: '50%' }}>
                  <Stack spacing={1} sx={{ maxWidth: 220, ml: 'auto' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ color: '#475569', fontSize: '0.95rem' }}>Sub</Typography>
                      <Box sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', px: 1, py: 0.25, width: 120, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.95rem' }}>{formatCurrency(currentReceiptData.subtotal)}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ color: '#475569', fontSize: '0.95rem' }}>Descuento</Typography>
                      <Box sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', px: 1, py: 0.25, width: 120, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.95rem' }}>{formatCurrency(currentReceiptData.discount)}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ color: '#475569', fontSize: '0.95rem' }}>Total</Typography>
                      <Box sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', px: 1, py: 0.25, width: 120, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.95rem' }}>{formatCurrency(currentReceiptData.total)}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ color: '#475569', fontSize: '0.95rem' }}>Pago</Typography>
                      <Box sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', px: 1, py: 0.25, width: 120, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.95rem' }}>({formatCurrency(currentReceiptData.paid)})</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ color: '#475569', fontSize: '0.95rem' }}>Saldo</Typography>
                      <Box sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', px: 1, py: 0.25, width: 120, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.95rem' }}>{formatCurrency((currentReceiptData.total - currentReceiptData.paid) > 0 ? (currentReceiptData.total - currentReceiptData.paid) : 0)}</Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* APPOINTMENTS DAILY DIALOG */}
      <AppointmentsDailyDialog
        open={appointmentsDialogOpen}
        onClose={() => setAppointmentsDialogOpen(false)}
        date={selectedAppointmentsDate}
        rawDate={selectedAppointmentsRawDate}
      />

    </Box>
  );
}
