'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { Rows as RowsIcon } from '@phosphor-icons/react/dist/ssr/Rows';

import { CustomersFilters } from '@/components/dashboard/customer/customers-filters';
import { CustomersTable } from '@/components/dashboard/customer/customers-table';
import type { AppointmentCustomer } from '@/components/dashboard/customer/customers-table';
import { AppointmentDialog } from './appointment-dialog';
import { AppointmentCalendar } from './appointments-calendar';
import { RescheduleDialog } from './reschedule-dialog';
import { CancelAppointmentDialog } from './cancel-appointment-dialog';
import { ExpedientDialog } from '../patients/expedient-drawer';
import { PatientDialog } from '../patients/patient-dialog';
import type { PatientRecord } from '../patients/patient-types';
import { InterconsultationDialog } from './interconsultation-dialog';
import { InterconsultationNotesDialog } from './interconsultation-notes-dialog';
import { StaffGroupsDialog, StaffGroup } from '../attention/staff-groups-dialog';
import { ServiceGroupsDialog, ServiceGroup } from '../attention/service-groups-dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { ListChecks as ListChecksIcon } from '@phosphor-icons/react/dist/ssr/ListChecks';
import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';

import { HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';

const DAYS_MAP: Record<string, string> = {
    '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRecurrenceLabel(rule: any): string | undefined {
    if (!rule) return undefined;
    if (rule.patternType === 'daily') {
        return rule.repeatEvery > 1 ? `Every ${rule.repeatEvery} days` : 'Daily';
    }
    if (rule.patternType === 'weekly') {
        const prefix = rule.repeatEvery > 1 ? `Every ${rule.repeatEvery} weeks` : 'Weekly';
        if (rule.daysOfWeek) {
            const days = String(rule.daysOfWeek).split(',').map(d => DAYS_MAP[d.trim()]).filter(Boolean).join(', ');
            return `On ${days}`;
        }
        return prefix;
    }
    if (rule.patternType === 'month') return `Monthly`;
    return 'Repeating';
}

function RealTimeClock() {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Typography variant="h6" color="text.secondary" sx={{ alignSelf: 'center', mr: 2, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {dayjs(time).format('hh:mm A')}
        </Typography>
    );
}

export function AppointmentsClient(): React.JSX.Element {
    const [visibleCount, setVisibleCount] = React.useState(50);
    const [appointments, setAppointments] = React.useState<AppointmentCustomer[]>([]);
    const [rawAppointments, setRawAppointments] = React.useState<Record<string, unknown>[]>([]);
    const getRawApp = React.useCallback((appId: string) => {
        if (appId && appId.startsWith('virtual-0-')) {
            const idx = parseInt(appId.split('-')[2], 10);
            return rawAppointments[idx];
        }
        return rawAppointments.find(r => String(r.id) === appId);
    }, [rawAppointments]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState(dayjs().format('YYYY-MM-DD'));
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'list' | 'daily' | 'weekly' | 'monthly'>('list');
    const [isViewModeInitialized, setIsViewModeInitialized] = React.useState(false);
    const [showOnlyEvaluations, setShowOnlyEvaluations] = React.useState<boolean>(false);
    const [availableServices, setAvailableServices] = React.useState<Array<{id: number, name: string, color?: string}>>([]);
    const [attendants, setAttendants] = React.useState<Array<{id: number, fullName: string}>>([]);
    const [selectedServiceIds, setSelectedServiceIds] = React.useState<number[]>([]);
    const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
    const [selectedRescheduleApp, setSelectedRescheduleApp] = React.useState<Record<string, unknown> | null>(null);

    const [interconsultationDialogOpen, setInterconsultationDialogOpen] = React.useState(false);
    const [selectedInterconsultationApptId, setSelectedInterconsultationApptId] = React.useState<string | null>(null);
    const [selectedInterconsultationPatientId, setSelectedInterconsultationPatientId] = React.useState<string | null>(null);

    const [interconsultationNotesDialogOpen, setInterconsultationNotesDialogOpen] = React.useState(false);
    const [selectedInterconsultationNotesApptId, setSelectedInterconsultationNotesApptId] = React.useState<string | null>(null);
    const [selectedInterconsultationNotesPatientId, setSelectedInterconsultationNotesPatientId] = React.useState<string | null>(null);
    const [selectedInterconsultationNotes, setSelectedInterconsultationNotes] = React.useState<string>('');

    const [selectedTurn, setSelectedTurn] = React.useState<'all' | 'morning' | 'afternoon'>('all');

    const [staffGroups, setStaffGroups] = React.useState<StaffGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
    const [isGroupsDialogOpen, setIsGroupsDialogOpen] = React.useState(false);

    const [serviceGroups, setServiceGroups] = React.useState<ServiceGroup[]>([]);
    const [selectedServiceGroupId, setSelectedServiceGroupId] = React.useState<number | null>(null);
    const [isServiceGroupsDialogOpen, setIsServiceGroupsDialogOpen] = React.useState(false);

    // Fetch master services once
    React.useEffect(() => {
        (async () => {
            try {
                const [servRes, userRes, staffGroupsRes, serviceGroupsRes] = await Promise.all([
                    apiClient.get('/Services'),
                    apiClient.get('/Users'),
                    apiClient.get('/StaffGroups').catch(() => ({ data: [] })),
                    apiClient.get('/ServiceGroups').catch(() => ({ data: [] }))
                ]);
                setAvailableServices(servRes.data);
                setAttendants(userRes.data.map((u: any) => ({ id: u.id, fullName: u.fullName })));
                setStaffGroups(staffGroupsRes.data || []);
                setServiceGroups(serviceGroupsRes.data || []);
            } catch (err) {
                console.error('Failed to load services or users', err);
            }
        })();
    }, []);

    // Persist view mode - Read on mount
    React.useEffect(() => {
        try {
            const savedView = localStorage.getItem('appointments-view-mode');
            if (savedView && ['list', 'daily', 'weekly', 'monthly'].includes(savedView)) {
                setViewMode(savedView as any);
            }
        } catch {
            // Safely ignore security exceptions from strict privacy settings
        }
        setIsViewModeInitialized(true);
    }, []);

    // Persist view mode - Write on change (only after initialization)
    React.useEffect(() => {
        if (isViewModeInitialized) {
            try {
                localStorage.setItem('appointments-view-mode', viewMode);
            } catch {
                // Safely ignore security exceptions
            }
        }
    }, [viewMode, isViewModeInitialized]);

    const [editingAppointment, setEditingAppointment] = React.useState<Record<string, unknown> | undefined>(undefined);

    // Cancellation state
    const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
    const [cancelingAppointmentId, setCancelingAppointmentId] = React.useState<string | null>(null);

    // Patient state
    const [isPatientDialogOpen, setIsPatientDialogOpen] = React.useState(false);
    const [selectedPatient, setSelectedPatient] = React.useState<PatientRecord | null>(null);
    const [expedientPatient, setExpedientPatient] = React.useState<PatientRecord | null>(null);

    // Persist filter states - Read on mount
    React.useEffect(() => {
        try {
            const storedGroupId = localStorage.getItem('appointments_selected_group_id');
            if (storedGroupId) setSelectedGroupId(Number(storedGroupId));

            const storedServiceGroupId = localStorage.getItem('appointments_selected_service_group_id');
            if (storedServiceGroupId) setSelectedServiceGroupId(Number(storedServiceGroupId));

            const storedTurn = localStorage.getItem('appointments_selected_turn');
            if (storedTurn && ['all', 'morning', 'afternoon'].includes(storedTurn)) {
                setSelectedTurn(storedTurn as any);
            }
        } catch {
            // Safely ignore security exceptions
        }
    }, []);

    // Persist filter states - Write on change
    React.useEffect(() => {
        try {
            if (selectedGroupId) localStorage.setItem('appointments_selected_group_id', selectedGroupId.toString());
            else localStorage.removeItem('appointments_selected_group_id');

            if (selectedServiceGroupId) localStorage.setItem('appointments_selected_service_group_id', selectedServiceGroupId.toString());
            else localStorage.removeItem('appointments_selected_service_group_id');

            localStorage.setItem('appointments_selected_turn', selectedTurn);
        } catch {
            // Safely ignore security exceptions
        }
    }, [selectedGroupId, selectedServiceGroupId, selectedTurn]);

    const fetchAppointments = async (mounted = true) => {
        try {
            const response = await apiClient.get('/Appointments');
            if (mounted) {
                const data = Array.isArray(response.data) ? response.data : [];
                setRawAppointments(data);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formatted = data.map((appRaw: any, index: number): AppointmentCustomer => {
                    const app = appRaw;

                    // Display selected Services. Join names with commas.
                    let serviceDisplay = '';
                    let serviceColor = undefined;

                    if (app.serviceWork && Array.isArray(app.serviceWork.serviceWorkItems)) {
                        const items = app.serviceWork.serviceWorkItems;
                        serviceDisplay = items.map((swi: any) => swi.service?.name).filter(Boolean).join(', ');
                        serviceColor = (items[0]?.service?.color) || undefined;
                    }

                    let status = app.status || 'N/A';
                    if (status.toLowerCase() === 'scheduled') {
                        const appDate = dayjs(app.appointmentDate);
                        if (dayjs().isAfter(appDate.add(15, 'minute'))) {
                            status = 'delayed';
                        }
                    }

                    return {
                        id: app.id === 0 ? `virtual-0-${index}` : String(app.id),
                        date: app.appointmentDate,
                        hour: dayjs(app.appointmentDate).format('HH:mm'),
                        occurrence: app.occurrenceNumber || 0,
                        patientId: String(app.patientId),
                        patient: {
                            name: app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Unknown Patient',
                            avatar: app.patient?.photoUrl || undefined,
                        },
                        service: serviceDisplay,
                        serviceColor: serviceColor,
                        services: app.services,
                        status: status,
                        phone: app.patient?.phoneNumber || 'N/A',
                        gym: app.patient?.clinic?.name || 'N/A',
                        staff: app.serviceWork?.serviceWorkItems?.[0]?.attendant?.fullName || 'Unknown Staff Member',
                        serviceWork: app.serviceWork,
                        recurrenceLabel: app.recurrenceRule ? buildRecurrenceLabel(app.recurrenceRule) : undefined,
                        isRehab: !!app.rehabilitationSessionId || !!app.rehabilitationSession,
                        isGhost: app.isGhost,
                        rescheduledTo: app.rescheduledTo
                    };
                });
                setAppointments(formatted);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        }
    };

    React.useEffect(() => {
        let isMounted = true;
        fetchAppointments(isMounted);

        let connection: any = null;

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';
            const baseUrl = apiBase.replace(/\/api\/?$/, '');
            connection = new HubConnectionBuilder()
                .withUrl(`${baseUrl}/hubs/appointments`, {
                    accessTokenFactory: () => {
                        try {
                            return localStorage.getItem('custom-auth-token') || '';
                        } catch {
                            return '';
                        }
                    }
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.None)
                .build();

            connection.on('ReceiveAppointmentUpdate', () => {
                if (isMounted) {
                    // Instantly refresh the data from the server when an update event arrives 
                    // so the backend can recalculate Occurrence counts automatically
                    fetchAppointments(isMounted);
                }
            });

            connection.start().catch((err: any) => {
                if (err?.message?.includes('stopped during negotiation')) {
                    return; // Ignore React 18 Strict Mode unmount aborts
                }
                if (isMounted) {
                    console.error('SignalR Connection Error: ', err);
                }
            });
        } catch (err) {
            console.error('Failed to initialize SignalR:', err);
        }

        return () => {
            isMounted = false;
            if (connection && connection.state !== 'Disconnected') {
                connection.stop().catch(() => {
                    // Ignore errors during stop, especially the "stop before start" one
                });
            }
        };
    }, []);

    const filteredAppointments = React.useMemo(() => {
        let result = appointments;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const today = dayjs().startOf('day');
            result = result.filter((app) => {
                const matchesName = app.patient.name.toLowerCase().includes(term) ||
                                    app.service.toLowerCase().includes(term) ||
                                    app.staff.toLowerCase().includes(term);
                
                if (!matchesName) return false;
                
                const rawApp = getRawApp(app.id);
                if (!rawApp) return false;
                
                const appDate = dayjs(rawApp.appointmentDate as string | number | Date);
                return !appDate.isBefore(today);
            });
        } else if (selectedDate && (viewMode === 'list' || viewMode === 'daily')) {
            // raw appointments have full ISO date, we need to match the YYYY-MM-DD
            result = result.filter((app) => {
                const rawApp = getRawApp(app.id);
                if (!rawApp) return false;
                const appDate = dayjs(rawApp.appointmentDate as string | number | Date).format('YYYY-MM-DD');
                return appDate === selectedDate;
            });
        }

        if (showOnlyEvaluations || selectedServiceIds.length > 0) {
            result = result.filter((app) => {
                let matchesEval = false;
                if (showOnlyEvaluations) {
                    const rawApp = getRawApp(app.id);
                    if (rawApp) {
                        const rehabSession = rawApp.rehabilitationSession as Record<string, unknown> | undefined;
                        const isRehabEval = typeof rehabSession?.type === 'string' && rehabSession.type.toLowerCase().includes('eval');
                        const isReasonEval = typeof rawApp.reason === 'string' && rawApp.reason.toLowerCase().includes('eval');
                        const isTreatmentEval = typeof rawApp.treatmentType === 'string' && rawApp.treatmentType.toLowerCase().includes('eval');
                        matchesEval = isRehabEval || isReasonEval || isTreatmentEval;
                    }
                }

                let matchesService = false;
                if (selectedServiceIds.length > 0) {
                    const appServiceIds = app.services?.map((s: any) => s.id) || (app.serviceId ? [app.serviceId] : []);
                    matchesService = appServiceIds.some((id: any) => selectedServiceIds.includes(Number(id)));
                }

                if (showOnlyEvaluations && selectedServiceIds.length > 0) {
                    return matchesEval || matchesService;
                }
                return showOnlyEvaluations ? matchesEval : matchesService;
            });
        }

        // Staff Group filtering logic
        if (selectedGroupId !== null) {
            const group = staffGroups.find(g => g.id === selectedGroupId);
            if (group) {
                result = result.filter(app => {
                    const totalServicesCount = app.services?.length || 0;
                    const assignedStaffIds = new Set<number>();
                    let assignedServicesCount = 0;

                    app.serviceWork?.serviceWorkItems?.forEach((item: any) => {
                        if (item.attendantId) {
                            assignedStaffIds.add(item.attendantId);
                            assignedServicesCount++;
                        }
                    });

                    // If any service is missing an assigned staff, we keep it visible for this filter
                    if (assignedServicesCount >= totalServicesCount && assignedStaffIds.size > 0) {
                        const hasGroupMember = Array.from(assignedStaffIds).some(id => group.userIds.includes(id));
                        if (!hasGroupMember) return false;
                    }
                    return true;
                });
            }
        }

        // Service Group filtering logic
        if (selectedServiceGroupId !== null) {
            const group = serviceGroups.find(g => g.id === selectedServiceGroupId);
            if (group) {
                result = result.filter(app => {
                    const hasGroupService = app.services?.some((s: any) => group.serviceIds.includes(s.id));
                    return hasGroupService;
                });
            }
        }

        // Turn filtering logic
        if (selectedTurn !== 'all') {
            result = result.filter(app => {
                if (!app.hour) return true;
                const parts = app.hour.split(':');
                if (parts.length === 2) {
                    const minutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                    if (selectedTurn === 'morning' && (minutes < 480 || minutes > 810)) return false;
                    if (selectedTurn === 'afternoon' && (minutes < 870 || minutes > 1260)) return false;
                }
                return true;
            });
        }

        return [...result].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    }, [appointments, searchTerm, selectedDate, selectedServiceIds, showOnlyEvaluations, viewMode, rawAppointments, selectedGroupId, staffGroups, selectedServiceGroupId, serviceGroups, selectedTurn]);

    const filteredRawAppointments = React.useMemo(() => {
        const validIds = new Set(filteredAppointments.map(a => a.id));
        return rawAppointments.filter(r => {
            // Handle virtual IDs that might be generated in AppointmentsClient
            // The table uses `virtual-0-${index}`
            // We need to reverse find if possible, or just apply filters again.
            // Applying filters again is safer.
            return filteredAppointments.some(f => f.id === String(r.id)) || 
                   (r.id === 0 && filteredAppointments.some(f => f.id.startsWith('virtual-0-') && f.patientId === String(r.patientId)));
        });
    }, [filteredAppointments, rawAppointments]);

    const handleEditClick = (id: string) => {
        const raw = getRawApp(id);
        if (raw) {
            setEditingAppointment(raw);
            setIsDialogOpen(true);
        }
    };

    const handleRescheduleClick = (id: string) => {
        const fullApp = getRawApp(id);
        if (fullApp) {
            setSelectedRescheduleApp(fullApp);
            setIsRescheduleOpen(true);
        }
    };

    const handleTransformInterconsultationClick = (id: string) => {
        const app = filteredAppointments.find(a => a.id === id);
        if (app) {
            setSelectedInterconsultationApptId(id);
            setSelectedInterconsultationPatientId(app.patientId);
            setInterconsultationDialogOpen(true);
        }
    };

    const handleEditInterconsultationNotesClick = (appointmentId: string, notes: string, patientId: string) => {
        setSelectedInterconsultationNotesApptId(appointmentId);
        setSelectedInterconsultationNotesPatientId(patientId);
        setSelectedInterconsultationNotes(notes);
        setInterconsultationNotesDialogOpen(true);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        if (newStatus === 'canceled' || newStatus === 'absent') {
            if (newStatus === 'absent') {
                await commitStatusChange(id, newStatus);
            } else {
                setCancelingAppointmentId(id);
                setCancelDialogOpen(true);
            }
        } else {
            await commitStatusChange(id, newStatus);
        }
    };

    const commitStatusChange = async (id: string, newStatus: string, cancelReason?: string, cancelComment?: string) => {
        try {
            const isVirtual = id.startsWith('virtual') || parseInt(id, 10) <= 0;
            if (isVirtual) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawApp = getRawApp(id);
                if (rawApp) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const updatedApp: Record<string, any> = {
                        ...rawApp,
                        status: newStatus,
                        // Ensure it has a UTC date for the override
                        appointmentDate: dayjs(rawApp.appointmentDate as any).toISOString(),
                        originalScheduledDate: rawApp.originalScheduledDate || rawApp.appointmentDate
                    };

                    if (newStatus === 'canceled') {
                        updatedApp.cancellationReason = cancelReason;
                        updatedApp.cancellationComment = cancelComment;
                    }

                    // Strip EF navigation properties before sending to prevent 400 Bad Request Model Validation failures
                    delete updatedApp.id; // Let the backend create a new one
                    delete updatedApp.patient;
                    delete updatedApp.user;
                    delete updatedApp.equipment;
                    delete updatedApp.technology;
                    delete updatedApp.technologies;
                    delete updatedApp.recurrenceRule;
                    delete updatedApp.serviceWork;

                    await apiClient.put('/Appointments/0', updatedApp);
                }
            } else {
                const payload = {
                    status: newStatus,
                    cancellationReason: cancelReason,
                    cancellationComment: cancelComment
                };
                await apiClient.patch(`/Appointments/${id}/status`, payload);
            }
            // SignalR event will trigger for other clients, but update immediately for us
            await fetchAppointments(true);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleConfirmCancel = async (reason: string, comment: string) => {
        if (cancelingAppointmentId) {
            await commitStatusChange(cancelingAppointmentId, 'canceled', reason, comment);
        }
        setCancelDialogOpen(false);
        setCancelingAppointmentId(null);
    };

    const handleCancelAndReschedule = async (reason: string, comment: string) => {
        if (cancelingAppointmentId) {
            await commitStatusChange(cancelingAppointmentId, 'canceled', reason, comment);
            // After cancelling, open the normal edit dialog to reschedule
            handleEditClick(cancelingAppointmentId); // handleEdit sets editingAppointment and opens the AppointmentDialog
        }
        setCancelDialogOpen(false);
        setCancelingAppointmentId(null);
    };

    const handlePatientClick = (patientId: string) => {
        const appointment: any = rawAppointments.find(a => String((a as any).patientId) === patientId);
        if (appointment && appointment.patient) {
            setExpedientPatient(appointment.patient as PatientRecord);
        } else {
            console.warn('Patient not found in appointments list');
        }
    };

    const paginatedCustomers = filteredAppointments.slice(0, visibleCount);

    return (
        <Stack spacing={3}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between'
                }}
            >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' }, justifyContent: 'space-between' }}>
                    <Typography variant="h4">Appointments</Typography>
                    <RealTimeClock />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
                    <Box sx={{ width: '100%', overflowX: 'auto', pb: { xs: 1, md: 0 } }}>
                        <ButtonGroup variant="outlined" size="small" sx={{ minWidth: 'max-content' }}>
                            <Button
                                onClick={() => setViewMode('list')}
                                variant={viewMode === 'list' ? 'contained' : 'outlined'}
                            >
                                List
                            </Button>
                            <Button
                                onClick={() => setViewMode('daily')}
                                variant={viewMode === 'daily' ? 'contained' : 'outlined'}
                            >
                                Daily
                            </Button>
                            <Button
                                onClick={() => setViewMode('weekly')}
                                variant={viewMode === 'weekly' ? 'contained' : 'outlined'}
                            >
                                Weekly
                            </Button>
                            <Button
                                onClick={() => setViewMode('monthly')}
                                variant={viewMode === 'monthly' ? 'contained' : 'outlined'}
                            >
                                Monthly
                            </Button>
                        </ButtonGroup>
                    </Box>
                    <Button
                        startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
                        variant="contained"
                        onClick={() => { setEditingAppointment(undefined); setIsDialogOpen(true); }}
                        sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}
                    >
                        New appointment
                    </Button>
                </Stack>
            </Stack>

            <Fab
                color="primary"
                aria-label="add"
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    display: { xs: 'flex', md: 'none' },
                    zIndex: 1000
                }}
                onClick={() => { setEditingAppointment(undefined); setIsDialogOpen(true); }}
            >
                <PlusIcon fontSize="var(--icon-fontSize-lg)" />
            </Fab>
            <CustomersFilters
                searchTerm={searchTerm}
                onSearch={(term: string) => {
                    setSearchTerm(term);
                    setVisibleCount(50);
                }}
                selectedDate={selectedDate}
                onDateChange={(date: string) => {
                    setSelectedDate(date);
                    setVisibleCount(50);
                }}
                appointments={rawAppointments}
                availableServices={availableServices}
                selectedServiceIds={selectedServiceIds}
                onServiceIdsChange={(ids) => {
                    setSelectedServiceIds(ids);
                    setVisibleCount(50);
                }}
                showOnlyEvaluations={showOnlyEvaluations}
                onShowOnlyEvaluationsChange={(checked: boolean) => {
                    setShowOnlyEvaluations(checked);
                    setVisibleCount(50);
                }}
                selectedTurn={selectedTurn}
                onTurnChange={setSelectedTurn}
            />

            {(staffGroups.length > 0 || serviceGroups.length > 0) && (
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 0.5, rowGap: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <Select
                            value={selectedGroupId || ''}
                            onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                            displayEmpty
                            size="small"
                            sx={{
                                minWidth: 120,
                                fontSize: '0.8rem',
                                '& .MuiSelect-select': { py: 0.5 }
                            }}
                        >
                            <MenuItem value=""><em>No Staff Group</em></MenuItem>
                            {staffGroups.map(g => (
                                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                            ))}
                        </Select>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<UsersIcon />}
                            onClick={() => setIsGroupsDialogOpen(true)}
                            sx={{ textTransform: 'none', py: 0.25, fontSize: '0.75rem' }}
                        >
                            Manage
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <Select
                            value={selectedServiceGroupId || ''}
                            onChange={(e) => setSelectedServiceGroupId(e.target.value ? Number(e.target.value) : null)}
                            displayEmpty
                            size="small"
                            sx={{
                                minWidth: 120,
                                fontSize: '0.8rem',
                                '& .MuiSelect-select': { py: 0.5 }
                            }}
                        >
                            <MenuItem value=""><em>No Service Group</em></MenuItem>
                            {serviceGroups.map(g => (
                                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                            ))}
                        </Select>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<ListChecksIcon />}
                            onClick={() => setIsServiceGroupsDialogOpen(true)}
                            sx={{ textTransform: 'none', py: 0.25, fontSize: '0.75rem' }}
                        >
                            Manage
                        </Button>
                    </Stack>
                </Stack>
            )}

            {viewMode !== 'list' ? (
                <AppointmentCalendar
                    events={filteredRawAppointments}
                    viewMode={viewMode as 'daily' | 'weekly' | 'monthly'}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onStatusChange={handleStatusChange}
                    rawAppointments={rawAppointments}
                />
            ) : (
                <CustomersTable
                    count={filteredAppointments.length}
                    rows={paginatedCustomers}
                    onLoadMore={() => setVisibleCount(v => v + 50)}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditClick}
                    onReschedule={handleRescheduleClick}
                    onTransformInterconsultation={handleTransformInterconsultationClick}
                    onEditInterconsultationNotes={handleEditInterconsultationNotesClick}
                    onPatientClick={handlePatientClick}
                    isSearching={Boolean(searchTerm)}
                />
            )}

            <AppointmentDialog
                open={isDialogOpen}
                appointment={editingAppointment}
                onClose={() => { setIsDialogOpen(false); setEditingAppointment(undefined); }}
                onSuccess={() => {
                    setIsDialogOpen(false);
                    setEditingAppointment(undefined);
                    fetchAppointments(true);
                }}
                existingAppointments={rawAppointments}
            />

            <CancelAppointmentDialog
                open={cancelDialogOpen}
                onClose={() => { setCancelDialogOpen(false); setCancelingAppointmentId(null); }}
                onConfirmCancel={handleConfirmCancel}
                onReschedule={handleCancelAndReschedule}
                isRehab={cancelingAppointmentId ? appointments.find(a => a.id === cancelingAppointmentId)?.isRehab : false}
            />

            <PatientDialog
                open={isPatientDialogOpen}
                patient={selectedPatient ?? undefined}
                onClose={() => { setIsPatientDialogOpen(false); setSelectedPatient(null); }}
                onSuccess={() => {
                    setIsPatientDialogOpen(false);
                    setSelectedPatient(null);
                    fetchAppointments(true);
                }}
            />

            <RescheduleDialog
                open={isRescheduleOpen}
                onClose={() => setIsRescheduleOpen(false)}
                onSuccess={fetchAppointments}
                appointment={selectedRescheduleApp}
            />

            <ExpedientDialog
                open={Boolean(expedientPatient)}
                patient={expedientPatient}
                onClose={() => setExpedientPatient(null)}
                onUpdate={() => fetchAppointments()}
                onEdit={() => {
                    if (expedientPatient) {
                        setSelectedPatient(expedientPatient);
                        setIsPatientDialogOpen(true);
                        setExpedientPatient(null);
                    }
                }}
            />

            <InterconsultationDialog
                open={interconsultationDialogOpen}
                onClose={() => setInterconsultationDialogOpen(false)}
                appointmentId={selectedInterconsultationApptId || ''}
                patientId={selectedInterconsultationPatientId || ''}
                attendants={attendants}
                onSaved={() => fetchAppointments(true)}
            />

            <InterconsultationNotesDialog
                open={interconsultationNotesDialogOpen}
                onClose={() => setInterconsultationNotesDialogOpen(false)}
                appointmentId={selectedInterconsultationNotesApptId || ''}
                patientId={selectedInterconsultationNotesPatientId || ''}
                initialNotes={selectedInterconsultationNotes}
                onSaved={() => fetchAppointments(true)}
            />

            <StaffGroupsDialog
                open={isGroupsDialogOpen}
                onClose={() => setIsGroupsDialogOpen(false)}
                staffGroups={staffGroups}
                attendants={attendants}
                onGroupsUpdated={() => fetchAppointments(true)}
            />

            <ServiceGroupsDialog
                open={isServiceGroupsDialogOpen}
                onClose={() => setIsServiceGroupsDialogOpen(false)}
                serviceGroups={serviceGroups}
                availableServices={availableServices}
                onGroupsUpdated={() => fetchAppointments(true)}
            />
        </Stack>
    );
}

