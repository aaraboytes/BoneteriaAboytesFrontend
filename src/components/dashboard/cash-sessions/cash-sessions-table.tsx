'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import apiClient from '@/lib/api-client';
import { ClosingReportView, dateTime, money, printStyles, type ClosingReport } from '@/components/dashboard/sales/closing-report-view';

interface SessionRow {
  id: number;
  cashRegisterName: string;
  storeName: string;
  businessDate: string;
  status: 'Open' | 'Closed';
  openedAt: string;
  openedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  openingAmount: number;
  salesCount: number | null;
  totalSales: number | null;
  expectedCashAmount: number | null;
  countedCashAmount: number | null;
  cashDifference: number | null;
}

interface StoreOption {
  id: number;
  name: string;
}

const isoDay = (d: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const longDay = (businessDate: string): string => {
  const [y, m, d] = businessDate.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : businessDate;
};

// A drawer difference means very different things: short = money missing, over = unexplained surplus.
function DifferenceCell({ value }: { value: number | null }): React.JSX.Element {
  if (value == null) return <>—</>;
  if (Math.abs(value) < 0.005) return <Chip size="small" color="success" variant="outlined" label="Cuadra" />;
  return value < 0 ? (
    <Chip size="small" color="error" label={`Faltante ${money(Math.abs(value))}`} />
  ) : (
    <Chip size="small" color="warning" label={`Sobrante ${money(value)}`} />
  );
}

// History of drawer closings with filters; each row opens its printable closing report.
export function CashSessionsTable(): React.JSX.Element {
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [storeId, setStoreId] = React.useState<number | ''>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [rows, setRows] = React.useState<SessionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(true);
  const [report, setReport] = React.useState<ClosingReport | null>(null);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    apiClient
      .get<StoreOption[]>('/Stores')
      .then((res) => setStores(res.data))
      .catch((err) => console.error('Failed to fetch stores', err));
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    apiClient
      .get<{ items: SessionRow[]; total: number }>('/CashSessions', {
        params: { storeId: storeId || undefined, from: from || undefined, to: to || undefined, page: page + 1, pageSize },
      })
      .then((res) => {
        if (!active) return;
        setRows(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => {
        console.error('Failed to fetch cash sessions', err);
        if (active) setLoadError('No se pudieron cargar los cortes de caja. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [storeId, from, to, page, pageSize, reloadKey]);

  const openReport = async (id: number): Promise<void> => {
    setReportLoading(true);
    try {
      const res = await apiClient.get<ClosingReport>(`/CashSessions/${id}/report`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch closing report', err);
      setLoadError('No se pudo abrir el corte. Inténtalo de nuevo.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <style>{printStyles}</style>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
        <TextField label="Desde" type="date" size="small" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <TextField label="Hasta" type="date" size="small" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <Stack direction="row" spacing={1} role="group" aria-label="Rangos rápidos">
          <Chip clickable label="Hoy" onClick={() => { const t = isoDay(new Date()); setFrom(t); setTo(t); setPage(0); }} />
          <Chip clickable label="Últimos 7 días" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setFrom(isoDay(d)); setTo(isoDay(new Date())); setPage(0); }} />
          <Chip clickable label="Este mes" onClick={() => { const d = new Date(); setFrom(isoDay(new Date(d.getFullYear(), d.getMonth(), 1))); setTo(isoDay(d)); setPage(0); }} />
          {from || to ? <Chip clickable variant="outlined" label="Quitar fechas" onClick={() => { setFrom(''); setTo(''); setPage(0); }} /> : null}
        </Stack>
        <TextField
          select
          size="small"
          label="Sucursal"
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          value={storeId}
          onChange={(e) => {
            setStoreId(e.target.value === '' ? '' : Number(e.target.value));
            setPage(0);
          }}
          sx={{ width: 240 }}
        >
          <MenuItem value="">Todas las sucursales</MenuItem>
          {stores.map((st) => (
            <MenuItem key={st.id} value={st.id}>
              {st.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loadError ? (
        <Alert
          severity="error"
          onClose={() => setLoadError(null)}
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          }
        >
          {loadError}
        </Alert>
      ) : null}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Día</TableCell>
                <TableCell>Caja</TableCell>
                <TableCell>Abrió</TableCell>
                <TableCell>Cerró</TableCell>
                <TableCell align="right">Ventas</TableCell>
                <TableCell align="right">Esperado</TableCell>
                <TableCell align="right">Contado</TableCell>
                <TableCell align="right">Diferencia</TableCell>
                <TableCell><span style={{ position: 'absolute', left: -9999 }}>Acciones</span></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    Cargando cortes…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    {from || to || storeId !== '' ? 'No hay cortes con estos filtros. Prueba con otro rango de fechas.' : 'Aún no hay cortes de caja.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{longDay(r.businessDate)}</TableCell>
                    <TableCell>
                      {r.cashRegisterName} · {r.storeName}
                      {r.status === 'Open' ? <Chip label="Abierta" size="small" color="warning" sx={{ ml: 1 }} /> : null}
                    </TableCell>
                    <TableCell>
                      {r.openedBy ?? '—'} · {dateTime(r.openedAt)}
                    </TableCell>
                    <TableCell>{r.closedAt ? `${r.closedBy ?? '—'} · ${dateTime(r.closedAt)}` : '—'}</TableCell>
                    <TableCell align="right">{r.totalSales != null ? `${money(r.totalSales)} (${r.salesCount})` : '—'}</TableCell>
                    <TableCell align="right">{r.expectedCashAmount != null ? money(r.expectedCashAmount) : '—'}</TableCell>
                    <TableCell align="right">{r.countedCashAmount != null ? money(r.countedCashAmount) : '—'}</TableCell>
                    <TableCell align="right">
                      <DifferenceCell value={r.cashDifference} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openReport(r.id)} disabled={reportLoading} aria-label={`Ver corte del ${longDay(r.businessDate)}, ${r.cashRegisterName}`}>
                        Ver corte
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Cortes por página"
          labelDisplayedRows={({ from: f, to: t, count }) => `${f}–${t} de ${count}`}
        />
      </Card>

      <Dialog open={report !== null || reportLoading} onClose={() => setReport(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Corte de caja
          {report ? null : <Typography variant="body2" color="text.secondary">Cargando…</Typography>}
        </DialogTitle>
        <DialogContent>
          {report ? (
            <Box id="cash-closing-printable">
              <ClosingReportView report={report} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.print()} disabled={!report}>
            Imprimir
          </Button>
          <Button variant="contained" onClick={() => setReport(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
