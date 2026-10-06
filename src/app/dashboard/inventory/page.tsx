'use client';

import * as React from 'react';
import { Stack, Typography, Alert, Button, Snackbar } from '@mui/material';
import apiClient from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';
import { InventoryTable, InventoryItem } from '@/components/dashboard/inventory/inventory-table';
import { StockTransferDialog } from '@/components/dashboard/inventory/stock-transfer-dialog';
import { StockIntakeDialog } from '@/components/dashboard/inventory/stock-intake-dialog';
import { StockWithdrawalDialog } from '@/components/dashboard/inventory/stock-withdrawal-dialog';
import { MissingProductsDialog } from '@/components/dashboard/inventory/missing-products-dialog';
import {
  ArrowsClockwise as RefreshIcon,
  ArrowsLeftRight as TransferIcon,
  Plus as PlusIcon,
  Warning as WarningIcon,
} from '@phosphor-icons/react';

export interface StoreSimple {
  id: number;
  name: string;
  code: string;
}

export default function InventoryPage(): React.JSX.Element {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [stores, setStores] = React.useState<StoreSimple[]>([]);
  const { user } = useUser();
  // 0 = not chosen yet: wait for the store list instead of assuming store 1 exists.
  const [selectedStoreId, setSelectedStoreId] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog States
  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const [intakeDialogOpen, setIntakeDialogOpen] = React.useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = React.useState(false);
  const [missingDialogOpen, setMissingDialogOpen] = React.useState(false);

  // Toast Notification State
  const [toast, setToast] = React.useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const fetchStores = async () => {
    try {
      const res = await apiClient.get('/Stores');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setStores(res.data);
        // Start on the user's own store when they have one.
        const own = res.data.find((st: StoreSimple) => st.id === user?.storeId);
        setSelectedStoreId((own ?? res.data[0]).id);
      } else {
        setLoading(false);
        setError('No hay sucursales registradas todavía.');
      }
    } catch (err) {
      console.error('Failed to fetch stores', err);
      setLoading(false);
      setError('No se pudo cargar la lista de sucursales.');
    }
  };

  const fetchInventory = async (storeId: number = selectedStoreId) => {
    if (!storeId) return;
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
            model: p.model?.name || 'N/A',
            size: v?.size?.name || 'N/A',
            color: v?.color?.name || 'N/A',
            price: p.price,
            cost: p.cost,
            stockQuantity:
              v?.inventories?.find((inv: any) => inv.storeId === storeId)?.stockQuantity ?? 0,
            barcodes: v?.barcodes ? v.barcodes.map((b: any) => b.barcode) : [],
            mapLocation: p.mapLocation && Array.isArray(p.mapLocation) ? p.mapLocation : [],
          };
        });
        setItems(fallbackItems);
      }
    } catch (err) {
      console.error('Failed to fetch inventory from API', err);
      setError('No se pudo cargar el inventario de esta sucursal. Lo que ves puede estar desactualizado.');
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
    } catch (err: any) {
      // Keep showing the real stock: the server refused the change (e.g. it would go below zero).
      console.error('Failed to adjust stock on backend', err);
      setError(err?.response?.data?.message || 'No se pudo ajustar el inventario.');
    }
  };

  const handleUpdateProduct = async (updatedItem: InventoryItem) => {
    const original = items.find((i) => i.productVariantId === updatedItem.productVariantId);
    if (!original) return;

    // 1. Stock quantity adjustment if changed
    if (original.stockQuantity !== updatedItem.stockQuantity) {
      const delta = updatedItem.stockQuantity - original.stockQuantity;
      try {
        await apiClient.post('/Inventory/adjust', {
          productVariantId: updatedItem.productVariantId,
          storeId: selectedStoreId,
          quantityDelta: delta,
        });
      } catch (err: any) {
        console.error('Failed to adjust stock on backend', err);
        throw new Error(err?.response?.data?.message || 'No se pudo ajustar el inventario.');
      }
    }

    // 2. Product fields update if changed
    try {
      await apiClient.put(`/Products/${updatedItem.productId}`, {
        id: updatedItem.productId,
        description: updatedItem.description,
        price: updatedItem.price,
        cost: updatedItem.cost,
        mapLocation: updatedItem.mapLocation,
      });
    } catch (err: any) {
      // Throwing keeps the edit dialog open with the reason, instead of showing the change as saved.
      console.error('Failed to update product details on backend', err);
      throw new Error(err?.response?.data?.message || 'No se pudieron guardar los datos del producto.');
    }

    // 3. Update local state
    setItems((prev) =>
      prev.map((i) => (i.productVariantId === updatedItem.productVariantId ? { ...i, ...updatedItem } : i))
    );
  };

  const handleSuccessAction = (message: string) => {
    setToast({ open: true, message });
    fetchInventory(selectedStoreId);
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h2" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Inventario y Stock
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Existencias por sucursal. Ingresa mercancía, transfiérela entre tiendas o revisa qué falta.
        </Typography>
      </Stack>

          {error && (
            <Alert
              severity="warning"
              onClose={() => setError(null)}
              action={
                selectedStoreId ? (
                  <Button color="inherit" size="small" onClick={() => fetchInventory(selectedStoreId)}>
                    Reintentar
                  </Button>
                ) : undefined
              }
            >
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
            onUpdateProduct={handleUpdateProduct}
            onOpenTransfer={() => setTransferDialogOpen(true)}
            onOpenIntake={() => setIntakeDialogOpen(true)}
            onOpenWithdrawal={() => setWithdrawalDialogOpen(true)}
            onOpenMissing={() => setMissingDialogOpen(true)}
          />

      {/* Missing Products Dialog */}
      <MissingProductsDialog
        open={missingDialogOpen}
        onClose={() => setMissingDialogOpen(false)}
        stores={stores}
        currentStoreId={selectedStoreId}
      />

      {/* Stock Intake Dialog */}
      <StockIntakeDialog
        open={intakeDialogOpen}
        onClose={() => setIntakeDialogOpen(false)}
        stores={stores}
        currentStoreId={selectedStoreId}
        onSuccess={handleSuccessAction}
      />

      {/* Stock Withdrawal Dialog */}
      <StockWithdrawalDialog
        open={withdrawalDialogOpen}
        onClose={() => setWithdrawalDialogOpen(false)}
        stores={stores}
        currentStoreId={selectedStoreId}
        onSuccess={handleSuccessAction}
      />

      {/* Stock Transfer Dialog */}
      <StockTransferDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        stores={stores}
        currentStoreId={selectedStoreId}
        onSuccess={handleSuccessAction}
      />

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity="success"
          variant="filled"
          sx={{ width: '100%', fontWeight: 700, borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

