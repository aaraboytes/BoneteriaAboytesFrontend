'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Typography,
    TextField,
    MenuItem,
    Box,
    CircularProgress
} from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import apiClient from '@/lib/api-client';

export interface InterconsultationDialogProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    patientId: string;
    attendants: any[];
    onSaved?: () => void;
}

export function InterconsultationDialog({ open, onClose, appointmentId, patientId, attendants, onSaved }: InterconsultationDialogProps): React.JSX.Element {
    const [attendantId, setAttendantId] = React.useState<number | ''>('');
    const [rehabProgramId, setRehabProgramId] = React.useState<number | 'none'>('none');
    const [notes, setNotes] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [rehabPrograms, setRehabPrograms] = React.useState<any[]>([]);
    const [loadingPrograms, setLoadingPrograms] = React.useState(false);

    React.useEffect(() => {
        if (open && patientId) {
            setLoadingPrograms(true);
            apiClient.get(`/Patients/${patientId}/rehabilitation-programs`)
                .then(res => {
                    // Filter or just show all active
                    setRehabPrograms(res.data || []);
                })
                .catch(err => console.error('Failed to load rehab programs:', err))
                .finally(() => setLoadingPrograms(false));
        } else {
            setAttendantId('');
            setRehabProgramId('none');
            setNotes('');
        }
    }, [open, patientId]);

    const handleSave = async () => {
        if (!attendantId) {
            alert('Please select an attendant.');
            return;
        }

        setSaving(true);
        try {
            await apiClient.post(`/Appointments/${appointmentId}/transform-interconsultation`, {
                attendantId: Number(attendantId),
                rehabProgramId: rehabProgramId === 'none' ? null : Number(rehabProgramId),
                notes
            });
            if (onSaved) onSaved();
            onClose();
        } catch (error: any) {
            console.error('Failed to transform to interconsultation:', error);
            alert(error.response?.data || 'Failed to transform appointment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Convert into Interconsultation</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Typography variant="body2" color="text.secondary">
                        Transforming this appointment will automatically reschedule any linked rehabilitation session forward and assign the selected attendant and notes to this interconsultation.
                    </Typography>

                    <TextField
                        select
                        fullWidth
                        label="Attendant"
                        value={attendantId}
                        onChange={(e) => setAttendantId(e.target.value as number | '')}
                        required
                    >
                        {attendants.map((att) => (
                            <MenuItem key={att.id} value={att.id}>
                                {att.fullName}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box>
                        <TextField
                            select
                            fullWidth
                            label="Add to Program..."
                            value={rehabProgramId}
                            onChange={(e) => setRehabProgramId(e.target.value as number | 'none')}
                            disabled={loadingPrograms}
                        >
                            <MenuItem value="none">
                                <em>None (Standalone)</em>
                            </MenuItem>
                            {rehabPrograms.map((prog) => (
                                <MenuItem key={prog.id} value={prog.id}>
                                    #{prog.id} - {prog.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        {loadingPrograms && <CircularProgress size={20} sx={{ mt: 1 }} />}
                    </Box>

                    <TextField
                        label="Interconsultation Notes"
                        multiline
                        rows={4}
                        fullWidth
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add final notes for this interconsultation..."
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />} 
                    onClick={handleSave}
                    disabled={saving || !attendantId}
                >
                    Transform
                </Button>
            </DialogActions>
        </Dialog>
    );
}
