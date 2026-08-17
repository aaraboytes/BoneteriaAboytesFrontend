'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import apiClient from '@/lib/api-client';

interface ProductItem {
  id: number | string;
  description: string;
  price: number;
  cost: number;
  department?: string;
  genre?: string;
  model?: string;
}

interface SupplierProductsDialogProps {
  open: boolean;
  onClose: () => void;
  supplierId: number | null;
  supplierName: string;
  productIds: (number | string)[];
}

export function SupplierProductsDialog({
  open,
  onClose,
  supplierId,
  supplierName,
  productIds,
}: SupplierProductsDialogProps): React.JSX.Element {
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (open && supplierId) {
      setLoading(true);
      apiClient
        .get(`/Suppliers/${supplierId}`)
        .then((res: any) => {
          if (res.data && Array.isArray(res.data.products)) {
            setProducts(res.data.products);
          }
        })
        .catch((err: any) => console.error('Failed to load supplier products:', err))
        .finally(() => setLoading(false));
    }
  }, [open, supplierId]);

  const filteredProducts = React.useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        String(p.id).toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.model && p.model.toLowerCase().includes(q))
    );
  }, [products, search]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Productos de {supplierName}</Typography>
          <Chip label={`${productIds.length} productos`} color="primary" size="small" />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Buscar producto por ID, descripción o modelo..."
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>

        {loading ? (
          <Typography sx={{ py: 3, textAlign: 'center' }}>Cargando productos del proveedor...</Typography>
        ) : filteredProducts.length === 0 ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
            No se encontraron productos registrados para este proveedor.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID Producto</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Departamento</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell align="right">Precio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={String(p.id)} hover>
                  <TableCell>
                    <Chip label={`#${p.id}`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.description}</TableCell>
                  <TableCell>{p.department || 'General'}</TableCell>
                  <TableCell>{p.model || 'N/A'}</TableCell>
                  <TableCell align="right">${p.price?.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
