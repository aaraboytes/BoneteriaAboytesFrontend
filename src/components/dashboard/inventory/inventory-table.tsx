'use client';

import * as React from 'react';
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  MagnifyingGlass as SearchIcon,
  Funnel as FilterIcon,
  X as ClearIcon,
  PencilSimple as EditIcon,
  ArrowsClockwise as RefreshIcon,
  Package as PackageIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  TrendUp as TrendIcon,
  Sparkle as SparkleIcon,
  ArrowsLeftRight as TransferIcon,
  Plus as PlusIcon,
} from '@phosphor-icons/react';

export interface InventoryItem {
  id: string;
  productVariantId: string;
  productId: number;
  sku: string;
  description: string;
  provider: string;
  department: string;
  genre: string;
  size: string;
  color: string;
  price: number;
  cost: number;
  stockQuantity: number;
  barcodes?: string[];
}

interface InventoryTableProps {
  items: InventoryItem[];
  stores?: { id: number; name: string; code: string }[];
  selectedStoreId?: number;
  onStoreChange?: (storeId: number) => void;
  loading?: boolean;
  onRefresh?: () => void;
  onAdjustStock?: (variantId: string, newStock: number) => Promise<void>;
  onUpdateProduct?: (updatedItem: InventoryItem) => Promise<void>;
  onOpenTransfer?: () => void;
  onOpenIntake?: () => void;
  onOpenMissing?: () => void;
}

type Order = 'asc' | 'desc';

export function InventoryTable({
  items,
  stores = [],
  selectedStoreId,
  onStoreChange,
  loading = false,
  onRefresh,
  onAdjustStock,
  onUpdateProduct,
  onOpenTransfer,
  onOpenIntake,
  onOpenMissing,
}: InventoryTableProps): React.JSX.Element {
  // Global search autocomplete state
  const [globalSearch, setGlobalSearch] = React.useState<string>('');

  // Column Filters state
  const [descriptionFilter, setDescriptionFilter] = React.useState<string>('');
  const [providerFilter, setProviderFilter] = React.useState<string | null>(null);
  const [genreFilter, setGenreFilter] = React.useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = React.useState<string | null>(null);
  const [colorFilter, setColorFilter] = React.useState<string | null>(null);
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string | null>(null);

  // Edit Product Modal State
  const [editItem, setEditItem] = React.useState<InventoryItem | null>(null);
  const [editTab, setEditTab] = React.useState<number>(0);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [editForm, setEditForm] = React.useState<{
    description: string;
    price: number;
    cost: number;
    provider: string;
    department: string;
    genre: string;
    size: string;
    color: string;
    sku: string;
    stockQuantity: number;
  }>({
    description: '',
    price: 0,
    cost: 0,
    provider: '',
    department: '',
    genre: '',
    size: '',
    color: '',
    sku: '',
    stockQuantity: 0,
  });

  // Sorting & Pagination
  const [orderBy, setOrderBy] = React.useState<keyof InventoryItem>('description');
  const [order, setOrder] = React.useState<Order>('asc');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  // Stock Adjustment Dialog Modal
  const [adjustItem, setAdjustItem] = React.useState<InventoryItem | null>(null);
  const [newStockVal, setNewStockVal] = React.useState<number>(0);
  const [adjusting, setAdjusting] = React.useState(false);

  // Extract unique values for column autocomplete dropdowns
  const providerOptions = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.provider && i.provider !== 'Sin Proveedor') set.add(i.provider);
    });
    return Array.from(set).sort();
  }, [items]);

  const departmentOptions = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.department && i.department !== 'General' && i.department !== 'N/A') set.add(i.department);
    });
    return Array.from(set).sort();
  }, [items]);

  const genreOptions = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.genre && i.genre !== 'N/A') set.add(i.genre);
    });
    return Array.from(set).sort();
  }, [items]);

  const sizeOptions = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.size && i.size !== 'N/A') set.add(i.size);
    });
    return Array.from(set).sort();
  }, [items]);

  const colorOptions = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.color && i.color !== 'N/A') set.add(i.color);
    });
    return Array.from(set).sort();
  }, [items]);

  const stockStatusOptions = ['En Existencia (>0)', 'Poco Stock (1 - 5)', 'Sin Stock (0)'];

  // Global search autocomplete options
  const globalSearchOptions = React.useMemo(() => {
    const optionsSet = new Set<string>();
    items.slice(0, 1500).forEach((i) => {
      if (i.description) optionsSet.add(i.description);
      if (i.provider && i.provider !== 'Sin Proveedor') optionsSet.add(i.provider);
      if (i.sku) optionsSet.add(i.sku);
      if (i.barcodes) i.barcodes.forEach((b) => optionsSet.add(b));
    });
    return Array.from(optionsSet);
  }, [items]);

  // Filtered dataset logic
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      // 1. Global Search Filter
      if (globalSearch) {
        const q = globalSearch.toLowerCase().trim();
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesProvider = item.provider?.toLowerCase().includes(q);
        const matchesSku = item.sku?.toLowerCase().includes(q);
        const matchesColor = item.color?.toLowerCase().includes(q);
        const matchesSize = item.size?.toLowerCase().includes(q);
        const matchesBarcode = item.barcodes?.some((b) => b.toLowerCase().includes(q));
        if (!matchesDesc && !matchesProvider && !matchesSku && !matchesColor && !matchesSize && !matchesBarcode) {
          return false;
        }
      }

      // 2. Column Description Filter
      if (descriptionFilter) {
        if (!item.description.toLowerCase().includes(descriptionFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Column Provider Filter
      if (providerFilter) {
        if (item.provider !== providerFilter) return false;
      }

      // 4. Column Genre Filter
      if (genreFilter) {
        if (item.genre !== genreFilter) return false;
      }

      // 5. Column Size Filter
      if (sizeFilter) {
        if (item.size !== sizeFilter) return false;
      }

      // 6. Column Color Filter
      if (colorFilter) {
        if (item.color !== colorFilter) return false;
      }

      // 7. Column Stock Status Filter
      if (stockStatusFilter) {
        if (stockStatusFilter === 'En Existencia (>0)' && item.stockQuantity <= 0) return false;
        if (stockStatusFilter === 'Poco Stock (1 - 5)' && (item.stockQuantity <= 0 || item.stockQuantity > 5)) return false;
        if (stockStatusFilter === 'Sin Stock (0)' && item.stockQuantity > 0) return false;
      }

      return true;
    });
  }, [items, globalSearch, descriptionFilter, providerFilter, genreFilter, sizeFilter, colorFilter, stockStatusFilter]);

  // Sorting
  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return order === 'asc' ? -1 : 1;
      if (strA > strB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, orderBy, order]);

  // Paginated slice
  const paginatedItems = React.useMemo(() => {
    return sortedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  const handleSort = (property: keyof InventoryItem) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleClearFilters = () => {
    setGlobalSearch('');
    setDescriptionFilter('');
    setProviderFilter(null);
    setGenreFilter(null);
    setSizeFilter(null);
    setColorFilter(null);
    setStockStatusFilter(null);
    setPage(0);
  };

  const activeFiltersCount = [
    globalSearch,
    descriptionFilter,
    providerFilter,
    genreFilter,
    sizeFilter,
    colorFilter,
    stockStatusFilter,
  ].filter(Boolean).length;

  // Inventory Summary Metrics
  const summaryMetrics = React.useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    items.forEach((item) => {
      totalUnits += item.stockQuantity;
      if (item.stockQuantity === 0) outOfStockCount++;
      else if (item.stockQuantity <= 5) lowStockCount++;
      totalValuation += item.stockQuantity * item.price;
    });

    return {
      totalSkus: items.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      totalValuation,
    };
  }, [items]);

  const handleOpenEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditTab(0);
    setEditForm({
      description: item.description || '',
      price: item.price || 0,
      cost: item.cost || 0,
      provider: item.provider || '',
      department: item.department || '',
      genre: item.genre || '',
      size: item.size || '',
      color: item.color || '',
      sku: item.sku || '',
      stockQuantity: item.stockQuantity || 0,
    });
  };

  const handleSaveProduct = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const updatedItem: InventoryItem = {
        ...editItem,
        description: editForm.description,
        price: Number(editForm.price),
        cost: Number(editForm.cost),
        provider: editForm.provider,
        department: editForm.department,
        genre: editForm.genre,
        size: editForm.size,
        color: editForm.color,
        sku: editForm.sku,
        stockQuantity: Number(editForm.stockQuantity),
      };

      if (onUpdateProduct) {
        await onUpdateProduct(updatedItem);
      } else if (onAdjustStock) {
        await onAdjustStock(editItem.productVariantId, Number(editForm.stockQuantity));
      }
      setEditItem(null);
    } catch (e) {
      console.error('Failed to update product', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>

      {/* Main Filter & Search Control Panel */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Stack spacing={2}>
          {/* Top Control Bar: Store Selector & Action Buttons */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            {/* Store Selector Dropdown */}
            {stores.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', sm: 'auto' } }}>
                <InputLabel id="store-select-label">🏢 Sucursal / Tienda</InputLabel>
                <Select
                  labelId="store-select-label"
                  value={selectedStoreId ?? (stores[0]?.id || 1)}
                  label="🏢 Sucursal / Tienda"
                  onChange={(e) => onStoreChange && onStoreChange(Number(e.target.value))}
                  sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 700 }}
                >
                  {stores.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      🏢 {s.name} ({s.code || `SUC-${s.id}`})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
              {onOpenMissing && (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<WarningIcon size={18} />}
                  onClick={onOpenMissing}
                  sx={{ borderRadius: 2, fontWeight: 700, whitespace: 'nowrap' }}
                >
                  Faltantes
                </Button>
              )}

              {onOpenIntake && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<PlusIcon size={18} />}
                  onClick={onOpenIntake}
                  sx={{ borderRadius: 2, fontWeight: 700, whitespace: 'nowrap' }}
                >
                  Ingresar
                </Button>
              )}

              {onOpenTransfer && (
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<TransferIcon size={18} />}
                  onClick={onOpenTransfer}
                  sx={{ borderRadius: 2, fontWeight: 700, whitespace: 'nowrap' }}
                >
                  Transferir
                </Button>
              )}

              {activeFiltersCount > 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                  sx={{ borderRadius: 2, whitespace: 'nowrap' }}
                >
                  Limpiar Filtros ({activeFiltersCount})
                </Button>
              )}

              {onRefresh && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon size={18} className={loading ? 'spin' : ''} />}
                  onClick={onRefresh}
                  disabled={loading}
                  sx={{ borderRadius: 2, fontWeight: 600, whitespace: 'nowrap' }}
                >
                  Actualizar Inventario
                </Button>
              )}
            </Stack>
          </Stack>

          {/* Global Autocomplete Search Bar (Full Width below store dropdown & buttons) */}
          <Autocomplete
            freeSolo
            fullWidth
            options={globalSearchOptions}
            value={globalSearch}
            onInputChange={(_, value) => {
              setGlobalSearch(value || '');
              setPage(0);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Buscar por Descripción, Proveedor, SKU, Código de Barras, Color, Talla..."
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
                      {globalSearch && (
                        <IconButton size="small" onClick={() => setGlobalSearch('')}>
                          <ClearIcon size={16} />
                        </IconButton>
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'background.neutral',
                  },
                }}
              />
            )}
          />

          {/* Dynamic Column Autocomplete Filters Section */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <FilterIcon size={18} color="var(--mui-palette-primary-main)" />
                <Typography variant="subtitle2" fontWeight={700} color="primary">
                  Filtros Inteligentes por Columna (Autocomplete)
                </Typography>
              </Stack>

              <Grid container spacing={1.5}>
                {/* 1. Proveedor Autocomplete Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Autocomplete
                    options={providerOptions}
                    value={providerFilter}
                    onChange={(_, val) => {
                      setProviderFilter(val);
                      setPage(0);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Proveedor / Marca" size="small" placeholder="Todos" variant="outlined" />
                    )}
                  />
                </Grid>

                {/* 2. Género Autocomplete Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <Autocomplete
                    options={genreOptions}
                    value={genreFilter}
                    onChange={(_, val) => {
                      setGenreFilter(val);
                      setPage(0);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Género" size="small" placeholder="Todos" variant="outlined" />
                    )}
                  />
                </Grid>

                {/* 3. Talla Autocomplete Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <Autocomplete
                    options={sizeOptions}
                    value={sizeFilter}
                    onChange={(_, val) => {
                      setSizeFilter(val);
                      setPage(0);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Talla" size="small" placeholder="Todas" variant="outlined" />
                    )}
                  />
                </Grid>

                {/* 4. Color Autocomplete Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 2.6 }}>
                  <Autocomplete
                    options={colorOptions}
                    value={colorFilter}
                    onChange={(_, val) => {
                      setColorFilter(val);
                      setPage(0);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Color" size="small" placeholder="Todos" variant="outlined" />
                    )}
                  />
                </Grid>

                {/* 5. Stock Status Autocomplete Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Autocomplete
                    options={stockStatusOptions}
                    value={stockStatusFilter}
                    onChange={(_, val) => {
                      setStockStatusFilter(val);
                      setPage(0);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Estado de Inventario" size="small" placeholder="Todos" variant="outlined" />
                    )}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Stack>
      </Card>

      {/* Main Inventory Data Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 680, overflowX: 'auto' }}>
          <Table stickyHeader size="medium" sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                <TableCell style={{ width: '10%' }}>
                  <TableSortLabel
                    active={orderBy === 'sku'}
                    direction={orderBy === 'sku' ? order : 'asc'}
                    onClick={() => handleSort('sku')}
                  >
                    SKU / ID
                  </TableSortLabel>
                </TableCell>

                <TableCell style={{ width: '28%' }}>
                  <TableSortLabel
                    active={orderBy === 'description'}
                    direction={orderBy === 'description' ? order : 'asc'}
                    onClick={() => handleSort('description')}
                  >
                    Descripción Base Del Producto
                  </TableSortLabel>
                </TableCell>

                <TableCell style={{ width: '16%' }}>
                  <TableSortLabel
                    active={orderBy === 'provider'}
                    direction={orderBy === 'provider' ? order : 'asc'}
                    onClick={() => handleSort('provider')}
                  >
                    Proveedor / Marca
                  </TableSortLabel>
                </TableCell>

                <TableCell style={{ width: '10%' }}>
                  <TableSortLabel
                    active={orderBy === 'genre'}
                    direction={orderBy === 'genre' ? order : 'asc'}
                    onClick={() => handleSort('genre')}
                  >
                    Género
                  </TableSortLabel>
                </TableCell>

                <TableCell style={{ width: '9%' }}>
                  <TableSortLabel
                    active={orderBy === 'size'}
                    direction={orderBy === 'size' ? order : 'asc'}
                    onClick={() => handleSort('size')}
                  >
                    Talla
                  </TableSortLabel>
                </TableCell>

                <TableCell style={{ width: '11%' }}>
                  <TableSortLabel
                    active={orderBy === 'color'}
                    direction={orderBy === 'color' ? order : 'asc'}
                    onClick={() => handleSort('color')}
                  >
                    Color
                  </TableSortLabel>
                </TableCell>

                <TableCell align="right" style={{ width: '10%' }}>
                  <TableSortLabel
                    active={orderBy === 'price'}
                    direction={orderBy === 'price' ? order : 'asc'}
                    onClick={() => handleSort('price')}
                  >
                    Precio Unitario
                  </TableSortLabel>
                </TableCell>

                <TableCell align="center" style={{ width: '11%' }}>
                  <TableSortLabel
                    active={orderBy === 'stockQuantity'}
                    direction={orderBy === 'stockQuantity' ? order : 'asc'}
                    onClick={() => handleSort('stockQuantity')}
                  >
                    Stock / Existencia
                  </TableSortLabel>
                </TableCell>

                <TableCell align="right" style={{ width: '5%' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <Stack spacing={2} alignItems="center">
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary">
                        Cargando catálogo e inventario completo...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <Stack spacing={1.5} alignItems="center">
                      <PackageIcon size={48} color="var(--mui-palette-text-disabled)" />
                      <Typography variant="h6" color="text.secondary">
                        No se encontraron artículos de inventario.
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Intenta ajustar o limpiar los filtros de búsqueda.
                      </Typography>
                      {activeFiltersCount > 0 && (
                        <Button variant="outlined" size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                          Limpiar Todos los Filtros
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  const isOut = item.stockQuantity <= 0;
                  const isLow = item.stockQuantity > 0 && item.stockQuantity <= 5;

                  return (
                    <TableRow hover key={item.productVariantId || item.id} sx={{ transition: 'background-color 0.15s' }}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                          #{item.productId || item.sku}
                        </Typography>
                        {item.sku && item.sku !== `SKU-${item.productId}` && (
                          <Typography variant="caption" color="text.disabled" display="block">
                            {item.sku}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                          {item.description}
                        </Typography>
                        {item.barcodes && item.barcodes.length > 0 && (
                          <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" gap={0.5}>
                            {item.barcodes.slice(0, 2).map((bc) => (
                              <Chip key={bc} label={bc} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                            ))}
                          </Stack>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.provider && item.provider !== 'Sin Proveedor' ? (
                          <Chip
                            label={item.provider}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600, borderRadius: 1.5 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Sin Proveedor
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.genre && item.genre !== 'N/A' ? (
                          <Chip label={item.genre} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.size && item.size !== 'N/A' ? (
                          <Chip
                            label={item.size}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: 11, height: 22 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.color && item.color !== 'N/A' ? (
                          <Chip label={item.color} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                          ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        {item.cost > 0 && (
                          <Typography variant="caption" color="text.disabled" display="block">
                            Costo: ${item.cost.toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={isOut ? 'Agotado (0)' : isLow ? `Poco Stock (${item.stockQuantity})` : `${item.stockQuantity} unid.`}
                          color={isOut ? 'error' : isLow ? 'warning' : 'success'}
                          variant={isOut ? 'filled' : 'outlined'}
                          size="small"
                          sx={{ fontWeight: 700, px: 1 }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Editar Producto y Existencias">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                            <EditIcon size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, 250]}
          component="div"
          count={sortedItems.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
        />
      </Card>

      {/* Metrics Summary Below Table (3 Cards) */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'primary.alpha12',
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <PackageIcon size={28} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    TOTAL PRODUCTOS / SKUS
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {summaryMetrics.totalSkus.toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'success.alpha12',
                    color: 'success.main',
                    display: 'flex',
                  }}
                >
                  <CheckIcon size={28} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    UNIDADES EN INVENTARIO
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {summaryMetrics.totalUnits.toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'warning.alpha12',
                    color: 'warning.main',
                    display: 'flex',
                  }}
                >
                  <WarningIcon size={28} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    POCO STOCK (≤ 5) / AGOTADOS
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={summaryMetrics.outOfStockCount > 0 ? 'error.main' : 'warning.main'}>
                    {summaryMetrics.lowStockCount} / {summaryMetrics.outOfStockCount}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Complete Product Edit Modal Dialog */}
      {editItem && (
        <Dialog open={Boolean(editItem)} onClose={() => setEditItem(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
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
                  <PackageIcon size={24} weight="bold" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Editar Producto
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SKU #{editItem.sku || editItem.productId} • {editItem.description}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={`ID #${editItem.productId}`}
                variant="outlined"
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </DialogTitle>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
            <Tabs value={editTab} onChange={(_, val) => setEditTab(val)}>
              <Tab label="Información General" id="tab-0" />
              <Tab label="Especificaciones" id="tab-1" />
              <Tab label="Sección de Stock / Existencias" id="tab-2" />
            </Tabs>
          </Box>

          <DialogContent dividers sx={{ p: 3 }}>
            {/* Tab 0: General Product Information */}
            {editTab === 0 && (
              <Stack spacing={3}>
                <TextField
                  label="Nombre / Descripción del Producto"
                  fullWidth
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Precio de Venta ($)"
                      type="number"
                      fullWidth
                      value={editForm.price}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Costo de Compra ($)"
                      type="number"
                      fullWidth
                      value={editForm.cost}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, cost: Number(e.target.value) }))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Autocomplete
                      options={providerOptions}
                      value={editForm.provider || null}
                      onChange={(_, newValue) => setEditForm((prev) => ({ ...prev, provider: newValue || '' }))}
                      onInputChange={(_, newInputValue) => setEditForm((prev) => ({ ...prev, provider: newInputValue }))}
                      freeSolo
                      renderInput={(params) => <TextField {...params} label="Proveedor / Marca" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Autocomplete
                      options={departmentOptions}
                      value={editForm.department || null}
                      onChange={(_, newValue) => setEditForm((prev) => ({ ...prev, department: newValue || '' }))}
                      onInputChange={(_, newInputValue) => setEditForm((prev) => ({ ...prev, department: newInputValue }))}
                      freeSolo
                      renderInput={(params) => <TextField {...params} label="Departamento" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Autocomplete
                      options={genreOptions}
                      value={editForm.genre || null}
                      onChange={(_, newValue) => setEditForm((prev) => ({ ...prev, genre: newValue || '' }))}
                      onInputChange={(_, newInputValue) => setEditForm((prev) => ({ ...prev, genre: newInputValue }))}
                      freeSolo
                      renderInput={(params) => <TextField {...params} label="Categoría / Género" fullWidth />}
                    />
                  </Grid>
                </Grid>
              </Stack>
            )}

            {/* Tab 1: Variant Specifications */}
            {editTab === 1 && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Código SKU"
                      fullWidth
                      value={editForm.sku}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      options={sizeOptions}
                      value={editForm.size || null}
                      onChange={(_, newValue) => setEditForm((prev) => ({ ...prev, size: newValue || '' }))}
                      onInputChange={(_, newInputValue) => setEditForm((prev) => ({ ...prev, size: newInputValue }))}
                      freeSolo
                      renderInput={(params) => <TextField {...params} label="Talla / Medida" fullWidth />}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      options={colorOptions}
                      value={editForm.color || null}
                      onChange={(_, newValue) => setEditForm((prev) => ({ ...prev, color: newValue || '' }))}
                      onInputChange={(_, newInputValue) => setEditForm((prev) => ({ ...prev, color: newInputValue }))}
                      freeSolo
                      renderInput={(params) => <TextField {...params} label="Color" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Código de Barras (Barcodes)"
                      fullWidth
                      value={editItem.barcodes?.join(', ') || 'N/A'}
                      disabled
                      helperText="Lectura desde código escaneado"
                    />
                  </Grid>
                </Grid>
              </Stack>
            )}

            {/* Tab 2: Stock & Inventory Section */}
            {editTab === 2 && (
              <Stack spacing={3}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.neutral' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Sucursal / Almacén Activo
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {stores.find((s) => s.id === selectedStoreId)?.name || 'Tienda Principal'}
                      </Typography>
                    </Box>
                    <Chip
                      label={`Valor Stock: $${(editForm.stockQuantity * editForm.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 800 }}
                    />
                  </Stack>
                </Paper>

                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Cantidad en Stock
                  </Typography>
                  <TextField
                    type="number"
                    fullWidth
                    value={editForm.stockQuantity}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, stockQuantity: Number(e.target.value) }))}
                    inputProps={{ min: 0 }}
                  />
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Ajuste Rápido de Stock (+ / -)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {[-10, -5, -1, 1, 5, 10].map((delta) => (
                      <Button
                        key={delta}
                        variant="outlined"
                        size="small"
                        color={delta > 0 ? 'success' : 'error'}
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            stockQuantity: Math.max(0, prev.stockQuantity + delta),
                          }))
                        }
                        sx={{ minWidth: 60, fontWeight: 700 }}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Stack>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5, px: 3 }}>
            <Button onClick={() => setEditItem(null)} disabled={saving} color="inherit">
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSaveProduct} disabled={saving} sx={{ borderRadius: 2, px: 3 }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Guardar Cambios'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
