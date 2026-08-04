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

const filterOptions = createFilterOptions<InventoryItem>({
  limit: 50,
  stringify: (option) =>
    `${option.description || ''} ${option.sku || ''} ${option.provider || ''} ${option.color || ''} ${option.size || ''} ${option.barcodes ? option.barcodes.join(' ') : ''}`,
});
import {
  ArrowsLeftRight as TransferIcon,
  Trash as TrashIcon,
  X as CloseIcon,
  Package as PackageIcon,
  CheckCircle as CheckIcon,
  MagnifyingGlass as SearchIcon,
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';
import { InventoryItem } from './inventory-table';

export interface StoreSimple {
  id: number;
  name: string;
  code: string;
}

export interface SelectedTransferItem {
  item: InventoryItem;
  quantity: number;
}

interface StockTransferDialogProps {
  open: boolean;
  onClose: () => void;
  stores: StoreSimple[];
  currentStoreId: number;
  onSuccess: (message: string) => void;
}

export function StockTransferDialog({
  open,
  onClose,
  stores,
  currentStoreId,
  onSuccess,
}: StockTransferDialogProps): React.JSX.Element {
  const [fromStoreId, setFromStoreId] = React.useState<number>(currentStoreId || 1);
  const [toStoreId, setToStoreId] = React.useState<number>(1);
  const [fromInventory, setFromInventory] = React.useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = React.useState<boolean>(false);
  const [transferItems, setTransferItems] = React.useState<SelectedTransferItem[]>([]);
  const [searchValue, setSearchValue] = React.useState<InventoryItem | null>(null);
  const [searchInputValue, setSearchInputValue] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Synchronize initial store selections when dialog opens or stores change
  React.useEffect(() => {
    if (open) {
      const initialFrom = currentStoreId || (stores[0] ? stores[0].id : 1);
      setFromStoreId(initialFrom);

      const otherStore = stores.find((s) => s.id !== initialFrom);
      setToStoreId(otherStore ? otherStore.id : initialFrom === 1 ? 2 : 1);
      setTransferItems([]);
      setSearchValue(null);
      setSearchInputValue('');
      setErrorMessage(null);
    }
  }, [open, currentStoreId, stores]);

  // Fetch inventory for selected Location A (fromStoreId)
  const fetchFromInventory = React.useCallback(async (storeId: number) => {
    setLoadingInventory(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get(`/Inventory?storeId=${storeId}`);
      if (Array.isArray(res.data)) {
        setFromInventory(res.data);
      } else {
        setFromInventory([]);
      }
    } catch (err) {
      console.error('Error fetching inventory for transfer source location:', err);
      setErrorMessage('No se pudo cargar el inventario de la ubicación de origen.');
      setFromInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && fromStoreId) {
      fetchFromInventory(fromStoreId);
    }
  }, [open, fromStoreId, fetchFromInventory]);

  // Update available stock for items in transfer list when fromInventory updates
  React.useEffect(() => {
    if (fromInventory.length > 0 && transferItems.length > 0) {
      setTransferItems((prev) =>
        prev.map((ti) => {
          const updatedItem = fromInventory.find((i) => i.productVariantId === ti.item.productVariantId);
          if (updatedItem) {
            const maxQty = Math.max(0, updatedItem.stockQuantity);
            return {
              item: updatedItem,
              quantity: ti.quantity > maxQty ? maxQty : ti.quantity,
            };
          }
          return ti;
        })
      );
    }
  }, [fromInventory]);

  // Filter out items already selected for transfer to keep search fast and clean
  const availableOptions = React.useMemo(() => {
    const selectedIds = new Set(transferItems.map((ti) => ti.item.productVariantId));
    return fromInventory.filter((item) => !selectedIds.has(item.productVariantId));
  }, [fromInventory, transferItems]);

  const handleFromStoreChange = (newFromId: number) => {
    setFromStoreId(newFromId);
    if (newFromId === toStoreId) {
      const otherStore = stores.find((s) => s.id !== newFromId);
      if (otherStore) {
        setToStoreId(otherStore.id);
      }
    }
  };

  const handleAddProduct = (itemToAdd: InventoryItem | null) => {
    if (!itemToAdd) return;

    // Check if already in transfer list
    const existingIndex = transferItems.findIndex(
      (ti) => ti.item.productVariantId === itemToAdd.productVariantId
    );

    if (existingIndex >= 0) {
      setErrorMessage(`El producto "${itemToAdd.description}" ya está en la lista de transferencia.`);
      setSearchValue(null);
      setSearchInputValue('');
      return;
    }

    const availableStock = Math.max(0, itemToAdd.stockQuantity);
    if (availableStock <= 0) {
      setErrorMessage(`El producto "${itemToAdd.description}" no tiene stock disponible en la Ubicación A.`);
    } else {
      setErrorMessage(null);
    }

    // Default quantity is 1 if stock >= 1, otherwise 0
    const initialQty = availableStock >= 1 ? 1 : 0;

    setTransferItems((prev) => [
      ...prev,
      { item: itemToAdd, quantity: initialQty },
    ]);

    setSearchValue(null);
    setSearchInputValue('');
  };

  const handleQuantityChange = (productVariantId: string, valStr: string) => {
    const rawVal = parseInt(valStr, 10);

    setTransferItems((prev) =>
      prev.map((ti) => {
        if (ti.item.productVariantId === productVariantId) {
          const availableStock = Math.max(0, ti.item.stockQuantity);

          if (isNaN(rawVal) || rawVal < 0) {
            return { ...ti, quantity: 0 };
          }

          // Enforce rule: "This number can never be greater than the available units on the location A"
          if (rawVal > availableStock) {
            return { ...ti, quantity: availableStock };
          }

          return { ...ti, quantity: rawVal };
        }
        return ti;
      })
    );
  };

  const handleRemoveProduct = (productVariantId: string) => {
    setTransferItems((prev) => prev.filter((ti) => ti.item.productVariantId !== productVariantId));
  };

  const isFormValid = React.useMemo(() => {
    if (fromStoreId === toStoreId) return false;
    if (transferItems.length === 0) return false;

    // Check every item: quantity must be >= 1 and <= available stock
    for (const ti of transferItems) {
      if (ti.quantity <= 0) return false;
      if (ti.quantity > ti.item.stockQuantity) return false;
    }
    return true;
  }, [fromStoreId, toStoreId, transferItems]);

  const handleSendTransfer = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const fromStoreObj = stores.find((s) => s.id === fromStoreId);
    const toStoreObj = stores.find((s) => s.id === toStoreId);

    try {
      const payload = {
        fromStoreId,
        toStoreId,
        items: transferItems.map((ti) => ({
          productVariantId: ti.item.productVariantId,
          quantity: ti.quantity,
        })),
      };

      await apiClient.post('/Inventory/transfer', payload);

      const msg = `Se transfirieron exitosamente ${transferItems.reduce((acc, i) => acc + i.quantity, 0)} unidades de ${fromStoreObj?.name || 'Origen'} a ${toStoreObj?.name || 'Destino'}.`;
      
      onSuccess(msg);
      onClose();
    } catch (err: any) {
      console.error('Transfer failed:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Ocurrió un error al procesar la transferencia.';
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
                bgcolor: 'primary.alpha12',
                color: 'primary.main',
                display: 'flex',
              }}
            >
              <TransferIcon size={24} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Transferir Productos Entre Ubicaciones
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Selecciona el origen (Ubicación A), el destino (Ubicación B) y los productos a enviar.
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
          {/* Location Selectors: Location A & Location B */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 5.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="from-store-label">🏢 Ubicación A (Origen)</InputLabel>
                  <Select
                    labelId="from-store-label"
                    value={fromStoreId}
                    label="🏢 Ubicación A (Origen)"
                    onChange={(e) => handleFromStoreChange(Number(e.target.value))}
                    sx={{ borderRadius: 1.5, bgcolor: 'background.paper', fontWeight: 600 }}
                  >
                    {stores.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        🏢 {s.name} ({s.code || `SUC-${s.id}`})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Ubicación desde donde se descontará el stock</FormHelperText>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 1 }} alignSelf="center" sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'text.secondary',
                    pt: { xs: 0, sm: 1 },
                  }}
                >
                  <TransferIcon size={24} />
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 5.5 }}>
                <FormControl fullWidth size="small" error={fromStoreId === toStoreId}>
                  <InputLabel id="to-store-label">🏢 Ubicación B (Destino)</InputLabel>
                  <Select
                    labelId="to-store-label"
                    value={toStoreId}
                    label="🏢 Ubicación B (Destino)"
                    onChange={(e) => setToStoreId(Number(e.target.value))}
                    sx={{ borderRadius: 1.5, bgcolor: 'background.paper', fontWeight: 600 }}
                  >
                    {stores.map((s) => (
                      <MenuItem key={s.id} value={s.id} disabled={s.id === fromStoreId}>
                        🏢 {s.name} ({s.code || `SUC-${s.id}`})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Ubicación donde se incrementará el stock</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            {fromStoreId === toStoreId && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                La Ubicación A (Origen) y la Ubicación B (Destino) deben ser diferentes.
              </Alert>
            )}
          </Paper>

          {/* Autocomplete Search Bar to find products */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Buscador de Productos (Ubicación A)
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
                const isOutOfStock = option.stockQuantity <= 0;

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
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={isOutOfStock ? 'error.main' : 'success.main'}
                        sx={{ display: 'block' }}
                      >
                        Stock: {option.stockQuantity} unid.
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

          {/* List of Products to Transfer */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Productos a Transferir ({transferItems.length})
              </Typography>
              {transferItems.length > 0 && (
                <Button size="small" color="secondary" onClick={() => setTransferItems([])}>
                  Limpiar Lista
                </Button>
              )}
            </Stack>

            {transferItems.length === 0 ? (
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
                    Selecciona productos en el buscador superior para agregarlos a la transferencia.
                  </Typography>
                </Stack>
              </Paper>
            ) : (
              <Stack spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                {transferItems.map(({ item, quantity }) => {
                  const availableStock = Math.max(0, item.stockQuantity);
                  const isInvalidQty = quantity <= 0 || quantity > availableStock;

                  return (
                    <Paper
                      key={item.productVariantId}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        borderColor: isInvalidQty ? 'error.main' : 'divider',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 7 }}>
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

                            {/* Required Stock info below product name */}
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              color={availableStock <= 0 ? 'error.main' : 'primary.main'}
                              sx={{ mt: 0.5, display: 'inline-block' }}
                            >
                              Stock disponible en Ubicación A: {availableStock} unidades
                            </Typography>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 9, sm: 4 }}>
                          <TextField
                            type="number"
                            label="Cantidad a enviar"
                            size="small"
                            fullWidth
                            value={quantity}
                            onChange={(e) => handleQuantityChange(item.productVariantId, e.target.value)}
                            slotProps={{
                              htmlInput: {
                                min: 1,
                                max: availableStock,
                              },
                            }}
                            error={isInvalidQty}
                            helperText={
                              quantity > availableStock
                                ? `Máximo ${availableStock} unidades`
                                : quantity <= 0
                                ? 'Debe ser al menos 1'
                                : ''
                            }
                          />
                        </Grid>

                        <Grid size={{ xs: 3, sm: 1 }} sx={{ textAlign: 'right' }}>
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
          color="primary"
          onClick={handleSendTransfer}
          disabled={!isFormValid || submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon size={20} />}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
