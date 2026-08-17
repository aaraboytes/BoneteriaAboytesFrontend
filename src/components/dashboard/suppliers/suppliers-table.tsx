'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';

import apiClient from '@/lib/api-client';
import { SupplierDialog, SupplierFormData } from './supplier-dialog';
import { SupplierProductsDialog } from './supplier-products-dialog';

export interface SupplierItem {
  id: number;
  name: string;
  email: string;
  telephone: string;
  address: string;
  products: (number | string)[];
  productsCount: number;
}

export function SuppliersTable(): React.JSX.Element {
  const [suppliers, setSuppliers] = React.useState<SupplierItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<SupplierItem | null>(null);

  // Products preview dialog state
  const [productsDialogOpen, setProductsDialogOpen] = React.useState(false);
  const [viewProductsSupplier, setViewProductsSupplier] = React.useState<SupplierItem | null>(null);

  const fetchSuppliers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/Suppliers');
      if (Array.isArray(res.data)) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = React.useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.telephone.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.products.some((pId) => String(pId).includes(q))
    );
  }, [suppliers, search]);

  const paginatedSuppliers = React.useMemo(() => {
    return filteredSuppliers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredSuppliers, page, rowsPerPage]);

  const handleSaveSupplier = async (data: SupplierFormData) => {
    if (data.id) {
      await apiClient.put(`/Suppliers/${data.id}`, data);
    } else {
      await apiClient.post('/Suppliers', data);
    }
    await fetchSuppliers();
  };

  const handleDeleteSupplier = async (id: number, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${name}"?`)) {
      try {
        await apiClient.delete(`/Suppliers/${id}`);
        await fetchSuppliers();
      } catch (err) {
        console.error('Failed to delete supplier:', err);
      }
    }
  };

  const handleOpenAddDialog = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (supplier: SupplierItem) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleOpenProductsDialog = (supplier: SupplierItem) => {
    setViewProductsSupplier(supplier);
    setProductsDialogOpen(true);
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <OutlinedInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            placeholder="Buscar proveedores por nombre, correo, teléfono, dirección o ID producto..."
            startAdornment={
              <InputAdornment position="start">
                <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
              </InputAdornment>
            }
            sx={{ maxWidth: '600px' }}
          />
          <Button variant="contained" onClick={handleOpenAddDialog}>
            + Nuevo Proveedor
          </Button>
        </Stack>
      </Card>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '800px' }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre / Empresa</TableCell>
                <TableCell>Correo Electrónico</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>Productos Suministrados (IDs)</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    Cargando catálogo de proveedores...
                  </TableCell>
                </TableRow>
              ) : paginatedSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No se encontraron proveedores registrados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((s) => (
                  <TableRow key={String(s.id)} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        #{s.id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell>{s.email || '-'}</TableCell>
                    <TableCell>{s.telephone || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.address || '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {s.products && s.products.length > 0 ? (
                          <>
                            {s.products.slice(0, 3).map((pId) => (
                              <Chip key={String(pId)} label={`#${pId}`} size="small" variant="outlined" />
                            ))}
                            {s.products.length > 3 && (
                              <Chip
                                label={`+${s.products.length - 3} más`}
                                size="small"
                                color="primary"
                                onClick={() => handleOpenProductsDialog(s)}
                                sx={{ cursor: 'pointer' }}
                              />
                            )}
                            <Tooltip title="Ver lista completa de productos">
                              <IconButton size="small" color="info" onClick={() => handleOpenProductsDialog(s)}>
                                <EyeIcon size={18} />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Sin productos asociados
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Ver productos">
                          <IconButton color="primary" size="small" onClick={() => handleOpenProductsDialog(s)}>
                            <PackageIcon size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar proveedor">
                          <IconButton color="info" size="small" onClick={() => handleOpenEditDialog(s)}>
                            <PencilIcon size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar proveedor">
                          <IconButton color="error" size="small" onClick={() => handleDeleteSupplier(s.id, s.name)}>
                            <TrashIcon size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={filteredSuppliers.length}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      <SupplierDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveSupplier}
        initialData={selectedSupplier}
      />

      <SupplierProductsDialog
        open={productsDialogOpen}
        onClose={() => setProductsDialogOpen(false)}
        supplierId={viewProductsSupplier?.id ?? null}
        supplierName={viewProductsSupplier?.name ?? ''}
        productIds={viewProductsSupplier?.products ?? []}
      />
    </Stack>
  );
}
