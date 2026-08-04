'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';

export interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  themeColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'; 
}

export function KPICard({ title, value, icon, subtitle, themeColor = 'primary' }: KPICardProps): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }} spacing={3}>
            <Stack spacing={1}>
              <Typography color="text.secondary" variant="overline">
                {title}
              </Typography>
              <Typography variant="h4">{value}</Typography>
            </Stack>
            {icon && (
              <Avatar sx={{ backgroundColor: `var(--mui-palette-${themeColor}-main)`, height: '56px', width: '56px' }}>
                {icon}
              </Avatar>
            )}
          </Stack>
          {subtitle && (
            <div>
              <Typography color="text.secondary" variant="caption">
                {subtitle}
              </Typography>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
