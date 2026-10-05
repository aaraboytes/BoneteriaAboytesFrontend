'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { CashMovement } from './cash-movement-dialog';

interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  isCash: boolean;
  amount: number;
}

interface CashierTotal {
  employeeId: number | null;
  name: string;
  salesCount: number;
  totalSales: number;
}

export interface CashSessionSummary {
  openingAmount: number;
  saleCount: number;
  totalSales: number;
  voidedCount: number;
  voidedTotal: number;
  paymentsByMethod: PaymentMethodTotal[];
  cashSales: number;
  totalIncomes: number;
  totalWithdrawals: number;
  cashRefunds: number;
  expectedCash: number;
  cashiers: CashierTotal[];
}

export interface ClosingReport {
  session: {
    id: number;
    cashRegisterName: string;
    storeName: string;
    businessDate: string;
    status: 'Open' | 'Closed';
    openedAt: string;
    openedBy: string | null;
    closedAt: string | null;
    closedBy: string | null;
    expectedCashAmount: number | null;
    countedCashAmount: number | null;
    cashDifference: number | null;
    notes: string | null;
  };
  summary: CashSessionSummary;
  movements: CashMovement[];
}

export const money = (v: number): string => (v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`);
export const dateTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// Rows shared by the live summary (before counting) and the closing report.
export function SummaryRows({ summary }: { summary: CashSessionSummary }): React.JSX.Element {
  return (
    <>
      <TableRow>
        <TableCell>Fondo inicial</TableCell>
        <TableCell align="right">{money(summary.openingAmount)}</TableCell>
      </TableRow>
      {summary.paymentsByMethod.map((m) => (
        <TableRow key={m.paymentMethodId}>
          <TableCell>Ventas {m.name.toLowerCase()}</TableCell>
          <TableCell align="right">{money(m.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow sx={{ '& td': { fontWeight: 700 } }}>
        <TableCell>Total de ventas ({summary.saleCount})</TableCell>
        <TableCell align="right">{money(summary.totalSales)}</TableCell>
      </TableRow>
      {summary.voidedCount > 0 ? (
        <TableRow>
          <TableCell>Ventas canceladas ({summary.voidedCount}, no cuentan)</TableCell>
          <TableCell align="right">{money(summary.voidedTotal)}</TableCell>
        </TableRow>
      ) : null}
      <TableRow>
        <TableCell>Ingresos de efectivo</TableCell>
        <TableCell align="right">+{money(summary.totalIncomes)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Retiros</TableCell>
        <TableCell align="right">-{money(summary.totalWithdrawals)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Reembolsos en efectivo</TableCell>
        <TableCell align="right">-{money(summary.cashRefunds)}</TableCell>
      </TableRow>
      <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '1px solid', borderColor: 'divider' } }}>
        <TableCell>Efectivo esperado en caja</TableCell>
        <TableCell align="right">{money(summary.expectedCash)}</TableCell>
      </TableRow>
    </>
  );
}

// The printable closing report of one drawer session (wrap it in #cash-closing-printable to print).
export function ClosingReportView({ report }: { report: ClosingReport }): React.JSX.Element {
  const difference = report.session.cashDifference ?? 0;
  const closed = report.session.status === 'Closed';

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {report.session.cashRegisterName} · {report.session.storeName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Día: {report.session.businessDate} · Abrió {report.session.openedBy ?? '—'} ({dateTime(report.session.openedAt)})
          {closed ? ` · Cerró ${report.session.closedBy ?? '—'} (${dateTime(report.session.closedAt)})` : ' · Caja abierta'}
        </Typography>
      </Box>

      <Table size="small">
        <TableBody>
          <SummaryRows summary={report.summary} />
          {closed ? (
            <TableRow>
              <TableCell>Efectivo contado</TableCell>
              <TableCell align="right">{money(report.session.countedCashAmount ?? 0)}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {closed ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: 1.5,
            borderRadius: 1,
            bgcolor: difference === 0 ? 'success.lighter' : 'warning.lighter',
          }}
        >
          <Typography variant="h6">{difference === 0 ? 'Cuadra' : difference > 0 ? 'Sobrante' : 'Faltante'}</Typography>
          <Typography variant="h6" fontWeight={700}>
            {difference > 0 ? '+' : ''}
            {money(difference)}
          </Typography>
        </Box>
      ) : null}

      {report.summary.cashiers.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Ventas por cajero
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cajero</TableCell>
                <TableCell align="right">Ventas</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.summary.cashiers.map((c) => (
                <TableRow key={c.employeeId ?? 0}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell align="right">{c.salesCount}</TableCell>
                  <TableCell align="right">{money(c.totalSales)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {report.movements.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Movimientos de efectivo
          </Typography>
          <Table size="small">
            <TableBody>
              {report.movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{dateTime(m.createdAt)}</TableCell>
                  <TableCell>
                    {m.type === 'Withdrawal' ? 'Retiro' : 'Ingreso'}: {m.reason}
                    {m.approvedByName ? ` (autorizó ${m.approvedByName})` : ''}
                  </TableCell>
                  <TableCell align="right">
                    {m.type === 'Withdrawal' ? '-' : '+'}
                    {money(m.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {report.session.notes ? <Typography variant="body2">Notas: {report.session.notes}</Typography> : null}
    </Stack>
  );
}

export const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #cash-closing-printable, #cash-closing-printable * { visibility: visible; }
    #cash-closing-printable { position: absolute; top: 0; left: 0; width: 100%; }
  }
`;
