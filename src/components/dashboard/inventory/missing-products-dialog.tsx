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
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';
import { InventoryItem } from './inventory-table';
import { StoreSimple } from './stock-transfer-dialog';

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
  const [selectedProducts, setSelectedProducts] = React.useState<InventoryItem[]>([]);
  const [searchInputValue, setSearchInputValue] = React.useState<string>('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Synchronize initial store selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedStoreId(currentStoreId || (stores[0] ? stores[0].id : 1));
      setStatusFilter('todos');
      setSelectedProducts([]);
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

  // Update selected products details if storeInventory refreshes
  React.useEffect(() => {
    if (storeInventory.length > 0 && selectedProducts.length > 0) {
      setSelectedProducts((prev) =>
        prev.map((item) => {
          const updated = storeInventory.find((i) => i.productVariantId === item.productVariantId);
          return updated || item;
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

  const handleRemoveProduct = (productVariantId: string) => {
    setSelectedProducts((prev) => prev.filter((i) => i.productVariantId !== productVariantId));
  };

  const handleGenerateExcelReport = async () => {
    if (selectedProducts.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema POS';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Productos Faltantes');

      // Title Banner Row
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Reporte de Productos Faltantes - ${storeName}`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } }; // Red
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 36;

      // Metadata Row
      worksheet.mergeCells('A2:G2');
      const metaCell = worksheet.getCell('A2');
      metaCell.value = `Sucursal: ${storeName} (ID: ${selectedStoreId}) | Generado: ${new Date().toLocaleString('es-MX')} | Filtro: ${statusFilter.toUpperCase()}`;
      metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 22;

      worksheet.addRow([]); // Blank spacer

      // Column Headers
      const headerRow = worksheet.addRow([
        'SKU',
        'Descripción / Producto',
        'Color',
        'Talla',
        'Proveedor',
        'Stock Actual (Ubicación)',
        'Estado Inventario',
      ]);

      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }; // Primary Blue
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Data Rows
      selectedProducts.forEach((item) => {
        const qty = item.stockQuantity || 0;
        const estado = qty <= 0 ? 'AGOTADO' : qty <= 5 ? 'POCO STOCK' : 'DISPONIBLE';

        const row = worksheet.addRow([
          item.sku || 'N/A',
          item.description || '',
          item.color || 'N/A',
          item.size || 'N/A',
          item.provider || 'Sin Proveedor',
          qty,
          estado,
        ]);

        row.height = 22;

        const qtyCell = row.getCell(6);
        qtyCell.alignment = { horizontal: 'right', vertical: 'middle' };
        qtyCell.font = { name: 'Arial', size: 11, bold: true };

        const statusCell = row.getCell(7);
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

        if (qty <= 0) {
          statusCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFD32F2F' } };
        } else if (qty <= 5) {
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

      // Write to Buffer & Trigger Download
      const buffer = await workbook.xlsx.writeBuffer();
      const safeStoreName = storeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `reporte_faltantes_${safeStoreName}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Failed to generate Excel file:', err);
      setErrorMessage('No se pudo generar el archivo Excel.');
    }
  };

  const storeName = React.useMemo(() => {
    const s = stores.find((st) => st.id === selectedStoreId);
    return s ? s.name : `Sucursal #${selectedStoreId}`;
  }, [stores, selectedStoreId]);

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
              value={selectedProducts}
              inputValue={searchInputValue}
              onInputChange={(_, newInputValue) => setSearchInputValue(newInputValue)}
              onChange={(_, newValue) => setSelectedProducts(newValue)}
              getOptionLabel={(option) =>
                `${option.description} - SKU: ${option.sku || 'N/A'}${option.color !== 'N/A' ? ` | Color: ${option.color}` : ''}`
              }
              isOptionEqualToValue={(option, value) => option.productVariantId === value.productVariantId}
              renderOption={(props, option, { selected }) => {
                const { key, ...otherProps } = props as any;
                const isOut = option.stockQuantity <= 0;
                const isLow = option.stockQuantity > 0 && option.stockQuantity <= 5;

                return (
                  <Box
                    component="li"
                    key={key || option.productVariantId}
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

          {/* List of Selected Products */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Productos Seleccionados ({selectedProducts.length})
              </Typography>
              {selectedProducts.length > 0 && (
                <Button size="small" color="secondary" onClick={() => setSelectedProducts([])}>
                  Limpiar Lista
                </Button>
              )}
            </Stack>

            {selectedProducts.length === 0 ? (
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
              <Stack spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                {selectedProducts.map((item) => {
                  const currentStock = item.stockQuantity || 0;
                  const isOut = currentStock <= 0;
                  const isLow = currentStock > 0 && currentStock <= 5;

                  return (
                    <Paper
                      key={item.productVariantId}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        borderColor: isOut ? 'error.main' : isLow ? 'warning.main' : 'divider',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 8 }}>
                          <Stack spacing={0.75}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {item.description}
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                              <Chip
                                label={`SKU: ${item.sku || 'N/A'}`}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip
                                label={`Color: ${item.color || 'N/A'}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                              {item.size && item.size !== 'N/A' && (
                                <Chip
                                  label={`Talla: ${item.size}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600 }}
                                />
                              )}
                            </Stack>

                            {/* Required Available Stock on selected location */}
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color={isOut ? 'error.main' : isLow ? 'warning.main' : 'success.main'}
                              sx={{ mt: 0.5, display: 'inline-block' }}
                            >
                              Stock disponible en {storeName}: {currentStock} unidades
                            </Typography>
                          </Stack>
                        </Grid>

                        <Grid size={{ xs: 10, sm: 3 }} sx={{ textAlign: 'right' }}>
                          <Chip
                            label={isOut ? 'AGOTADO' : isLow ? `POCO STOCK (${currentStock})` : `${currentStock} UNID.`}
                            color={isOut ? 'error' : isLow ? 'warning' : 'success'}
                            variant={isOut ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 800, px: 1 }}
                          />
                        </Grid>

                        <Grid size={{ xs: 2, sm: 1 }} sx={{ textAlign: 'right' }}>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveProduct(item.productVariantId)}
                            title="Eliminar de la lista"
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
        <Button
          variant="contained"
          color="error"
          startIcon={<FileXlsIcon size={20} />}
          onClick={handleGenerateExcelReport}
          disabled={selectedProducts.length === 0}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          Generar Reporte Excel {selectedProducts.length > 0 ? `(${selectedProducts.length})` : ''}
        </Button>

        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 2, px: 3 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
