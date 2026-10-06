'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import RouterLink from 'next/link';

import { paths } from '@/paths';
import apiClient from '@/lib/api-client';

import { VoidSaleDialog } from './void-sale-dialog';

interface SaleHistoryRow {
  id: number;
  folio: string | null;
  date: string;
  total: number;
  status: 'Completed' | 'Voided';
  cashierName: string | null;
  canVoid: boolean;
  articleCount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
}

interface SalesHistoryResponse {
  items: SaleHistoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export function SalesHistoryTable(): React.JSX.Element {
  const [rows, setRows] = React.useState<SaleHistoryRow[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [voiding, setVoiding] = React.useState<SaleHistoryRow | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const res = await apiClient.get<SalesHistoryResponse>('/Sales/history', {
          params: { page: page + 1, pageSize: rowsPerPage },
        });
        if (active) {
          setRows(res.data.items);
          setTotalCount(res.data.totalCount);
        }
      } catch (err) {
        console.error('Failed to fetch sales history:', err);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, rowsPerPage, reloadKey]);

  return (
    <Card>
      {loadError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          }
          sx={{ m: 2 }}
        >
          No se pudo cargar el historial de ventas. Revisa tu conexión e inténtalo de nuevo.
        </Alert>
      ) : null}
      <Box sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: '800px' }}>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Artículos</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Efectivo</TableCell>
              <TableCell align="right">Tarjeta</TableCell>
              <TableCell align="right">Transferencia</TableCell>
              <TableCell>Cajero</TableCell>
              <TableCell align="right"><span style={{ position: 'absolute', left: -9999 }}>Acciones</span></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Cargando ventas…
                </TableCell>
              </TableRow>
            ) : loadError ? null : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Aún no hay ventas registradas.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover sx={row.status === 'Voided' ? { '& td': { color: 'text.disabled' } } : undefined}>
                  <TableCell>
                    <Stack>
                      <Typography variant="body2">{new Date(row.date).toLocaleString('es-MX')}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Venta {row.folio ?? `#${row.id}`}
                        </Typography>
                        {row.status === 'Voided' ? <Chip label="Cancelada" size="small" color="error" variant="outlined" /> : null}
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{row.articleCount}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ${row.total.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{row.cashAmount > 0 ? `$${row.cashAmount.toFixed(2)}` : '-'}</TableCell>
                  <TableCell align="right">{row.cardAmount > 0 ? `$${row.cardAmount.toFixed(2)}` : '-'}</TableCell>
                  <TableCell align="right">{row.transferAmount > 0 ? `$${row.transferAmount.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{row.cashierName ?? '-'}</TableCell>
                  <TableCell align="right">
                    {row.status === 'Completed' ? (
                      <Button
                        size="small"
                        component={RouterLink}
                        href={`${paths.dashboard.returns}?saleId=${row.id}`}
                        aria-label={`Registrar devolución de la venta ${row.folio ?? `#${row.id}`}`}
                      >
                        Devolver
                      </Button>
                    ) : null}
                    {row.canVoid ? (
                      <Button size="small" color="error" onClick={() => setVoiding(row)} aria-label={`Cancelar venta ${row.folio ?? `#${row.id}`}`}>
                        Cancelar venta
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={totalCount}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Ventas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
      <VoidSaleDialog
        open={voiding !== null}
        sale={voiding}
        onClose={() => setVoiding(null)}
        onVoided={() => {
          setVoiding(null);
          setReloadKey((k) => k + 1);
        }}
      />
    </Card>
  );
}
