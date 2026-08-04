'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Box,
    Typography,
    Chip,
    Divider,
    CircularProgress,
    IconButton,
    Checkbox,
    Autocomplete,
    TextField
} from '@mui/material';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@/lib/api-client';

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
    repeatDays: number[];
    endType: 'never' | 'on' | 'after';
    endDate?: string;
    endOccurrences?: number;
    repeatTimes?: Record<string, { start: string, end: string }>;
}

// We import/define local subsets of the interfaces safely matching what the backend JSON returns.
interface Technology {
    id: number;
    name: string;
}

interface Service {
    id: number;
    name: string;
    color?: string;
    technologies?: Technology[];
}

interface Session {
    id: number;
    type: string;
    isCompleted: boolean;
    services: Service[];
    appointments?: any[];
}

export interface RehabilitationProgramFull {
    id: number;
    patientId: number;
    name: string;
    muscleGroups: string;
    startDate: string;
    status: string;
    sessions: Session[];
    recurrenceRule?: any;
}

interface RehabilitationProgramDetailsDialogProps {
    open: boolean;
    program: RehabilitationProgramFull | null;
    onClose: () => void;
    onEdit?: (program: RehabilitationProgramFull) => void;
    onDeleteSuccess?: () => void;
    onScheduleSuccess?: () => void;
}

export function RehabilitationProgramDetailsDialog({ open, program, onClose, onScheduleSuccess, onEdit, onDeleteSuccess }: RehabilitationProgramDetailsDialogProps): React.ReactNode {
    if (!program) return null;

    const [togglingSessions, setTogglingSessions] = React.useState<Record<number, boolean>>({});
    const [savingSchedule, setSavingSchedule] = React.useState(false);
    const [viewNotes, setViewNotes] = React.useState<string | null>(null);

    const [editingServicesSessionId, setEditingServicesSessionId] = React.useState<number | null>(null);
    const [allServices, setAllServices] = React.useState<any[]>([]);
    const [tempServiceIds, setTempServiceIds] = React.useState<number[]>([]);
    const [savingServices, setSavingServices] = React.useState(false);

    const [activeRule, setActiveRule] = React.useState<any>(null);
    const [replaceExistingRule, setReplaceExistingRule] = React.useState(false);

    // Recurrence Rule State
    const [recurrenceState, setRecurrenceState] = React.useState<RecurrenceState>({
        repeatEvery: 1,
        repeatInterval: 'week',
        repeatDays: [],
        endType: 'never',
        repeatTimes: {}
    });
    const [startDate, setStartDate] = React.useState<Dayjs>(dayjs());

    React.useEffect(() => {
        if (!open || !program) return;

        setActiveRule(null);
        setReplaceExistingRule(true); // Default to true now to simplify flow

        const fetchActiveRule = async () => {
            try {
                const res = await apiClient.get(`/Patients/${program.patientId}/active-recurrence-rule?programId=${program.id}`);
                if (res.data) {
                    setActiveRule(res.data);
                    console.log('Active Rule Loaded:', res.data);
                    
                    const ruleData = res.data;
                    const daysOfWeek = ruleData.daysOfWeek || ruleData.DaysOfWeek;
                    const timePrefs = ruleData.timePreferences || ruleData.TimePreferences;
                    const savedStartDate = ruleData.startDate || ruleData.StartDate;

                    if (savedStartDate) setStartDate(dayjs(savedStartDate));

                    const parsedRepeatTimes: Record<string, { start: string, end: string }> = {};
                    if (Array.isArray(timePrefs)) {
                        timePrefs.forEach((tp: any) => {
                            const day = tp.dayOfWeek ?? tp.DayOfWeek;
                            const start = tp.startTime ?? tp.StartTime;
                            const end = tp.endTime ?? tp.EndTime;
                            if (day !== undefined && start && end) {
                                parsedRepeatTimes[String(day)] = {
                                    start: String(start).slice(0, 5),
                                    end: String(end).slice(0, 5)
                                };
                            }
                        });
                    }

                    setRecurrenceState({
                        repeatEvery: 1,
                        repeatInterval: 'week',
                        repeatDays: daysOfWeek ? String(daysOfWeek).split(',').map(Number).filter(n => !isNaN(n)) : [],
                        endType: 'never',
                        repeatTimes: parsedRepeatTimes
                    });
                    setReplaceExistingRule(true);
                }
            } catch (err: any) {
                if (err.response?.status !== 404) {
                    console.error('Failed to fetch active recurrence rule', err);
                }
            }
        };

        if (program.recurrenceRule) {
            const ruleData = program.recurrenceRule;
            const daysOfWeek = ruleData.daysOfWeek || ruleData.DaysOfWeek;
            const timePrefs = ruleData.timePreferences || ruleData.TimePreferences;
            const savedStartDate = ruleData.startDate || ruleData.StartDate;

            if (savedStartDate) setStartDate(dayjs(savedStartDate));

            const parsedRepeatTimes: Record<string, { start: string, end: string }> = {};
            if (Array.isArray(timePrefs)) {
                timePrefs.forEach((tp: any) => {
                    const day = tp.dayOfWeek ?? tp.DayOfWeek;
                    const start = tp.startTime ?? tp.StartTime;
                    const end = tp.endTime ?? tp.EndTime;
                    if (day !== undefined && start && end) {
                        parsedRepeatTimes[String(day)] = {
                            start: String(start).slice(0, 5),
                            end: String(end).slice(0, 5)
                        };
                    }
                });
            }

            setRecurrenceState({
                repeatEvery: 1,
                repeatInterval: 'week',
                repeatDays: daysOfWeek ? String(daysOfWeek).split(',').map(Number).filter(n => !isNaN(n)) : [],
                endType: 'never',
                repeatTimes: parsedRepeatTimes
            });
        }
        fetchActiveRule();

        const fetchServices = async () => {
            try {
                const res = await apiClient.get('/Services');
                setAllServices(res.data);
            } catch (err) {
                console.error('Failed to fetch services', err);
            }
        };
        fetchServices();
    }, [open, program]);

    // Derive unique technologies cleanly
    const uniqueTechnologies = React.useMemo(() => {
        const techMap = new Map<number, string>();
        program.sessions?.forEach(session => {
            session.services?.forEach(service => {
                service.technologies?.forEach(tech => {
                    techMap.set(tech.id, tech.name);
                });
            });
        });
        return Array.from(techMap.values());
    }, [program]);

    const handleToggleSessionCompleted = async (sessionId: number, isCompleted: boolean) => {
        setTogglingSessions(prev => ({ ...prev, [sessionId]: true }));
        try {
            await apiClient.patch(`/Patients/rehabilitation-programs/sessions/${sessionId}/toggle-completion`, { isCompleted });
            const s = program.sessions.find(s => s.id === sessionId);
            if (s) {
                s.isCompleted = isCompleted;
            }
        } catch (err) {
            console.error('Failed to toggle completion', err);
            alert('Failed to toggle session completion');
        } finally {
            setTogglingSessions(prev => ({ ...prev, [sessionId]: false }));
        }
    };

    const handleSaveServices = async () => {
        if (!editingServicesSessionId) return;
        setSavingServices(true);
        try {
            await apiClient.patch(`/Patients/rehabilitation-programs/sessions/${editingServicesSessionId}/services`, tempServiceIds);
            if (onScheduleSuccess) onScheduleSuccess(); // Refresh program
            setEditingServicesSessionId(null);
        } catch (err) {
            console.error('Failed to save session services', err);
        } finally {
            setSavingServices(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (recurrenceState.repeatDays.length === 0) {
            alert('Please select at least one day of the week.');
            return;
        }

        setSavingSchedule(true);
        try {
            const firstDay = recurrenceState.repeatDays[0];
            const firstTime = recurrenceState.repeatTimes?.[firstDay] || { start: '10:00:00', end: '11:00:00' };

            const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const template = {
                patientId: program.patientId,
                clinicId: (program as any).clinicId || 1,
                appointmentDate: `${startDate.format('YYYY-MM-DD')}T${firstTime.start}`,
                appointmentEndTime: `${startDate.format('YYYY-MM-DD')}T${firstTime.end}`,
                status: 'scheduled',
                timeZoneId: userTimeZone,
                recurrenceRule: {
                    patternType: 'weekly',
                    repeatEvery: 1,
                    daysOfWeek: recurrenceState.repeatDays.join(','),
                    startDate: startDate.format('YYYY-MM-DDTHH:mm:ss'),
                    timeZoneId: userTimeZone,
                    timePreferences: recurrenceState.repeatDays.map(day => {
                        const pref = recurrenceState.repeatTimes?.[String(day)] || recurrenceState.repeatTimes?.[day] || { start: '10:00', end: '11:00' };
                        return {
                            dayOfWeek: day,
                            startTime: String(pref.start).slice(0, 5),
                            endTime: String(pref.end).slice(0, 5)
                        };
                    })
                }
            };

            await apiClient.post(`/Appointments/rehab-plan/${program.id}?replaceExistingRule=${replaceExistingRule}`, template);

            // Invoke the schedule close/refresh to update UI in expedient 
            if (onScheduleSuccess) onScheduleSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to schedule plan', err);
            alert(err.response?.data?.message || 'Failed to update program schedule');
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleClearSchedule = async () => {
        if (!confirm('Are you sure you want to clear the schedule? All uncompleted future appointments will be permanently deleted.')) return;

        setSavingSchedule(true);
        try {
            await apiClient.delete(`/Appointments/rehab-plan/${program.id}`);

            setRecurrenceState({
                repeatEvery: 1,
                repeatInterval: 'week',
                repeatDays: [],
                endType: 'never',
                repeatTimes: {}
            });

            if (program) {
                program.recurrenceRule = null;
            }

            if (onScheduleSuccess) onScheduleSuccess();
        } catch (err: any) {
            console.error('Failed to clear schedule', err);
            alert('Failed to clear schedule');
        } finally {
            setSavingSchedule(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Rehabilitation Program #{program.id} : {program.name}</span>
                    <Chip
                        size="small"
                        label={program.status}
                        color={program.status === 'Active' ? 'success' : 'default'}
                        variant="outlined"
                    />
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={4}>
                        {/* Program Meta */}
                        <Box>
                            <Stack direction="row" spacing={4}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Start Date</Typography>
                                    <Typography variant="body1">{new Date(program.startDate).toLocaleDateString()}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Treated Muscles</Typography>
                                    <Typography variant="body1">{program.muscleGroups || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Sessions progress</Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                        {program.sessions?.filter(s => s.isCompleted).length || 0} / {program.sessions?.length || 0}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>

                        <Divider />

                        {/* Sessions List */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Sessions ({program.sessions?.length || 0})</Typography>
                            <Stack spacing={1}>
                                {(() => {
                                    const sortedSessions = [...(program.sessions || [])].sort((a: any, b: any) => {
                                        const aAppt = a.appointments?.find((ap: any) => ap.status !== 'canceled' && ap.status !== 'rescheduled' && !ap.isGhost);
                                        const bAppt = b.appointments?.find((ap: any) => ap.status !== 'canceled' && ap.status !== 'rescheduled' && !ap.isGhost);
                                        const aDate = aAppt ? new Date(aAppt.appointmentDate).getTime() : Infinity;
                                        const bDate = bAppt ? new Date(bAppt.appointmentDate).getTime() : Infinity;
                                        if (aDate !== bDate) return aDate - bDate;
                                        return a.id - b.id;
                                    });
                                    return sortedSessions.map((session: Session, index: number) => {
                                        const isInterconsultation = session.services?.some((s: any) => s.name.toLowerCase() === 'interconsulta');
                                        // Make the background slightly yellow if interconsultation
                                        const bgColor = isInterconsultation ? 'rgba(255, 193, 7, 0.1)' :
                                            session.type === 'Evaluation' ? 'rgba(76, 175, 80, 0.1)' :
                                                session.type === 'Reevaluation' ? 'rgba(255, 152, 0, 0.1)' :
                                                    'var(--mui-palette-background-level1)';

                                        return (
                                            <Stack key={session.id} direction="row" spacing={2} alignItems="center" sx={{ bgcolor: bgColor, p: 1.5, borderRadius: 1 }}>
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: 80 }}>
                                                    <Checkbox
                                                        checked={session.isCompleted}
                                                        onChange={(e) => handleToggleSessionCompleted(session.id, e.target.checked)}
                                                        size="small"
                                                        disabled={togglingSessions[session.id]}
                                                        sx={{ p: 0.5 }}
                                                    />
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>#{index + 1}</Typography>
                                                </Stack>
                                                <Typography variant="body2" sx={{ width: 100 }}>{session.type}</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, ml: 2, alignItems: 'center' }}>
                                                    {isInterconsultation ? (
                                                        <>
                                                            <Chip label="Interconsultation" size="small" variant="filled" sx={{ bgcolor: '#ffc107', color: '#000' }} />
                                                            {(() => {
                                                                const activeApt = session.appointments?.find((a: any) => a.status !== 'canceled' && a.status !== 'absent' && a.status !== 'rescheduled' && !a.isGhost);
                                                                if (activeApt?.serviceWork?.notes) {
                                                                    return (
                                                                        <IconButton size="small" onClick={() => setViewNotes(activeApt.serviceWork.notes)} sx={{ ml: 1, color: '#ffb300' }}>
                                                                            <FileTextIcon fontSize="small" />
                                                                        </IconButton>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </>
                                                    ) : (
                                                        session.services?.map((service: any) => (
                                                            <Chip key={service.id} label={service.name} size="small" variant={service.color ? "filled" : "outlined"} sx={{ bgcolor: service.color || 'background.paper', color: service.color ? '#fff' : 'inherit', borderColor: service.color || 'divider' }} />
                                                        ))
                                                    )}
                                                    {(!isInterconsultation && (!session.services || session.services.length === 0)) && (
                                                        <Typography variant="caption" color="text.secondary">No services attached</Typography>
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                                    {(() => {
                                                        const activeAppointment = session.appointments?.find((a: any) => a.status !== 'cancelled' && a.status !== 'rescheduled' && !a.isGhost);
                                                        if (activeAppointment) {
                                                            const dateStr = dayjs(activeAppointment.appointmentDate).format('dddd, DD MMMM, YYYY');
                                                            const timeStr = dayjs(activeAppointment.appointmentDate).format('HH:mm');
                                                            return (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {dateStr}{' '}
                                                                    <Box component="span" fontWeight="bold">({timeStr})</Box>
                                                                </Typography>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </Box>
                                                <Box sx={{ minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    {togglingSessions[session.id] ? (
                                                        <CircularProgress size={20} />
                                                    ) : (
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            {!session.isCompleted && (
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setEditingServicesSessionId(session.id);
                                                                        setTempServiceIds(session.services?.map(s => s.id) || []);
                                                                    }}
                                                                >
                                                                    <PencilSimpleIcon fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                            {session.isCompleted ? (
                                                                <Stack direction="row" spacing={1} alignItems="center">
                                                                    <Chip size="small" label="Completed" color="success" variant="filled" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                                    {(() => {
                                                                        const doneApt = session.appointments?.find((a: any) => a.status === 'done');
                                                                        if (doneApt) {
                                                                            return <Typography variant="caption" color="text.secondary" sx={{ display: 'none' }}>on {new Date(doneApt.appointmentDate).toLocaleDateString()}</Typography>;
                                                                        }
                                                                        return <Typography variant="caption" color="text.secondary">Manually</Typography>;
                                                                    })()}
                                                                </Stack>
                                                            ) : null}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            </Stack>
                                        );
                                    });
                                })()}
                                {(!program.sessions || program.sessions.length === 0) && (
                                    <Typography variant="body2" color="text.secondary">No sessions found in this program.</Typography>
                                )}
                            </Stack>
                        </Box>

                        <Divider />

                        {/* APPOINTMENTS SECTION */}
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">Appointments Schedule</Typography>
                                <Chip size="small" label={program.recurrenceRule ? "Rule Active" : "Inactive"} color={program.recurrenceRule ? "primary" : "default"} variant="outlined" />
                            </Stack>

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Stack spacing={3} sx={{ bgcolor: 'var(--mui-palette-background-level1)', p: 2, borderRadius: 1 }}>



                                    <Box>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>Start Date</Typography>
                                        <DatePicker
                                            value={startDate}
                                            onChange={(val) => setStartDate(val || dayjs())}
                                            slotProps={{ textField: { size: 'small', fullWidth: false } }}
                                        />
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>Days of Week</Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {DAYS_OF_WEEK.map((day, i) => (
                                                <Chip
                                                    key={`day-${i}`}
                                                    label={day.label}
                                                    clickable={true}
                                                    color={recurrenceState.repeatDays?.includes(day.value) ? 'primary' : 'default'}
                                                    onClick={() => {
                                                        const days = recurrenceState.repeatDays || [];
                                                        if (days.includes(day.value)) {
                                                            const newDays = days.filter(d => d !== day.value);
                                                            const newTimes = { ...recurrenceState.repeatTimes };
                                                            delete newTimes[day.value];
                                                            setRecurrenceState({ ...recurrenceState, repeatDays: newDays, repeatTimes: newTimes });
                                                        } else {
                                                            const newTimes = { ...recurrenceState.repeatTimes };
                                                            newTimes[day.value] = { start: '10:00:00', end: '11:00:00' };
                                                            setRecurrenceState({ ...recurrenceState, repeatDays: [...days, day.value].sort(), repeatTimes: newTimes });
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>

                                    {(recurrenceState.repeatDays?.length ?? 0) > 0 && (
                                        <Box>
                                            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>Specific Times</Typography>
                                            <Stack spacing={2}>
                                                {recurrenceState.repeatDays?.sort().map(dayValue => {
                                                    const timePref = recurrenceState.repeatTimes?.[String(dayValue)] || { start: '10:00', end: '11:00' };
                                                    const startVal = dayjs(`2000-01-01T${timePref.start}`);

                                                    return (
                                                        <Stack key={`time-${dayValue}`} direction="row" spacing={2} alignItems="center">
                                                            <Chip label={DAYS_OF_WEEK[dayValue]?.label === 'T' ? (dayValue === 2 ? 'Tu' : 'Th') : DAYS_OF_WEEK[dayValue]?.label + (dayValue === 0 ? 'u' : dayValue === 6 ? 'a' : '')} size="small" sx={{ width: 40 }} />
                                                            <TimePicker
                                                                label="Start time"
                                                                value={startVal}
                                                                minutesStep={1}
                                                                ampm={false}
                                                                onChange={(val) => {
                                                                    if (!val) return;
                                                                    const newTimes = { ...recurrenceState.repeatTimes };
                                                                    const startStr = val.format('HH:mm');
                                                                    const endStr = val.add(1, 'hour').format('HH:mm');
                                                                    newTimes[String(dayValue)] = { start: startStr, end: endStr };
                                                                    setRecurrenceState({ ...recurrenceState, repeatTimes: newTimes });
                                                                }}
                                                                slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                                                            />
                                                        </Stack>
                                                    );
                                                })}
                                            </Stack>
                                        </Box>
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                        {program.recurrenceRule && (
                                            <Button
                                                variant="contained"
                                                color="error"
                                                onClick={handleClearSchedule}
                                                disabled={savingSchedule}
                                            >
                                                Clear Schedule
                                            </Button>
                                        )}
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleSaveSchedule}
                                            disabled={savingSchedule || recurrenceState.repeatDays.length === 0}
                                        >
                                            {savingSchedule ? <CircularProgress size={24} color="inherit" /> : program.recurrenceRule ? 'Update Schedule' : 'Schedule Sessions'}
                                        </Button>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" textAlign="right">
                                        Updating schedule will discard any unscheduled/future pending appointments.
                                    </Typography>
                                </Stack>
                            </LocalizationProvider>
                        </Box>

                        <Divider />

                        {/* Derived Technologies */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Technologies involved</Typography>
                            {uniqueTechnologies.length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {uniqueTechnologies.map(tech => (
                                        <Chip key={tech} label={tech} color="secondary" variant="outlined" />
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">None</Typography>
                            )}
                        </Box>

                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} variant="contained" color="inherit">Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!viewNotes} onClose={() => setViewNotes(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Interconsultation Notes</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{viewNotes}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewNotes(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Services Dialog */}
            <Dialog open={editingServicesSessionId !== null} onClose={() => setEditingServicesSessionId(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Session Services</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Autocomplete
                            multiple
                            options={allServices}
                            getOptionLabel={(option) => option.name}
                            value={allServices.filter(s => tempServiceIds.includes(s.id))}
                            onChange={(_, newValue) => {
                                setTempServiceIds(newValue.map(v => v.id));
                            }}
                            renderInput={(params) => (
                                <TextField {...params} variant="outlined" label="Select Services" placeholder="Add service..." />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    return (
                                        <Chip
                                            key={key}
                                            variant="filled"
                                            label={option.name}
                                            {...tagProps}
                                            sx={{ bgcolor: option.color || 'primary.main', color: '#fff' }}
                                        />
                                    );
                                })
                            }
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingServicesSessionId(null)} disabled={savingServices}>Cancel</Button>
                    <Button onClick={handleSaveServices} variant="contained" disabled={savingServices}>
                        {savingServices ? <CircularProgress size={24} /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
