'use client';

import * as React from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  MagnifyingGlass as SearchIcon,
  Funnel as FilterIcon,
  X as ClearIcon,
  PencilSimple as PencilIcon,
  Trash as TrashIcon,
} from '@phosphor-icons/react';

export interface ProductVariant {
  id?: string;
  sku?: string;
  size?: { id: number; name: string } | string | null;
  color?: { id: number; name: string } | string | null;
  inventory?: { stockQuantity: number } | null;
  barcodes?: Array<{ barcode: string }> | string[] | null;
}

export interface Product {
  id: number;
  name?: string;
  description?: string;
  price: number;
  cost?: number;
  quantity?: number;
  imageBase64?: string;
  isDefault?: boolean;
  mapLocation?: string[];
  department?: { id: number; name: string } | string | null;
  supplier?: { id: number; name: string } | string | null;
  provider?: string;
  genre?: { id: number; name: string } | string | null;
  size?: string;
  color?: string;
  sku?: string;
  barcodes?: string[];
  variants?: ProductVariant[];
}

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

// Helpers to extract filter attributes from product or variants
function getProvider(p: Product): string {
  if (p.provider) return p.provider;
  if (p.supplier) {
    if (typeof p.supplier === 'object' && p.supplier.name) return p.supplier.name;
    if (typeof p.supplier === 'string') return p.supplier;
  }
  return 'Sin Proveedor';
}

function getGenre(p: Product): string {
  if (p.genre) {
    if (typeof p.genre === 'object' && p.genre.name) return p.genre.name;
    if (typeof p.genre === 'string') return p.genre;
  }
  return 'N/A';
}

function getSizes(p: Product): string[] {
  const sizes = new Set<string>();
  if (p.size && p.size !== 'N/A') sizes.add(p.size);
  if (p.variants && Array.isArray(p.variants)) {
    p.variants.forEach((v) => {
      if (v.size) {
        const s = typeof v.size === 'object' ? v.size.name : v.size;
        if (s && s !== 'N/A') sizes.add(s);
      }
    });
  }
  return Array.from(sizes);
}

function getColors(p: Product): string[] {
  const colors = new Set<string>();
  if (p.color && p.color !== 'N/A') colors.add(p.color);
  if (p.variants && Array.isArray(p.variants)) {
    p.variants.forEach((v) => {
      if (v.color) {
        const c = typeof v.color === 'object' ? v.color.name : v.color;
        if (c && c !== 'N/A') colors.add(c);
      }
    });
  }
  return Array.from(colors);
}

function getStock(p: Product): number {
  if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
    let sum = 0;
    let hasInventory = false;
    p.variants.forEach((v) => {
      if (v.inventory && typeof v.inventory.stockQuantity === 'number') {
        sum += v.inventory.stockQuantity;
        hasInventory = true;
      }
    });
    if (hasInventory) return sum;
  }
  return p.quantity ?? 0;
}

function getSkus(p: Product): string[] {
  const skus = new Set<string>();
  if (p.sku) skus.add(p.sku);
  if (p.variants && Array.isArray(p.variants)) {
    p.variants.forEach((v) => {
      if (v.sku) skus.add(v.sku);
    });
  }
  return Array.from(skus);
}

function getBarcodes(p: Product): string[] {
  const barcodes = new Set<string>();
  if (p.barcodes && Array.isArray(p.barcodes)) {
    p.barcodes.forEach((b) => barcodes.add(b));
  }
  if (p.variants && Array.isArray(p.variants)) {
    p.variants.forEach((v) => {
      if (v.barcodes && Array.isArray(v.barcodes)) {
        v.barcodes.forEach((b: any) => {
          const code = typeof b === 'object' ? b.barcode : b;
          if (code) barcodes.add(code);
        });
      }
    });
  }
  return Array.from(barcodes);
}

export function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps): React.JSX.Element {
  // Global search autocomplete state
  const [globalSearch, setGlobalSearch] = React.useState<string>('');

  // Column Filters state
  const [providerFilter, setProviderFilter] = React.useState<string | null>(null);
  const [genreFilter, setGenreFilter] = React.useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = React.useState<string | null>(null);
  const [colorFilter, setColorFilter] = React.useState<string | null>(null);
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string | null>(null);

  // Pagination
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  // Dynamic filter options extraction
  const providerOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const prov = getProvider(p);
      if (prov && prov !== 'Sin Proveedor') set.add(prov);
    });
    return Array.from(set).sort();
  }, [products]);

  const genreOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const g = getGenre(p);
      if (g && g !== 'N/A') set.add(g);
    });
    return Array.from(set).sort();
  }, [products]);

  const sizeOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      getSizes(p).forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [products]);

  const colorOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      getColors(p).forEach((c) => set.add(c));
    });
    return Array.from(set).sort();
  }, [products]);

  const stockStatusOptions = ['En Existencia (>0)', 'Poco Stock (1 - 5)', 'Sin Stock (0)'];

  // Global search autocomplete options
  const globalSearchOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const name = p.name || p.description;
      if (name) set.add(name);
      const prov = getProvider(p);
      if (prov && prov !== 'Sin Proveedor') set.add(prov);
      getSkus(p).forEach((s) => set.add(s));
      getBarcodes(p).forEach((b) => set.add(b));
      getColors(p).forEach((c) => set.add(c));
      getSizes(p).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [products]);

  // Filtering logic
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // 1. Global Search Filter
      if (globalSearch) {
        const q = globalSearch.toLowerCase().trim();
        const name = (p.name || p.description || '').toLowerCase();
        const prov = getProvider(p).toLowerCase();
        const skus = getSkus(p).map((s) => s.toLowerCase());
        const barcodes = getBarcodes(p).map((b) => b.toLowerCase());
        const colors = getColors(p).map((c) => c.toLowerCase());
        const sizes = getSizes(p).map((s) => s.toLowerCase());

        const matchesName = name.includes(q);
        const matchesProv = prov.includes(q);
        const matchesSku = skus.some((s) => s.includes(q));
        const matchesBarcode = barcodes.some((b) => b.includes(q));
        const matchesColor = colors.some((c) => c.includes(q));
        const matchesSize = sizes.some((s) => s.includes(q));

        if (!matchesName && !matchesProv && !matchesSku && !matchesBarcode && !matchesColor && !matchesSize) {
          return false;
        }
      }

      // 2. Provider Filter
      if (providerFilter) {
        if (getProvider(p) !== providerFilter) return false;
      }

      // 3. Genre Filter
      if (genreFilter) {
        if (getGenre(p) !== genreFilter) return false;
      }

      // 4. Size Filter
      if (sizeFilter) {
        if (!getSizes(p).includes(sizeFilter)) return false;
      }

      // 5. Color Filter
      if (colorFilter) {
        if (!getColors(p).includes(colorFilter)) return false;
      }

      // 6. Stock Status Filter
      if (stockStatusFilter) {
        const stock = getStock(p);
        if (stockStatusFilter === 'En Existencia (>0)' && stock <= 0) return false;
        if (stockStatusFilter === 'Poco Stock (1 - 5)' && (stock <= 0 || stock > 5)) return false;
        if (stockStatusFilter === 'Sin Stock (0)' && stock > 0) return false;
      }

      return true;
    });
  }, [products, globalSearch, providerFilter, genreFilter, sizeFilter, colorFilter, stockStatusFilter]);

  // Paginated slice
  const paginatedProducts = React.useMemo(() => {
    return filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredProducts, page, rowsPerPage]);

  const handleClearFilters = () => {
    setGlobalSearch('');
    setProviderFilter(null);
    setGenreFilter(null);
    setSizeFilter(null);
    setColorFilter(null);
    setStockStatusFilter(null);
    setPage(0);
  };

  const activeFiltersCount = [
    globalSearch,
    providerFilter,
    genreFilter,
    sizeFilter,
    colorFilter,
    stockStatusFilter,
  ].filter(Boolean).length;

  return (
    <Stack spacing={3}>
      {/* Main Filter & Search Control Panel */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Stack spacing={2}>
          {/* Global Autocomplete Search Bar */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
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

      {/* Products Table Card */}
      <Card variant="outlined">
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '800px' }}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Detalles / Descripción</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Ubicación en Mapa</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedProducts.map((product) => {
                const displayName = product.name || product.description || 'Producto';
                const firstLetter = displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'P';
                const locations = product.mapLocation && Array.isArray(product.mapLocation) ? product.mapLocation : [];
                const provider = getProvider(product);
                const genre = getGenre(product);
                const colors = getColors(product);
                const sizes = getSizes(product);
                const stock = getStock(product);

                return (
                  <TableRow hover key={product.id}>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={product.imageBase64 ? product.imageBase64 : undefined}
                          variant="rounded"
                          sx={{ width: 48, height: 48, bgcolor: 'background.neutral' }}
                        >
                          {firstLetter}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{displayName}</Typography>
                          <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                            {product.isDefault && (
                              <Chip label="Default" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                            )}
                            {provider !== 'Sin Proveedor' && (
                              <Chip label={provider} size="small" color="default" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                            )}
                            {genre !== 'N/A' && (
                              <Chip label={genre} size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.description || 'Sin descripción'}
                      </Typography>
                      {(sizes.length > 0 || colors.length > 0) && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {sizes.length > 0 && `Talla: ${sizes.join(', ')}`}{' '}
                          {colors.length > 0 && `${sizes.length > 0 ? '| ' : ''}Color: ${colors.join(', ')}`}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${stock} units`}
                        size="small"
                        color={stock > 5 ? 'success' : stock > 0 ? 'warning' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {locations.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {locations.map((loc) => (
                            <Chip key={loc} label={loc} size="small" color="info" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Sin asignar</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => onEdit(product)}>
                          <PencilIcon fontSize="var(--icon-fontSize-md)" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => onDelete(product.id)}>
                          <TrashIcon fontSize="var(--icon-fontSize-md)" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {activeFiltersCount > 0
                        ? 'No se encontraron productos con los filtros seleccionados.'
                        : 'No products found. Add your first product!'}
                    </Typography>
                    {activeFiltersCount > 0 && (
                      <Button variant="text" size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                        Limpiar Filtros
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredProducts.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Filas por página:"
        />
      </Card>
    </Stack>
  );
}
