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
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
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
  Sparkle as SparkleIcon
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
}: InventoryTableProps): React.JSX.Element {
  // Global search autocomplete state
  const [globalSearch, setGlobalSearch] = React.useState<string>('');

  // Column-level Autocomplete filter states
  const [descriptionFilter, setDescriptionFilter] = React.useState<string>('');
  const [providerFilter, setProviderFilter] = React.useState<string | null>(null);
  const [genreFilter, setGenreFilter] = React.useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = React.useState<string | null>(null);
  const [colorFilter, setColorFilter] = React.useState<string | null>(null);
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string | null>(null);

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

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setNewStockVal(item.stockQuantity);
  };

  const handleSaveStock = async () => {
    if (!adjustItem || !onAdjustStock) return;
    setAdjusting(true);
    try {
      await onAdjustStock(adjustItem.productVariantId, newStockVal);
      setAdjustItem(null);
    } catch (e) {
      console.error('Failed to update stock', e);
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Metrics Header Summary */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'info.alpha12',
                    color: 'info.main',
                    display: 'flex',
                  }}
                >
                  <TrendIcon size={28} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    VALOR TOTAL INVENTARIO
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    ${summaryMetrics.totalValuation.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Filter & Search Control Panel */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            {/* Global Autocomplete Search Bar */}
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

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
              {/* Store Selector Dropdown */}
              {stores.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 220 }}>
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
                <IconButton onClick={onRefresh} color="primary" disabled={loading} title="Actualizar Datos">
                  <RefreshIcon size={22} className={loading ? 'spin' : ''} />
                </IconButton>
              )}
            </Stack>
          </Stack>

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
                        <Tooltip title="Ajustar Existencias / Stock">
                          <IconButton size="small" color="primary" onClick={() => handleOpenAdjust(item)}>
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

      {/* Stock Adjustment Modal Dialog */}
      {adjustItem && (
        <Dialog open={Boolean(adjustItem)} onClose={() => setAdjustItem(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Ajustar Existencia / Stock</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={1}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {adjustItem.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  SKU #{adjustItem.productId} | Talla: {adjustItem.size} | Color: {adjustItem.color}
                </Typography>
              </Box>

              <TextField
                label="Nueva Cantidad en Stock"
                type="number"
                fullWidth
                value={newStockVal}
                onChange={(e) => setNewStockVal(Number(e.target.value))}
                inputProps={{ min: 0 }}
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAdjustItem(null)} disabled={adjusting}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSaveStock} disabled={adjusting}>
              {adjusting ? <CircularProgress size={20} /> : 'Guardar Ajuste'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
