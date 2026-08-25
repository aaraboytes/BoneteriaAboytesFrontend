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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  FileArrowDown as FileArrowDownIcon,
  FileArrowUp as FileArrowUpIcon,
} from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import apiClient from '@/lib/api-client';
import { InventoryItem } from './inventory-table';
import { StockTransferReportDialog, TransferReportData } from './stock-transfer-report-dialog';

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
  const [generatedReport, setGeneratedReport] = React.useState<TransferReportData | null>(null);
  const [showReportModal, setShowReportModal] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        userName: 'Administrador',
        items: transferItems.map((ti) => ({
          productVariantId: ti.item.productVariantId,
          quantity: ti.quantity,
        })),
      };

      const res = await apiClient.post('/Inventory/transfer', payload);

      const msg = `Se transfirieron exitosamente ${transferItems.reduce((acc, i) => acc + i.quantity, 0)} unidades de ${fromStoreObj?.name || 'Origen'} a ${toStoreObj?.name || 'Destino'}.`;
      onSuccess(msg);

      if (res.data && res.data.report) {
        setGeneratedReport(res.data.report);
        setShowReportModal(true);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Transfer failed:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Ocurrió un error al procesar la transferencia.';
      setErrorMessage(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateFormat = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transferencia de Inventario');

      worksheet.columns = [
        { header: 'ID Producto', key: 'productId', width: 18, style: { numFmt: '0' } },
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Descripción', key: 'description', width: 45 },
        { header: 'Modelo', key: 'model', width: 18 },
        { header: 'Talla', key: 'size', width: 14 },
        { header: 'Color', key: 'color', width: 14 },
        { header: 'Stock Disponible', key: 'availableStock', width: 18 },
        { header: 'Cantidad a Enviar', key: 'cantidad', width: 18 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '15B79E' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 24;

      const targetItems =
        transferItems.length > 0
          ? transferItems.map((i) => ({ item: i.item, qty: i.quantity || 0 }))
          : fromInventory.map((i) => ({ item: i, qty: 0 }));

      targetItems.forEach(({ item, qty }) => {
        const avail = Math.max(0, item.stockQuantity || 0);
        const row = worksheet.addRow({
          productId: item.productId || item.productVariantId || item.id,
          sku: item.sku || 'N/A',
          description: item.description || 'Sin Descripción',
          model: item.model || 'N/A',
          size: item.size || 'N/A',
          color: item.color || 'N/A',
          availableStock: avail,
          cantidad: qty || 0,
        });

        row.getCell('availableStock').alignment = { horizontal: 'right' };
        row.getCell('cantidad').alignment = { horizontal: 'right' };
        row.getCell('cantidad').font = { bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fromStoreObj = stores.find((s) => s.id === fromStoreId);
      const toStoreObj = stores.find((s) => s.id === toStoreId);
      const fromName = fromStoreObj ? fromStoreObj.name.replace(/[^a-zA-Z0-9_-]/g, '_') : `Sucursal_${fromStoreId}`;
      const toName = toStoreObj ? toStoreObj.name.replace(/[^a-zA-Z0-9_-]/g, '_') : `Sucursal_${toStoreId}`;
      const dateStr = new Date().toISOString().split('T')[0];

      saveAs(blob, `Formato_Transferencia_${fromName}_a_${toName}_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Failed to generate XLSX transfer format:', err);
    }
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFormat = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setErrorMessage('El archivo Excel no contiene ninguna hoja de trabajo válida.');
        return;
      }

      let idColIdx = -1;
      let qtyColIdx = -1;
      let skuColIdx = -1;

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const val = String(cell.value || '').trim().toLowerCase();
        if (val.includes('id producto') || val === 'id' || val.includes('productid') || val.includes('id_producto')) {
          idColIdx = colNumber;
        } else if (val.includes('sku')) {
          skuColIdx = colNumber;
        } else if (val.includes('cantidad') || val.includes('enviar') || val.includes('amount') || val.includes('cant')) {
          qtyColIdx = colNumber;
        }
      });

      if (idColIdx === -1 && skuColIdx === -1) {
        setErrorMessage('No se encontró la columna "ID Producto" o "SKU" en el archivo Excel.');
        return;
      }

      if (qtyColIdx === -1) {
        setErrorMessage('No se encontró la columna "Cantidad a Enviar" en el archivo Excel.');
        return;
      }

      const inventoryByIdMap = new Map<string, InventoryItem>();
      fromInventory.forEach((item) => {
        if (item.productId !== undefined && item.productId !== null) inventoryByIdMap.set(String(item.productId).trim(), item);
        if (item.productVariantId !== undefined && item.productVariantId !== null) inventoryByIdMap.set(String(item.productVariantId).trim(), item);
        if (item.id !== undefined && item.id !== null) inventoryByIdMap.set(String(item.id).trim(), item);
        if (item.sku) inventoryByIdMap.set(String(item.sku).trim().toLowerCase(), item);
      });

      const newTransferItemsMap = new Map<string | number, SelectedTransferItem>();
      transferItems.forEach((existing) => {
        newTransferItemsMap.set(existing.item.productVariantId || existing.item.id, existing);
      });

      let importedCount = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rawIdVal = idColIdx !== -1 ? row.getCell(idColIdx).value : null;
        const rawSkuVal = skuColIdx !== -1 ? row.getCell(skuColIdx).value : null;
        const rawQtyVal = row.getCell(qtyColIdx).value;

        let qtyNum = 0;
        if (typeof rawQtyVal === 'number') {
          qtyNum = rawQtyVal;
        } else if (typeof rawQtyVal === 'object' && rawQtyVal !== null && 'result' in rawQtyVal) {
          qtyNum = Number((rawQtyVal as any).result) || 0;
        } else if (typeof rawQtyVal === 'string') {
          qtyNum = parseFloat(rawQtyVal.trim()) || 0;
        }

        if (qtyNum <= 0) return;

        let matchedItem: InventoryItem | undefined;

        if (rawIdVal !== null && rawIdVal !== undefined) {
          const idStr = String(typeof rawIdVal === 'object' && 'result' in rawIdVal ? (rawIdVal as any).result : rawIdVal).trim();
          matchedItem = inventoryByIdMap.get(idStr) || inventoryByIdMap.get(idStr.replace('.0', ''));
        }

        if (!matchedItem && rawSkuVal !== null && rawSkuVal !== undefined) {
          const skuStr = String(typeof rawSkuVal === 'object' && 'result' in rawSkuVal ? (rawSkuVal as any).result : rawSkuVal).trim().toLowerCase();
          matchedItem = inventoryByIdMap.get(skuStr);
        }

        if (matchedItem) {
          const availableStock = Math.max(0, matchedItem.stockQuantity || 0);
          const validQty = Math.min(qtyNum, availableStock);
          const key = matchedItem.productVariantId || matchedItem.id;

          newTransferItemsMap.set(key, {
            item: matchedItem,
            quantity: validQty,
          });
          importedCount++;
        }
      });

      const updatedList = Array.from(newTransferItemsMap.values());
      setTransferItems(updatedList);

      if (importedCount > 0) {
        setErrorMessage(null);
      } else {
        setErrorMessage('No se encontraron productos coincidentes en la sucursal de origen con cantidad a enviar > 0.');
      }
    } catch (err) {
      console.error('Failed to import transfer XLSX format:', err);
      setErrorMessage('Error al importar el archivo Excel. Revisa el formato del archivo.');
    } finally {
      event.target.value = '';
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
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleGenerateFormat}
                  startIcon={<FileArrowDownIcon size={18} />}
                >
                  Generar formato (.xlsx)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  onClick={handleImportButtonClick}
                  startIcon={<FileArrowUpIcon size={18} />}
                >
                  Importar formato
                </Button>
                {transferItems.length > 0 && (
                  <Button size="small" color="secondary" onClick={() => setTransferItems([])}>
                    Limpiar Lista
                  </Button>
                )}
              </Stack>
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
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 340, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.neutral' } }}>
                      <TableCell>ID</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Talla</TableCell>
                      <TableCell>Color</TableCell>
                      <TableCell align="right">Cantidad actual</TableCell>
                      <TableCell align="center" sx={{ width: 140 }}>Cantidad a enviar</TableCell>
                      <TableCell align="center" sx={{ width: 50 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transferItems.map(({ item, quantity }) => {
                      const initialStock = Math.max(0, item.stockQuantity || 0);
                      const qtyToSend = quantity > 0 ? quantity : 0;
                      const remainingStock = initialStock - qtyToSend;
                      const isInvalidQty = quantity <= 0 || quantity > initialStock;
                      const productIdVal = item.productId || item.productVariantId || item.id;

                      return (
                        <TableRow key={item.productVariantId || item.id} hover sx={{ bgcolor: isInvalidQty ? 'error.alpha8' : undefined }}>
                          <TableCell sx={{ fontWeight: 600 }}>{productIdVal}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.description}
                            </Typography>
                            {item.sku && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                SKU: {item.sku}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{item.model && item.model !== 'N/A' ? item.model : 'N/A'}</TableCell>
                          <TableCell>{item.size && item.size !== 'N/A' ? item.size : 'N/A'}</TableCell>
                          <TableCell>{item.color && item.color !== 'N/A' ? item.color : 'N/A'}</TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color={remainingStock < 0 ? 'error.main' : remainingStock === 0 ? 'warning.main' : 'primary.main'}
                            >
                              {remainingStock}
                            </Typography>
                            {qtyToSend > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                ({initialStock} - {qtyToSend})
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={quantity}
                              onChange={(e) => handleQuantityChange(item.productVariantId, e.target.value)}
                              slotProps={{
                                htmlInput: {
                                  min: 1,
                                  max: initialStock,
                                  style: { textAlign: 'center', fontWeight: 700 },
                                },
                              }}
                              error={isInvalidQty}
                              helperText={
                                quantity > initialStock
                                  ? `Máx ${initialStock}`
                                  : quantity <= 0
                                  ? 'Mín 1'
                                  : ''
                              }
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleRemoveProduct(item.productVariantId)}
                              title="Eliminar producto"
                            >
                              <CloseIcon size={18} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
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
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls"
          style={{ display: 'none' }}
          onChange={handleImportFormat}
        />

        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" color="inherit" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleGenerateFormat}
            startIcon={<FileArrowDownIcon size={18} />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Generar formato (.xlsx)
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={handleImportButtonClick}
            startIcon={<FileArrowUpIcon size={18} />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Importar formato
          </Button>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSendTransfer}
          disabled={!isFormValid || submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon size={20} />}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>

      {/* Transfer Summary Report Modal */}
      <StockTransferReportDialog
        open={showReportModal}
        report={generatedReport}
        onClose={() => {
          setShowReportModal(false);
          setGeneratedReport(null);
          onClose();
        }}
      />
    </Dialog>
  );
}
