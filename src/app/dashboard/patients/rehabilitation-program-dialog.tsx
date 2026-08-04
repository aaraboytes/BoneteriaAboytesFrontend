'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    MenuItem,
    Box,
    Typography,
    IconButton,
    Chip,
    Select,
    FormControl,
    InputLabel,
    Checkbox,
    ListItemText,
    OutlinedInput,
    Divider,
    ToggleButton,
    Radio,
    RadioGroup,
    FormControlLabel,
    Input
} from '@mui/material';
import { LocalizationProvider, TimePicker, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { MuscleSelector } from '@/components/dashboard/services/muscle-selector';
import apiClient from '@/lib/api-client';
import type { RehabilitationProgramFull } from './rehabilitation-program-details-dialog';

interface ServiceRecord {
    id: number;
    name: string;
    technologies: { id: number; name: string; }[];
}

export interface RehabilitationProgramDialogProps {
    open: boolean;
    patientId: number | null;
    onClose: () => void;
    onSuccess: () => void;
    existingProgram?: RehabilitationProgramFull | null;
}

const DAYS_OF_WEEK = [
    { label: 'S', value: 0 },
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
];

export interface RecurrenceState {
    repeatEvery: number;
    repeatInterval: 'day' | 'week' | 'month' | 'year';
    repeatDays: number[]; // 0=Sunday, 1=Monday, etc.
    endType: 'never' | 'on' | 'after';
    endDate?: string;
    endOccurrences?: number;
    repeatTimes?: Record<string, { start: string, end: string }>;
}

interface RehabSessionState {
    id: string; // purely for React key
    serviceIds: number[];
    count: number;
}

export function RehabilitationProgramDialog({ open, patientId, onClose, onSuccess, existingProgram }: RehabilitationProgramDialogProps): React.JSX.Element {
    const [name, setName] = React.useState('');
    const [status, setStatus] = React.useState('Active');
    const [muscleGroups, setMuscleGroups] = React.useState<string[]>([]);

    // We use Math.random() fallback since crypto.randomUUID() isn't always available in all browser contexts
    const generateId = () => Math.random().toString(36).substring(2, 9);
    
    const parseRecurrenceRule = (rule: any): { type: string; state: RecurrenceState } => {
        const ruleData = rule || {};
        const patternType = String(ruleData.patternType || ruleData.PatternType || '').toLowerCase();
        const repeatEvery = Number(ruleData.repeatEvery ?? ruleData.RepeatEvery) || 1;
        const daysOfWeek = ruleData.daysOfWeek || ruleData.DaysOfWeek;
        const timePreferences = ruleData.timePreferences || ruleData.TimePreferences;
        const maxOccurrences = ruleData.maxOccurrences ?? ruleData.MaxOccurrences;
        const endDate = ruleData.endDate || ruleData.EndDate;

        if (patternType === 'daily' && repeatEvery === 1 && !timePreferences && !daysOfWeek) {
            return { type: 'daily', state: { repeatEvery: 1, repeatInterval: 'day', repeatDays: [], endType: 'never' } };
        }
        if (patternType === 'weekly' && repeatEvery === 1 && !timePreferences && daysOfWeek?.split(',').length <= 1) {
            return { type: 'weekly', state: { repeatEvery: 1, repeatInterval: 'week', repeatDays: daysOfWeek?.split(',').map(Number).filter((n: any) => !isNaN(n)) || [], endType: 'never' } };
        }
        // Custom
        const days = daysOfWeek ? String(daysOfWeek).split(',').map(Number).filter((n: any) => !isNaN(n)) : [];
        return {
            type: 'custom',
            state: {
                repeatEvery,
                repeatInterval: patternType === 'daily' ? 'day' : patternType === 'weekly' ? 'week' : 'month',
                repeatDays: days,
                endType: maxOccurrences ? 'after' : endDate ? 'on' : 'never',
                endDate: endDate ? String(endDate).split('T')[0] : '',
                endOccurrences: Number(maxOccurrences) || 1,
                repeatTimes: timePreferences ? (typeof timePreferences === 'string' ? JSON.parse(timePreferences) : timePreferences) : undefined,
            },
        };
    };

    const [sessionAddCount, setSessionAddCount] = React.useState<number>(1);
    const [sessions, setSessions] = React.useState<RehabSessionState[]>([{ id: generateId(), serviceIds: [], count: 1 }]);

    const [availableServices, setAvailableServices] = React.useState<ServiceRecord[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [patientGender, setPatientGender] = React.useState<'male' | 'female'>('male');

    // Recurrence Rule State
    const [recurrenceType, setRecurrenceType] = React.useState<string>('custom');
    const [recurrenceState, setRecurrenceState] = React.useState<RecurrenceState>({
        repeatEvery: 1,
        repeatInterval: 'week',
        repeatDays: [], // Empty by default
        endType: 'never',
    });
    const [startDate, setStartDate] = React.useState<Dayjs>(dayjs());

    React.useEffect(() => {
        if (!open) return;

        if (patientId) {
            apiClient.get<any>(`Patients/${patientId}`).then(res => {
                setPatientGender(res.data.gender?.toLowerCase() === 'female' ? 'female' : 'male');
            }).catch(err => console.error('Failed to fetch patient gender', err));
        }

        if (existingProgram) {
            setName(existingProgram.name || '');
            setStatus(existingProgram.status || 'Active');
            setMuscleGroups(existingProgram.muscleGroups ? existingProgram.muscleGroups.split(',') : []);
            if (existingProgram.sessions) {
                setSessions(existingProgram.sessions.map((s: any) => ({
                    id: s.id || generateId(),
                    serviceIds: (s.services || []).map((srv: any) => srv.id),
                    count: 1
                })));
            }
            if (existingProgram.recurrenceRule) {
                const parsed = parseRecurrenceRule(existingProgram.recurrenceRule);
                setRecurrenceType(parsed.type);
                setRecurrenceState(parsed.state);
            } else {
                setRecurrenceType('none');
            }
        } else {
            // Reset state on open
            // Default to current user or first available staff if possible
            setName('');
            setStatus('Active');
            setMuscleGroups([]);
            setSessions([{ id: generateId(), serviceIds: [], count: 1 }]);
            setRecurrenceType('custom');
        }

        // Fetch services
        apiClient.get('/Services').then(res => {
            setAvailableServices(res.data);
        }).catch(err => {
            console.error('Failed to fetch services', err);
        });
    }, [open, existingProgram]);

    const handleCloneSession = (index: number) => {
        const source = sessions[index];
        const newSession: RehabSessionState = {
            id: generateId(),
            serviceIds: [...source.serviceIds],
            count: source.count
        };
        const newSessions = [...sessions];
        newSessions.splice(index + 1, 0, newSession);
        setSessions(newSessions);
    };

    const handleRemoveSession = (id: string) => {
        setSessions(sessions.filter(s => s.id !== id));
    };

    const handleSessionChange = (id: string, field: keyof RehabSessionState, value: any) => {
        setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSubmit = async () => {
        if (!patientId || !name) return;
        setSubmitting(true);
        try {
            const finalSessions: any[] = [];
            sessions.forEach(s => {
                for (let i = 0; i < s.count; i++) {
                    finalSessions.push({ serviceIds: s.serviceIds });
                }
            });

            const payload: any = {
                name,
                muscleGroups: muscleGroups.join(','),
                status,
                sessions: finalSessions,
            };

            const hasRecurrence = recurrenceType !== 'none' && (recurrenceType !== 'custom' || recurrenceState.repeatDays.length > 0);
            if (hasRecurrence) {
                payload.Recurrence = {
                    PatternType: recurrenceType === 'custom' ? (recurrenceState.repeatInterval === 'day' ? 'daily' : recurrenceState.repeatInterval === 'week' ? 'weekly' : 'monthly') : (recurrenceType === 'daily' ? 'daily' : 'weekly'),
                    RepeatEvery: recurrenceType === 'custom' ? recurrenceState.repeatEvery : 1,
                    DaysOfWeek: recurrenceType === 'custom' ? recurrenceState.repeatDays.join(',') : '',
                    StartDate: startDate.format('YYYY-MM-DDTHH:mm:ss'),
                    MaxOccurrences: recurrenceType === 'custom' && recurrenceState.endType === 'after' ? recurrenceState.endOccurrences : null,
                    EndDate: recurrenceType === 'custom' && recurrenceState.endType === 'on' ? recurrenceState.endDate : null,
                    TimePreferences: recurrenceType === 'custom' && recurrenceState.repeatTimes ? JSON.stringify(recurrenceState.repeatTimes) : null
                };
            }

            console.log('Saving Rehabilitation Program Payload:', payload);

            if (existingProgram) {
                await apiClient.put(`/Patients/${patientId}/rehabilitation-programs/${existingProgram.id}`, payload);
            } else {
                await apiClient.post(`/Patients/${patientId}/rehabilitation-programs`, payload);
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to save program', err);
            alert('Failed to save program');
        } finally {
            setSubmitting(false);
        }
    };

    // Derive technologies from selected services
    const uniqueTechnologies = React.useMemo(() => {
        const techMap = new Map<number, string>();
        sessions.forEach(session => {
            session.serviceIds.forEach(serviceId => {
                const service = availableServices.find(s => s.id === serviceId);
                if (service && service.technologies) {
                    service.technologies.forEach(tech => {
                        techMap.set(tech.id, tech.name);
                    });
                }
            });
        });
        return Array.from(techMap.values());
    }, [sessions, availableServices]);

    // Calculate simulated session dates based on recurrence rules
    const simulatedDates = React.useMemo(() => {
        const totalCount = sessions.reduce((acc, s) => acc + s.count, 0);
        const hasNoDays = recurrenceType === 'custom' && recurrenceState.repeatInterval === 'week' && recurrenceState.repeatDays.length === 0;
        if (totalCount === 0 || recurrenceType === 'none' || hasNoDays) return [];

        const dates: dayjs.Dayjs[] = [];
        let currentDate = startDate.clone();
        
        while (dates.length < totalCount) {
            let matches = false;
            
            if (recurrenceType === 'daily') {
                matches = true;
            } else if (recurrenceType === 'weekly' || (recurrenceType === 'custom' && recurrenceState.repeatInterval === 'week')) {
                const targetDays = recurrenceType === 'custom' ? recurrenceState.repeatDays : [];
                if (recurrenceType === 'weekly') {
                    matches = currentDate.day() >= 1 && currentDate.day() <= 5; // Default working days if standard weekly
                } else {
                    matches = targetDays.includes(currentDate.day());
                }
            } else if (recurrenceType === 'custom' && recurrenceState.repeatInterval === 'day') {
                matches = true;
            }

            if (matches) {
                dates.push(currentDate.clone());
            }

            if (recurrenceType === 'daily' || (recurrenceType === 'custom' && recurrenceState.repeatInterval === 'day')) {
                currentDate = currentDate.add(recurrenceType === 'custom' ? recurrenceState.repeatEvery : 1, 'day');
            } else if (recurrenceType === 'weekly' || (recurrenceType === 'custom' && recurrenceState.repeatInterval === 'week')) {
                currentDate = currentDate.add(1, 'day');
                const repeatEvery = recurrenceType === 'custom' ? recurrenceState.repeatEvery : 1;
                if (currentDate.day() === 0 && repeatEvery > 1) {
                    currentDate = currentDate.add(7 * (repeatEvery - 1), 'day');
                }
            } else {
                currentDate = currentDate.add(1, 'day');
            }
        }
        return dates;
    }, [sessions, recurrenceType, recurrenceState, startDate]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{existingProgram ? 'Edit' : 'Create'} Rehabilitation Program</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={4}>
                    {/* Program Meta */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Program Details</Typography>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Rehabilitation program's name"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Post-op ACL Recovery"
                            />
                            <TextField
                                label="Status"
                                select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Inactive">Inactive</MenuItem>
                            </TextField>
                        </Stack>

                        <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Program Schedule</Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Program Start Date"
                                    value={startDate}
                                    onChange={(newValue) => setStartDate(newValue || dayjs())}
                                    format="DD/MM/YYYY"
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                            </LocalizationProvider>
                        </Stack>

                        {recurrenceType === 'custom' && (
                            <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2 }}>Select Days and Times</Typography>
                                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                    {DAYS_OF_WEEK.map((day) => {
                                        const isSelected = recurrenceState.repeatDays.includes(day.value);
                                        return (
                                            <Chip
                                                key={day.value}
                                                label={day.label}
                                                color={isSelected ? 'primary' : 'default'}
                                                onClick={() => {
                                                    setRecurrenceState(prev => {
                                                        const newDays = isSelected
                                                            ? prev.repeatDays.filter(d => d !== day.value)
                                                            : [...prev.repeatDays, day.value].sort((a, b) => a - b);
                                                        
                                                        const newTimes = { ...(prev.repeatTimes || {}) };
                                                        if (!isSelected && !newTimes[day.value]) {
                                                            newTimes[day.value] = { start: '09:00', end: '10:00' };
                                                        }
                                                        return { ...prev, repeatDays: newDays, repeatTimes: newTimes };
                                                    });
                                                }}
                                                variant={isSelected ? 'filled' : 'outlined'}
                                                sx={{ width: 40, height: 40, borderRadius: '50%' }}
                                            />
                                        );
                                    })}
                                </Stack>
                                
                                {recurrenceState.repeatDays.length > 0 && (
                                    <Stack spacing={2}>
                                        {recurrenceState.repeatDays.map(dayValue => {
                                            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayValue];
                                            const times = recurrenceState.repeatTimes?.[dayValue] || { start: '09:00', end: '10:00' };
                                            return (
                                                <Stack key={dayValue} direction="row" spacing={2} alignItems="center">
                                                    <Typography sx={{ width: 100 }}>{dayName}</Typography>
                                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                        <TimePicker
                                                            label="Start Time"
                                                            value={dayjs(`2000-01-01T${times.start}`)}
                                                            minutesStep={1}
                                                            onChange={(newValue) => {
                                                                if (newValue) {
                                                                    setRecurrenceState(prev => ({
                                                                        ...prev,
                                                                        repeatTimes: {
                                                                            ...prev.repeatTimes,
                                                                            [dayValue]: { ...times, start: newValue.format('HH:mm') }
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            format="hh:mm A"
                                                            slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                                                        />
                                                        <Typography>to</Typography>
                                                        <TimePicker
                                                            label="End Time"
                                                            value={dayjs(`2000-01-01T${times.end}`)}
                                                            minutesStep={1}
                                                            onChange={(newValue) => {
                                                                if (newValue) {
                                                                    setRecurrenceState(prev => ({
                                                                        ...prev,
                                                                        repeatTimes: {
                                                                            ...prev.repeatTimes,
                                                                            [dayValue]: { ...times, end: newValue.format('HH:mm') }
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            format="hh:mm A"
                                                            slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                                                        />
                                                    </LocalizationProvider>
                                                </Stack>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Muscle Selector */}
                    <Box>
                        <MuscleSelector
                            selectedMuscles={muscleGroups}
                            onChange={setMuscleGroups}
                            gender={patientGender}
                        />
                    </Box>

                    {/* Sessions & Technologies Split Layout */}
                    <Stack direction="row" spacing={3} alignItems="flex-start">
                        {/* LEFT: Sessions & Recurrence */}
                        <Box sx={{ flex: 2 }}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2 }}>Sessions</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total current sessions: {sessions.reduce((acc, s) => acc + s.count, 0)} ({sessions.length} rows)
                                </Typography>
                            </Box>

                            <Stack spacing={2}>
                                <Stack spacing={1}>
                                    {sessions.map((session, index) => {
                                        const bgColor = 'var(--mui-palette-background-level1)';
                                        const startIdx = sessions.slice(0, index).reduce((acc, s) => acc + s.count, 0);

                                        return (
                                            <Box key={session.id}>
                                                <Stack direction="row" spacing={2} alignItems="center" sx={{ bgcolor: bgColor, p: 1, borderRadius: 1 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ width: 40, fontWeight: 'bold' }}>#{startIdx}</Typography>

                                                    <Box sx={{ minWidth: 100 }}>
                                                        {simulatedDates[startIdx] ? (
                                                            <Typography variant="caption" color="primary.main" fontWeight="bold">
                                                                {simulatedDates[startIdx].format('DD MMM')}
                                                                {session.count > 1 && simulatedDates[startIdx + session.count - 1] && 
                                                                    ` - ${simulatedDates[startIdx + session.count - 1].format('DD MMM')}`}
                                                            </Typography>
                                                        ) : <Typography variant="caption" color="text.disabled">Unscheduled</Typography>}
                                                    </Box>

                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        label="Count"
                                                        value={session.count}
                                                        onChange={(e) => {
                                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                                            handleSessionChange(session.id, 'count', val);
                                                        }}
                                                        sx={{ width: 80 }}
                                                        inputProps={{ min: 1 }}
                                                    />

                                                    <FormControl sx={{ flex: 1 }} size="small">
                                                        <InputLabel>Services</InputLabel>
                                                        <Select
                                                            multiple
                                                            value={session.serviceIds}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                handleSessionChange(session.id, 'serviceIds', typeof value === 'string' ? value.split(',').map(Number) : value);
                                                            }}
                                                            input={<OutlinedInput label="Services" />}
                                                            renderValue={(selected) => (
                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                    {selected.map((value) => {
                                                                        const s = availableServices.find(srv => srv.id === value);
                                                                        return <Chip key={value} label={s?.name || `Service ${value}`} size="small" sx={{ height: 20, fontSize: '0.75rem' }} />;
                                                                    })}
                                                                </Box>
                                                            )}
                                                        >
                                                            {availableServices.map((service) => (
                                                                <MenuItem key={service.id} value={service.id}>
                                                                    <Checkbox checked={session.serviceIds.includes(service.id)} />
                                                                    <ListItemText primary={service.name} />
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>

                                                    <IconButton color="error" size="small" onClick={() => handleRemoveSession(session.id)} disabled={sessions.length === 1}>
                                                        <TrashIcon />
                                                    </IconButton>
                                                </Stack>
                                            </Box>
                                        )
                                    })}
                                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleCloneSession(sessions.length - 1)}
                                            sx={{
                                                border: '1px solid',
                                                borderColor: 'primary.main',
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'primary.dark',
                                                }
                                            }}
                                        >
                                            <PlusIcon size={16} />
                                        </IconButton>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Box>

                        {/* RIGHT: Selected Techs panel */}
                        <Box sx={{ flex: 1, position: 'sticky', top: 0 }}>
                            {uniqueTechnologies.length > 0 && (
                                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2 }}>Technologies involved</Typography>
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                        {uniqueTechnologies.map(tech => (
                                            <Chip key={tech} label={tech} color="secondary" variant="outlined" size="small" />
                                        ))}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                        These are identified automatically based on selected services.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Stack>

                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={sessions.length === 0 || submitting}
                >
                    {existingProgram ? 'Save Changes' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
