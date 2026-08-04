'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

interface Attendant {
    id: number;
    fullName: string;
}

interface ServiceWorkDialogProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    patientName: string;
    serviceId: number;
    serviceName: string;
    currentAttendantId: number | null;
    attendants: Attendant[];
    onSaved: (appointmentId: string, serviceId: number, attendantId: number | null) => Promise<void>;
}

export function ServiceWorkDialog({
    open,
    onClose,
    appointmentId,
    patientName,
    serviceId,
    serviceName,
    currentAttendantId,
    attendants,
    onSaved
}: ServiceWorkDialogProps) {
    const [selectedAttendant, setSelectedAttendant] = React.useState<Attendant | null>(null);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setSelectedAttendant(attendants.find(a => a.id === currentAttendantId) || null);
        }
    }, [open, currentAttendantId, attendants]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSaved(appointmentId, serviceId, selectedAttendant?.id || null);
            onClose();
        } catch (error) {
            console.error('Error saving service work attendant:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Assign Staff for Service</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2.5}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
                            PATIENT
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {patientName}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
                            SERVICE
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {serviceName}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
                            STAFF / ATTENDANT
                        </Typography>
                        <Autocomplete
                            options={attendants}
                            getOptionLabel={(option) => option.fullName || ''}
                            value={selectedAttendant}
                            onChange={(_, newValue) => setSelectedAttendant(newValue)}
                            renderOption={(props, option) => {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { key, ...optionProps } = props;
                                return (
                                    <li key={option.id} {...optionProps}>
                                        {option.fullName}
                                    </li>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select attendant..." variant="outlined" size="small" />
                            )}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Selection'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
