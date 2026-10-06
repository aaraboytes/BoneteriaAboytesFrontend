'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowDown as ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowUp as ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { Warning as WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import type { ApexOptions } from 'apexcharts';

import { paths } from '@/paths';
import { Chart } from '@/components/core/chart';
import { useActiveTheme } from '@/styles/theme/use-active-theme';

import {
  money,
  moneyCompact,
  num,
  percentChange,
  shortDate,
  type AmountRow,
  type DashboardReport,
  type DayRow,
  type HourRow,
  type LowStockRow,
  type ProductRow,
  type RecentSaleRow,
} from './dashboard-types';

// ---------------------------------------------------------------------------------------------
// KPI tile
// ---------------------------------------------------------------------------------------------

export interface StatTileProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info' | 'error';
  /** Current and previous value, to show the change versus the previous period. */
  compare?: { current: number; previous: number; /** A drop is good news (e.g. returns). */ invert?: boolean };
  caption?: React.ReactNode;
  loading?: boolean;
}

function Delta({ current, previous, invert }: { current: number; previous: number; invert?: boolean }): React.JSX.Element {
  const change = percentChange(current, previous);
  if (change === null) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin datos en el periodo anterior
      </Typography>
    );
  }
  if (Math.abs(change) < 0.05) {
    return (
      <Typography variant="caption" color="text.secondary">
        Igual que el periodo anterior
      </Typography>
    );
  }
  const up = change > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  const abs = Math.abs(change);
  // Huge swings (e.g. a quiet day before) are noise: don't print "1300.0%".
  const text = abs > 999 ? '999%+' : abs >= 100 ? `${Math.round(abs)}%` : `${abs.toFixed(1)}%`;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap role="img" aria-label={`${up ? 'Subió' : 'Bajó'} ${text} frente al periodo anterior`}>
      <Icon size={14} weight="bold" color={good ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'} aria-hidden />
      <Typography variant="caption" fontWeight={700} color={good ? 'success.main' : 'error.main'} aria-hidden>
        {text}
      </Typography>
      <Typography variant="caption" color="text.secondary" aria-hidden>
        vs. periodo anterior
      </Typography>
    </Stack>
  );
}

export function StatTile({ title, value, icon, color, compare, caption, loading }: StatTileProps): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                {title}
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 800, opacity: loading ? 0.4 : 1, transition: 'opacity 150ms' }}>
                {value}
              </Typography>
            </Stack>
            <Box
              aria-hidden
              sx={{
                alignItems: 'center',
                bgcolor: `rgba(var(--mui-palette-${color}-mainChannel) / 0.12)`,
                borderRadius: 2,
                color: `${color}.main`,
                display: 'flex',
                flexShrink: 0,
                height: 44,
                justifyContent: 'center',
                width: 44,
              }}
            >
              {icon}
            </Box>
          </Stack>
          <Box sx={{ minHeight: 20 }}>{compare ? <Delta {...compare} /> : null}</Box>
          {caption ? (
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Shared chart bits
// ---------------------------------------------------------------------------------------------

function useBaseOptions(): ApexOptions {
  const theme = useActiveTheme();
  return {
    chart: { background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
    dataLabels: { enabled: false },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 3, xaxis: { lines: { show: false } } },
    legend: { show: false },
    theme: { mode: theme.palette.mode },
    tooltip: { theme: theme.palette.mode },
  };
}

function EmptyChart({ text }: { text: string }): React.JSX.Element {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ color: 'text.secondary', minHeight: 240, textAlign: 'center' }}>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------------------------
// Sales over time (per day, or per hour when the range is a single day)
// ---------------------------------------------------------------------------------------------

type Metric = 'netSales' | 'grossMargin' | 'units' | 'salesCount';

const metricLabels: Record<Metric, string> = {
  netSales: 'Ventas',
  grossMargin: 'Ganancia',
  units: 'Piezas',
  salesCount: 'Tickets',
};

export function TrendCard({ byDay, byHour, singleDay }: { byDay: DayRow[]; byHour: HourRow[]; singleDay: boolean }): React.JSX.Element {
  const theme = useActiveTheme();
  const base = useBaseOptions();
  const [metric, setMetric] = React.useState<Metric>('netSales');

  const isMoney = metric === 'netSales' || metric === 'grossMargin';
  const color = metric === 'grossMargin' ? theme.palette.success.main : theme.palette.primary.main;

  const hasData = singleDay ? byHour.length > 0 : byDay.some((d) => d.salesCount > 0);
  const categories = singleDay ? byHour.map((h) => `${String(h.hour).padStart(2, '0')}:00`) : byDay.map((d) => shortDate(d.date));
  const values = singleDay ? byHour.map((h) => h.amount) : byDay.map((d) => d[metric]);
  const seriesName = singleDay ? 'Ventas' : metricLabels[metric];
  const moneyAxis = singleDay || isMoney;

  const options: ApexOptions = {
    ...base,
    colors: [color],
    plotOptions: { bar: { borderRadius: 4, columnWidth: byDay.length > 20 ? '80%' : '50%' } },
    stroke: { width: 0 },
    fill: { opacity: 1 },
    xaxis: {
      categories,
      tickAmount: Math.min(categories.length, 12),
      axisBorder: { color: theme.palette.divider },
      axisTicks: { color: theme.palette.divider },
      labels: { rotate: 0, hideOverlappingLabels: true, style: { colors: theme.palette.text.secondary } },
    },
    yaxis: {
      labels: {
        formatter: (v) => (moneyAxis ? moneyCompact(v) : num(Math.round(v))),
        style: { colors: theme.palette.text.secondary },
      },
    },
    tooltip: { ...base.tooltip, y: { formatter: (v) => (moneyAxis ? money(v) : num(v)) } },
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={singleDay ? 'Ventas por hora' : 'Ventas por día'}
        subheader={singleDay ? 'Cómo se repartió el día' : 'Elige qué quieres comparar día a día'}
        action={
          singleDay ? null : (
            <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, v: Metric | null) => v && setMetric(v)} aria-label="Métrica de la gráfica">
              {(Object.keys(metricLabels) as Metric[]).map((m) => (
                <ToggleButton key={m} value={m} sx={{ px: 1.5 }}>
                  {metricLabels[m]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )
        }
      />
      <CardContent>
        {hasData ? (
          <Chart height={300} options={options} series={[{ name: seriesName, data: values }]} type="bar" width="100%" />
        ) : (
          <EmptyChart text="No hay ventas en este periodo." />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------------------------

export function PaymentDonut({ rows }: { rows: AmountRow[] }): React.JSX.Element {
  const theme = useActiveTheme();
  const base = useBaseOptions();
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const options: ApexOptions = {
    ...base,
    labels: rows.map((r) => r.name),
    colors: [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.info.main, theme.palette.error.main],
    stroke: { width: 0 },
    legend: { show: true, position: 'bottom', labels: { colors: theme.palette.text.secondary } },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { show: true, color: theme.palette.text.secondary },
            value: { show: true, color: theme.palette.text.primary, formatter: (v) => money(Number(v)) },
            total: { show: true, label: 'Total cobrado', color: theme.palette.text.secondary, formatter: () => money(total) },
          },
        },
      },
    },
    tooltip: { ...base.tooltip, y: { formatter: (v) => money(v) } },
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="Cómo pagan" subheader="Cobros por método de pago" />
      <CardContent>
        {rows.length > 0 ? (
          <Chart height={300} options={options} series={rows.map((r) => r.amount)} type="donut" width="100%" />
        ) : (
          <EmptyChart text="Aún no hay cobros en este periodo." />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Ranked lists with proportional bars (top products, departments, cashiers)
// ---------------------------------------------------------------------------------------------

export interface RankedRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  display: string;
  secondary?: string;
}

export interface RankedTab {
  label: string;
  rows: RankedRow[];
}

export function RankedListCard({ title, subheader, tabs, emptyText }: { title: string; subheader?: string; tabs: RankedTab[]; emptyText: string }): React.JSX.Element {
  const [tab, setTab] = React.useState(0);
  const active = tabs[Math.min(tab, tabs.length - 1)];
  const max = Math.max(1, ...active.rows.map((r) => r.value));

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={title} subheader={subheader} sx={{ pb: 0 }} />
      {tabs.length > 1 ? (
        <Tabs value={Math.min(tab, tabs.length - 1)} onChange={(_, v: number) => setTab(v)} sx={{ px: 2 }} aria-label={title}>
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
      ) : null}
      <CardContent>
        {active.rows.length === 0 ? (
          <EmptyChart text={emptyText} />
        ) : (
          <Stack component="ol" spacing={1.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {active.rows.map((row, index) => (
              <Box component="li" key={row.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
                  <Stack direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 18 }}>
                      {index + 1}
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap title={row.label}>
                        {row.label}
                      </Typography>
                      {row.sublabel ? (
                        <Typography variant="caption" color="text.secondary" noWrap component="p">
                          {row.sublabel}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {row.display}
                    </Typography>
                    {row.secondary ? (
                      <Typography variant="caption" color="text.secondary" component="p">
                        {row.secondary}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 6, mt: 0.75, overflow: 'hidden', ml: '30px' }} aria-hidden>
                  <Box sx={{ bgcolor: 'primary.main', borderRadius: 1, height: '100%', width: `${Math.max(2, (row.value / max) * 100)}%` }} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

const pieces = (n: number): string => `${num(n)} ${n === 1 ? 'pza' : 'pzas'}`;

export function productTabs(byUnits: ProductRow[], byAmount: ProductRow[]): RankedTab[] {
  const toRow = (p: ProductRow, by: 'units' | 'amount'): RankedRow => ({
    key: p.productVariantId,
    label: p.description,
    sublabel: p.sku,
    value: by === 'units' ? p.units : p.amount,
    display: by === 'units' ? pieces(p.units) : money(p.amount),
    secondary: by === 'units' ? money(p.amount) : pieces(p.units),
  });
  return [
    { label: 'Más vendidos', rows: byUnits.map((p) => toRow(p, 'units')) },
    { label: 'Mayor ingreso', rows: byAmount.map((p) => toRow(p, 'amount')) },
  ];
}

export function amountTab(label: string, rows: AmountRow[], unit: string): RankedTab {
  return {
    label,
    rows: rows.map((r) => ({ key: r.name, label: r.name, value: r.amount, display: money(r.amount), secondary: `${num(r.count)} ${unit}` })),
  };
}

// ---------------------------------------------------------------------------------------------
// Low stock
// ---------------------------------------------------------------------------------------------

const THRESHOLDS = [3, 5, 10, 20];

export function LowStockCard({
  report,
  threshold,
  onThresholdChange,
}: {
  report: DashboardReport;
  threshold: number;
  onThresholdChange: (value: number) => void;
}): React.JSX.Element {
  const showStore = report.storeId === null;
  const shown = report.lowStock.length;
  const total = report.lowStockCount + report.outOfStockCount;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Productos por reabastecer"
        subheader={
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" color={report.outOfStockCount > 0 ? 'error' : 'default'} label={`${report.outOfStockCount} agotados`} />
            <Chip size="small" color={report.lowStockCount > 0 ? 'warning' : 'default'} label={`${report.lowStockCount} con poco stock`} />
          </Stack>
        }
        action={
          <TextField select size="small" label="Poco stock hasta" value={threshold} onChange={(e) => onThresholdChange(Number(e.target.value))} sx={{ minWidth: 150 }}>
            {THRESHOLDS.map((t) => (
              <MenuItem key={t} value={t}>
                {t} piezas
              </MenuItem>
            ))}
          </TextField>
        }
      />
      <CardContent sx={{ flex: '1 1 auto', pt: 0 }}>
        {shown === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ color: 'text.secondary', minHeight: 240, textAlign: 'center' }} spacing={0.5}>
            <Typography variant="subtitle1" color="text.primary">
              Todo en orden
            </Typography>
            <Typography variant="body2">Ningún producto tiene {threshold} piezas o menos.</Typography>
          </Stack>
        ) : (
          <Stack component="ul" divider={<Divider component="li" />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {report.lowStock.map((row) => (
              <LowStockItem key={`${row.productVariantId}-${row.storeId}`} row={row} showStore={showStore} />
            ))}
          </Stack>
        )}
      </CardContent>
      <Divider />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {total > shown ? `Mostrando los ${shown} más urgentes de ${total}` : ' '}
        </Typography>
        <Button size="small" color="inherit" component={RouterLink} href={paths.dashboard.inventory} endIcon={<ArrowRightIcon />}>
          Ir a inventario
        </Button>
      </Stack>
    </Card>
  );
}

function LowStockItem({ row, showStore }: { row: LowStockRow; showStore: boolean }): React.JSX.Element {
  const out = row.stock <= 0;
  const detail = [row.sku, row.size, row.color].filter(Boolean).join(' · ');
  return (
    <Stack component="li" direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: 1.25 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap title={row.description}>
          {row.description}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="p">
          {detail}
          {showStore ? ` — ${row.storeName}` : ''}
        </Typography>
      </Box>
      <Chip
        size="small"
        icon={out ? <WarningIcon /> : undefined}
        color={out ? 'error' : 'warning'}
        variant={out ? 'filled' : 'outlined'}
        label={out ? 'Agotado' : `${num(row.stock)} ${row.stock === 1 ? 'pza' : 'pzas'}`}
        sx={{ flexShrink: 0, fontWeight: 700 }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------------------------
// Latest sales
// ---------------------------------------------------------------------------------------------

export function RecentSalesCard({ rows }: { rows: RecentSaleRow[] }): React.JSX.Element {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="Últimas ventas" subheader="Las más recientes del periodo" />
      <CardContent sx={{ flex: '1 1 auto', pt: 0 }}>
        {rows.length === 0 ? (
          <EmptyChart text="Todavía no hay ventas." />
        ) : (
          <Stack component="ul" divider={<Divider component="li" />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {rows.map((sale) => {
              const voided = sale.status === 'Voided';
              return (
                <Stack key={sale.id} component="li" direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: 1.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600} sx={{ textDecoration: voided ? 'line-through' : 'none' }}>
                        {sale.folio ?? `#${sale.id}`}
                      </Typography>
                      {voided ? <Chip size="small" color="error" variant="outlined" label="Cancelada" /> : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap component="p">
                      {new Date(sale.date).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {sale.cashierName ?? 'Sin cajero'} · {num(sale.items)} {sale.items === 1 ? 'pza' : 'pzas'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color={voided ? 'text.disabled' : 'text.primary'} sx={{ flexShrink: 0 }}>
                    {money(sale.total)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
      <Divider />
      <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, py: 1 }}>
        <Button size="small" color="inherit" component={RouterLink} href={paths.dashboard.salesHistory} endIcon={<ArrowRightIcon />}>
          Ver historial
        </Button>
      </Stack>
    </Card>
  );
}

export function CostCoverageNote({ coverage }: { coverage: number }): React.JSX.Element | null {
  if (coverage >= 0.999) return null;
  return (
    <Tooltip title="Algunos productos vendidos no tenían costo registrado, así que no cuentan para la ganancia. Captura el costo en Productos para verla completa.">
      <Chip size="small" color="warning" variant="outlined" icon={<WarningIcon />} label={`Ganancia calculada con el ${Math.round(coverage * 100)}% de lo vendido`} />
    </Tooltip>
  );
}
