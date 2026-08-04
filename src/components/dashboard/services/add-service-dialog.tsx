'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import * as PhosphorIcons from '@phosphor-icons/react/dist/ssr';
import apiClient from '@/lib/api-client';
import type { ServiceRecord } from '@/app/dashboard/services/services-client';

const PRESET_COLORS = [
    '#ef4444', // Red
    '#f43f5e', // Rose
    '#d946ef', // Fuchsia
    '#a855f7', // Purple
    '#8b5cf6', // Violet
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#0ea5e9', // Sky
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#10b981', // Emerald
    '#22c55e', // Green
    '#84cc16', // Lime
    '#eab308', // Yellow
    '#f59e0b', // Amber
    '#f97316', // Orange
    '#64748b', // Slate
    '#71717a', // Zinc
    '#737373', // Neutral
    '#78716c', // Stone
    '#9f1239', // Dark Rose
    '#4c1d95', // Dark Violet
    '#1e3a8a', // Dark Blue
    '#064e3b', // Dark Emerald
    '#451a03', // Dark Amber
    '#fca5a5', // Light Red
    '#93c5fd', // Light Blue
    '#86efac', // Light Green
    '#fde047', // Light Yellow
];

const AVAILABLE_ICONS = [
    'Briefcase', 'Star', 'Heart', 'Activity', 'Barbell',
    'FirstAid', 'Drop', 'Fire', 'Lightning', 'Moon',
    'Sun', 'Thermometer', 'WaveSine', 'Bicycle', 'Person'
];

export interface AddServiceDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serviceToEdit?: ServiceRecord | null;
}

interface FormValues {
    name: string;
    alias: string;
    performerIds: number[];
    technologyIds: number[];
    icon: string;
    duration: number;
    color: string;
    cost: number;
}

export function AddServiceDialog({ open, onClose, onSuccess, serviceToEdit }: AddServiceDialogProps): React.JSX.Element {
    const [performers, setPerformers] = React.useState<any[]>([]);
    const [technologies, setTechnologies] = React.useState<any[]>([]);
    const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);
    const [formData, setFormData] = React.useState<FormValues>({
        name: '',
        alias: '',
        performerIds: [],
        technologyIds: [],
        icon: 'Briefcase',
        duration: 0,
        color: PRESET_COLORS[0],
        cost: 0
    });

    const [manualId, setManualId] = React.useState<number | ''>('');

    const [isDeleting, setIsDeleting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            if (serviceToEdit) {
                setFormData({
                    name: serviceToEdit.name || '',
                    alias: (serviceToEdit as any).alias || '',
                    performerIds: serviceToEdit.performers?.map(p => p.id) || [],
                    technologyIds: serviceToEdit.technologies?.map(t => t.id) || [],
                    icon: serviceToEdit.icon || 'Briefcase',
                    duration: serviceToEdit.duration || 0,
                    color: (serviceToEdit as any).color || PRESET_COLORS[0],
                    cost: serviceToEdit.cost || 0
                });
                setManualId(serviceToEdit.id);
            } else {
                setFormData({ name: '', alias: '', performerIds: [], technologyIds: [], icon: 'Briefcase', duration: 0, color: PRESET_COLORS[0], cost: 0 });
                setManualId('');
            }
            fetchPerformers();
            fetchTechnologies();
        }
    }, [open, serviceToEdit]);

    const fetchPerformers = async () => {
        try {
            const response = await apiClient.get('/Users');
            setPerformers(response.data);
        } catch (e) {
            console.error('Error fetching users:', e);
        }
    };

    const fetchTechnologies = async () => {
        try {
            const response = await apiClient.get('/Technologies');
            setTechnologies(response.data);
        } catch (e) {
            console.error('Error fetching technologies:', e);
        }
    };

    const handleChange = (field: keyof FormValues, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleTechnologyChange = (selectedIds: number[]) => {
        // 1. Calculate duration based on selected technologies
        const calculatedDuration = selectedIds.reduce((total, id) => {
            const tech = technologies.find((t) => t.id === id);
            return total + (tech?.durationMinutes || 0);
        }, 0);

        setFormData((prev) => ({
            ...prev,
            technologyIds: selectedIds,
            duration: calculatedDuration
        }));
    };

    const handleDelete = async () => {
        if (!serviceToEdit) return;
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            setIsDeleting(true);
            await apiClient.delete(`/Services/${serviceToEdit.id}`);
            onSuccess();
        } catch (error) {
            console.error('Failed to delete service:', error);
            alert('Failed to delete service.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                ...formData,
                newId: manualId === '' ? undefined : Number(manualId)
            };
            if (serviceToEdit) {
                await apiClient.put(`/Services/${serviceToEdit.id}`, payload);
            } else {
                await apiClient.post('/Services', payload);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save service:', error);
            alert('Failed to save service. Please review selections.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{serviceToEdit ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            label="ID"
                            type="number"
                            sx={{ width: 200 }}
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value === '' ? '' : Number(e.target.value))}
                            disabled={!serviceToEdit}
                        />
                        <TextField
                            autoFocus
                            fullWidth
                            label="Service Name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="Alias"
                            value={formData.alias}
                            onChange={(e) => handleChange('alias', e.target.value)}
                        />
                        <FormControl fullWidth>
                            <InputLabel shrink>Appearance (Icon & Color)</InputLabel>
                            <div onClick={(e) => setAnchorEl(e.currentTarget as any)}>
                                <OutlinedInput
                                    readOnly
                                    fullWidth
                                    label="Appearance (Icon & Color)"
                                    value=" "
                                    sx={{ cursor: 'pointer' }}
                                    startAdornment={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: formData.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {(() => {
                                                    const IconComp = (PhosphorIcons as any)[formData.icon] || (PhosphorIcons as any).Briefcase;
                                                    return <IconComp color="#fff" size={18} />;
                                                })()}
                                            </Box>
                                            <Typography variant="body1">{formData.icon}</Typography>
                                        </Stack>
                                    }
                                />
                            </div>
                            <Popover
                                open={Boolean(anchorEl)}
                                anchorEl={anchorEl}
                                onClose={() => setAnchorEl(null)}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                            >
                                <Box sx={{ p: 2, width: 340 }}>
                                    <Typography variant="subtitle2" gutterBottom>Theme Color</Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                                        {PRESET_COLORS.map((c) => (
                                            <Box
                                                key={c}
                                                onClick={() => handleChange('color', c)}
                                                sx={{
                                                    width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                                    border: formData.color === c ? '2px solid #000' : '2px solid transparent',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                    <Typography variant="subtitle2" gutterBottom>Icon</Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                        {AVAILABLE_ICONS.map((i) => {
                                            const IconComp = (PhosphorIcons as any)[i];
                                            return (
                                                <Box
                                                    key={i}
                                                    onClick={() => handleChange('icon', i)}
                                                    sx={{
                                                        p: 1, borderRadius: 1, cursor: 'pointer',
                                                        bgcolor: formData.icon === i ? 'action.selected' : 'transparent',
                                                        '&:hover': { bgcolor: 'action.hover' }
                                                    }}
                                                >
                                                    {IconComp && <IconComp size={28} color={formData.icon === i ? formData.color : 'inherit'} />}
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            </Popover>
                        </FormControl>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>Performers</InputLabel>
                            <Select
                                multiple
                                label="Performers"
                                value={formData.performerIds}
                                onChange={(e) => {
                                    const { value } = e.target;
                                    handleChange('performerIds', typeof value === 'string' ? value.split(',').map(Number) : value);
                                }}
                                input={<OutlinedInput label="Performers" />}
                                renderValue={(selected) =>
                                    (selected as number[]).map(id => performers.find(p => p.id === id)?.fullName).join(', ')
                                }
                            >
                                {performers.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        <Checkbox checked={formData.performerIds.indexOf(user.id) > -1} />
                                        <ListItemText primary={user.fullName} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>Technologies</InputLabel>
                            <Select
                                multiple
                                value={formData.technologyIds}
                                onChange={(e) => {
                                    const { value } = e.target;
                                    handleTechnologyChange(typeof value === 'string' ? value.split(',').map(Number) : value as number[]);
                                }}
                                input={<OutlinedInput label="Technologies" />}
                                renderValue={(selected) =>
                                    (selected as number[]).map(id => technologies.find(t => t.id === id)?.name).join(', ')
                                }
                            >
                                {technologies.map((tech) => (
                                    <MenuItem key={tech.id} value={tech.id}>
                                        <Checkbox checked={formData.technologyIds.indexOf(tech.id) > -1} />
                                        <ListItemText primary={tech.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Service Duration (Total Mins)"
                            type="number"
                            value={formData.duration}
                            onChange={(e) => handleChange('duration', Number(e.target.value))}
                        />
                        <TextField
                            fullWidth
                            label="Cost ($)"
                            type="number"
                            value={formData.cost}
                            onChange={(e) => handleChange('cost', Number(e.target.value))}
                        />
                    </Stack>



                </Stack>
            </DialogContent>
            <DialogActions sx={{ justifyContent: serviceToEdit ? 'space-between' : 'flex-end' }}>
                {serviceToEdit && (
                    <Button color="error" onClick={handleDelete} disabled={isDeleting}>
                        Delete
                    </Button>
                )}
                <Stack direction="row" spacing={1}>
                    <Button onClick={onClose} color="inherit" disabled={isDeleting}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={isDeleting}>
                        {serviceToEdit ? 'Save' : 'Create'}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
