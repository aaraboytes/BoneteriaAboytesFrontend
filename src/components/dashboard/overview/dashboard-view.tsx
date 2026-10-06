'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { CurrencyDollar as CurrencyIcon } from '@phosphor-icons/react/dist/ssr/CurrencyDollar';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import dayjs from 'dayjs';

import { paths } from '@/paths';
import apiClient from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';

import {
  amountTab,
  CostCoverageNote,
  LowStockCard,
  PaymentDonut,
  productTabs,
  RankedListCard,
  RecentSalesCard,
  StatTile,
  TrendCard,
} from './dashboard-widgets';
import { dateRangeLabel, money, num, type DashboardReport } from './dashboard-types';

interface StoreOption {
  id: number;
  name: string;
}

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'custom';

const PRESETS: { value: Exclude<Preset, 'custom'>; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes anterior' },
];

const FORMAT = 'YYYY-MM-DD';
const AUTO_REFRESH_MS = 2 * 60 * 1000;
const STORAGE_KEY = 'dashboard-filters-v1';

// The business day rolls over at 06:00 (the default cutoff), so just after midnight "today" is still yesterday.
const businessToday = (): dayjs.Dayjs => dayjs().subtract(6, 'hour');

function rangeFor(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const today = businessToday();
  switch (preset) {
    case 'today':
      return { from: today.format(FORMAT), to: today.format(FORMAT) };
    case 'yesterday': {
      const d = today.subtract(1, 'day');
      return { from: d.format(FORMAT), to: d.format(FORMAT) };
    }
    case '7d':
      return { from: today.subtract(6, 'day').format(FORMAT), to: today.format(FORMAT) };
    case '30d':
      return { from: today.subtract(29, 'day').format(FORMAT), to: today.format(FORMAT) };
    case 'month':
      return { from: today.startOf('month').format(FORMAT), to: today.format(FORMAT) };
    case 'lastMonth': {
      const m = today.subtract(1, 'month');
      return { from: m.startOf('month').format(FORMAT), to: m.endOf('month').format(FORMAT) };
    }
  }
}

interface SavedFilters {
  preset: Preset;
  from: string;
  to: string;
  storeId: number | '';
  threshold: number;
}

function loadSaved(): Partial<SavedFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SavedFilters>;
  } catch {
    return {};
  }
}

export function DashboardView(): React.JSX.Element | null {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const allowed = user?.permissions?.includes('reports.view') ?? false;

  const [preset, setPreset] = React.useState<Preset>('today');
  const [range, setRange] = React.useState(() => rangeFor('today'));
  const [storeId, setStoreId] = React.useState<number | ''>('');
  const [threshold, setThreshold] = React.useState(5);
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [report, setReport] = React.useState<DashboardReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [restored, setRestored] = React.useState(false);

  // Cashiers have no access to reports: send them to the till instead of showing a dead end.
  React.useEffect(() => {
    if (!userLoading && !allowed) router.replace(paths.dashboard.sales);
  }, [userLoading, allowed, router]);

  // Restore the last filters (a saved preset is recomputed so "Hoy" is still today).
  React.useEffect(() => {
    const saved = loadSaved();
    if (saved.preset && saved.preset !== 'custom') {
      setPreset(saved.preset);
      setRange(rangeFor(saved.preset));
    } else if (saved.preset === 'custom' && saved.from && saved.to) {
      setPreset('custom');
      setRange({ from: saved.from, to: saved.to });
    }
    if (typeof saved.storeId === 'number') setStoreId(saved.storeId);
    if (typeof saved.threshold === 'number') setThreshold(saved.threshold);
    setRestored(true);
  }, []);

  React.useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, ...range, storeId, threshold } satisfies SavedFilters));
    } catch {
      // Remembering the filters is a convenience only.
    }
  }, [restored, preset, range, storeId, threshold]);

  React.useEffect(() => {
    if (!allowed) return;
    apiClient
      .get<StoreOption[]>('/Stores')
      .then((res) => setStores(res.data))
      .catch((err) => console.error('Failed to fetch stores', err));
  }, [allowed]);

  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!allowed || !restored) return;
    let active = true;
    setLoading(true);
    apiClient
      .get<DashboardReport>('/Reports/dashboard', {
        params: { from: range.from, to: range.to, storeId: storeId || undefined, lowStockThreshold: threshold },
      })
      .then((res) => {
        if (!active) return;
        setReport(res.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load dashboard', err);
        setError(err?.response?.data?.message || 'No se pudo cargar el resumen. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [allowed, restored, range.from, range.to, storeId, threshold, reloadKey]);

  // Keep the numbers fresh while the screen is left open on the counter.
  React.useEffect(() => {
    if (!allowed) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setReloadKey((k) => k + 1);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [allowed]);

  if (userLoading || !allowed) return null;

  const days = dayjs(range.to).diff(dayjs(range.from), 'day') + 1;
  const singleDay = days === 1;
  const s = report?.summary;
  const p = report?.previous;
  const marginPct = s && s.revenueExTax > 0 ? (s.grossMargin / s.revenueExTax) * 100 : null;
  const showSkeleton = loading && !report;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h2">
            Resumen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {report ? `${report.storeName} · ${dateRangeLabel(report.from, report.to)}` : 'Cargando…'}
            {report && report.openSessions > 0 ? ` · ${report.openSessions} ${report.openSessions === 1 ? 'caja abierta' : 'cajas abiertas'}` : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="Sucursal"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value === '' ? '' : Number(e.target.value))}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas las sucursales</MenuItem>
            {stores.map((st) => (
              <MenuItem key={st.id} value={st.id}>
                {st.name}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title={report ? `Actualizado ${dayjs(report.generatedAt).format('HH:mm')}` : 'Actualizar'}>
            <span>
              <IconButton aria-label="Actualizar datos" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
                <RefreshIcon size={20} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap role="group" aria-label="Periodo">
          {PRESETS.map((item) => (
            <Chip
              key={item.value}
              clickable
              label={item.label}
              aria-pressed={preset === item.value}
              color={preset === item.value ? 'primary' : 'default'}
              variant={preset === item.value ? 'filled' : 'outlined'}
              onClick={() => {
                setPreset(item.value);
                setRange(rangeFor(item.value));
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            type="date"
            label="Desde"
            value={range.from}
            onChange={(e) => {
              if (!e.target.value) return;
              setPreset('custom');
              setRange((r) => ({ from: e.target.value, to: e.target.value > r.to ? e.target.value : r.to }));
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            type="date"
            label="Hasta"
            value={range.to}
            onChange={(e) => {
              if (!e.target.value) return;
              setPreset('custom');
              setRange((r) => ({ from: e.target.value < r.from ? e.target.value : r.from, to: e.target.value }));
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {showSkeleton ? (
        <Grid container spacing={3}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton variant="rounded" height={148} />
            </Grid>
          ))}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Skeleton variant="rounded" height={380} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Skeleton variant="rounded" height={380} />
          </Grid>
        </Grid>
      ) : null}

      {report && s && p ? (
        <Grid container spacing={3} sx={{ opacity: loading ? 0.7 : 1, transition: 'opacity 150ms' }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatTile
              title="Ventas"
              value={money(s.netSales)}
              icon={<CurrencyIcon size={24} />}
              color="primary"
              compare={{ current: s.netSales, previous: p.netSales }}
              caption={s.refunds > 0 ? `${money(s.netAfterReturns)} después de devoluciones` : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatTile
              title="Ganancia bruta"
              value={money(s.grossMargin)}
              icon={<CoinsIcon size={24} />}
              color="success"
              compare={{ current: s.grossMargin, previous: p.grossMargin }}
              caption={marginPct !== null ? `Margen del ${marginPct.toFixed(1)}% sobre ventas sin IVA` : 'Sin costos registrados para calcularla'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatTile
              title="Tickets"
              value={num(s.salesCount)}
              icon={<ReceiptIcon size={24} />}
              color="info"
              compare={{ current: s.salesCount, previous: p.salesCount }}
              caption={`Ticket promedio ${money(s.averageTicket)}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatTile
              title="Piezas vendidas"
              value={num(s.units)}
              icon={<PackageIcon size={24} />}
              color="warning"
              compare={{ current: s.units, previous: p.units }}
              caption={s.salesCount > 0 ? `${(s.units / s.salesCount).toFixed(1)} piezas por ticket` : undefined}
            />
          </Grid>

          <Grid size={12}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip variant="outlined" label={`Devoluciones: ${money(s.refunds)} (${s.returnsCount})`} color={s.returnsCount > 0 ? 'warning' : 'default'} />
              <Chip variant="outlined" label={`Cancelaciones: ${money(s.voidedTotal)} (${s.voidedCount})`} color={s.voidedCount > 0 ? 'error' : 'default'} />
              <Chip variant="outlined" label={`Descuentos: ${money(s.discounts)}`} />
              <Chip variant="outlined" label={`Inventario a costo: ${money(report.inventoryCostValue)}`} />
              <Chip variant="outlined" label={`Inventario a precio de venta: ${money(report.inventoryRetailValue)}`} />
              <CostCoverageNote coverage={s.costCoverage} />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <TrendCard byDay={report.byDay} byHour={report.byHour} singleDay={singleDay} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <PaymentDonut rows={report.byPaymentMethod} />
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <RankedListCard
              title="Productos estrella"
              subheader="Lo que más se vendió en el periodo"
              tabs={productTabs(report.topProductsByUnits, report.topProductsByAmount)}
              emptyText="Aún no hay productos vendidos en este periodo."
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <LowStockCard report={report} threshold={threshold} onThresholdChange={setThreshold} />
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <RankedListCard
              title="Desglose de ventas"
              subheader="Qué departamentos y qué cajeros venden más"
              tabs={[amountTab('Por departamento', report.byDepartment, 'pzas'), amountTab('Por cajero', report.byCashier, 'tickets')]}
              emptyText="Aún no hay ventas en este periodo."
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <RecentSalesCard rows={report.recentSales} />
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
}
