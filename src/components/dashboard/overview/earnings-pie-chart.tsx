'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { useTheme } from '@mui/material/styles';
import { Chart } from '@/components/core/chart';
import type { ApexOptions } from 'apexcharts';

export interface EarningsPieChartProps {
  sales: number;
  discounts: number;
  courtesies: number;
  cashMovements: number;
}

export function EarningsPieChart({ sales, discounts, courtesies, cashMovements }: EarningsPieChartProps): React.JSX.Element {
  const theme = useTheme();

  const series = [sales, discounts, courtesies, cashMovements];
  const labels = ['Sales', 'Discounts', 'Courtesies', 'Cash Movements'];
  
  const chartOptions: ApexOptions = {
    chart: { background: 'transparent' },
    colors: [
      theme.palette.success.main, 
      theme.palette.warning.main, 
      theme.palette.info.main, 
      theme.palette.primary.main
    ],
    dataLabels: { enabled: false },
    labels,
    legend: { show: true, position: 'bottom' },
    plotOptions: { pie: { expandOnClick: false } },
    states: { active: { filter: { type: 'none' } }, hover: { filter: { type: 'none' } } },
    stroke: { width: 0 },
    theme: { mode: theme.palette.mode },
    tooltip: { fillSeriesColor: false },
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="Earnings Breakdown" />
      <CardContent>
        {series.some(v => v > 0) ? (
          <Chart height={300} options={chartOptions} series={series} type="donut" width="100%" />
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.text.secondary }}>
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
