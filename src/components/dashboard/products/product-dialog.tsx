'use client';

import * as React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
    Avatar,
    IconButton,
    FormControlLabel,
    Checkbox,
    Alert,
    Autocomplete,
    InputAdornment,
} from '@mui/material';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import apiClient from '@/lib/api-client';
import { Product } from './products-table';
import { MapLocationPicker } from './map-location-picker';

interface ProductDialogProps {
    open: boolean;
    onClose: () => void;
    /** Should reject with an Error (shown inline) if saving fails; the dialog stays open. */
    onSave: (product: Partial<Product>) => Promise<void>;
    product?: Product | null;
}

export function ProductDialog({ open, onClose, onSave, product }: ProductDialogProps): React.JSX.Element {
    const [formData, setFormData] = React.useState<Partial<Product>>({
        name: '',
        description: '',
        price: 0,
        quantity: undefined,
        imageBase64: '',
        isDefault: false,
        mapLocation: [],
    });

    const [availableLocations, setAvailableLocations] = React.useState<string[]>([]);
    const [supplierOptions, setSupplierOptions] = React.useState<string[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [touched, setTouched] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;

        const fetchSuppliers = async () => {
            try {
                const res = await apiClient.get('/Suppliers');
                if (Array.isArray(res.data)) {
                    const names = res.data.map((s: any) => s.name).filter(Boolean);
                    setSupplierOptions(Array.from(new Set(names)).sort());
                }
            } catch (err) {
                console.error('Failed to load suppliers:', err);
            }
        };

        const fetchStoreMapLocations = async () => {
            try {
                const res = await apiClient.get('/Stores');
                const stores = res.data || [];
                const locationSet = new Set<string>();

                stores.forEach((store: any) => {
                    if (store.mapData) {
                        try {
                            const parsed = JSON.parse(store.mapData);
                            const objects = parsed.objects || [];
                            objects.forEach((obj: any) => {
                                if (obj.customName) {
                                    locationSet.add(obj.customName);
                                }
                                if (obj.text && typeof obj.text === 'string' && obj.text.trim().length > 0) {
                                    locationSet.add(obj.text.trim());
                                }
                            });
                        } catch (e) {
                            console.error('Failed to parse mapData JSON for store', store.id, e);
                        }
                    }
                });

                if (locationSet.size === 0) {
                    ['CAJA', 'A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5'].forEach((l) => locationSet.add(l));
                }

                setAvailableLocations(Array.from(locationSet));
            } catch (err) {
                console.error('Failed to load store map locations', err);
                setAvailableLocations(['CAJA', 'A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5']);
            }
        };

        fetchSuppliers();
        fetchStoreMapLocations();
    }, [open]);

    React.useEffect(() => {
        if (product) {
            setFormData({
                ...product,
                mapLocation: product.mapLocation && Array.isArray(product.mapLocation) ? product.mapLocation : [],
            });
        } else {
            setFormData({
                name: '',
                description: '',
                price: 0,
                quantity: undefined,
                imageBase64: '',
                isDefault: false,
                mapLocation: [],
            });
        }
        setSaveError(null);
        setTouched(false);
    }, [product, open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({ ...prev, imageBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const nameMissing = !formData.name?.trim();
    const priceInvalid = !(Number(formData.price) > 0);

    const handleSave = async () => {
        setTouched(true);
        if (nameMissing || priceInvalid) return;
        setSaving(true);
        setSaveError(null);
        try {
            await onSave(formData);
        } catch (err: any) {
            setSaveError(err?.message || 'No se pudo guardar el producto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSave();
                }}
            >
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={formData.imageBase64 || undefined}
                                sx={{ width: 120, height: 120, bgcolor: 'background.neutral' }}
                                variant="rounded"
                            >
                                <CameraIcon size={32} />
                            </Avatar>
                            <input
                                accept="image/*"
                                type="file"
                                id="product-image-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <label htmlFor="product-image-upload">
                                <IconButton
                                    component="span"
                                    aria-label="Elegir imagen"
                                    sx={{
                                        position: 'absolute',
                                        right: -8,
                                        bottom: -8,
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                    }}
                                    size="small"
                                >
                                    <CameraIcon size={16} />
                                </IconButton>
                            </label>
                            {formData.imageBase64 && (
                                <IconButton
                                    aria-label="Quitar imagen"
                                    onClick={() => setFormData((prev) => ({ ...prev, imageBase64: '' }))}
                                    sx={{
                                        position: 'absolute',
                                        right: -8,
                                        top: -8,
                                        bgcolor: 'error.main',
                                        color: 'error.contrastText',
                                        '&:hover': { bgcolor: 'error.dark' },
                                    }}
                                    size="small"
                                >
                                    <XIcon size={16} />
                                </IconButton>
                            )}
                        </Box>
                    </Box>

                    <TextField
                        label="Nombre del producto"
                        required
                        fullWidth
                        autoFocus
                        value={formData.name ?? ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={touched && nameMissing}
                        helperText={touched && nameMissing ? 'Escribe el nombre del producto.' : ' '}
                    />

                    <TextField
                        label="Descripción (opcional)"
                        multiline
                        rows={3}
                        fullWidth
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Autocomplete
                            options={supplierOptions}
                            value={
                                typeof formData.supplier === 'object' && formData.supplier
                                    ? formData.supplier.name
                                    : (formData.supplier || formData.provider || null)
                            }
                            onChange={(_, newValue) =>
                                setFormData((prev) => ({ ...prev, provider: newValue || '', supplier: newValue || '' }))
                            }
                            onInputChange={(_, newInputValue) =>
                                setFormData((prev) => ({ ...prev, provider: newInputValue, supplier: newInputValue }))
                            }
                            freeSolo
                            fullWidth
                            renderInput={(params) => <TextField {...params} label="Proveedor / Marca" fullWidth />}
                        />
                        <TextField
                            label="Modelo"
                            fullWidth
                            value={typeof formData.model === 'object' && formData.model ? formData.model.name : (formData.model || '')}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            placeholder="Ej. Slim Fit, Modelo 2026, Clasico..."
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Precio de venta"
                            required
                            fullWidth
                            type="number"
                            value={formData.price ?? ''}
                            onChange={(e) => setFormData({ ...formData, price: Math.max(0, parseFloat(e.target.value) || 0) })}
                            slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                            error={touched && priceInvalid}
                            helperText={touched && priceInvalid ? 'El precio debe ser mayor que $0.' : ' '}
                        />
                        <TextField
                            label="Existencia inicial (opcional)"
                            fullWidth
                            type="number"
                            value={formData.quantity ?? ''}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value ? Math.max(0, parseInt(e.target.value, 10)) : undefined })}
                            slotProps={{ htmlInput: { min: 0, step: 1 } }}
                            helperText="Déjalo vacío si vas a registrar la entrada después."
                        />
                    </Stack>

                    <MapLocationPicker
                        selectedLocations={formData.mapLocation || []}
                        onChange={(locations) => setFormData((prev) => ({ ...prev, mapLocation: locations }))}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox 
                                checked={formData.isDefault} 
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })} 
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body1">Producto predeterminado</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Al marcarlo, deja de ser predeterminado cualquier otro producto.
                                </Typography>
                            </Box>
                        }
                    />
                    {saveError ? <Alert severity="error">{saveError}</Alert> : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" disabled={saving}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Agregar producto'}
                </Button>
            </DialogActions>
            </form>
        </Dialog>
    );
}
