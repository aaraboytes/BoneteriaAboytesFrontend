'use client';

import * as React from 'react';
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
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
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  X as XIcon,
  MapTrifold as MapIcon,
  MapPin as PinIcon,
  MagnifyingGlass as SearchIcon,
  CheckCircle as CheckIcon,
  Funnel as FilterIcon,
  Package as PackageIcon,
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';
import { InventoryItem } from './inventory-table';

export interface MapObjectItem {
  id: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  type: string;
}

export interface StoreMapDialogProps {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
  stores: { id: number; name: string; code: string; mapData?: string }[];
  selectedStoreId?: number;
  hoveredItem?: InventoryItem | null;
  onHoverItem?: (item: InventoryItem | null) => void;
}

// Module-level in-memory cache for instant zero-latency rendering
const storeMapCache: Record<number, MapObjectItem[]> = {};

export function parseStoreMapData(mapDataStr?: string | null): MapObjectItem[] {
  if (mapDataStr) {
    try {
      const parsed = JSON.parse(mapDataStr);
      const rawObjects = parsed.objects || [];
      const extracted: MapObjectItem[] = [];

      rawObjects.forEach((obj: any, idx: number) => {
        let name = obj.customName || '';
        if (!name && obj.objects && Array.isArray(obj.objects)) {
          const subTextObj = obj.objects.find((so: any) => so.customName || so.text);
          if (subTextObj) name = subTextObj.customName || subTextObj.text || '';
        }
        if (!name && obj.text) name = obj.text;
        if (!name) name = `Zona ${idx + 1}`;

        if (name && typeof name === 'string' && name.trim().length > 0) {
          extracted.push({
            id: obj.customId || `map_obj_${idx}`,
            name: name.trim(),
            left: obj.left || 10 + (idx % 3) * 150,
            top: obj.top || 10 + Math.floor(idx / 3) * 100,
            width: (obj.width || 120) * (obj.scaleX || 1),
            height: (obj.height || 80) * (obj.scaleY || 1),
            type: obj.type || 'rect',
          });
        }
      });

      if (extracted.length > 0) return extracted;
    } catch (e) {
      console.error('Failed to parse mapData JSON', e);
    }
  }

  // Default layout grid if map is not customized yet
  const defaultZones = ['CAJA', 'A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5'];
  return defaultZones.map((zName, idx) => ({
    id: `default_${idx}`,
    name: zName,
    left: 20 + (idx % 4) * 155,
    top: 20 + Math.floor(idx / 4) * 115,
    width: 135,
    height: 90,
    type: 'rect',
  }));
}

export function StoreMapDialog({
  open,
  onClose,
  items,
  stores,
  selectedStoreId,
  hoveredItem,
  onHoverItem,
}: StoreMapDialogProps): React.JSX.Element {
  const [activeStoreId, setActiveStoreId] = React.useState<number | ''>(selectedStoreId || stores[0]?.id || 1);
  const [cachedMaps, setCachedMaps] = React.useState<Record<number, MapObjectItem[]>>(storeMapCache);
  const [selectedZoneFilter, setSelectedZoneFilter] = React.useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = React.useState<string | null>(null);
  const [dialogSearch, setDialogSearch] = React.useState<string>('');
  const [localHoveredItem, setLocalHoveredItem] = React.useState<InventoryItem | null>(null);

  // Pagination state (25 products per page)
  const [page, setPage] = React.useState<number>(0);
  const rowsPerPage = 25;

  // Synchronize store ID immediately when selectedStoreId changes
  React.useEffect(() => {
    if (selectedStoreId) {
      setActiveStoreId(selectedStoreId);
    } else if (stores.length > 0) {
      setActiveStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setPage(0);
  }, [dialogSearch, selectedZoneFilter, hoveredZone]);

  // Pre-fetch all stores in background once to warm cache
  React.useEffect(() => {
    const prefetchStores = async () => {
      try {
        const res = await apiClient.get('/Stores');
        const list = res.data || [];
        list.forEach((s: any) => {
          if (s.id && s.mapData) {
            const objs = parseStoreMapData(s.mapData);
            storeMapCache[s.id] = objs;
          }
        });
        setCachedMaps({ ...storeMapCache });
      } catch (err) {
        console.error('Background store map prefetch error', err);
      }
    };

    prefetchStores();
  }, []);

  // Compute map objects synchronously with zero latency
  const mapObjects = React.useMemo(() => {
    const store = stores.find((s) => s.id === Number(activeStoreId));
    if (store && store.mapData) {
      return parseStoreMapData(store.mapData);
    }
    if (activeStoreId && cachedMaps[Number(activeStoreId)]) {
      return cachedMaps[Number(activeStoreId)];
    }
    return parseStoreMapData(null);
  }, [activeStoreId, stores, cachedMaps]);

  // Compute products per zone count
  const productsPerZone = React.useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const locs = item.mapLocation && Array.isArray(item.mapLocation) ? item.mapLocation : [];
      locs.forEach((loc) => {
        counts[loc] = (counts[loc] || 0) + 1;
      });
    });
    return counts;
  }, [items]);

  // Combined active hovered item (from table or local dialog hover)
  const currentHoveredItem = hoveredItem || localHoveredItem;

  // Filtered sidebar items
  const sidebarItems = React.useMemo(() => {
    return items.filter((item) => {
      const locs = item.mapLocation && Array.isArray(item.mapLocation) ? item.mapLocation : [];
      if (selectedZoneFilter && !locs.includes(selectedZoneFilter)) {
        return false;
      }
      if (hoveredZone && !locs.includes(hoveredZone)) {
        return false;
      }
      if (dialogSearch) {
        const q = dialogSearch.toLowerCase().trim();
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesSku = item.sku?.toLowerCase().includes(q);
        const matchesLoc = locs.some((l) => l.toLowerCase().includes(q));
        if (!matchesDesc && !matchesSku && !matchesLoc) return false;
      }
      return true;
    });
  }, [items, selectedZoneFilter, hoveredZone, dialogSearch]);

  // Paginated sidebar slice (25 per page)
  const paginatedSidebarItems = React.useMemo(() => {
    return sidebarItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sidebarItems, page]);

  const activeStoreObj = stores.find((s) => s.id === Number(activeStoreId));
  const activeStoreName = activeStoreObj ? activeStoreObj.name : 'Sucursal';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      keepMounted
      PaperProps={{ sx: { borderRadius: 3, minHeight: '85vh' } }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: 'primary.50',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapIcon size={24} weight="bold" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Plano Interactivo de Ubicaciones - {activeStoreName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pasa el cursor sobre un producto para resaltar su ubicación en el mapa, o sobre una zona del plano para ver sus productos.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {stores.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="map-dialog-store-label">🏢 Sucursal</InputLabel>
                <Select
                  labelId="map-dialog-store-label"
                  value={activeStoreId}
                  label="🏢 Sucursal"
                  onChange={(e) => {
                    setActiveStoreId(Number(e.target.value));
                    setSelectedZoneFilter(null);
                  }}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {stores.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      🏢 {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <IconButton onClick={onClose} size="small" sx={{ bgcolor: 'action.hover' }}>
              <XIcon size={20} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
        <Grid container spacing={2.5} sx={{ height: '100%' }}>
          {/* Main Visual Interactive Map Section */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#ffffff', height: '100%', minHeight: 560, position: 'relative' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PinIcon size={20} color="#2563eb" weight="bold" />
                  <Typography variant="subtitle2" fontWeight={800}>
                    Mapa de Secciones / Estantes
                  </Typography>
                </Stack>

                {selectedZoneFilter && (
                  <Chip
                    label={`Filtro Activo: ${selectedZoneFilter}`}
                    color="primary"
                    size="small"
                    onDelete={() => setSelectedZoneFilter(null)}
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Stack>

              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 520,
                  overflow: 'auto',
                  border: '2px dashed #e2e8f0',
                  borderRadius: 2.5,
                  bgcolor: '#fafafa',
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ position: 'relative', width: 680, height: 520, flexShrink: 0 }}>
                  {mapObjects.map((obj) => {
                    const count = productsPerZone[obj.name] || 0;
                    const isHoveredProductZone =
                      currentHoveredItem?.mapLocation &&
                      Array.isArray(currentHoveredItem.mapLocation) &&
                      currentHoveredItem.mapLocation.includes(obj.name);

                    const isSelectedZone = selectedZoneFilter === obj.name;
                    const isHoveredZone = hoveredZone === obj.name;

                    const highlighted = isHoveredProductZone || isSelectedZone || isHoveredZone;

                    return (
                      <Tooltip
                        key={obj.id}
                        title={`${obj.name}: ${count} productos almacenados. Haz clic para filtrar.`}
                        arrow
                        placement="top"
                      >
                        <Card
                          onClick={() => {
                            setSelectedZoneFilter(isSelectedZone ? null : obj.name);
                          }}
                          onMouseEnter={() => setHoveredZone(obj.name)}
                          onMouseLeave={() => setHoveredZone(null)}
                          variant="outlined"
                          sx={{
                            position: 'absolute',
                            left: obj.left,
                            top: obj.top,
                            width: obj.width,
                            height: obj.height,
                            borderRadius: 2.5,
                            borderWidth: highlighted ? 3 : 2,
                            borderColor: isHoveredProductZone
                              ? '#2563eb'
                              : isSelectedZone
                              ? '#059669'
                              : isHoveredZone
                              ? '#6366f1'
                              : '#475569',
                            bgcolor: isHoveredProductZone
                              ? '#dbeafe'
                              : isSelectedZone
                              ? '#d1fae5'
                              : isHoveredZone
                              ? '#e0e7ff'
                              : '#f8fafc',
                            boxShadow: highlighted ? '0 6px 20px rgba(37,99,235,0.35)' : '0 2px 4px rgba(0,0,0,0.04)',
                            transform: highlighted ? 'scale(1.05)' : 'scale(1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: highlighted ? 10 : 1,
                          }}
                        >
                          <Stack alignItems="center" justifyContent="center" spacing={0.5}>
                            {isHoveredProductZone ? (
                              <CheckIcon size={22} color="#2563eb" weight="fill" className="pulse-icon" />
                            ) : isSelectedZone ? (
                              <FilterIcon size={20} color="#059669" weight="fill" />
                            ) : null}

                            <Typography
                              variant="subtitle1"
                              fontWeight={800}
                              color={
                                isHoveredProductZone
                                  ? '#1e40af'
                                  : isSelectedZone
                                  ? '#065f46'
                                  : 'text.primary'
                              }
                              sx={{ fontSize: 15, textAlign: 'center', px: 1 }}
                            >
                              {obj.name}
                            </Typography>

                            <Chip
                              label={`${count} prods`}
                              size="small"
                              color={count > 0 ? (highlighted ? 'primary' : 'default') : 'default'}
                              variant={highlighted ? 'filled' : 'outlined'}
                              sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                            />
                          </Stack>
                        </Card>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Interactive Products List Sidebar with 25 per page Pagination */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={1.5} mb={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={800}>
                    Productos en Sucursal ({sidebarItems.length})
                  </Typography>
                  {(selectedZoneFilter || hoveredZone) && (
                    <Button variant="text" size="small" onClick={() => { setSelectedZoneFilter(null); setHoveredZone(null); }}>
                      Limpiar Selección
                    </Button>
                  )}
                </Stack>

                <TextField
                  placeholder="Filtrar por producto, SKU o ubicación..."
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={dialogSearch}
                  onChange={(e) => setDialogSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={18} />
                      </InputAdornment>
                    ),
                    endAdornment: dialogSearch && (
                      <IconButton size="small" onClick={() => setDialogSearch('')}>
                        <XIcon size={14} />
                      </IconButton>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 400, pr: 0.5 }}>
                <Stack spacing={1}>
                  {paginatedSidebarItems.map((item) => {
                    const isHovered = currentHoveredItem?.productVariantId === item.productVariantId;
                    const locations = item.mapLocation && Array.isArray(item.mapLocation) ? item.mapLocation : [];

                    return (
                      <Paper
                        key={item.productVariantId || item.id}
                        onMouseEnter={() => {
                          setLocalHoveredItem(item);
                          if (onHoverItem) onHoverItem(item);
                        }}
                        onMouseLeave={() => {
                          setLocalHoveredItem(null);
                          if (onHoverItem) onHoverItem(null);
                        }}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          cursor: 'pointer',
                          bgcolor: isHovered ? '#eff6ff' : 'background.paper',
                          borderColor: isHovered ? '#2563eb' : 'divider',
                          borderWidth: isHovered ? 2 : 1,
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': {
                            bgcolor: '#f0f9ff',
                            borderColor: '#3b82f6',
                          },
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="subtitle2" fontWeight={700} color={isHovered ? 'primary.main' : 'text.primary'}>
                              {item.description}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                              ${item.price.toFixed(2)}
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">
                              SKU: {item.sku}
                            </Typography>
                            <Chip
                              label={`Stock: ${item.stockQuantity}`}
                              size="small"
                              color={item.stockQuantity > 5 ? 'success' : item.stockQuantity > 0 ? 'warning' : 'error'}
                              variant="outlined"
                              sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                            />
                          </Stack>

                          <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                            {locations.length > 0 ? (
                              locations.map((loc) => (
                                <Chip
                                  key={loc}
                                  label={`📍 ${loc}`}
                                  size="small"
                                  color={isHovered ? 'primary' : 'info'}
                                  variant={isHovered ? 'filled' : 'outlined'}
                                  sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                                />
                              ))
                            ) : (
                              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                Sin ubicación asignada
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}

                  {sidebarItems.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                      <PackageIcon size={32} color="#94a3b8" />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        No se encontraron productos con los filtros seleccionados.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Sidebar Pagination (25 products per page) */}
              <Divider sx={{ my: 1 }} />
              <TablePagination
                component="div"
                count={sidebarItems.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[25]}
                labelRowsPerPage="Por página:"
                sx={{
                  '.MuiTablePagination-toolbar': { px: 1, minHeight: 40 },
                  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: 12 },
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc' }}>
        <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 700 }}>
          Cerrar Mapa
        </Button>
      </DialogActions>
    </Dialog>
  );
}
