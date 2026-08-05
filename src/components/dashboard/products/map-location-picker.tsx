'use client';

import * as React from 'react';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  MapPin as PinIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  ArrowsOut as ResetIcon,
  Hand as HandIcon,
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';

export interface MapObjectItem {
  id: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  type: string;
}

export interface MapLocationPickerProps {
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
}

export function MapLocationPicker({ selectedLocations, onChange }: MapLocationPickerProps): React.JSX.Element {
  const [stores, setStores] = React.useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = React.useState<number | ''>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [mapObjects, setMapObjects] = React.useState<MapObjectItem[]>([]);

  // Zoom & Pan state
  const [zoom, setZoom] = React.useState<number>(1);
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState<boolean>(false);
  const [panStart, setPanStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Reset view when selected store changes
  React.useEffect(() => {
    handleResetView();
  }, [selectedStoreId]);

  // Non-passive wheel listener for smooth zooming inside container
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 3.0));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Middle-click / Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1 || isPanning) {
      setIsPanning(false);
    }
  };

  // 1. Fetch Stores list
  React.useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/Stores');
        const list = res.data || [];
        setStores(list);
        if (list.length > 0) {
          setSelectedStoreId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load stores', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  // 2. Parse selected store map data or fallback layout
  React.useEffect(() => {
    if (!selectedStoreId) return;

    const store = stores.find((s) => s.id === selectedStoreId);
    if (store && store.mapData) {
      try {
        const parsed = JSON.parse(store.mapData);
        const rawObjects = parsed.objects || [];
        const extracted: MapObjectItem[] = [];

        rawObjects.forEach((obj: any, idx: number) => {
          let name = obj.customName || '';

          if (!name && obj.objects && Array.isArray(obj.objects)) {
            const subTextObj = obj.objects.find((so: any) => so.customName || so.text);
            if (subTextObj) {
              name = subTextObj.customName || subTextObj.text || '';
            }
          }

          if (!name && obj.text) {
            name = obj.text;
          }

          if (!name) {
            name = `Zona ${idx + 1}`;
          }

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

        if (extracted.length > 0) {
          setMapObjects(extracted);
          return;
        }
      } catch (e) {
        console.error('Failed to parse mapData', e);
      }
    }

    setMapObjects([]);
  }, [selectedStoreId, stores]);

  const handleToggleLocation = (name: string) => {
    const isSelected = selectedLocations.includes(name);
    if (isSelected) {
      onChange(selectedLocations.filter((l) => l !== name));
    } else {
      onChange([...selectedLocations, name]);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#f8fafc' }}>
      <Stack spacing={2}>
        {/* Header & Store Selector */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <PinIcon size={22} color="#2563eb" weight="bold" />
            <Typography variant="subtitle1" fontWeight={700}>
              Plano de la Sucursal (Haz clic en los cuadros para seleccionar ubicaciones)
            </Typography>
          </Stack>

          {stores.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="map-picker-store-label">Sucursal</InputLabel>
              <Select
                labelId="map-picker-store-label"
                value={selectedStoreId}
                label="Sucursal"
                onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              >
                {stores.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {/* Selected Badges */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Ubicaciones seleccionadas ({selectedLocations.length}):
          </Typography>
          {selectedLocations.length === 0 ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              Ninguna (haz clic en las casillas del mapa abajo)
            </Typography>
          ) : (
            selectedLocations.map((loc) => (
              <Chip
                key={loc}
                label={loc}
                color="primary"
                size="small"
                onDelete={() => handleToggleLocation(loc)}
                sx={{ fontWeight: 700, fontSize: 11 }}
              />
            ))
          )}
        </Box>

        {/* Interactive Floor Map Canvas Area */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : mapObjects.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              px: 3,
              bgcolor: '#ffffff',
              borderRadius: 3,
              border: '2px dashed #cbd5e1',
              textAlign: 'center',
            }}
          >
            <PinIcon size={44} color="#94a3b8" weight="duotone" />
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary" sx={{ mt: 1.5 }}>
              Esta sucursal aún no tiene un mapa configurado
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 420, mt: 0.5 }}>
              Para asignar ubicaciones en esta tienda, ingresa al menú de <strong>Sucursales</strong> y abre el <strong>Diseñador de Mapa</strong>.
            </Typography>
          </Box>
        ) : (
          <Box
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onAuxClick={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: 520,
              bgcolor: '#ffffff',
              borderRadius: 3,
              border: '2px dashed #cbd5e1',
              overflow: 'hidden',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isPanning ? 'grabbing' : 'default',
              userSelect: 'none',
            }}
          >
            {/* Navigation Hint Badge */}
            <Paper
              variant="outlined"
              sx={{
                position: 'absolute',
                top: 14,
                left: 14,
                zIndex: 20,
                borderRadius: 2,
                px: 1.5,
                py: 0.6,
                bgcolor: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
              }}
            >
              <HandIcon size={16} color="#64748b" weight="bold" />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Wheel: <strong>Zoom</strong> • Clic Central: <strong>Mover plano</strong>
              </Typography>
            </Paper>

            {/* Floating Zoom & Reset Control Bar */}
            <Paper
              variant="outlined"
              sx={{
                position: 'absolute',
                top: 14,
                right: 14,
                zIndex: 20,
                borderRadius: 2,
                p: 0.5,
                bgcolor: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Acercar (Zoom In)">
                  <IconButton
                    size="small"
                    onClick={() => setZoom((z) => Math.min(z * 1.2, 3.0))}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <PlusIcon size={18} weight="bold" />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 42, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </Typography>
                <Tooltip title="Alejar (Zoom Out)">
                  <IconButton
                    size="small"
                    onClick={() => setZoom((z) => Math.max(z * 0.8, 0.4))}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <MinusIcon size={18} weight="bold" />
                  </IconButton>
                </Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Tooltip title="Restablecer Vista (100% / Centrar)">
                  <IconButton size="small" onClick={handleResetView} sx={{ borderRadius: 1.5 }}>
                    <ResetIcon size={18} weight="bold" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>

            {/* Inner Canvas Floor Plan with Transform Matrix */}
            <Box
              sx={{
                position: 'relative',
                width: 680,
                height: 570,
                flexShrink: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {mapObjects.map((obj) => {
                const isSelected = selectedLocations.includes(obj.name);

                return (
                  <Card
                    key={obj.id}
                    onClick={() => handleToggleLocation(obj.name)}
                    variant="outlined"
                    sx={{
                      position: 'absolute',
                      left: obj.left,
                      top: obj.top,
                      width: obj.width,
                      height: obj.height,
                      borderRadius: 2.5,
                      borderWidth: isSelected ? 3 : 2,
                      borderColor: isSelected ? '#2563eb' : '#334155',
                      bgcolor: isSelected ? '#eff6ff' : '#f8fafc',
                      boxShadow: isSelected ? '0 4px 14px rgba(37,99,235,0.25)' : '0 2px 4px rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.18s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.04)',
                        borderColor: '#2563eb',
                        bgcolor: isSelected ? '#dbeafe' : '#f1f5f9',
                      },
                    }}
                  >
                    <Stack alignItems="center" justifyContent="center" spacing={0.5}>
                      {isSelected && <CheckIcon size={22} color="#2563eb" weight="fill" />}
                      <Typography
                        variant="subtitle1"
                        fontWeight={800}
                        color={isSelected ? 'primary.main' : 'text.primary'}
                        sx={{ fontSize: 16, letterSpacing: 0.5 }}
                      >
                        {obj.name}
                      </Typography>
                    </Stack>
                  </Card>
                );
              })}
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
