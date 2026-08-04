'use client';

import * as React from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
    Radio,
    RadioGroup,
    FormControlLabel,
    ToggleButton,
    ToggleButtonGroup,
    Tabs,
    Tab,
    IconButton,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@/lib/api-client';

export interface DaySetting {
    startTime: string;
    endTime: string;
    services: Array<{ serviceId: number; attendantId: number | '' }>;
}

export interface RecurrenceState {
    repeatEvery: number;
    repeatInterval: 'day' | 'week' | 'month' | 'year';
    repeatDays: number[]; // 0=Sunday, 1=Monday, etc.
    endType: 'never' | 'on' | 'after';
    endDate?: string;
    endOccurrences?: number;
    daySettings: Record<number, DaySetting>;
}

const defaultRecurrenceState: RecurrenceState = {
    repeatEvery: 1,
    repeatInterval: 'week',
    repeatDays: [],
    endType: 'never',
    daySettings: {}
};

interface Patient {
    id: number;
    firstName: string;
    lastName: string;
    defaultAttendants?: Array<{ serviceId: number; attendantId: number }>;
}

interface User {
    id: number;
    fullName: string;
    role: string;
    specialty?: string;
}

export interface AppointmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingAppointments: Record<string, unknown>[];
    /** When provided, the dialog opens in edit mode pre-filled with this appointment's data */
    appointment?: Record<string, unknown>;
    /** When provided, the dialog enters bulk scheduling mode for this specific program */
    schedulePlanForProgram?: any;
    /** Provided alongside schedulePlanForProgram to prefill the combobox */
    schedulePlanPatient?: Patient;
    onGoToRehab?: (programId: number) => void;
}

interface MiniRehabSession {
    id: number;
    type: string;
    isCompleted: boolean;
    services?: Array<{
        id: number;
        name: string;
        color: string;
    }>;
}

interface MiniRehabProgram {
    id: number;
    name?: string;
    status: string;
    sessions: MiniRehabSession[];
}

// Format a UTC/local ISO string to the datetime-local input format (YYYY-MM-DDThh:mm)
function toDatetimeLocal(isoStr: string): string {
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function getRoundedHour(offsetHours = 0): string {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + offsetHours);
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

/** Map a raw recurrenceRule from the API to our frontend RecurrenceState + recurrenceType */
function parseRecurrenceRule(rule: any): { type: string; state: RecurrenceState } {
    const patternType = rule.patternType || rule.PatternType;
    const repeatEvery = rule.repeatEvery || rule.RepeatEvery || 1;
    const daysOfWeek = rule.daysOfWeek || rule.DaysOfWeek;
    const maxOccurrences = rule.maxOccurrences || rule.MaxOccurrences;
    const endDate = rule.endDate || rule.EndDate;
    const timePreferences = rule.timePreferences || rule.TimePreferences;

    const state: RecurrenceState = {
        repeatEvery: repeatEvery,
        repeatInterval: (patternType === 'daily' ? 'day' : 
                         patternType === 'weekly' ? 'week' :
                         patternType === 'monthly' ? 'month' : 'year') as any,
        repeatDays: daysOfWeek ? String(daysOfWeek).split(',').map(Number) : [],
        endType: maxOccurrences ? 'after' : endDate ? 'on' : 'never',
        endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
        endOccurrences: maxOccurrences || undefined,
        daySettings: {}
    };

    if (timePreferences && Array.isArray(timePreferences)) {
        timePreferences.forEach((tp: any) => {
            let services: Array<{ serviceId: number; attendantId: number | '' }> = [];
            
            const rawAssignments = tp.serviceAssignments || tp.ServiceAssignments;
            const rawAssignmentsJson = tp.serviceAssignmentsJson || tp.ServiceAssignmentsJson;

            if (rawAssignments && Array.isArray(rawAssignments)) {
                services = rawAssignments.map((d: any) => ({
                    serviceId: d.serviceId ?? d.ServiceId,
                    attendantId: d.attendantId ?? d.AttendantId ?? ''
                }));
            } else if (rawAssignmentsJson && typeof rawAssignmentsJson === 'string') {
                try {
                    const parsed = JSON.parse(rawAssignmentsJson);
                    if (Array.isArray(parsed)) {
                        services = parsed.map((d: any) => ({
                            serviceId: d.serviceId ?? d.ServiceId,
                            attendantId: d.attendantId ?? d.AttendantId ?? ''
                        }));
                    }
                } catch (e) { }
            }

            const rawStart = tp.startTime || tp.StartTime || '09:00:00';
            const rawEnd = tp.endTime || tp.EndTime || '10:00:00';

            state.daySettings[tp.dayOfWeek ?? tp.DayOfWeek] = {
                startTime: rawStart.slice(0, 5),
                endTime: rawEnd.slice(0, 5),
                services: services
            };
        });
    }

    return {
        type: 'custom',
        state
    };
}

export function AppointmentDialog({
    open,
    onClose,
    onSuccess,
    existingAppointments,
    appointment,
    schedulePlanForProgram,
    schedulePlanPatient,
    onGoToRehab
}: AppointmentDialogProps): React.JSX.Element {

    const isEditMode = Boolean(appointment);
    // Virtual occurrences have virtual string IDs — editing them creates a one-time override
    const isVirtual = isEditMode && typeof appointment?.id === 'string' && appointment.id.startsWith('virtual');
    // Real appointment that has a recurrence rule
    const hasRecurrence = isEditMode && !isVirtual && Boolean(appointment?.recurrenceRuleId);

    const [appointmentDate, setAppointmentDate] = React.useState<Dayjs | null>(dayjs());
    const [startTime, setStartTime] = React.useState<Dayjs | null>(dayjs().startOf('hour').add(1, 'hour'));
    const [endTime, setEndTime] = React.useState<Dayjs | null>(dayjs().startOf('hour').add(2, 'hour'));
    const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
    const [selectedStaffId, setSelectedStaffId] = React.useState<number | ''>('');
    const [selectedRehabProgramId, setSelectedRehabProgramId] = React.useState<number | ''>('');
    const [selectedRehabSessionId, setSelectedRehabSessionId] = React.useState<number | ''>('');
    const [serviceAssignments, setServiceAssignments] = React.useState<Array<{ serviceId: number; attendantId: number | '' }>>([]);
    const [staffMembers, setStaffMembers] = React.useState<User[]>([]);
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [patientRehabPrograms, setPatientRehabPrograms] = React.useState<MiniRehabProgram[]>([]);
    const [patientSearchTerm, setPatientSearchTerm] = React.useState('');
    const [loadingPatients, setLoadingPatients] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState(0); // 0 = Single, 1 = Recurrent
    const [recurrenceState, setRecurrenceState] = React.useState<RecurrenceState | undefined>();
    const [includeToday, setIncludeToday] = React.useState<boolean>(true);
    const [loadingRehab, setLoadingRehab] = React.useState(false);
    const [isGeneralRuleActive, setIsGeneralRuleActive] = React.useState(false);
    const [activeRuleId, setActiveRuleId] = React.useState<number | null>(null);
    const [scheduledAppointments, setScheduledAppointments] = React.useState<any[]>([]);
    const [updateFuture, setUpdateFuture] = React.useState<boolean>(false);
    
    // Fetch last used attendant for a patient/service
    const fetchLastAttendant = async (patientId: number, serviceId: number) => {
        try {
            const res = await apiClient.get(`/Patients/${patientId}/last-attendant/${serviceId}`);
            return res.data.attendantId as number | null;
        } catch (err) {
            console.error('Failed to fetch last attendant', err);
            return null;
        }
    };
    
    const [masterServices, setMasterServices] = React.useState<Array<{id: number, name: string, color: string}>>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    // Fetch master services once
    React.useEffect(() => {
        (async () => {
            try {
                const res = await apiClient.get('/Services');
                setMasterServices(res.data);
            } catch (err) {
                console.error('Failed to load master services', err);
            }
        })();
    }, []);

    // Fetch staff members once
    React.useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await apiClient.get('/Users');
                if (active) setStaffMembers(res.data);
            } catch (err) {
                console.error('Failed to load staff members', err);
            }
        })();
        return () => { active = false; };
    }, []);

    // Pre-fill or reset whenever the dialog opens
    React.useEffect(() => {
        if (!open) return;

        if (schedulePlanForProgram && schedulePlanPatient) {
            // ── Schedule Plan mode ──
            setAppointmentDate(dayjs().startOf('hour'));
            setStartTime(dayjs().startOf('hour'));
            setEndTime(dayjs().startOf('hour').add(1, 'hour'));
            setPatients([schedulePlanPatient]);
            setSelectedPatient(schedulePlanPatient);
            setSelectedStaffId('');
            setSelectedRehabProgramId(schedulePlanForProgram.id);
            setSelectedRehabSessionId('');
            setServiceAssignments([]);

            const uncompletedCount = (schedulePlanForProgram.sessions as any[])?.filter((s) => !s.isCompleted).length || 1;
            
            if (schedulePlanForProgram.recurrenceRule) {
                const parsed = parseRecurrenceRule(schedulePlanForProgram.recurrenceRule);
                setActiveTab(1);
                setRecurrenceState(parsed.state);
            } else {
                setActiveTab(1);
                setRecurrenceState({
                    repeatInterval: 'week',
                    repeatEvery: 1,
                    repeatDays: [dayjs().day()],
                    endType: 'after',
                    endOccurrences: uncompletedCount,
                    daySettings: {}
                });
            }
            setUpdateFuture(false);
        } else if (appointment) {
            // ── Edit mode ──
            const apptDateStr = appointment.appointmentDate as string;
            const apptEndStr = appointment.appointmentEndTime as string;
            setAppointmentDate(dayjs(apptDateStr));
            setStartTime(dayjs(apptDateStr));
            setEndTime(dayjs(apptEndStr));

            const pat = appointment.patient as Patient | null;
            setSelectedPatient(pat);
            if (pat) setPatients([pat]);
            setSelectedStaffId(Number(appointment.userId));
            setSelectedRehabSessionId(appointment.rehabilitationSessionId ? Number(appointment.rehabilitationSessionId) : '');
            
            // Map existing service work items
            const existingSwItems = (appointment as any).serviceWork?.serviceWorkItems || [];
            
            const assignments = existingSwItems.map((swi: any) => {
                return { serviceId: swi.serviceId, attendantId: swi.attendantId ? Number(swi.attendantId) : '' };
            });
            setServiceAssignments(assignments);
            
            const rule = (appointment as any).recurrenceRule;
            if (rule && hasRecurrence) {
                const parsed = parseRecurrenceRule(rule);
                setActiveTab(1);
                setRecurrenceState(parsed.state);
            } else {
                setActiveTab(0);
                setRecurrenceState(undefined);
            }
            setUpdateFuture(false);
        } else {
            // ── Create mode ──
            setAppointmentDate(dayjs().startOf('hour').add(1, 'hour'));
            setStartTime(dayjs().startOf('hour').add(1, 'hour'));
            setEndTime(dayjs().startOf('hour').add(2, 'hour'));
            setSelectedPatient(null);
            setSelectedStaffId('');
            setSelectedRehabProgramId('');
            setSelectedRehabSessionId('');
            setServiceAssignments([]);
            setActiveTab(0);
            setRecurrenceState(undefined);
            setIsGeneralRuleActive(false);
            setActiveRuleId(null);
            setSelectedRehabProgramId('');
            setScheduledAppointments([]);
            setUpdateFuture(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Debounced patient search (create mode only)
    React.useEffect(() => {
        if (isEditMode) return;
        let active = true;
        if (patientSearchTerm === '') { setPatients([]); return; }
        setLoadingPatients(true);
        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/Patients?query=${encodeURIComponent(patientSearchTerm)}`);
                if (active) setPatients(res.data.items || []);
            } catch (err) {
                console.error('Failed to search patients', err);
            } finally {
                if (active) setLoadingPatients(false);
            }
        }, 400);
        return () => { active = false; clearTimeout(timer); };
    }, [patientSearchTerm, isEditMode]);

    // Auto-fill staff from last appointment (create mode only), and fetch Rehab Programs
    React.useEffect(() => {
        if (!selectedPatient) {
            if (!isEditMode) {
                setSelectedStaffId('');
                setSelectedRehabSessionId('');
                setServiceAssignments([]);
            }
            setPatientRehabPrograms([]);
            return;
        }

        let active = true;
        setLoadingRehab(true);
        (async () => {
            try {
                const res = await apiClient.get(`/Patients/${selectedPatient.id}/rehabilitation-programs`);
                const programs: MiniRehabProgram[] = res.data;
                if (active) {
                    setPatientRehabPrograms(programs);
                    if (appointment?.rehabilitationSessionId) {
                        const sessId = Number(appointment.rehabilitationSessionId);
                        const prog = programs.find(p => p.sessions?.some(s => s.id === sessId));
                        if (prog) setSelectedRehabProgramId(prog.id);
                    }
                }
            } catch (err) {
                console.error('Failed to load patient rehab programs', err);
            } finally {
                if (active) setLoadingRehab(false);
            }
        })();

        if (!isEditMode && !schedulePlanForProgram) {
            (async () => {
                try {
                    const resRule = await apiClient.get(`/Patients/${selectedPatient.id}/active-recurrence-rule`);
                    if (active && resRule.data) {
                        const parsed = parseRecurrenceRule(resRule.data);
                        setActiveTab(1);
                        setRecurrenceState(parsed.state);
                        // In the new multi-rule system, we only fetch and show the General rule in the normal dialog
                        // to prevent conflicts. Rehabilitation rules are handled via schedulePlanForProgram.
                        setIsGeneralRuleActive(true);
                        setActiveRuleId(resRule.data.id || resRule.data.Id);
                        setScheduledAppointments(resRule.data.scheduledAppointments || resRule.data.ScheduledAppointments || []);
                    } else if (active) {
                        setIsGeneralRuleActive(false);
                        setActiveRuleId(null);
                        setScheduledAppointments([]);
                    }
                } catch(e: any) {
                    if (e.response?.status !== 404) {
                        console.error('Failed to fetch active recurrence rule', e);
                    }
                    if (active) {
                        setIsGeneralRuleActive(false);
                        setActiveRuleId(null);
                        setScheduledAppointments([]);
                    }
                }
            })();
        }

        if (isEditMode) return () => { active = false; };

        const last = existingAppointments
            .filter((a) => a.patientId === selectedPatient.id)
            .slice().sort((a, b) => new Date(String(b.appointmentDate)).getTime() - new Date(String(a.appointmentDate)).getTime())[0];
        if (last?.userId) setSelectedStaffId(Number(last.userId));
        else setSelectedStaffId('');

        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatient, isEditMode]);

    const patientOptions = React.useMemo<Patient[]>(() => {
        if (selectedPatient && !patients.find((p) => p.id === selectedPatient.id)) {
            return [selectedPatient, ...patients];
        }
        return patients;
    }, [patients, selectedPatient]);

    const handleAddService = async (serviceId: number) => {
        if (!serviceAssignments.find(a => a.serviceId === serviceId)) {
            let attendantId: number | '' = '';
            const defaultAtt = selectedPatient?.defaultAttendants?.find(da => da.serviceId === serviceId);
            if (defaultAtt) {
                attendantId = defaultAtt.attendantId;
            } else if (selectedPatient) {
                const lastAtt = await fetchLastAttendant(selectedPatient.id, serviceId);
                if (lastAtt) attendantId = lastAtt;
            }
            setServiceAssignments([...serviceAssignments, { serviceId, attendantId }]);
        }
    };

    const handleRemoveService = (serviceId: number) => {
        setServiceAssignments(serviceAssignments.filter(a => a.serviceId !== serviceId));
    };

    const handleAttendantChangeForService = (serviceId: number, attendantId: number | '') => {
        setServiceAssignments(serviceAssignments.map(a => 
            a.serviceId === serviceId ? { ...a, attendantId } : a
        ));
    };

    // Initialize missing daySettings whenever selected repeatDays changes
    React.useEffect(() => {
        if (recurrenceState?.repeatDays && startTime) {
            const currentSettings = { ...recurrenceState.daySettings };
            let hasChanges = false;

            const defStart = startTime.format('HH:mm');
            const defEnd = startTime.add(1, 'hour').format('HH:mm');

            recurrenceState.repeatDays.forEach((dayId: number) => {
                if (!currentSettings[dayId]) {
                    currentSettings[dayId] = { 
                        startTime: defStart, 
                        endTime: defEnd,
                        services: [] 
                    };
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setRecurrenceState({ ...recurrenceState, daySettings: currentSettings });
            }
        }
    }, [recurrenceState?.repeatDays, startTime]);

    const buildRecurrenceRule = (baseDate?: dayjs.Dayjs) => {
        const payloadDate = (baseDate || appointmentDate)?.toISOString() || new Date().toISOString();
        const timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (activeTab === 1 && recurrenceState) {
            let timePreferencesArray: any[] | undefined = undefined;
            if (recurrenceState.repeatDays && recurrenceState.repeatDays.length > 0) {
                timePreferencesArray = recurrenceState.repeatDays.map(dayId => {
                    const setting = recurrenceState.daySettings[dayId];
                    if (setting) {
                        return {
                            dayOfWeek: parseInt(String(dayId), 10),
                            startTime: setting.startTime.includes(':') 
                                ? (setting.startTime.split(':').length === 2 ? `${setting.startTime}:00` : setting.startTime)
                                : `${setting.startTime}:00:00`,
                            endTime: setting.endTime.includes(':')
                                ? (setting.endTime.split(':').length === 2 ? `${setting.endTime}:00` : setting.endTime)
                                : `${setting.endTime}:00:00`,
                            serviceAssignments: setting.services.map(s => ({
                                serviceId: s.serviceId,
                                attendantId: s.attendantId === "" ? null : s.attendantId
                            }))
                        };
                    }
                    return null;
                }).filter(Boolean) as any[];
            }

            return {
                patternType: recurrenceState.repeatInterval === 'day' ? 'daily' :
                    recurrenceState.repeatInterval === 'week' ? 'weekly' : 'monthly',
                repeatEvery: parseInt(String(recurrenceState.repeatEvery || 1), 10),
                daysOfWeek: (recurrenceState.repeatDays && recurrenceState.repeatDays.length > 0) 
                    ? recurrenceState.repeatDays.map(d => String(d)).join(',') 
                    : null,
                startDate: payloadDate,
                maxOccurrences: recurrenceState.endType === 'after' ? parseInt(String(recurrenceState.endOccurrences || 0), 10) : null,
                endDate: recurrenceState.endType === 'on' && recurrenceState.endDate
                    ? new Date(recurrenceState.endDate).toISOString() : null,
                timePreferences: timePreferencesArray,
                timeZoneId,
                includeToday: !!includeToday,
            };
        }
        
        return null;
    };

    const handleSubmit = async () => {
        if (!selectedPatient || !appointmentDate || !startTime) return;
        setSubmitting(true);
        try {
            let finalStart = appointmentDate.hour(startTime.hour()).minute(startTime.minute());
            let finalEnd = finalStart.add(1, 'hour');

            if (activeTab === 1 && recurrenceState) {
                const dayId = appointmentDate.day();
                if (isEditMode) {
                    const current = recurrenceState.daySettings[dayId] || { startTime: startTime.format('HH:mm'), endTime: finalEnd.format('HH:mm'), services: [] };
                    current.startTime = startTime.format('HH:mm');
                    current.endTime = finalEnd.format('HH:mm');
                } else {
                    const custom = recurrenceState.daySettings[dayId];
                    if (custom) {
                        const [sH, sM] = custom.startTime.split(':').map(Number);
                        const [eH, eM] = custom.endTime.split(':').map(Number);
                        if (!isNaN(sH) && !isNaN(sM)) finalStart = appointmentDate.hour(sH).minute(sM);
                        if (!isNaN(eH) && !isNaN(eM)) finalEnd = appointmentDate.hour(eH).minute(eM);
                    }
                }
            }

            const payload: any = {
                patientId: selectedPatient.id,
                appointmentDate: finalStart.toISOString(),
                appointmentEndTime: finalEnd.toISOString(),
                reason: selectedRehabSessionId ? `Session from rehabilitation program` : 'Consultation',
                treatmentType: 'other',
                rehabilitationSessionId: selectedRehabSessionId || null
            };

            if (activeTab === 0) {
                if (serviceAssignments.length > 0) {
                    payload.serviceWork = {
                        patientId: selectedPatient.id,
                        serviceItems: serviceAssignments.map(a => ({
                            serviceId: a.serviceId,
                            attendantId: a.attendantId || null
                        }))
                    };
                }
            } else if (activeTab === 1 && recurrenceState) {
                const daySetting = recurrenceState.daySettings[appointmentDate.day()];
                if (daySetting && daySetting.services.length > 0) {
                    payload.serviceWork = {
                        patientId: selectedPatient.id,
                        serviceItems: daySetting.services.map(a => ({
                            serviceId: a.serviceId,
                            attendantId: a.attendantId || null
                        }))
                    };
                }
            }

            if (isEditMode && appointment) {
                payload.status = appointment.status;
                if (appointment.recurrenceRuleId) payload.recurrenceRuleId = appointment.recurrenceRuleId;
                if (isVirtual) {
                    payload.originalScheduledDate = appointment.appointmentDate;
                } else if (activeTab === 1) {
                    const rule = buildRecurrenceRule(finalStart);
                    if (rule) payload.recurrenceRule = rule;
                }
                await apiClient.put(`/Appointments/${appointment.id}?updateFuture=${updateFuture}`, payload);
            } else if (schedulePlanForProgram) {
                payload.status = 'scheduled';
                const rule = buildRecurrenceRule(finalStart);
                if (rule) {
                    const uncompletedCount = (schedulePlanForProgram.sessions as any[])?.filter((s) => !s.isCompleted).length || 1;
                    rule.maxOccurrences = uncompletedCount;
                    payload.recurrenceRule = rule;
                }
                await apiClient.post(`/Appointments/rehab-plan/${schedulePlanForProgram.id}`, payload);
            } else {
                payload.status = 'scheduled';
                const rule = buildRecurrenceRule(finalStart);
                if (rule) payload.recurrenceRule = rule;

                if (activeTab === 1 && activeRuleId) {
                    await apiClient.put(`/Appointments/recurrence/${activeRuleId}`, rule);
                } else {
                    await apiClient.post('/Appointments', payload);
                }
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to save appointment:', err);
            let errorMessage = err.message;
            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.errors) {
                    // Extract validation errors from ASP.NET Core Identity/ModelState
                    errorMessage = Object.values(err.response.data.errors).flat().join('\n');
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else {
                    errorMessage = JSON.stringify(err.response.data);
                }
            }
            alert('Failed to save appointment:\n' + errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (deleteFuture: boolean) => {
        if (!appointment) return;
        try {
            const payload = {
                recurrenceRuleId: appointment.recurrenceRuleId || appointment.RecurrenceRuleId,
                originalScheduledDate: dayjs((appointment.originalScheduledDate || appointment.OriginalScheduledDate || appointment.appointmentDate || appointment.AppointmentDate) as any).toISOString(),
                isCancelled: true,
                patientId: appointment.patientId || appointment.PatientId,
            };
            await apiClient.delete(`/Appointments/${appointment.id}?deleteFuture=${deleteFuture}`, { data: payload });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to delete appointment', err);
            let errorMessage = 'Failed to delete appointment';
            if (err.response?.data) {
                errorMessage = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
            }
            alert(errorMessage);
        }
    };

    const isFormValid = !!selectedPatient && 
        (activeTab === 0 ? serviceAssignments.length > 0 : (recurrenceState?.repeatDays?.length ?? 0) > 0) && 
        !!appointmentDate && 
        !!startTime;

    const previewAppointments = React.useMemo(() => {
        if (activeTab !== 1 || !recurrenceState) return [];
        if (!appointmentDate || !startTime) return [];
        if (recurrenceState.repeatDays?.length === 0) return [];

        const previews: { index: number; date: dayjs.Dayjs; startTime: string; endTime: string; services: number[] }[] = [];
        
        let currentDate = appointmentDate.startOf('day');
        let generated = 0;
        
        // Calculate max limit to prevent infinite loops
        let maxLimit = 30; // UI display cap
        if (recurrenceState.endType === 'after' && recurrenceState.endOccurrences) {
            maxLimit = Math.min(recurrenceState.endOccurrences, 30);
        }

        const safeEndDate = recurrenceState.endType === 'on' && recurrenceState.endDate 
            ? dayjs(recurrenceState.endDate).endOf('day') 
            : null;

        let safetyBreak = 0;

        while (generated < maxLimit && safetyBreak < 365) {
            safetyBreak++;

            if (safeEndDate && currentDate.isAfter(safeEndDate)) break;

            let matches = false;
            if (recurrenceState.repeatInterval === 'day') {
                matches = true;
            } else if (recurrenceState.repeatInterval === 'week') {
                if (recurrenceState.repeatDays.includes(currentDate.day())) {
                    matches = true;
                }
            }

            if (includeToday && generated === 0 && currentDate.isSame(appointmentDate, 'day')) {
                matches = true;
            }

            if (matches) {
                const dayId = currentDate.day();
                let daySetting = recurrenceState.daySettings[dayId];
                
                let sTime = startTime.format('HH:mm');
                let eTime = startTime.add(1, 'hour').format('HH:mm');
                let srvs = [...serviceAssignments.map(s => s.serviceId)];

                if (daySetting) {
                    sTime = daySetting.startTime;
                    eTime = daySetting.endTime;
                    if (daySetting.services && daySetting.services.length > 0) {
                        srvs = daySetting.services.map(s => s.serviceId);
                    }
                }

                previews.push({
                    index: generated + 1,
                    date: currentDate,
                    startTime: sTime,
                    endTime: eTime,
                    services: srvs
                });
                generated++;
            }

            if (recurrenceState.repeatInterval === 'day') {
                currentDate = currentDate.add(recurrenceState.repeatEvery || 1, 'day');
            } else if (recurrenceState.repeatInterval === 'week') {
                currentDate = currentDate.add(1, 'day');
                if (currentDate.day() === 0 && (recurrenceState.repeatEvery || 1) > 1) { // Sunday
                    currentDate = currentDate.add(7 * ((recurrenceState.repeatEvery || 1) - 1), 'day');
                }
            } else {
                currentDate = currentDate.add(1, 'day');
            }
        }

        return previews;
    }, [appointmentDate, startTime, includeToday, recurrenceState, activeTab, serviceAssignments]);

    const TabPanel = (props: { children?: React.ReactNode, index: number, value: number }) => {
        const { children, value, index, ...other } = props;
        return (
            <div role="tabpanel" hidden={value !== index} {...other}>
                {value === index && (
                    <Box sx={{ pt: 3 }}>
                        {children}
                    </Box>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {schedulePlanForProgram ? 'Schedule Plan' : isEditMode ? (isVirtual ? 'Edit Occurrence' : 'Edit Appointment') : 'New Appointment'}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5}>
                    <Box sx={{ width: '100%' }}>
                        <Autocomplete
                            options={patientOptions}
                            value={selectedPatient}
                            getOptionLabel={(o) => `${o.firstName} ${o.lastName}`}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            filterOptions={(x) => x}
                            loading={loadingPatients}
                            disabled={isEditMode}
                            onInputChange={(_, val) => { if (!isEditMode) setPatientSearchTerm(val); }}
                            onChange={(_, val) => setSelectedPatient(val)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Patient Name"
                                    placeholder={isEditMode ? '' : 'Search patient by name…'}
                                    variant="outlined"
                                    fullWidth
                                />
                            )}
                        />
                    </Box>

                    {isVirtual && (
                        <Chip
                            label="Editing only this occurrence — the series remains unchanged"
                            color="info"
                            variant="outlined"
                            size="small"
                        />
                    )}

                    {isEditMode && hasRecurrence && !isVirtual && (
                        <FormControlLabel
                            control={<Radio checked={updateFuture} onClick={() => setUpdateFuture(!updateFuture)} color="primary" />}
                            label="Update this and all future appointments"
                        />
                    )}

                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs 
                            value={activeTab} 
                            onChange={(_, newValue) => {
                                setActiveTab(newValue);
                                if (newValue === 1 && !recurrenceState) {
                                    setRecurrenceState({
                                        ...defaultRecurrenceState,
                                        repeatDays: [],
                                        daySettings: {}
                                    });
                                }
                            }}
                            indicatorColor="primary"
                            textColor="primary"
                        >
                            <Tab label="Single appointment" />
                            <Tab label="Recurrent appointments" />
                        </Tabs>
                    </Box>

                    <TabPanel value={activeTab} index={0}>
                        <Stack spacing={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Stack direction="row" spacing={2}>
                                    <DatePicker
                                        label="Date"
                                        value={appointmentDate}
                                        onChange={(res) => setAppointmentDate(res)}
                                        sx={{ flex: 1 }}
                                    />
                                    <TimePicker
                                        label="Time"
                                        value={startTime}
                                        minutesStep={1}
                                        ampm={false}
                                        onChange={(res) => setStartTime(res)}
                                        sx={{ flex: 1 }}
                                    />
                                </Stack>
                            </LocalizationProvider>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                                    Services
                                </Typography>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Add Service</InputLabel>
                                    <Select
                                        value=""
                                        label="Add Service"
                                        onChange={(e) => handleAddService(Number(e.target.value))}
                                    >
                                        <MenuItem value="" disabled><em>Select a service to add</em></MenuItem>
                                        {masterServices.map(s => (
                                            <MenuItem key={s.id} value={s.id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color || '#ccc', flexShrink: 0 }} />
                                                    {s.name}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                {serviceAssignments.length > 0 && (
                                    <Stack spacing={1} sx={{ mt: 2 }}>
                                        {serviceAssignments.map((a, idx) => {
                                            const srv = masterServices.find(s => s.id === a.serviceId);
                                            return (
                                                <Stack key={idx} direction="row" spacing={2} alignItems="center"
                                                    sx={{ 
                                                        p: 1.5, 
                                                        bgcolor: 'background.paper',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        borderLeft: `6px solid ${srv?.color || '#ccc'}`
                                                    }}
                                                >
                                                    <Typography variant="body2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                                                        {srv?.name}
                                                    </Typography>
                                                    <FormControl size="small" sx={{ width: 200 }}>
                                                        <InputLabel>Staff</InputLabel>
                                                        <Select
                                                            label="Staff"
                                                            value={a.attendantId || ''}
                                                            onChange={(e) => handleAttendantChangeForService(a.serviceId, String(e.target.value) === '' ? '' : Number(e.target.value))}
                                                        >
                                                            <MenuItem value=""><em>Auto / Last used</em></MenuItem>
                                                            {staffMembers.map(sm => (
                                                                <MenuItem key={sm.id} value={sm.id}>{sm.fullName}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveService(a.serviceId)}>
                                                        <TrashIcon />
                                                    </IconButton>
                                                </Stack>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </TabPanel>

                    <TabPanel value={activeTab} index={1}>
                        <Stack spacing={3}>
                            {isGeneralRuleActive && (
                                <Box sx={{ 
                                    bgcolor: 'rgba(255, 152, 0, 0.1)', 
                                    p: 2, 
                                    borderRadius: 1, 
                                    border: '1px solid rgba(255, 152, 0, 0.5)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    mb: 2
                                }}>
                                    <Typography variant="body2" fontWeight="bold" color="warning.dark">
                                        Patient already has a general recurrence rule enabled.
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        You can edit the existing series below or delete it entirely.
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        size="small" 
                                        sx={{ mt: 1, alignSelf: 'flex-start' }}
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this recurrence series and all future appointments?')) {
                                                try {
                                                    await apiClient.delete(`/Appointments/recurrence/${activeRuleId}`);
                                                    setIsGeneralRuleActive(false);
                                                    setActiveRuleId(null);
                                                    setRecurrenceState(undefined);
                                                    setScheduledAppointments([]);
                                                    onSuccess();
                                                    onClose();
                                                } catch (err) {
                                                    console.error('Failed to delete rule', err);
                                                    alert('Failed to delete recurrence rule');
                                                }
                                            }
                                        }}
                                    >
                                        Delete Recurrence Series
                                    </Button>
                                </Box>
                            )}
                            <Box>
                                <Stack spacing={3}>
                                    <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Repeat on</Typography>
                                    <ToggleButtonGroup
                                        value={recurrenceState?.repeatDays || []}
                                        onChange={(_, newDays) => {
                                            if (recurrenceState) setRecurrenceState({ ...recurrenceState, repeatDays: newDays });
                                        }}
                                        fullWidth
                                        size="small"
                                        color="primary"
                                    >
                                        {['S','M','T','W','T','F','S'].map((label, idx) => (
                                            <ToggleButton key={idx} value={idx} sx={{ flex: 1, borderRadius: '50% !important', m: 0.5 }}>
                                                {label}
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                </Box>

                            {(recurrenceState && recurrenceState.repeatDays.sort((a,b) => a-b).map(dayId => {
                                const daySetting = recurrenceState.daySettings[dayId] || { startTime: '09:00', endTime: '10:00', services: [] };
                                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                
                                return (
                                    <Box key={dayId} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main', fontWeight: 700 }}>
                                            {dayNames[dayId]}
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                <TimePicker
                                                    label="Time"
                                                    value={dayjs(daySetting.startTime, 'HH:mm')}
                                                    minutesStep={1}
                                                    ampm={false}
                                                    onChange={(res) => {
                                                        if (res) {
                                                            const newStart = res.format('HH:mm');
                                                            const newEnd = res.add(1, 'hour').format('HH:mm');
                                                            const newSettings = { ...recurrenceState.daySettings };
                                                            newSettings[dayId] = { ...daySetting, startTime: newStart, endTime: newEnd };
                                                            setRecurrenceState({ ...recurrenceState, daySettings: newSettings });
                                                        }
                                                    }}
                                                    sx={{ width: 140 }}
                                                />
                                            </LocalizationProvider>
                                            
                                            <FormControl fullWidth>
                                                <InputLabel>Services</InputLabel>
                                                <Select
                                                    multiple
                                                    label="Services"
                                                    value={daySetting.services.map(s => s.serviceId)}
                                                    renderValue={(selected) => (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {Array.from(new Set(selected as number[])).map((val) => {
                                                                const srv = masterServices.find(s => s.id === val);
                                                                return (
                                                                    <Chip 
                                                                        key={val} 
                                                                        label={srv?.name} 
                                                                        size="small" 
                                                                        sx={{ 
                                                                            bgcolor: srv?.color || 'divider', 
                                                                            color: srv?.color ? '#fff' : 'text.primary',
                                                                            fontWeight: 600,
                                                                            '& .MuiChip-label': { px: 1 }
                                                                        }} 
                                                                    />
                                                                );
                                                            })}
                                                        </Box>
                                                    )}
                                                    onChange={async (e) => {
                                                        const selectedIds = e.target.value as number[];
                                                        const existingServices = [...daySetting.services];
                                                        let updated = existingServices.filter(s => selectedIds.includes(s.serviceId));
                                                        const newIds = selectedIds.filter(id => !existingServices.find(es => es.serviceId === id));
                                                        for (const nId of newIds) {
                                                            let attId: number | '' = '';
                                                            const defAtt = selectedPatient?.defaultAttendants?.find(da => da.serviceId === nId);
                                                            if (defAtt) attId = defAtt.attendantId;
                                                            else if (selectedPatient) {
                                                                const la = await fetchLastAttendant(selectedPatient.id, nId);
                                                                if (la) attId = la;
                                                            }
                                                            updated.push({ serviceId: nId, attendantId: attId });
                                                        }
                                                        const newSettings = { ...recurrenceState.daySettings };
                                                        newSettings[dayId] = { ...daySetting, services: updated };
                                                        setRecurrenceState({ ...recurrenceState, daySettings: newSettings });
                                                    }}
                                                >
                                                    {masterServices.map(s => (
                                                        <MenuItem key={s.id} value={s.id}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color || '#ccc', flexShrink: 0 }} />
                                                                {s.name}
                                                            </Box>
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Stack>
                                    </Box>
                                );
                            }))}

                                <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 2, borderRadius: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Ends after</Typography>
                                    <RadioGroup
                                        value={recurrenceState?.endType || 'never'}
                                        onChange={(e) => {
                                            if (recurrenceState) setRecurrenceState({ ...recurrenceState, endType: e.target.value as any });
                                        }}
                                    >
                                        <Stack spacing={1}>
                                            <FormControlLabel value="never" control={<Radio size="small" />} label="Never" />
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <FormControlLabel value="on" control={<Radio size="small" />} label="End Date" />
                                                {recurrenceState?.endType === 'on' && (
                                                    <TextField 
                                                        type="date" 
                                                        size="small" 
                                                        value={recurrenceState.endDate || ''}
                                                        onChange={(e) => setRecurrenceState({ ...recurrenceState, endDate: e.target.value })}
                                                    />
                                                )}
                                            </Stack>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <FormControlLabel value="after" control={<Radio size="small" />} label="After" />
                                                {recurrenceState?.endType === 'after' && (
                                                    <TextField 
                                                        type="number" 
                                                        size="small" 
                                                        sx={{ width: 80 }}
                                                        value={recurrenceState.endOccurrences || 12}
                                                        onChange={(e) => setRecurrenceState({ ...recurrenceState, endOccurrences: parseInt(e.target.value, 10) })}
                                                    />
                                                )}
                                                {recurrenceState?.endType === 'after' && <Typography variant="body2">occurrences</Typography>}
                                            </Stack>
                                        </Stack>
                                    </RadioGroup>
                                    <FormControlLabel 
                                        control={<Checkbox size="small" checked={includeToday} onChange={(e) => setIncludeToday(e.target.checked)} />} 
                                        label={<Typography variant="caption">Schedule first appointment today regardless of pattern</Typography>} 
                                        sx={{ mt: 1 }}
                                    />
                                </Box>


                            {isGeneralRuleActive && scheduledAppointments.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>Actual Scheduled Appointments</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {scheduledAppointments.map((sa) => {
                                                    const date = dayjs(sa.appointmentDate);
                                                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                                    return (
                                                        <TableRow key={sa.id}>
                                                            <TableCell sx={{ py: 0.5 }}>
                                                                <Typography variant="body2">
                                                                    {date.format('DD/MM/YYYY')} ({dayNames[date.day()]})
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ py: 0.5 }}>
                                                                <Typography variant="body2">{date.format('HH:mm')}</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ py: 0.5 }}>
                                                                <Chip 
                                                                    label={sa.status} 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    color={sa.status === 'done' ? 'success' : 'primary'}
                                                                    sx={{ height: 20, fontSize: '0.65rem' }} 
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                        These appointments are already created in the database for the active rehabilitation program.
                                    </Typography>
                                </Box>
                            )}

                            {previewAppointments.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Predicted Appointments</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>No.</TableCell>
                                                    <TableCell>Day</TableCell>
                                                    <TableCell>Time</TableCell>
                                                    <TableCell>Services</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {previewAppointments.map((pa) => {
                                                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                    return (
                                                        <TableRow key={pa.index}>
                                                            <TableCell><Typography variant="body2">{pa.index}</Typography></TableCell>
                                                            <TableCell><Typography variant="body2">{pa.date.format('DD/MM/YYYY')} - {dayNames[pa.date.day()]}</Typography></TableCell>
                                                            <TableCell><Typography variant="body2">{pa.startTime}</Typography></TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                    {pa.services.map(sid => {
                                                                        const srv = masterServices.find(s => s.id === sid);
                                                                        return srv ? <Chip key={sid} label={srv.name} size="small" sx={{ bgcolor: srv.color || 'divider', color: srv.color ? '#fff' : 'inherit' }} /> : null;
                                                                    })}
                                                                    {pa.services.length === 0 && <Typography variant="caption" color="text.secondary">None</Typography>}
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, textAlign: 'right' }}>Preview limited to first 30 occurrences</Typography>
                                </Box>
                            )}
                                </Stack>
                            </Box>
                        </Stack>
                    </TabPanel>
                </Stack>
            </DialogContent>

            <DialogActions>
                {isEditMode && (
                    <Button onClick={() => setDeleteDialogOpen(true)} color="error" sx={{ mr: 'auto' }}>
                        Delete
                    </Button>
                )}
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!isFormValid || submitting}>
                    {isEditMode ? 'Save' : (activeTab === 1 && activeRuleId ? 'Update Series' : 'Schedule')}
                </Button>
            </DialogActions>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Appointment</DialogTitle>
                <DialogContent>
                    <Typography>
                        {(hasRecurrence || isVirtual)
                            ? 'This is a repeating appointment. Do you want to delete only this occurrence, or this and all future occurrences?'
                            : 'Are you sure you want to delete this appointment?'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
                    {(hasRecurrence || isVirtual) ? (
                        <>
                            <Button onClick={() => handleDelete(false)} color="error">Only This Occurrence</Button>
                            <Button onClick={() => handleDelete(true)} color="error" variant="contained">This and Future</Button>
                        </>
                    ) : (
                        <Button onClick={() => handleDelete(false)} color="error" variant="contained">Delete</Button>
                    )}
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
