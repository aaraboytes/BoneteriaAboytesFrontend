import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';

import type { Technology } from './technologies-client';
import { MuscleSelector } from '@/components/dashboard/services/muscle-selector';

export interface TechnologyPayload {
    name: string;
    alias: string;
    dateLastMaintenance: string | null;
    maintenancePeriodicityDays: number;
    durationMinutes: number;
    status: string;
    color: string;
    muscleGroups: string;
    availableStartTime: string;
    availableEndTime: string;
}

const PREDEFINED_COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#f97316', // Orange
];

interface TechnologyDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: TechnologyPayload) => Promise<void>;
    initialData?: Technology | null;
}

export function TechnologyDialog({ open, onClose, onSubmit, initialData }: TechnologyDialogProps): React.JSX.Element {
    const [submitting, setSubmitting] = React.useState(false);

    // Form state
    const [name, setName] = React.useState('');
    const [alias, setAlias] = React.useState('');
    const [dateLastMaintenance, setDateLastMaintenance] = React.useState<dayjs.Dayjs | null>(null);
    const [periodicity, setPeriodicity] = React.useState('30');
    const [duration, setDuration] = React.useState('60');
    const [status, setStatus] = React.useState('Active');
    const [color, setColor] = React.useState(PREDEFINED_COLORS[0]);
    const [muscleGroups, setMuscleGroups] = React.useState<string[]>([]);
    const [startTime, setStartTime] = React.useState<dayjs.Dayjs | null>(dayjs().set('hour', 8).set('minute', 0));
    const [endTime, setEndTime] = React.useState<dayjs.Dayjs | null>(dayjs().set('hour', 20).set('minute', 0));

    // Reset when opened/closed/initialData changes
    React.useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setAlias(initialData.alias);
                setDateLastMaintenance(initialData.dateLastMaintenance ? dayjs(initialData.dateLastMaintenance) : null);
                setPeriodicity(initialData.maintenancePeriodicityDays.toString());
                setDuration(initialData.durationMinutes?.toString() || '60');
                setStatus(initialData.status);
                setColor(initialData.color ? initialData.color.toLowerCase() : PREDEFINED_COLORS[0]);
                setMuscleGroups(initialData.muscleGroups ? initialData.muscleGroups.split(',').map(m => m.trim()).filter(Boolean) : []);

                // Parse "HH:mm:ss"
                const startParts = initialData.availableStartTime.split(':');
                setStartTime(dayjs().set('hour', parseInt(startParts[0])).set('minute', parseInt(startParts[1])).set('second', 0));

                const endParts = initialData.availableEndTime.split(':');
                setEndTime(dayjs().set('hour', parseInt(endParts[0])).set('minute', parseInt(endParts[1])).set('second', 0));
            } else {
                setName('');
                setAlias('');
                setDateLastMaintenance(null);
                setPeriodicity('30');
                setDuration('60');
                setStatus('Active');
                setColor(PREDEFINED_COLORS[0]);
                setMuscleGroups([]);
                setStartTime(dayjs().set('hour', 8).set('minute', 0));
                setEndTime(dayjs().set('hour', 20).set('minute', 0));
            }
            setSubmitting(false);
        }
    }, [open, initialData]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await onSubmit({
                name,
                alias,
                dateLastMaintenance: dateLastMaintenance ? dateLastMaintenance.toISOString() : null,
                maintenancePeriodicityDays: parseInt(periodicity) || 30,
                durationMinutes: parseInt(duration) || 60,
                status,
                color,
                muscleGroups: muscleGroups.join(', '),
                // Format the TimeSpan properly like "08:00:00"
                availableStartTime: startTime ? startTime.format('HH:mm:ss') : '08:00:00',
                availableEndTime: endTime ? endTime.format('HH:mm:ss') : '20:00:00'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>{initialData ? 'Edit Machine' : 'Add New Machine'}</DialogTitle>
                <form onSubmit={handleFormSubmit}>
                    <DialogContent dividers>
                        <Stack spacing={3}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Name"
                                    required
                                    fullWidth
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <TextField
                                    label="Alias (Optional)"
                                    fullWidth
                                    value={alias}
                                    onChange={(e) => setAlias(e.target.value)}
                                    helperText="Autogenerated if empty"
                                />
                            </Stack>

                            <Stack direction="row" spacing={2}>
                                <DatePicker
                                    label="Last Maintenance Date"
                                    value={dateLastMaintenance}
                                    onChange={(newValue) => setDateLastMaintenance(newValue)}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                                <TextField
                                    label="Maintenance Periodicity (Days)"
                                    required
                                    fullWidth
                                    type="number"
                                    value={periodicity}
                                    onChange={(e) => setPeriodicity(e.target.value)}
                                    inputProps={{ min: 1 }}
                                />
                            </Stack>

                            <Stack direction="row" spacing={2}>
                                <TextField
                                    select
                                    label="Status"
                                    required
                                    fullWidth
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <MenuItem value="Active">Active</MenuItem>
                                    <MenuItem value="Inactive">Inactive</MenuItem>
                                </TextField>
                                <TextField
                                    label="Duration (Minutes)"
                                    fullWidth
                                    type="number"
                                    required
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    inputProps={{ min: 1 }}
                                />
                            </Stack>

                            <Stack spacing={1}>
                                <Typography variant="subtitle2">Machine Color</Typography>
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                    {PREDEFINED_COLORS.map(c => (
                                        <Box
                                            key={c}
                                            onClick={() => setColor(c)}
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                bgcolor: c,
                                                cursor: 'pointer',
                                                border: color.toLowerCase() === c.toLowerCase() ? '3px solid var(--mui-palette-primary-main)' : '2px solid transparent',
                                                boxShadow: color.toLowerCase() === c.toLowerCase() ? 2 : 0,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    opacity: 0.8,
                                                }
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>

                            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                                <MuscleSelector selectedMuscles={muscleGroups} onChange={setMuscleGroups} />
                            </Stack>

                            <Stack direction="row" spacing={2}>
                                <TimePicker
                                    label="Available Start Time"
                                    value={startTime}
                                    onChange={(newValue) => setStartTime(newValue)}
                                    slotProps={{ textField: { fullWidth: true, required: true } }}
                                />
                                <TimePicker
                                    label="Available End Time"
                                    value={endTime}
                                    onChange={(newValue) => setEndTime(newValue)}
                                    slotProps={{ textField: { fullWidth: true, required: true } }}
                                />
                            </Stack>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting || !name}>
                            {initialData ? 'Save Changes' : 'Add Machine'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </LocalizationProvider>
    );
}
