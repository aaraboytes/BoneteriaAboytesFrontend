'use client';

import * as React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
  createFilterOptions,
} from '@mui/material';
import {
  Plus as PlusIcon,
  Trash as TrashIcon,
  X as CloseIcon,
  Package as PackageIcon,
  CheckCircle as CheckIcon,
  MagnifyingGlass as SearchIcon,
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';
import { InventoryItem } from './inventory-table';
import { StoreSimple } from './stock-transfer-dialog';

export interface SelectedIntakeItem {
  item: InventoryItem;
  quantityToAdd: number;
}

interface StockIntakeDialogProps {
  open: boolean;
  onClose: () => void;
  stores: StoreSimple[];
  currentStoreId: number;
  onSuccess: (message: string) => void;
}

const filterOptions = createFilterOptions<InventoryItem>({
  limit: 50,
  stringify: (option) =>
    `${option.description || ''} ${option.sku || ''} ${option.provider || ''} ${option.color || ''} ${option.size || ''} ${option.barcodes ? option.barcodes.join(' ') : ''}`,
});

export function StockIntakeDialog({
  open,
  onClose,
  stores,
  currentStoreId,
  onSuccess,
}: StockIntakeDialogProps): React.JSX.Element {
  const [selectedStoreId, setSelectedStoreId] = React.useState<number>(currentStoreId || 1);
  const [storeInventory, setStoreInventory] = React.useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = React.useState<boolean>(false);
  const [intakeItems, setIntakeItems] = React.useState<SelectedIntakeItem[]>([]);
  const [searchValue, setSearchValue] = React.useState<InventoryItem | null>(null);
  const [searchInputValue, setSearchInputValue] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Synchronize initial store selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedStoreId(currentStoreId || (stores[0] ? stores[0].id : 1));
      setIntakeItems([]);
      setSearchValue(null);
      setSearchInputValue('');
      setErrorMessage(null);
    }
  }, [open, currentStoreId, stores]);

  // Fetch inventory for selected store to get current stock levels
  const fetchStoreInventory = React.useCallback(async (storeId: number) => {
    setLoadingInventory(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get(`/Inventory?storeId=${storeId}`);
      if (Array.isArray(res.data)) {
        setStoreInventory(res.data);
      } else {
        setStoreInventory([]);
      }
    } catch (err) {
      console.error('Error fetching inventory for store intake:', err);
      setErrorMessage('No se pudo cargar el inventario de la sucursal seleccionada.');
      setStoreInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && selectedStoreId) {
      fetchStoreInventory(selectedStoreId);
    }
  }, [open, selectedStoreId, fetchStoreInventory]);

  // Update current stock in intake items list when storeInventory refreshes
  React.useEffect(() => {
    if (storeInventory.length > 0 && intakeItems.length > 0) {
      setIntakeItems((prev) =>
        prev.map((ti) => {
          const updatedItem = storeInventory.find((i) => i.productVariantId === ti.item.productVariantId);
          if (updatedItem) {
            return {
              ...ti,
              item: updatedItem,
            };
          }
          return ti;
        })
      );
    }
  }, [storeInventory]);

  // Exclude already added items from autocomplete options for speed & convenience
  const availableOptions = React.useMemo(() => {
    const selectedIds = new Set(intakeItems.map((ti) => ti.item.productVariantId));
    return storeInventory.filter((item) => !selectedIds.has(item.productVariantId));
  }, [storeInventory, intakeItems]);

  const handleAddProduct = (itemToAdd: InventoryItem | null) => {
    if (!itemToAdd) return;

    const existingIndex = intakeItems.findIndex(
      (ti) => ti.item.productVariantId === itemToAdd.productVariantId
    );

    if (existingIndex >= 0) {
      setErrorMessage(`El producto "${itemToAdd.description}" ya está en la lista de ingreso.`);
      setSearchValue(null);
      setSearchInputValue('');
      return;
    }

    setErrorMessage(null);

    // Default 1 unit to add
    setIntakeItems((prev) => [
      ...prev,
      { item: itemToAdd, quantityToAdd: 1 },
    ]);

    setSearchValue(null);
    setSearchInputValue('');
  };

  const handleQuantityChange = (productVariantId: string, valStr: string) => {
    const rawVal = parseInt(valStr, 10);

    setIntakeItems((prev) =>
      prev.map((ti) => {
        if (ti.item.productVariantId === productVariantId) {
          if (isNaN(rawVal) || rawVal < 1) {
            return { ...ti, quantityToAdd: 1 };
          }
          return { ...ti, quantityToAdd: rawVal };
        }
        return ti;
      })
    );
  };

  const handleRemoveProduct = (productVariantId: string) => {
    setIntakeItems((prev) => prev.filter((ti) => ti.item.productVariantId !== productVariantId));
  };

  const isFormValid = React.useMemo(() => {
    if (intakeItems.length === 0) return false;
    for (const ti of intakeItems) {
      if (ti.quantityToAdd <= 0) return false;
    }
    return true;
  }, [intakeItems]);

  const handleSendIntake = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const storeObj = stores.find((s) => s.id === selectedStoreId);
    const storeName = storeObj ? storeObj.name : `Sucursal #${selectedStoreId}`;

    try {
      const payload = {
        storeId: selectedStoreId,
        items: intakeItems.map((ti) => ({
          productVariantId: ti.item.productVariantId,
          quantity: ti.quantityToAdd,
        })),
      };

      await apiClient.post('/Inventory/bulk-adjust', payload);

      const msg = `Producto añadido a ${storeName}`;
      
      onSuccess(msg);
      onClose();
    } catch (err: any) {
      console.error('Stock intake failed:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Ocurrió un error al ingresar el inventario.';
      setErrorMessage(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'success.alpha12',
                color: 'success.main',
                display: 'flex',
              }}
            >
              <PlusIcon size={24} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Ingresar Productos a Inventario
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Selecciona la sucursal de destino y registra nuevas unidades de stock.
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={3}>
          {/* Target Store Selector Dropdown */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <FormControl fullWidth size="small">
              <InputLabel id="intake-store-label">🏢 Sucursal / Tienda de Destino</InputLabel>
              <Select
                labelId="intake-store-label"
                value={selectedStoreId}
                label="🏢 Sucursal / Tienda de Destino"
                onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                sx={{ borderRadius: 1.5, bgcolor: 'background.paper', fontWeight: 700 }}
              >
                {stores.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    🏢 {s.name} ({s.code || `SUC-${s.id}`})
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Sucursal donde se incrementará el inventario</FormHelperText>
            </FormControl>
          </Paper>

          {/* Autocomplete Search Bar */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Buscador de Productos
            </Typography>
            <Autocomplete
              options={availableOptions}
              filterOptions={filterOptions}
              autoHighlight
              loading={loadingInventory}
              value={searchValue}
              inputValue={searchInputValue}
              onInputChange={(_, newInputValue) => setSearchInputValue(newInputValue)}
              onChange={(_, value) => handleAddProduct(value)}
              getOptionLabel={(option) =>
                `${option.description} - SKU: ${option.sku || 'N/A'}${option.size !== 'N/A' ? ` | Talla: ${option.size}` : ''}${option.color !== 'N/A' ? ` | Color: ${option.color}` : ''}`
              }
              renderOption={(props, option) => {
                const { key, ...otherProps } = props as any;
                return (
                  <Box
                    component="li"
                    key={key || option.productVariantId}
                    {...otherProps}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      px: 2,
                      borderBottom: '1px solid var(--mui-palette-divider)',
                    }}
                  >
                    <Box sx={{ pr: 2 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {option.description}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        {option.sku && <Chip label={`SKU: ${option.sku}`} size="small" variant="outlined" />}
                        {option.size && option.size !== 'N/A' && (
                          <Chip label={`Talla: ${option.size}`} size="small" variant="outlined" />
                        )}
                        {option.color && option.color !== 'N/A' && (
                          <Chip label={`Color: ${option.color}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block' }}>
                        Stock actual: {option.stockQuantity} unid.
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Buscar por Descripción, SKU, Proveedor, Código de barras..."
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={20} color="var(--mui-palette-text-secondary)" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {loadingInventory ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                    },
                  }}
                />
              )}
              ListboxProps={{
                style: {
                  maxHeight: 250,
                },
              }}
            />
          </Box>

          {/* List of Products to Add */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Productos a Ingresar ({intakeItems.length})
              </Typography>
              {intakeItems.length > 0 && (
                <Button size="small" color="secondary" onClick={() => setIntakeItems([])}>
                  Limpiar Lista
                </Button>
              )}
            </Stack>

            {intakeItems.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: 'background.neutral',
                  borderStyle: 'dashed',
                }}
              >
                <Stack spacing={1} alignItems="center">
                  <PackageIcon size={40} color="var(--mui-palette-text-disabled)" />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Lista vacía
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Selecciona productos en el buscador superior para registrarlos en el ingreso.
                  </Typography>
                </Stack>
              </Paper>
            ) : (
              <Stack spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                {intakeItems.map(({ item, quantityToAdd }) => {
                  const currentStock = item.stockQuantity || 0;
                  const totalStock = currentStock + (quantityToAdd || 0);

                  return (
                    <Paper
                      key={item.productVariantId}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 5 }}>
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {item.description}
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                              {item.sku && <Chip label={`SKU: ${item.sku}`} size="small" variant="outlined" />}
                              {item.size && item.size !== 'N/A' && (
                                <Chip label={`Talla: ${item.size}`} size="small" variant="outlined" />
                              )}
                              {item.color && item.color !== 'N/A' && (
                                <Chip label={`Color: ${item.color}`} size="small" variant="outlined" />
                              )}
                            </Stack>

                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              Stock actual: {currentStock} unidades
                            </Typography>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField
                            type="number"
                            label="Cantidad a ingresar"
                            size="small"
                            fullWidth
                            value={quantityToAdd}
                            onChange={(e) => handleQuantityChange(item.productVariantId, e.target.value)}
                            slotProps={{
                              htmlInput: {
                                min: 1,
                              },
                            }}
                          />
                        </Grid>

                        {/* Calculation Total = current + (insertedValue) */}
                        <Grid size={{ xs: 5, sm: 3 }} sx={{ textAlign: 'right' }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1.5,
                              bgcolor: 'success.alpha12',
                              border: '1px solid var(--mui-palette-success-main)',
                              display: 'inline-block',
                              width: '100%',
                            }}
                          >
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
                              Total (Actual + Ingreso)
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="success.main">
                              {totalStock} unid.
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              ({currentStock} + {quantityToAdd})
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 1, sm: 1 }} sx={{ textAlign: 'right' }}>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveProduct(item.productVariantId)}
                            title="Eliminar producto"
                          >
                            <TrashIcon size={20} />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          {errorMessage && (
            <Alert severity="error" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={handleSendIntake}
          disabled={!isFormValid || submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon size={20} />}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          {submitting ? 'Guardando...' : 'Agregar a inventario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
