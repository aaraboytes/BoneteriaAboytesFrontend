'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography, Alert, Button } from '@mui/material';
import apiClient from '@/lib/api-client';
import { InventoryTable, InventoryItem } from '@/components/dashboard/inventory/inventory-table';
import { ArrowsClockwise as RefreshIcon } from '@phosphor-icons/react';

export interface StoreSimple {
  id: number;
  name: string;
  code: string;
}

export default function InventoryPage(): React.JSX.Element {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [stores, setStores] = React.useState<StoreSimple[]>([]);
  const [selectedStoreId, setSelectedStoreId] = React.useState<number>(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStores = async () => {
    try {
      const res = await apiClient.get('/Stores');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setStores(res.data);
        if (!selectedStoreId) {
          setSelectedStoreId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch stores', err);
    }
  };

  const fetchInventory = async (storeId: number = selectedStoreId) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get(`/Inventory?storeId=${storeId}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setItems(res.data);
      } else {
        const prodRes = await apiClient.get('/Products');
        const fallbackItems: InventoryItem[] = prodRes.data.map((p: any) => {
          const v = p.variants && p.variants.length > 0 ? p.variants[0] : null;
          return {
            id: v ? v.id : String(p.id),
            productVariantId: v ? v.id : String(p.id),
            productId: p.id,
            sku: v?.sku || `SKU-${p.id}`,
            description: p.description,
            provider: p.supplier?.name || 'Sin Proveedor',
            department: p.department?.name || 'General',
            genre: p.genre?.name || 'N/A',
            size: v?.size?.name || 'N/A',
            color: v?.color?.name || 'N/A',
            price: p.price,
            cost: p.cost,
            stockQuantity: v?.inventory?.stockQuantity ?? 10,
            barcodes: v?.barcodes ? v.barcodes.map((b: any) => b.barcode) : [],
          };
        });
        setItems(fallbackItems);
      }
    } catch (err) {
      console.error('Failed to fetch inventory from API', err);
      setError('No se pudo conectar con el servidor backend PostgreSQL. Mostrando catálogo local.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStores();
  }, []);

  React.useEffect(() => {
    fetchInventory(selectedStoreId);
  }, [selectedStoreId]);

  const handleAdjustStock = async (variantId: string, newStock: number) => {
    const item = items.find((i) => i.productVariantId === variantId);
    if (!item) return;
    const delta = newStock - item.stockQuantity;

    try {
      await apiClient.post('/Inventory/adjust', {
        productVariantId: variantId,
        storeId: selectedStoreId,
        quantityDelta: delta,
      });
      setItems((prev) =>
        prev.map((i) => (i.productVariantId === variantId ? { ...i, stockQuantity: newStock } : i))
      );
    } catch (err) {
      console.error('Failed to adjust stock on backend', err);
      setItems((prev) =>
        prev.map((i) => (i.productVariantId === variantId ? { ...i, stockQuantity: newStock } : i))
      );
    }
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 4,
        px: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Stack direction="row" spacing={3} justifyContent="space-between" alignItems="center">
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={800}>
                Gestión De Inventarios & Stock
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Catálogo inteligente con selección de Sucursal / Tienda independiente y filtros por columna.
              </Typography>
            </Stack>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => fetchInventory(selectedStoreId)}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Actualizar Inventario
            </Button>
          </Stack>

          {error && (
            <Alert severity="warning" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <InventoryTable
            items={items}
            stores={stores}
            selectedStoreId={selectedStoreId}
            onStoreChange={(id) => setSelectedStoreId(id)}
            loading={loading}
            onRefresh={() => fetchInventory(selectedStoreId)}
            onAdjustStock={handleAdjustStock}
          />
        </Stack>
      </Container>
    </Box>
  );
}
