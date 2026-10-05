'use client';

import * as React from 'react';
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

  React.useEffect(() => {
    apiClient
      .get<StoreOption[]>('/Stores')
      .then((res) => setStores(res.data))
      .catch((err) => console.error('Failed to fetch stores', err));
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .get<{ items: SessionRow[]; total: number }>('/CashSessions', {
        params: { storeId: storeId || undefined, from: from || undefined, to: to || undefined, page: page + 1, pageSize },
      })
      .then((res) => {
        if (!active) return;
        setRows(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => console.error('Failed to fetch cash sessions', err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [storeId, from, to, page, pageSize]);

  const openReport = async (id: number): Promise<void> => {
    setReportLoading(true);
    try {
      const res = await apiClient.get<ClosingReport>(`/CashSessions/${id}/report`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch closing report', err);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <style>{printStyles}</style>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField label="Desde" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
        <TextField label="Hasta" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
        <TextField
          select
          label="Sucursal"
          value={storeId}
          onChange={(e) => {
            setStoreId(e.target.value === '' ? '' : Number(e.target.value));
            setPage(0);
          }}
          sx={{ width: 260 }}
        >
          <MenuItem value="">Todas las sucursales</MenuItem>
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

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
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    Cargando cortes...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No hay cortes de caja con estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.businessDate}</TableCell>
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
                    <TableCell align="right" sx={{ fontWeight: 700, color: r.cashDifference ? 'warning.main' : undefined }}>
                      {r.cashDifference != null ? `${r.cashDifference > 0 ? '+' : ''}${money(r.cashDifference)}` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openReport(r.id)} disabled={reportLoading}>
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
        />
      </Card>

      <Dialog open={report !== null || reportLoading} onClose={() => setReport(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Corte de caja</DialogTitle>
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
