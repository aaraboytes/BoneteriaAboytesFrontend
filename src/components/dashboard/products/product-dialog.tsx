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
} from '@mui/material';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Product } from './products-table';

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
    });

    React.useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData({
                name: '',
                description: '',
                price: 0,
                quantity: undefined,
                imageBase64: '',
                isDefault: false,
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
