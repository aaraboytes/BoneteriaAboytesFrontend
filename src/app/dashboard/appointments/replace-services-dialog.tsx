'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import apiClient from '@/lib/api-client';

interface Service {
    id: number;
    name: string;
    color: string;
}

interface ReplaceServicesDialogProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string | number;
    currentServiceIds: number[];
    patientName: string;
    onSaved?: () => void;
}

export function ReplaceServicesDialog({
    open,
    onClose,
    appointmentId,
    currentServiceIds,
    patientName,
    onSaved
}: ReplaceServicesDialogProps) {
    const [allServices, setAllServices] = React.useState<Service[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            fetchAllServices();
            setSelectedIds(currentServiceIds);
        }
    }, [open, currentServiceIds]);

    const fetchAllServices = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/Services');
            setAllServices(res.data);
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (id: number) => {
        const currentIndex = selectedIds.indexOf(id);
        const newSelected = [...selectedIds];

        if (currentIndex === -1) {
            newSelected.push(id);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        setSelectedIds(newSelected);
    };

    const handleSave = async () => {
        if (selectedIds.length === 0) {
            window.alert('At least one service must be selected.');
            return;
        }

        setSaving(true);
        try {
            await apiClient.patch(`/Appointments/${appointmentId}/services`, {
                serviceIds: selectedIds
            });
            onSaved?.();
            onClose();
        } catch (error: any) {
            console.error('Error replacing services:', error);
            window.alert(`Failed to replace services: ${error.response?.data || error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Replace Assigned Services</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Stack alignItems="center" py={3}>
                        <CircularProgress size={24} />
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Patient: <strong>{patientName}</strong>
                        </Typography>
                        <Typography variant="body2">
                            Select the services to assign to this appointment. If this is part of a rehabilitation program, the session services will also be updated.
                        </Typography>
                        <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <List dense>
                                {allServices.map((service) => {
                                    const labelId = `checkbox-list-label-${service.id}`;
                                    return (
                                        <ListItem key={service.id} disablePadding>
                                            <ListItemButton onClick={() => handleToggle(service.id)} dense>
                                                <ListItemIcon>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={selectedIds.indexOf(service.id) !== -1}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        inputProps={{ 'aria-labelledby': labelId }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText 
                                                    id={labelId} 
                                                    primary={service.name} 
                                                    secondary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: service.color }} />
                                                            <Typography variant="caption">{service.color}</Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={saving || loading || selectedIds.length === 0}
                >
                    {saving ? 'Saving...' : 'Apply Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
