'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { useTheme } from '@mui/material/styles';
import { Chart } from '@/components/core/chart';
import type { ApexOptions } from 'apexcharts';

export interface AgendaBarChartProps {
  timeDistribution: { time: string; count: number }[];
}

export function AgendaBarChart({ timeDistribution }: AgendaBarChartProps): React.JSX.Element {
  const theme = useTheme();

  const series = [{
    name: 'Patients',
    data: timeDistribution.map(d => d.count)
  }];
  
  const labels = timeDistribution.map(d => d.time);

  const chartOptions: ApexOptions = {
    chart: { background: 'transparent', toolbar: { show: false } },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false },
    xaxis: { categories: labels, labels: { style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 2 },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '40%' } },
    theme: { mode: theme.palette.mode },
    tooltip: { theme: theme.palette.mode },
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="Time vs Patients" />
      <CardContent>
        {timeDistribution.length > 0 ? (
          <Chart height={300} options={chartOptions} series={series} type="bar" width="100%" />
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.text.secondary }}>
            No appointments in this timeframe
          </div>
        )}
      </CardContent>
    </Card>
  );
}
