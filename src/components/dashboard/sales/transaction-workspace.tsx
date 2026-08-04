'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputAdornment from '@mui/material/InputAdornment';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PlusCircle as AddCircleOutlineIcon } from '@phosphor-icons/react/dist/ssr/PlusCircle';
import { Lock as LockIcon } from '@phosphor-icons/react/dist/ssr/Lock';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import dayjs from 'dayjs';
import apiClient from '@/lib/api-client';

export interface LineItem {
    id: string;
    name: string;
    type: string;
    price: number;
    quantity: number;
    locked?: boolean;
}

interface TransactionWorkspaceProps {
    appointment: any;
    items: LineItem[];
    setItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
    discount: { type: 'percentage' | 'fixed', value: number };
    setDiscount: React.Dispatch<React.SetStateAction<{ type: 'percentage' | 'fixed', value: number }>>;
}

export function TransactionWorkspace({ appointment, items, setItems, discount, setDiscount }: TransactionWorkspaceProps): React.JSX.Element {
    const [newItemName, setNewItemName] = React.useState('');
    const [newItemPrice, setNewItemPrice] = React.useState<number | ''>('');
    const [availableProducts, setAvailableProducts] = React.useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = React.useState(false);

    // Fetch products for search bar
    React.useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const res = await apiClient.get('/Products');
                setAvailableProducts(res.data);
            } catch (error) {
                console.error('Failed to fetch products', error);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // Set default item when appointment is selected
    React.useEffect(() => {
        if (appointment && items.length === 0) {
            if (appointment.saleDetails && appointment.saleDetails.length > 0) {
                const fetchedItems = appointment.saleDetails.map((detail: any) => ({
                    id: detail.id.toString(),
                    name: detail.product?.name || `Product #${detail.productId}`,
                    type: 'product',
                    price: detail.unitPrice,
                    quantity: detail.quantity
                }));
                setItems(fetchedItems);
            } else if (appointment.totalAmount > 0) {
                setItems([{
                    id: 'consultation',
                    name: `Consultation: ${appointment.treatmentType || 'General'}`,
                    type: 'consultation',
                    price: appointment.totalAmount, // Use actual total amount
                    quantity: 1
                }]);
            }
        } else if (!appointment) {
            setItems([]);
        }
    }, [appointment, setItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAddItem = () => {
        if (!newItemName || newItemPrice === '') return;
        setItems([...items, { id: Date.now().toString(), name: newItemName, type: 'custom', price: Number(newItemPrice), quantity: 1 }]);
        setNewItemName('');
        setNewItemPrice('');
    };

    const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

    const handleUpdateItem = (id: string, field: 'quantity' | 'price', value: number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = discount.type === 'percentage' ? subtotal * (discount.value / 100) : discount.value;

    if (!appointment) {
        return (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="h6" color="text.secondary">Select an appointment from the queue</Typography>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ p: 2.5, bgcolor: '#f0f7ff', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <Typography variant="h6" color="primary.main">{appointment.patient?.firstName} {appointment.patient?.lastName}</Typography>
                        <Typography variant="body2" color="text.secondary">Patient ID: #{appointment.patientId}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2">Insurance: {appointment.patient?.insuranceProvider || 'Self-Pay'}</Typography>
                        <Typography variant="body2" color="text.secondary">Date of Service: {dayjs(appointment.appointmentDate).format('MMM D, YYYY')}</Typography>
                    </Grid>
                </Grid>
            </Box>

            {/* Dynamic Rows Table */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell width="15%">Qty</TableCell>
                            <TableCell width="25%">Price ($)</TableCell>
                            <TableCell width="20%" align="right">Total</TableCell>
                            <TableCell width="10%"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map(item => (
                            <TableRow key={item.id} hover>
                                <TableCell>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="body2">{item.name}</Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                                        inputProps={{ min: 1 }}
                                        sx={{ width: '60px' }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">${item.price.toFixed(2)}</Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 500 }}>
                                    ${(item.price * item.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)}>
                                        <DeleteIcon size={20} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Quick Add Row */}
                        <TableRow>
                            <TableCell>
                                <Autocomplete
                                    fullWidth
                                    size="small"
                                    options={availableProducts}
                                    getOptionLabel={(option) => option.name || ''}
                                    loading={isLoadingProducts}
                                    value={availableProducts.find(p => p.name === newItemName) || null}
                                    onChange={(_, newValue) => {
                                        if (newValue) {
                                            setNewItemName(newValue.name);
                                            setNewItemPrice(newValue.price);
                                        } else {
                                            setNewItemName('');
                                            setNewItemPrice('');
                                        }
                                    }}
                                    onInputChange={(_, newInputValue) => {
                                        setNewItemName(newInputValue);
                                    }}
                                    renderOption={(props, option) => {
                                        const { key, ...optionProps } = props;
                                        return (
                                            <li key={key} {...optionProps}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'normal', width: '100%' }}>
                                                    {option.name}
                                                </Typography>
                                            </li>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder="Search products..."
                                            InputProps={{
                                                ...params.InputProps,
                                                startAdornment: (
                                                    <React.Fragment>
                                                        <Box sx={{ mr: 1, color: 'text.disabled', display: 'flex' }}><SearchIcon size={20} /></Box>
                                                        {params.InputProps.startAdornment}
                                                    </React.Fragment>
                                                ),
                                                endAdornment: (
                                                    <React.Fragment>
                                                        {isLoadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                                                        {params.InputProps.endAdornment}
                                                    </React.Fragment>
                                                ),
                                            }}
                                        />
                                    )}
                                />
                            </TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {newItemPrice !== '' ? `$${Number(newItemPrice).toFixed(2)}` : '$0.00'}
                                </Typography>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                                <IconButton color="primary" onClick={handleAddItem} disabled={!newItemName || newItemPrice === ''}>
                                    <AddCircleOutlineIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Box>

            {/* Footer Summary */}
            <Box sx={{ p: 2, borderTop: '2px dashed', borderColor: 'divider', bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Discount</Typography>
                        <Stack direction="row" spacing={1}>
                            <Select
                                size="small"
                                value={discount.type}
                                onChange={(e) => setDiscount({ ...discount, type: e.target.value as 'percentage' | 'fixed' })}
                                sx={{ width: 120 }}
                            >
                                <MenuItem value="percentage">Percent (%)</MenuItem>
                                <MenuItem value="fixed">Fixed ($)</MenuItem>
                            </Select>
                            <TextField
                                size="small"
                                type="number"
                                value={discount.value}
                                onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                                sx={{ width: 100 }}
                            />
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Subtotal:</Typography>
                                <Typography>${subtotal.toFixed(2)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Discount:</Typography>
                                <Typography color="error.main">-${discountAmount.toFixed(2)}</Typography>
                            </Stack>
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        </Card>
    );
}


