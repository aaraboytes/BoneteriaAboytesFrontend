'use client';

import * as React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@/lib/api-client';

export interface RescheduleDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    appointment: Record<string, any> | null;
    timeOnly?: boolean;
}

export function RescheduleDialog({
    open,
    onClose,
    onSuccess,
    appointment,
    timeOnly
}: RescheduleDialogProps): React.JSX.Element {
    const [appointmentDate, setAppointmentDate] = React.useState<Dayjs | null>(null);
    const [startTime, setStartTime] = React.useState<Dayjs | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open && appointment) {
            const start = dayjs(appointment.appointmentDate);
            setAppointmentDate(start);
            setStartTime(start);
            setError(null);
        }
    }, [open, appointment]);

    const handleSubmit = async () => {
        if (!appointment || !appointmentDate || !startTime) return;

        setSubmitting(true);
        setError(null);

        try {
            // Combine date and time
            const newStart = appointmentDate
                .set('hour', startTime.hour())
                .set('minute', startTime.minute())
                .set('second', 0);

            // Calculate duration from original
            const originalStart = dayjs(appointment.appointmentDate);
            const originalEnd = dayjs(appointment.appointmentEndTime);
            const durationMinutes = originalEnd.diff(originalStart, 'minute');
            const newEnd = newStart.add(durationMinutes, 'minute');

            // Sanitize payload for backend
            const payload: any = {
                id: appointment.id,
                patientId: appointment.patientId,
                userId: appointment.userId,
                equipmentId: appointment.equipmentId || null,
                appointmentDate: newStart.toISOString(),
                appointmentEndTime: newEnd.toISOString(),
                reason: appointment.reason,
                treatmentType: appointment.treatmentType,
                status: appointment.status,
                recurrenceRuleId: appointment.recurrenceRuleId || null,
                originalScheduledDate: appointment.originalScheduledDate || null,
                rehabilitationSessionId: appointment.rehabilitationSessionId || null,
                services: appointment.services?.map((s: any) => ({ id: s.id })) || [],
                technologies: appointment.technologies?.map((t: any) => ({ id: t.id })) || []
            };

            // Backend PUT handles both real updates and virtual-to-override creation (id <= 0)
            await apiClient.put(`/Appointments/${appointment.id}`, payload);

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to reschedule:', err);
            setError(err.response?.data?.title || err.message || 'Failed to reschedule appointment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{timeOnly ? 'Reschedule Time' : 'Reschedule Appointment'}</DialogTitle>
            <DialogContent dividers>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        {appointment && (
                            <Typography variant="body2" color="text.secondary">
                                Rescheduling for: <strong>{appointment.patient?.firstName} {appointment.patient?.lastName}</strong>
                            </Typography>
                        )}

                        {error && <Alert severity="error">{error}</Alert>}

                        {!timeOnly && (
                            <DatePicker
                                label="New Date"
                                value={appointmentDate}
                                onChange={(val) => setAppointmentDate(val)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        )}

                        <TimePicker
                            label="New Time"
                            value={startTime}
                            minutesStep={1}
                            onChange={(val) => setStartTime(val)}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Stack>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    disabled={submitting || !appointmentDate || !startTime}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    Confirm Reschedule
                </Button>
            </DialogActions>
        </Dialog>
    );
}
