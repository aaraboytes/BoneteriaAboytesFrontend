'use client';

import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
    Stack,
    Typography,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import apiClient from '@/lib/api-client';

import { ProductsTable, Product } from '@/components/dashboard/products/products-table';
import { ProductDialog } from '@/components/dashboard/products/product-dialog';

const errorMessage = (err: any, fallback: string): string => err?.response?.data?.message || err?.response?.data?.title || fallback;

export default function ProductsPage(): React.JSX.Element {
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
    const [toDelete, setToDelete] = React.useState<Product | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState<string | null>(null);
    const [toast, setToast] = React.useState<string | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/Products');
            if (Array.isArray(res.data)) {
                setProducts(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch products', err);
            setError('No se pudo cargar el catálogo de productos.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchProducts();
    }, []);

    const handleAdd = () => {
        setSelectedProduct(null);
        setDialogOpen(true);
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setDialogOpen(true);
    };

    const askDelete = (id: number) => {
        setDeleteError(null);
        setToDelete(products.find((p) => p.id === id) ?? null);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await apiClient.delete(`/Products/${toDelete.id}`);
            setToast(`Producto "${toDelete.name || toDelete.description}" eliminado.`);
            setToDelete(null);
            fetchProducts();
        } catch (err) {
            console.error('Failed to delete product', err);
            setDeleteError(errorMessage(err, 'No se pudo eliminar el producto. Puede tener ventas o movimientos registrados.'));
        } finally {
            setDeleting(false);
        }
    };

    // Throws on failure so the dialog stays open and shows what went wrong.
    const handleSave = async (productData: Partial<Product>) => {
        const payload = {
            ...productData,
            description: productData.name || productData.description || 'Producto',
        };
        try {
            if (selectedProduct) {
                await apiClient.put(`/Products/${selectedProduct.id}`, payload);
            } else {
                await apiClient.post('/Products', payload);
            }
        } catch (err) {
            console.error('Failed to save product', err);
            throw new Error(errorMessage(err, 'No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.'));
        }
        setDialogOpen(false);
        setToast(selectedProduct ? 'Cambios guardados.' : 'Producto agregado.');
        fetchProducts();
    };

    return (
        <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" component="h2">Productos</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Catálogo de la tienda: precios, existencias y ubicación en el mapa.
                    </Typography>
                </Stack>
                <Button startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />} variant="contained" onClick={handleAdd}>
                    Agregar producto
                </Button>
            </Stack>

            {error && (
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={fetchProducts}>
                            Reintentar
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} role="status" aria-label="Cargando productos">
                    <CircularProgress />
                </Box>
            ) : (
                <ProductsTable products={products} onEdit={handleEdit} onDelete={askDelete} onAdd={handleAdd} />
            )}

            <ProductDialog open={dialogOpen} product={selectedProduct} onClose={() => setDialogOpen(false)} onSave={handleSave} />

            <Dialog open={toDelete !== null} onClose={deleting ? undefined : () => setToDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>¿Eliminar este producto?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Se eliminará <strong>{toDelete?.name || toDelete?.description}</strong> del catálogo. Esta acción no se puede deshacer.
                    </DialogContentText>
                    {deleteError ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {deleteError}
                        </Alert>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setToDelete(null)} disabled={deleting} color="inherit">
                        Conservar
                    </Button>
                    <Button onClick={confirmDelete} disabled={deleting} color="error" variant="contained">
                        {deleting ? 'Eliminando…' : 'Eliminar producto'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setToast(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
                    {toast}
                </Alert>
            </Snackbar>
        </Stack>
    );
}
