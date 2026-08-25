'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Printer as PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';

export interface CompletedSaleLine {
  description: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

export interface CompletedSalePayment {
  methodName: string;
  amount: number;
  receivedAmount?: number;
  changeGiven?: number;
}

export interface CompletedSale {
  id: number;
  date: string;
  storeName: string;
  items: CompletedSaleLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  payments: CompletedSalePayment[];
  totalReceived: number;
  totalChange: number;
}

export interface SaleReceiptDialogProps {
  open: boolean;
  sale: CompletedSale | null;
  onClose: () => void;
}

export function SaleReceiptDialog({ open, sale, onClose }: SaleReceiptDialogProps): React.JSX.Element | null {
  if (!sale) return null;

  const handlePrint = (): void => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sale-receipt-printable, #sale-receipt-printable * { visibility: visible; }
          #sale-receipt-printable { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <DialogTitle>Venta completada</DialogTitle>
      <DialogContent>
        <Box id="sale-receipt-printable">
          <Stack spacing={1.5}>
            <Stack alignItems="center" spacing={0}>
              <Typography variant="subtitle1" fontWeight={700}>{sale.storeName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Venta #{sale.id} · {new Date(sale.date).toLocaleString('es-MX')}
              </Typography>
            </Stack>

            <Divider />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Cant.</TableCell>
                  <TableCell align="right">Importe</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.items.map((line) => (
                  <TableRow key={`${line.sku}-${line.description}`}>
                    <TableCell>
                      {line.description}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {line.sku}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{line.quantity}</TableCell>
                    <TableCell align="right">${(line.unitPrice * line.quantity).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Divider />

            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Subtotal</Typography>
                <Typography variant="body2">${sale.subtotal.toFixed(2)}</Typography>
              </Stack>
              {sale.discountTotal > 0 ? (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Descuento</Typography>
                  <Typography variant="body2">-${sale.discountTotal.toFixed(2)}</Typography>
                </Stack>
              ) : null}
              {sale.taxTotal > 0 ? (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Impuestos</Typography>
                  <Typography variant="body2">${sale.taxTotal.toFixed(2)}</Typography>
                </Stack>
              ) : null}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
                <Typography variant="subtitle1" fontWeight={700}>${sale.total.toFixed(2)}</Typography>
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Pagos</Typography>
              {sale.payments.map((payment, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    {payment.methodName}
                    {payment.receivedAmount ? ` (recibido $${payment.receivedAmount.toFixed(2)})` : ''}
                  </Typography>
                  <Typography variant="body2">${payment.amount.toFixed(2)}</Typography>
                </Stack>
              ))}
            </Stack>

            {sale.totalChange > 0 ? (
              <>
                <Divider />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ bgcolor: 'success.lighter', p: 1.5, borderRadius: 1 }}
                >
                  <Typography variant="h6" color="success.dark">Cambio a devolver</Typography>
                  <Typography variant="h6" color="success.dark" fontWeight={700}>
                    ${sale.totalChange.toFixed(2)}
                  </Typography>
                </Stack>
              </>
            ) : null}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained" startIcon={<PrinterIcon />} onClick={handlePrint}>
          Imprimir Ticket
        </Button>
      </DialogActions>
    </Dialog>
  );
}
