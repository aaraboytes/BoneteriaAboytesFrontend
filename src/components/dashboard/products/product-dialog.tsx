'use client';

import * as React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    OutlinedInput,
    Stack,
    TextField,
    Typography,
    Avatar,
    IconButton,
    FormControlLabel,
    Checkbox,
    Autocomplete,
    Chip,
} from '@mui/material';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import apiClient from '@/lib/api-client';
import { Product } from './products-table';
import { MapLocationPicker } from './map-location-picker';

interface ProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (product: Partial<Product>) => void;
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

    const handleSave = () => {
        if (!formData.name || formData.price === undefined) return;
        onSave(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
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

                    <FormControl fullWidth required>
                        <InputLabel>Product Name</InputLabel>
                        <OutlinedInput
                            label="Product Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </FormControl>

                    <TextField
                        label="Description"
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

                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth required>
                            <InputLabel>Price ($)</InputLabel>
                            <OutlinedInput
                                label="Price ($)"
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            />
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Initial Quantity (Optional)</InputLabel>
                            <OutlinedInput
                                label="Initial Quantity (Optional)"
                                type="number"
                                value={formData.quantity ?? ''}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                                placeholder="Leaves blank for N/A"
                            />
                        </FormControl>
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
                                <Typography variant="body1">Mark as Default Product</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Setting this will remove default status from any other product.
                                </Typography>
                            </Box>
                        }
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={!formData.name}
                >
                    {product ? 'Save Changes' : 'Add Product'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
