'use client';

import * as React from 'react';
import { Box, Button, Container, Stack, Typography, CircularProgress, Alert } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import apiClient from '@/lib/api-client';

import { ProductsTable, Product } from '@/components/dashboard/products/products-table';
import { ProductDialog } from '@/components/dashboard/products/product-dialog';

export default function ProductsPage(): React.JSX.Element {
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

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
            setError('Error al cargar la lista de productos del servidor.');
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

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await apiClient.delete(`/Products/${id}`);
            fetchProducts();
        } catch (err) {
            console.error('Failed to delete product', err);
            alert('Failed to delete product');
        }
    };

    const handleSave = async (productData: Partial<Product>) => {
        try {
            if (selectedProduct) {
                await apiClient.put(`/Products/${selectedProduct.id}`, productData);
            } else {
                await apiClient.post('/Products', productData);
            }
            setDialogOpen(false);
            fetchProducts();
        } catch (err) {
            console.error('Failed to save product', err);
            alert('Failed to save product');
        }
    };

    return (
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                py: 8,
            }}
        >
            <Container maxWidth="xl">
                <Stack spacing={4}>
                    <Stack direction="row" spacing={3} justifyContent="space-between" alignItems="center">
                        <Stack spacing={1}>
                            <Typography variant="h4">Products</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Manage your clinic's product catalog and inventory.
                            </Typography>
                        </Stack>
                        <Button
                            startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
                            variant="contained"
                            onClick={handleAdd}
                        >
                            Add Product
                        </Button>
                    </Stack>

                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <ProductsTable 
                            products={products} 
                            onEdit={handleEdit} 
                            onDelete={handleDelete} 
                        />
                    )}
                </Stack>
            </Container>

            <ProductDialog
                open={dialogOpen}
                product={selectedProduct}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
            />
        </Box>
    );
}
