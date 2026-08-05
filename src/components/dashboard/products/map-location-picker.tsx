'use client';

import * as React from 'react';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  MapPin as PinIcon,
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
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: 520,
              bgcolor: '#ffffff',
              borderRadius: 3,
              border: '2px dashed #cbd5e1',
              overflowX: 'auto',
              p: 2,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 680,
                height: 570,
                flexShrink: 0,
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
