'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import apiClient from '@/lib/api-client';

interface SaleHistoryRow {
  id: number;
  date: string;
  total: number;
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

  React.useEffect(() => {
    let active = true;
    setLoading(true);
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
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, rowsPerPage]);

  return (
    <Card>
      <Box sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: '800px' }}>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">No. Artículos</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Efectivo</TableCell>
              <TableCell align="right">Tarjeta</TableCell>
              <TableCell align="right">Transferencia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  Cargando historial de ventas...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No se encontraron ventas.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack>
                      <Typography variant="body2">{new Date(row.date).toLocaleString('es-MX')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Venta #{row.id}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{row.articleCount}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ${row.total.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{row.cashAmount > 0 ? `$${row.cashAmount.toFixed(2)}` : '-'}</TableCell>
                  <TableCell align="right">{row.cardAmount > 0 ? `$${row.cardAmount.toFixed(2)}` : '-'}</TableCell>
                  <TableCell align="right">{row.transferAmount > 0 ? `$${row.transferAmount.toFixed(2)}` : '-'}</TableCell>
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
      />
    </Card>
  );
}
