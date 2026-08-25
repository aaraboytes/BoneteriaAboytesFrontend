'use client';

import * as React from 'react';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

export interface CartLine {
  productVariantId: string;
  description: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

export interface CartTableProps {
  lines: CartLine[];
  onUpdateLine: (productVariantId: string, changes: Partial<Pick<CartLine, 'unitPrice' | 'quantity'>>) => void;
  onRemoveLine: (productVariantId: string) => void;
}

export function CartTable({ lines, onUpdateLine, onRemoveLine }: CartTableProps): React.JSX.Element {
  if (lines.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        El carrito está vacío. Busque un producto o escanee un código de barras para comenzar.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Producto</TableCell>
          <TableCell>SKU</TableCell>
          <TableCell align="right">Precio</TableCell>
          <TableCell align="right">Cantidad</TableCell>
          <TableCell align="right">Importe</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.productVariantId} hover>
            <TableCell>{line.description}</TableCell>
            <TableCell>{line.sku}</TableCell>
            <TableCell align="right">
              <TextField
                type="number"
                size="small"
                value={line.unitPrice}
                onChange={(e) => onUpdateLine(line.productVariantId, { unitPrice: parseFloat(e.target.value) || 0 })}
                sx={{ width: 100 }}
                inputProps={{ step: '0.01', min: 0 }}
              />
            </TableCell>
            <TableCell align="right">
              <TextField
                type="number"
                size="small"
                value={line.quantity}
                onChange={(e) => onUpdateLine(line.productVariantId, { quantity: parseFloat(e.target.value) || 0 })}
                sx={{ width: 80 }}
                inputProps={{ step: '1', min: 1 }}
              />
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" fontWeight={600}>
                ${(line.unitPrice * line.quantity).toFixed(2)}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <IconButton size="small" onClick={() => onRemoveLine(line.productVariantId)}>
                <TrashIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
