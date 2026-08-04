'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import { Clock as AccessTimeIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { CheckCircle as CheckCircleOutlineIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Chip
} from '@mui/material';

interface QueueSidebarProps {
    onSelectSale: (sale: any) => void;
    selectedId?: number;
    refreshTrigger?: number;
}

export function QueueSidebar({ onSelectSale, selectedId, refreshTrigger = 0 }: QueueSidebarProps): React.JSX.Element {
    const [pendingSales, setPendingSales] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
    const [targetSale, setTargetSale] = React.useState<any>(null);
    const [updating, setUpdating] = React.useState(false);

    React.useEffect(() => {
        let isMounted = true;
        const fetchSales = async () => {
            try {
                // Add timestamp to prevent browser caching of the pending list
                const response = await apiClient.get(`/Sales/pending?t=${Date.now()}`);
                if (isMounted) {
                    setPendingSales(response.data);
                }
            } catch (error: any) {
                console.error('Failed to fetch pending sales:', error);
                if (error.response?.status === 404 && isMounted) {
                    setPendingSales([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSales();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchSales, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [refreshTrigger]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    const handleSaleClick = (sale: any) => {
        const appointment = sale.appointment || sale.Appointment;
        const status = (appointment?.status || appointment?.Status || '')?.toLowerCase()?.trim();
        
        if (status === 'in_progress') {
            setTargetSale(sale);
            setConfirmDialogOpen(true);
            return;
        }
        onSelectSale(sale);
    };

    const handleConfirmDone = async () => {
        const appointmentId = targetSale?.appointmentId || targetSale?.AppointmentId || targetSale?.appointment?.id || targetSale?.Appointment?.Id;
        if (!targetSale || !appointmentId) {
            console.error('No appointment ID found for sale', targetSale);
            alert('Cannot complete checkout: No appointment linked to this sale.');
            setConfirmDialogOpen(false);
            return;
        }
        setUpdating(true);
        try {
            await apiClient.patch(`/Appointments/${appointmentId}/status`, { status: 'done' });
            // Refresh list
            const response = await apiClient.get(`/Sales/pending?t=${Date.now()}`);
            setPendingSales(response.data);
            setConfirmDialogOpen(false);
            setTargetSale(null);
        } catch (error) {
            console.error('Failed to update appointment status:', error);
            alert('Failed to update appointment status');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.50' }}>
                <Typography variant="h6" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon fontSize="small" /> Pending Checkout
                </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                {pendingSales.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 10, px: 2, opacity: 0.6 }}>
                        <Typography variant="body1" fontWeight={600}>Clinic is caught up!</Typography>
                        <Typography variant="body2">No pending sales.</Typography>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {pendingSales.map((sale) => {
                            const patientName = sale.patient ? `${sale.patient.firstName} ${sale.patient.lastName}` : 'Unknown Patient';
                            const isSelected = selectedId === sale.id;

                            // Calculate time waiting since sale was created
                            const minutesWaiting = Math.max(0, dayjs().diff(dayjs(sale.createdAt), 'minute'));

                            return (
                                <Card
                                    key={sale.id}
                                    variant="outlined"
                                    sx={{
                                        borderLeft: isSelected ? '4px solid' : '1px solid',
                                        borderLeftColor: isSelected ? 'primary.main' : 'divider',
                                        bgcolor: isSelected ? 'primary.50' : 'background.paper',
                                        transition: 'all 0.2s',
                                        opacity: (sale.appointment?.status || sale.Appointment?.Status)?.toLowerCase() === 'in_progress' ? 0.6 : 1,
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <CardActionArea onClick={() => handleSaleClick(sale)} sx={{ p: 1.5 }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar sx={{ width: 40, height: 40, bgcolor: isSelected ? 'primary.main' : 'grey.400' }}>
                                                {patientName.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{patientName}</Typography>
                                                    {(() => {
                                                        const appt = sale.appointment || sale.Appointment;
                                                        const status = (appt?.status || appt?.Status || '')?.toLowerCase()?.trim();
                                                        if (!status) return null;
                                                        
                                                        const isProgress = status === 'in_progress';
                                                        return (
                                                            <Chip 
                                                                label={status.replace('_', ' ')} 
                                                                size="small" 
                                                                color={isProgress ? 'warning' : 'success'} 
                                                                sx={{ fontSize: '0.6rem', height: 16, textTransform: 'uppercase' }} 
                                                            />
                                                        );
                                                    })()}
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">Order #{sale.id}</Typography>
                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, color: minutesWaiting > 15 ? 'error.main' : 'text.secondary' }}>
                                                    <AccessTimeIcon size={14} />
                                                    <Typography variant="caption">Wait: {minutesWaiting} min</Typography>
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </CardActionArea>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </Box>

            <Dialog open={confirmDialogOpen} onClose={() => !updating && setConfirmDialogOpen(false)}>
                <DialogTitle>Move to Checkout</DialogTitle>
                <DialogContent>
                    <Typography>
                        Do you want to move this appointment to <span style={{ color: '#2e7d32', fontWeight: 700 }}>DONE</span>?
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        This will enable payment processing for this sale.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)} color="inherit" disabled={updating}>No</Button>
                    <Button onClick={handleConfirmDone} color="success" variant="contained" disabled={updating}>
                        {updating ? 'Updating...' : 'Yes, move to DONE'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}
