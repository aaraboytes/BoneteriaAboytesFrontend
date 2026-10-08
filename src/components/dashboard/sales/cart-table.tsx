'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Minus as MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { ShoppingCart as ShoppingCartIcon } from '@phosphor-icons/react/dist/ssr/ShoppingCart';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

export interface CartLine {
  productVariantId: string;
  description: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  /** Stock at this store when the line was added; used only to warn the cashier. */
  stockQuantity?: number;
}

export interface CartTableProps {
  lines: CartLine[];
  onUpdateLine: (productVariantId: string, changes: Partial<Pick<CartLine, 'quantity'>>) => void;
  onRemoveLine: (productVariantId: string) => void;
  onClear?: () => void;
}

const money = (n: number): string => `$${n.toFixed(2)}`;

export function CartTable({ lines, onUpdateLine, onRemoveLine, onClear }: CartTableProps): React.JSX.Element {
  if (lines.length === 0) {
    return (
      <Stack spacing={1} alignItems="center" sx={{ py: 6, color: 'text.secondary' }}>
        <ShoppingCartIcon size={40} aria-hidden />
        <Typography variant="subtitle1" color="text.primary">
          Aún no hay productos
        </Typography>
        <Typography variant="body2" textAlign="center">
          Escanea un código de barras o busca por nombre para agregar el primer producto.
        </Typography>
      </Stack>
    );
  }

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">
          Carrito · {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
        </Typography>
        {onClear ? (
          <Button size="small" color="error" onClick={onClear}>
            Vaciar carrito
          </Button>
        ) : null}
      </Stack>

      <Stack component="ul" divider={<Box sx={{ borderTop: '1px solid var(--mui-palette-divider)' }} />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {lines.map((line) => {
          const overStock = line.stockQuantity !== undefined && line.quantity > line.stockQuantity;
          return (
            <Stack
              key={line.productVariantId}
              component="li"
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              alignItems={{ sm: 'center' }}
              sx={{ py: 1.5 }}
            >
              <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {line.description}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="caption" color="text.secondary">
                    {line.sku}
                  </Typography>
                  {overStock ? <Chip size="small" color="warning" label={`Solo hay ${line.stockQuantity} en existencia`} /> : null}
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 72, textAlign: { sm: 'right' } }} aria-label={`Precio de ${line.description}`}>
                {money(line.unitPrice)}
              </Typography>

              <Stack direction="row" alignItems="center" role="group" aria-label={`Cantidad de ${line.description}`}>
                <IconButton
                  aria-label="Quitar uno"
                  onClick={() => (line.quantity > 1 ? onUpdateLine(line.productVariantId, { quantity: line.quantity - 1 }) : onRemoveLine(line.productVariantId))}
                  sx={{ width: 40, height: 40, border: '1px solid var(--mui-palette-divider)' }}
                >
                  <MinusIcon />
                </IconButton>
                <TextField
                  type="number"
                  size="small"
                  value={line.quantity}
                  onChange={(e) => onUpdateLine(line.productVariantId, { quantity: Math.max(1, Math.floor(parseFloat(e.target.value)) || 1) })}
                  slotProps={{ htmlInput: { min: 1, step: 1, 'aria-label': 'Cantidad', style: { textAlign: 'center' } } }}
                  sx={{ width: 64, mx: 0.5 }}
                />
                <IconButton
                  aria-label="Agregar uno"
                  onClick={() => onUpdateLine(line.productVariantId, { quantity: line.quantity + 1 })}
                  sx={{ width: 40, height: 40, border: '1px solid var(--mui-palette-divider)' }}
                >
                  <PlusIcon />
                </IconButton>
              </Stack>

              <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 88, textAlign: 'right' }}>
                {money(line.unitPrice * line.quantity)}
              </Typography>

              <IconButton aria-label={`Quitar ${line.description} del carrito`} onClick={() => onRemoveLine(line.productVariantId)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                <TrashIcon />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
