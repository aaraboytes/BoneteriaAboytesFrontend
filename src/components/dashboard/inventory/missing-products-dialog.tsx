'use client';

import * as React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
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
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  createFilterOptions,
} from '@mui/material';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  Warning as WarningIcon,
  Trash as TrashIcon,
  X as CloseIcon,
  Package as PackageIcon,
  MagnifyingGlass as SearchIcon,
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  FileXls as FileXlsIcon,
  FileArrowDown as FileArrowDownIcon,
  FileArrowUp as FileArrowUpIcon,
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';
import { InventoryItem } from './inventory-table';
import { StoreSimple } from './stock-transfer-dialog';

export interface SelectedMissingItem {
  item: InventoryItem;
  requestedQuantity: number;
}

interface MissingProductsDialogProps {
  open: boolean;
  onClose: () => void;
  stores: StoreSimple[];
  currentStoreId: number;
}

type StockStatusFilter = 'todos' | 'poco' | 'agotado';

const filterOptions = createFilterOptions<InventoryItem>({
  limit: 50,
  stringify: (option) =>
    `${option.description || ''} ${option.sku || ''} ${option.provider || ''} ${option.color || ''} ${option.size || ''} ${option.barcodes ? option.barcodes.join(' ') : ''}`,
});

const icon = <SquareIcon size={20} />;
const checkedIcon = <CheckSquareIcon size={20} />;

export function MissingProductsDialog({
  open,
  onClose,
  stores,
  currentStoreId,
}: MissingProductsDialogProps): React.JSX.Element {
  const [selectedStoreId, setSelectedStoreId] = React.useState<number>(currentStoreId || 1);
  const [statusFilter, setStatusFilter] = React.useState<StockStatusFilter>('todos');
  const [storeInventory, setStoreInventory] = React.useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = React.useState<boolean>(false);
  const [selectedMissingItems, setSelectedMissingItems] = React.useState<SelectedMissingItem[]>([]);
  const [searchInputValue, setSearchInputValue] = React.useState<string>('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Synchronize initial store selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedStoreId(currentStoreId || (stores[0] ? stores[0].id : 1));
      setStatusFilter('todos');
      setSelectedMissingItems([]);
      setSearchInputValue('');
      setErrorMessage(null);
    }
  }, [open, currentStoreId, stores]);

  // Fetch inventory for selected store
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
      console.error('Error fetching inventory for missing products dialog:', err);
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

  // Update selected items if storeInventory refreshes
  React.useEffect(() => {
    if (storeInventory.length > 0 && selectedMissingItems.length > 0) {
      setSelectedMissingItems((prev) =>
        prev.map((mi) => {
          const updated = storeInventory.find(
            (i) => i.productVariantId === mi.item.productVariantId || i.id === mi.item.id
          );
          return updated ? { ...mi, item: updated } : mi;
        })
      );
    }
  }, [storeInventory]);

  // Filter inventory candidates by status filter ("todos", "poco", "agotado")
  const filteredCandidates = React.useMemo(() => {
    return storeInventory.filter((item) => {
      const qty = item.stockQuantity;
      if (statusFilter === 'poco') {
        return qty > 0 && qty <= 5;
      }
      if (statusFilter === 'agotado') {
        return qty <= 0;
      }
      return true; // 'todos'
    });
  }, [storeInventory, statusFilter]);

  const handleAutocompleteChange = (newValue: InventoryItem[]) => {
    setSelectedMissingItems((prev) => {
      const prevMap = new Map(
        prev.map((i) => [i.item.productVariantId || i.item.id, i.requestedQuantity])
      );
      return newValue.map((item) => {
        const key = item.productVariantId || item.id;
        const existingQty = prevMap.get(key);
        const defaultQty =
          existingQty !== undefined
            ? existingQty
            : Math.max(1, 5 - Math.max(0, item.stockQuantity || 0));
        return {
          item,
          requestedQuantity: defaultQty,
        };
      });
    });
  };

  const handleRequestedQuantityChange = (keyVal: string | number, valStr: string) => {
    const rawNum = parseInt(valStr, 10);
    const validQty = isNaN(rawNum) || rawNum < 0 ? 0 : rawNum;

    setSelectedMissingItems((prev) =>
      prev.map((mi) => {
        const k = mi.item.productVariantId || mi.item.id;
        if (k === keyVal) {
          return { ...mi, requestedQuantity: validQty };
        }
        return mi;
      })
    );
  };

  const handleRemoveProduct = (keyVal: string | number) => {
    setSelectedMissingItems((prev) =>
      prev.filter((i) => (i.item.productVariantId || i.item.id) !== keyVal)
    );
  };

  const storeName = React.useMemo(() => {
    const s = stores.find((st) => st.id === selectedStoreId);
    return s ? s.name : `Sucursal #${selectedStoreId}`;
  }, [stores, selectedStoreId]);

  const handleGenerateFormat = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Productos Faltantes');

      worksheet.columns = [
        { header: 'ID Producto', key: 'productId', width: 18, style: { numFmt: '0' } },
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Descripción', key: 'description', width: 45 },
        { header: 'Modelo', key: 'model', width: 18 },
        { header: 'Talla', key: 'size', width: 14 },
        { header: 'Color', key: 'color', width: 14 },
        { header: 'Cantidad Actual', key: 'stockQuantity', width: 18 },
        { header: 'Cantidad a Solicitar', key: 'requestedQuantity', width: 22 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D32F2F' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 24;

      const itemsToExport =
        selectedMissingItems.length > 0
          ? selectedMissingItems
          : filteredCandidates.map((item) => ({
              item,
              requestedQuantity: Math.max(1, 5 - Math.max(0, item.stockQuantity || 0)),
            }));

      itemsToExport.forEach(({ item, requestedQuantity }) => {
        const currentStock = item.stockQuantity || 0;
        const row = worksheet.addRow({
          productId: item.productId || item.productVariantId || item.id,
          sku: item.sku || 'N/A',
          description: item.description || 'Sin Descripción',
          model: item.model || 'N/A',
          size: item.size || 'N/A',
          color: item.color || 'N/A',
          stockQuantity: currentStock,
          requestedQuantity: requestedQuantity || 0,
        });

        row.getCell('stockQuantity').alignment = { horizontal: 'right' };
        row.getCell('requestedQuantity').alignment = { horizontal: 'right' };
        row.getCell('requestedQuantity').font = { bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const safeStoreName = storeName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];

      saveAs(blob, `Formato_Faltantes_${safeStoreName}_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Failed to generate missing products format XLSX:', err);
      setErrorMessage('Ocurrió un error al generar el formato Excel.');
    }
  };

  const handleGenerateDetailedReport = async () => {
    const itemsToReport =
      selectedMissingItems.length > 0
        ? selectedMissingItems
        : filteredCandidates.map((item) => ({
            item,
            requestedQuantity: Math.max(1, 5 - Math.max(0, item.stockQuantity || 0)),
          }));

    if (itemsToReport.length === 0) {
      setErrorMessage('No hay productos para generar el reporte.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema POS';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Reporte Faltantes');

      // Title Banner Row
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `REPORTE DE PRODUCTOS FALTANTES & POCO STOCK - ${storeName.toUpperCase()}`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 38;

      // Metadata Row
      worksheet.mergeCells('A2:J2');
      const metaCell = worksheet.getCell('A2');
      const totalUnitsReq = itemsToReport.reduce((acc, i) => acc + (i.requestedQuantity || 0), 0);
      metaCell.value = `Sucursal: ${storeName} (ID: ${selectedStoreId}) | Fecha: ${new Date().toLocaleString('es-MX')} | Productos Distintos: ${itemsToReport.length} | Total Unidades Solicitadas: ${totalUnitsReq}`;
      metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 22;

      worksheet.addRow([]); // Blank spacer

      // Summary of Providers Section
      const providerSummaryMap = new Map<string, { productCount: number; unitCount: number }>();
      itemsToReport.forEach(({ item, requestedQuantity }) => {
        const provName = item.provider && item.provider.trim() ? item.provider.trim() : 'Sin Proveedor';
        const existing = providerSummaryMap.get(provName) || { productCount: 0, unitCount: 0 };
        providerSummaryMap.set(provName, {
          productCount: existing.productCount + 1,
          unitCount: existing.unitCount + (requestedQuantity || 0),
        });
      });

      worksheet.addRow(['PROVEEDORES RELACIONADOS CON LOS PRODUCTOS SELECCIONADOS']);
      const sectionTitleCell = worksheet.getCell('A4');
      sectionTitleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1976D2' } };

      const provTableHead = worksheet.addRow(['Proveedor / Marca', 'Productos Distintos', 'Total Unidades a Solicitar']);
      provTableHead.height = 24;
      provTableHead.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF455A64' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      providerSummaryMap.forEach((val, provName) => {
        const row = worksheet.addRow([provName, val.productCount, val.unitCount]);
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).alignment = { horizontal: 'right' };
        row.getCell(3).font = { bold: true };
      });

      worksheet.addRow([]); // Spacer

      // Main Table Header
      const headerRow = worksheet.addRow([
        'ID Producto',
        'SKU',
        'Descripción',
        'Modelo',
        'Talla',
        'Color',
        'Proveedor / Marca',
        'Stock Actual',
        'Cantidad a Solicitar',
        'Estado',
      ]);

      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Data Rows
      itemsToReport.forEach(({ item, requestedQuantity }) => {
        const currentStock = item.stockQuantity || 0;
        const estado = currentStock <= 0 ? 'AGOTADO' : currentStock <= 5 ? 'POCO STOCK' : 'DISPONIBLE';

        const row = worksheet.addRow([
          item.productId || item.productVariantId || item.id,
          item.sku || 'N/A',
          item.description || 'Sin Descripción',
          item.model || 'N/A',
          item.size || 'N/A',
          item.color || 'N/A',
          item.provider || 'Sin Proveedor',
          currentStock,
          requestedQuantity || 0,
          estado,
        ]);

        row.height = 22;

        const stockCell = row.getCell(8);
        stockCell.alignment = { horizontal: 'right', vertical: 'middle' };

        const reqCell = row.getCell(9);
        reqCell.alignment = { horizontal: 'right', vertical: 'middle' };
        reqCell.font = { name: 'Arial', size: 11, bold: true };

        const statusCell = row.getCell(10);
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (currentStock <= 0) {
          statusCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFD32F2F' } };
        } else if (currentStock <= 5) {
          statusCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFED6C02' } };
        } else {
          statusCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF2E7D32' } };
        }
      });

      // Auto-fit Column Widths
      worksheet.columns.forEach((column) => {
        let maxLength = 12;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const val = cell.value ? cell.value.toString() : '';
          if (val.length > maxLength) {
            maxLength = Math.min(val.length + 4, 55);
          }
        });
        column.width = maxLength;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const safeStoreName = storeName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      saveAs(blob, `Reporte_Faltantes_${safeStoreName}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Failed to generate detailed Excel report:', err);
      setErrorMessage('No se pudo generar el reporte Excel.');
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
        setErrorMessage('El archivo Excel no contiene ninguna hoja válida.');
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
        } else if (val.includes('solicitar') || val.includes('cantidad') || val.includes('pedir') || val.includes('req')) {
          qtyColIdx = colNumber;
        }
      });

      if (idColIdx === -1 && skuColIdx === -1) {
        setErrorMessage('No se encontró la columna "ID Producto" o "SKU" en el archivo Excel.');
        return;
      }

      if (qtyColIdx === -1) {
        setErrorMessage('No se encontró la columna "Cantidad a Solicitar" en el archivo Excel.');
        return;
      }

      const inventoryByIdMap = new Map<string, InventoryItem>();
      storeInventory.forEach((item) => {
        if (item.productId !== undefined && item.productId !== null) inventoryByIdMap.set(String(item.productId).trim(), item);
        if (item.productVariantId !== undefined && item.productVariantId !== null) inventoryByIdMap.set(String(item.productVariantId).trim(), item);
        if (item.id !== undefined && item.id !== null) inventoryByIdMap.set(String(item.id).trim(), item);
        if (item.sku) inventoryByIdMap.set(String(item.sku).trim().toLowerCase(), item);
      });

      const newSelectedMap = new Map<string | number, SelectedMissingItem>();
      selectedMissingItems.forEach((existing) => {
        newSelectedMap.set(existing.item.productVariantId || existing.item.id, existing);
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
          const key = matchedItem.productVariantId || matchedItem.id;
          newSelectedMap.set(key, {
            item: matchedItem,
            requestedQuantity: qtyNum,
          });
          importedCount++;
        }
      });

      const updatedList = Array.from(newSelectedMap.values());
      setSelectedMissingItems(updatedList);

      if (importedCount > 0) {
        setErrorMessage(null);
      } else {
        setErrorMessage('No se encontraron productos coincidentes en el inventario con cantidad a solicitar > 0.');
      }
    } catch (err) {
      console.error('Failed to import missing products XLSX format:', err);
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
                bgcolor: 'error.alpha12',
                color: 'error.main',
                display: 'flex',
              }}
            >
              <WarningIcon size={24} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Consulta de Productos Faltantes & Poco Stock
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filtra y selecciona múltiples productos por sucursal y estado de inventario.
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
          {/* Controls Header: Store Selector & Stock Status Filter */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="missing-store-label">🏢 Sucursal / Tienda</InputLabel>
                  <Select
                    labelId="missing-store-label"
                    value={selectedStoreId}
                    label="🏢 Sucursal / Tienda"
                    onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                    sx={{ borderRadius: 1.5, bgcolor: 'background.paper', fontWeight: 700 }}
                  >
                    {stores.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        🏢 {s.name} ({s.code || `SUC-${s.id}`})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Sucursal para consultar faltantes</FormHelperText>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Filtro por Estado de Inventario:
                  </Typography>
                  <ToggleButtonGroup
                    value={statusFilter}
                    exclusive
                    onChange={(_, val) => val && setStatusFilter(val)}
                    size="small"
                    color="primary"
                    fullWidth
                    sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }}
                  >
                    <ToggleButton value="todos" sx={{ fontWeight: 700 }}>
                      Todos ({storeInventory.length})
                    </ToggleButton>
                    <ToggleButton value="poco" color="warning" sx={{ fontWeight: 700 }}>
                      Poco Stock ({storeInventory.filter((i) => i.stockQuantity > 0 && i.stockQuantity <= 5).length})
                    </ToggleButton>
                    <ToggleButton value="agotado" color="error" sx={{ fontWeight: 700 }}>
                      Agotado ({storeInventory.filter((i) => i.stockQuantity <= 0).length})
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Multi-Select Autocomplete Search Bar with Checkboxes */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Buscador Multiselección de Productos (Checkboxes)
            </Typography>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={filteredCandidates}
              filterOptions={filterOptions}
              loading={loadingInventory}
              value={selectedMissingItems.map((mi) => mi.item)}
              inputValue={searchInputValue}
              onInputChange={(_, newInputValue) => setSearchInputValue(newInputValue)}
              onChange={(_, newValue) => handleAutocompleteChange(newValue)}
              getOptionLabel={(option) =>
                `${option.description} - SKU: ${option.sku || 'N/A'}${option.color !== 'N/A' ? ` | Color: ${option.color}` : ''}`
              }
              isOptionEqualToValue={(option, value) => option.productVariantId === value.productVariantId || option.id === value.id}
              renderOption={(props, option, { selected }) => {
                const { key, ...otherProps } = props as any;
                const isOut = option.stockQuantity <= 0;
                const isLow = option.stockQuantity > 0 && option.stockQuantity <= 5;

                return (
                  <Box
                    component="li"
                    key={key || option.productVariantId || option.id}
                    {...otherProps}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.75,
                      px: 1.5,
                      borderBottom: '1px solid var(--mui-palette-divider)',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ pr: 2 }}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 4 }}
                        checked={selected}
                        color="error"
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {option.description}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          {option.sku && <Chip label={`SKU: ${option.sku}`} size="small" variant="outlined" />}
                          {option.color && option.color !== 'N/A' && (
                            <Chip label={`Color: ${option.color}`} size="small" variant="outlined" />
                          )}
                          {option.size && option.size !== 'N/A' && (
                            <Chip label={`Talla: ${option.size}`} size="small" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    <Box sx={{ textAlign: 'right', minWidth: 110 }}>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={isOut ? 'error.main' : isLow ? 'warning.main' : 'success.main'}
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
                  placeholder="Selecciona productos con checkbox (Descripción, SKU, Color...)"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <SearchIcon size={20} color="var(--mui-palette-text-secondary)" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
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
                      maxHeight: 110,
                      overflowY: 'auto',
                      alignItems: 'flex-start',
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

          {/* List of Selected Products as Table */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Productos Seleccionados ({selectedMissingItems.length})
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
                {selectedMissingItems.length > 0 && (
                  <Button size="small" color="secondary" onClick={() => setSelectedMissingItems([])}>
                    Limpiar Lista
                  </Button>
                )}
              </Stack>
            </Stack>

            {selectedMissingItems.length === 0 ? (
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
                    Selecciona casillas con checkbox en el buscador superior para agregar productos.
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
                      <TableCell align="center" sx={{ width: 150 }}>Cantidad a solicitar</TableCell>
                      <TableCell align="center" sx={{ width: 50 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedMissingItems.map(({ item, requestedQuantity }) => {
                      const currentStock = item.stockQuantity || 0;
                      const isOut = currentStock <= 0;
                      const isLow = currentStock > 0 && currentStock <= 5;
                      const productIdVal = item.productId || item.productVariantId || item.id;
                      const key = item.productVariantId || item.id;

                      return (
                        <TableRow key={key} hover>
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
                            <Chip
                              label={isOut ? 'AGOTADO (0)' : isLow ? `POCO (${currentStock})` : `${currentStock}`}
                              color={isOut ? 'error' : isLow ? 'warning' : 'success'}
                              size="small"
                              variant={isOut ? 'filled' : 'outlined'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={requestedQuantity}
                              onChange={(e) => handleRequestedQuantityChange(key, e.target.value)}
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
                              onClick={() => handleRemoveProduct(key)}
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
          <Button
            variant="contained"
            color="error"
            startIcon={<FileXlsIcon size={20} />}
            onClick={handleGenerateDetailedReport}
            disabled={selectedMissingItems.length === 0 && filteredCandidates.length === 0}
            sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
          >
            Generar reporte
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

        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 2, px: 3 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
