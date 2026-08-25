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
import {
  Plus as PlusIcon,
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
import { StoreSimple } from './stock-transfer-dialog';
import { StockIntakeReportDialog, IntakeReportData } from './stock-intake-report-dialog';

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
  const [generatedReport, setGeneratedReport] = React.useState<IntakeReportData | null>(null);
  const [showReportModal, setShowReportModal] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        userName: 'Administrador',
        items: intakeItems.map((ti) => ({
          productVariantId: ti.item.productVariantId,
          quantity: ti.quantityToAdd,
        })),
      };

      const res = await apiClient.post('/Inventory/bulk-adjust', payload);

      const msg = `Ingreso registrado exitosamente en ${storeName}`;
      onSuccess(msg);

      if (res.data && res.data.report) {
        setGeneratedReport(res.data.report);
        setShowReportModal(true);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Stock intake failed:', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Ocurrió un error al ingresar el inventario.';
      setErrorMessage(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateFormat = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ingreso de Inventario');

      worksheet.columns = [
        { header: 'ID Producto', key: 'productId', width: 18, style: { numFmt: '0' } },
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Descripción', key: 'description', width: 45 },
        { header: 'Proveedor / Marca', key: 'provider', width: 25 },
        { header: 'Modelo', key: 'model', width: 18 },
        { header: 'Talla', key: 'size', width: 14 },
        { header: 'Color', key: 'color', width: 14 },
        { header: 'Stock Actual', key: 'currentStock', width: 15 },
        { header: 'Cantidad', key: 'cantidad', width: 16 },
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
        intakeItems.length > 0
          ? intakeItems.map((i) => ({ item: i.item, qty: i.quantityToAdd || 0 }))
          : storeInventory.map((i) => ({ item: i, qty: 0 }));

      targetItems.forEach(({ item, qty }) => {
        const row = worksheet.addRow({
          productId: item.productId || item.productVariantId || item.id,
          sku: item.sku || 'N/A',
          description: item.description || 'Sin Descripción',
          provider: item.provider || 'Sin Proveedor',
          model: item.model || 'N/A',
          size: item.size || 'N/A',
          color: item.color || 'N/A',
          currentStock: item.stockQuantity ?? 0,
          cantidad: qty || 0,
        });

        row.getCell('currentStock').alignment = { horizontal: 'right' };
        row.getCell('cantidad').alignment = { horizontal: 'right' };
        row.getCell('cantidad').font = { bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const storeObj = stores.find((s) => s.id === selectedStoreId);
      const storeNameStr = storeObj ? storeObj.name.replace(/[^a-zA-Z0-9_-]/g, '_') : `Sucursal_${selectedStoreId}`;
      const dateStr = new Date().toISOString().split('T')[0];

      saveAs(blob, `Formato_Ingreso_Inventario_${storeNameStr}_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Failed to generate XLSX format:', err);
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

      // Inspect header row (Row 1)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const val = String(cell.value || '').trim().toLowerCase();
        if (val.includes('id producto') || val === 'id' || val.includes('productid') || val.includes('id_producto')) {
          idColIdx = colNumber;
        } else if (val.includes('sku')) {
          skuColIdx = colNumber;
        } else if (val.includes('cantidad') || val.includes('amount') || val.includes('cant')) {
          qtyColIdx = colNumber;
        }
      });

      if (idColIdx === -1 && skuColIdx === -1) {
        setErrorMessage('No se encontró la columna "ID Producto" o "SKU" en el archivo Excel.');
        return;
      }

      if (qtyColIdx === -1) {
        setErrorMessage('No se encontró la columna "Cantidad" en el archivo Excel.');
        return;
      }

      // Build Map for fast O(1) inventory item matching
      const inventoryByIdMap = new Map<string, InventoryItem>();
      storeInventory.forEach((item) => {
        if (item.productId !== undefined && item.productId !== null) inventoryByIdMap.set(String(item.productId).trim(), item);
        if (item.productVariantId !== undefined && item.productVariantId !== null) inventoryByIdMap.set(String(item.productVariantId).trim(), item);
        if (item.id !== undefined && item.id !== null) inventoryByIdMap.set(String(item.id).trim(), item);
        if (item.sku) inventoryByIdMap.set(String(item.sku).trim().toLowerCase(), item);
      });

      const newIntakeItemsMap = new Map<string | number, SelectedIntakeItem>();
      // Retain existing items if any
      intakeItems.forEach((existing) => {
        newIntakeItemsMap.set(existing.item.productVariantId || existing.item.id, existing);
      });

      let importedCount = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

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

        if (qtyNum <= 0) return; // Only process items with quantity > 0

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
          const key = matchedItem.productVariantId || matchedItem.id;
          newIntakeItemsMap.set(key, {
            item: matchedItem,
            quantityToAdd: qtyNum,
          });
          importedCount++;
        }
      });

      const updatedList = Array.from(newIntakeItemsMap.values());
      setIntakeItems(updatedList);

      if (importedCount > 0) {
        setErrorMessage(null);
      } else {
        setErrorMessage('No se encontraron productos coincidentes con cantidad > 0 en la sucursal seleccionada.');
      }
    } catch (err) {
      console.error('Failed to import XLSX format:', err);
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
                {intakeItems.length > 0 && (
                  <Button size="small" color="secondary" onClick={() => setIntakeItems([])}>
                    Limpiar Lista
                  </Button>
                )}
              </Stack>
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
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 340, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.neutral' } }}>
                      <TableCell>Id</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Talla</TableCell>
                      <TableCell>Color</TableCell>
                      <TableCell align="right">Cantidad actual</TableCell>
                      <TableCell align="center" sx={{ width: 140 }}>Cantidad a ingresar</TableCell>
                      <TableCell align="center" sx={{ width: 50 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {intakeItems.map(({ item, quantityToAdd }) => {
                      const productIdVal = item.productId || item.productVariantId || item.id;
                      return (
                        <TableRow key={item.productVariantId || item.id} hover>
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
                          <TableCell>{item.size && item.size !== 'N/A' ? item.size : 'N/A'}</TableCell>
                          <TableCell>{item.color && item.color !== 'N/A' ? item.color : 'N/A'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {item.stockQuantity || 0}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={quantityToAdd}
                              onChange={(e) => handleQuantityChange(item.productVariantId, e.target.value)}
                              slotProps={{
                                htmlInput: {
                                  min: 1,
                                  style: { textAlign: 'center', fontWeight: 700 },
                                },
                              }}
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
          color="success"
          onClick={handleSendIntake}
          disabled={!isFormValid || submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon size={20} />}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          {submitting ? 'Guardando...' : 'Agregar a inventario'}
        </Button>
      </DialogActions>

      {/* Report Summary Modal */}
      <StockIntakeReportDialog
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
