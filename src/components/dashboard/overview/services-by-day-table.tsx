'use client';

import * as React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Typography,
  Stack,
  SelectChangeEvent,
  useTheme
} from '@mui/material';
import { Chart } from '@/components/core/chart';
import type { ApexOptions } from 'apexcharts';
import apiClient from '@/lib/api-client';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface ServiceInfo {
  id: number;
  name: string;
}

interface DayData {
  day: number;
  date: string;
  dayOfWeek: string;
  serviceCounts: Record<string, number>;
  total: number;
}

interface DashboardResponse {
  availableServices: ServiceInfo[];
  days: DayData[];
  serviceTotals: Record<string, number>;
  grandTotal: number;
}

export function ServicesByDayTable(): React.JSX.Element {
  const theme = useTheme();
  
  const [month, setMonth] = React.useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = React.useState<number>(currentYear);
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  
  const [data, setData] = React.useState<DashboardResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        const response = await apiClient.get(`/Analytics/services-by-day?month=${month}&year=${year}`);
        if (!mounted) return;
        
        const resData = response.data as DashboardResponse;
        setData(resData);
        
        // If it's the first load or available services changed and we have none selected, select all by default
        if (selectedServices.length === 0 && resData.availableServices.length > 0) {
          setSelectedServices(resData.availableServices.map(s => s.id.toString()));
        } else {
            // Keep existing selections that are still available, or don't worry about it since it's just IDs
        }

        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        console.error("Failed to load services by day data", err);
        setError("Failed to load data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => { mounted = false; };
  }, [month, year]); // Only refetch when month or year changes, not selectedServices

  const handleServiceChange = (event: SelectChangeEvent<typeof selectedServices>) => {
    const {
      target: { value },
    } = event;
    setSelectedServices(
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  const getDayNameEs = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return days[date.getUTCDay()];
  };

  if (loading && !data) {
    return <Box p={3}><Typography>Loading...</Typography></Box>;
  }

  if (error) {
    return <Box p={3}><Typography color="error">{error}</Typography></Box>;
  }

  if (!data) {
      return <></>;
  }

  const visibleServices = data.availableServices.filter(s => selectedServices.includes(s.id.toString()));
  
  // Compute totals for visible columns
  let grandTotalVisible = 0;
  const visibleServiceTotals: Record<string, number> = {};
  visibleServices.forEach(vs => {
      visibleServiceTotals[vs.id.toString()] = data.serviceTotals[vs.id.toString()] || 0;
      grandTotalVisible += visibleServiceTotals[vs.id.toString()];
  });

  // Pie chart config
  const chartSeries = visibleServices.map(vs => visibleServiceTotals[vs.id.toString()]);
  const chartLabels = visibleServices.map(vs => vs.name);
  
  const chartOptions: ApexOptions = {
    chart: { background: 'transparent' },
    colors: [
      theme.palette.primary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main,
      '#8e24aa', '#3949ab', '#039be5', '#00897b', '#43a047'
    ],
    dataLabels: { enabled: true, formatter: (val) => `${Number(val).toFixed(1)}%` },
    labels: chartLabels,
    legend: { show: true, position: 'bottom' },
    plotOptions: { pie: { expandOnClick: false } },
    stroke: { width: 0 },
    theme: { mode: theme.palette.mode },
    tooltip: {
        y: {
            formatter: (value) => {
                return `${value} sessions`;
            }
        }
    }
  };

  return (
    <Card>
      <CardHeader 
        title="Completed Services per Day" 
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 200 }}>
             <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="month-select-label">Month</InputLabel>
              <Select
                labelId="month-select-label"
                value={month}
                label="Month"
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {months.map(m => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="year-select-label">Year</InputLabel>
              <Select
                labelId="year-select-label"
                value={year}
                label="Year"
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        }
      />
      
      <CardContent>
         <Box mb={3}>
            <FormControl sx={{ m: 1, width: 300 }} size="small">
                <InputLabel id="services-multiple-checkbox-label">Select Services</InputLabel>
                <Select
                    labelId="services-multiple-checkbox-label"
                    id="services-multiple-checkbox"
                    multiple
                    value={selectedServices}
                    onChange={handleServiceChange}
                    input={<OutlinedInput label="Select Services" />}
                    renderValue={(selected) => {
                        return data.availableServices
                            .filter(s => selected.includes(s.id.toString()))
                            .map(s => s.name)
                            .join(', ');
                    }}
                    MenuProps={MenuProps}
                >
                    {data.availableServices.map((service) => (
                        <MenuItem key={service.id} value={service.id.toString()}>
                            <Checkbox checked={selectedServices.indexOf(service.id.toString()) > -1} />
                            <ListItemText primary={service.name} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
         </Box>

        <TableContainer sx={{ maxHeight: 600, border: `1px solid ${theme.palette.divider}` }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 50, backgroundColor: theme.palette.action.hover }}>DAY</TableCell>
                {visibleServices.map(vs => (
                  <TableCell key={vs.id} align="center" sx={{ backgroundColor: theme.palette.action.hover }}>
                      {vs.name}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: theme.palette.action.hover }}>Total</TableCell>
                <TableCell align="center" sx={{ backgroundColor: theme.palette.action.hover }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.days.map((dayRow) => {
                  let dayVisibleTotal = 0;
                  const rowCells = visibleServices.map(vs => {
                      const val = dayRow.serviceCounts[vs.id.toString()] || 0;
                      dayVisibleTotal += val;
                      return (
                          <TableCell key={vs.id} align="center">
                              {val === 0 ? 'X' : val}
                          </TableCell>
                      );
                  });

                  return (
                      <TableRow key={dayRow.day} hover>
                        <TableCell sx={{ backgroundColor: theme.palette.action.hover, fontWeight: 'bold' }}>
                            {dayRow.day}
                        </TableCell>
                        {rowCells}
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            {dayVisibleTotal}
                        </TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.secondary }}>
                            {getDayNameEs(dayRow.date)}
                        </TableCell>
                      </TableRow>
                  );
              })}
              
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
                    TOTAL:
                </TableCell>
                {visibleServices.map(vs => (
                    <TableCell key={`total-${vs.id}`} align="center" sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
                        {visibleServiceTotals[vs.id.toString()]}
                    </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
                    {grandTotalVisible}
                </TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.primary.main }}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {chartSeries.some(v => v > 0) && (
            <Box mt={5}>
                <Typography variant="h6" align="center" gutterBottom color="text.secondary">
                    SESIONES ({months.find(m => m.value === month)?.label.toUpperCase()} {year})
                </Typography>
                <Chart height={400} options={chartOptions} series={chartSeries} type="pie" width="100%" />
            </Box>
        )}
      </CardContent>
    </Card>
  );
}
