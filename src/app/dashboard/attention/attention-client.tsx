'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import Popover from '@mui/material/Popover';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { AppointmentsAttention, statusMap } from '../appointments/appointments-attention';
import { CustomersFilters } from '@/components/dashboard/customer/customers-filters';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import apiClient from '@/lib/api-client';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import dayjs from 'dayjs';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { ExpedientDialog } from '../patients/expedient-drawer';
import { ClinicalHistoryDialog } from '../patients/clinical-history-dialog';
import { PatientDialog } from '../patients/patient-dialog';
import { RescheduleDialog } from '../appointments/reschedule-dialog';
import { StaffGroupsDialog, StaffGroup } from './staff-groups-dialog';
import { ServiceGroupsDialog, ServiceGroup } from './service-groups-dialog';
import Button from '@mui/material/Button';
import { AppointmentsResumeDialog } from './appointments-resume-dialog';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { UserPlus as UserPlusIcon } from '@phosphor-icons/react/dist/ssr/UserPlus';
import { ListChecks as ListChecksIcon } from '@phosphor-icons/react/dist/ssr/ListChecks';

function getInitials(name?: string) {
    if (!name) return '';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
}

function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 45;
  const lPercent = l / 100;
  const a = (s * Math.min(lPercent, 1 - lPercent)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lPercent - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getContrastColor(hexColor: string) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

function StaffPopoverContent({ staff, staffAppts, handleClosePopover }: any) {
    const tableContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!staffAppts.length) return;
        
        const now = dayjs().valueOf();
        let closestIdx = 0;
        let minDiff = Infinity;
        staffAppts.forEach((app: any, idx: number) => {
            const diff = Math.abs(app.timeVal - now);
            if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
        });
        
        setTimeout(() => {
            const row = document.getElementById(`staff-appt-row-${staffAppts[closestIdx].id}`);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }, [staffAppts]);

    const nowObj = dayjs();
    const currentLapseStart = nowObj.minute() >= 30 ? nowObj.startOf('hour').minute(30).valueOf() : nowObj.startOf('hour').valueOf();
    const currentLapseEnd = currentLapseStart + 30 * 60000;

    return (
        <Box>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Appointments assigned to {staff.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', fontWeight: 500 }}>
                        <span>🗓️ Assigned: {staffAppts.length}</span>
                        <span>|</span>
                        <span>✅ Completed: {staffAppts.filter((a: any) => a.state.toLowerCase() === 'done' || a.state.toLowerCase() === 'attended').length}</span>
                        <span>|</span>
                        <span>❌ Canceled: {staffAppts.filter((a: any) => a.state.toLowerCase() === 'canceled').length}</span>
                        <span>|</span>
                        <span>💤 Absent: {staffAppts.filter((a: any) => a.state.toLowerCase() === 'absent').length}</span>
                    </Typography>
                </Box>
                <IconButton size="small" onClick={handleClosePopover} sx={{ mt: -0.5, mr: -0.5 }}>
                    <XIcon size={16} />
                </IconButton>
            </Stack>
            
            {staffAppts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No appointments assigned.</Typography>
            ) : (
                <Box sx={{ maxHeight: 350, overflowY: 'auto', pr: 1 }} ref={tableContainerRef}>
                    <Table size="small">
                        <TableHead sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Patient</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>State</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {staffAppts.map((ap: any, idx: number) => {
                                let isLastInBlock = false;
                                    if (idx < staffAppts.length - 1) {
                                        const next = staffAppts[idx + 1];
                                        const bucketThis = dayjs(ap.timeVal).hour() * 2 + Math.floor(dayjs(ap.timeVal).minute() / 30);
                                        const bucketNext = dayjs(next.timeVal).hour() * 2 + Math.floor(dayjs(next.timeVal).minute() / 30);
                                        
                                        if (bucketNext > bucketThis || next.timeVal - ap.timeVal >= 30 * 60000) {
                                            isLastInBlock = true;
                                        }
                                    }

                                    const isCurrentLapse = ap.timeVal >= currentLapseStart && ap.timeVal < currentLapseEnd;

                                    return (
                                        <TableRow 
                                            key={ap.id} 
                                            id={`staff-appt-row-${ap.id}`}
                                            sx={{
                                                '& td': {
                                                    borderBottom: isLastInBlock ? '2px solid rgba(0,0,0,0.25)' : '1px solid rgba(224, 224, 224, 1)'
                                                }
                                            }}
                                        >
                                            <TableCell sx={{ 
                                                whiteSpace: 'nowrap',
                                                fontWeight: isCurrentLapse ? 800 : 400,
                                                color: isCurrentLapse ? 'primary.main' : 'text.primary'
                                            }}>
                                                {ap.timeStr}
                                            </TableCell>
                                            <TableCell>{ap.patient}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
                                                    {ap.services.map((s: any) => (
                                                        <Chip key={s.id} label={s.name} size="small" sx={{ bgcolor: s.color || 'primary.main', color: '#fff', fontSize: '0.7rem' }} />
                                                    ))}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={ap.statusObj?.label || ap.state} 
                                                    size="small" 
                                                    sx={{ 
                                                        bgcolor: ap.statusObj?.hex || undefined,
                                                        color: ap.statusObj?.hex ? '#fff' : 'inherit',
                                                        fontSize: '0.7rem'
                                                    }}
                                                    color={ap.statusObj?.hex ? undefined : (ap.statusObj?.color || 'default')}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Box>
    );
}

export function AttentionClient(): React.JSX.Element {
    const [rawAppointments, setRawAppointments] = React.useState<any[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState(dayjs().format('YYYY-MM-DD'));
    const [selectedServiceIds, setSelectedServiceIds] = React.useState<number[]>([]);
    const [availableServices, setAvailableServices] = React.useState<Array<{id: number, name: string, color: string}>>([]);
    const [attendants, setAttendants] = React.useState<Array<{id: number, fullName: string}>>([]);
    const [showOnlyEvaluations, setShowOnlyEvaluations] = React.useState(false);
    const [selectedTurn, setSelectedTurn] = React.useState<'all' | 'morning' | 'afternoon'>('all');

    const [staffGroups, setStaffGroups] = React.useState<StaffGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
    const [isGroupsDialogOpen, setIsGroupsDialogOpen] = React.useState(false);

    const [serviceGroups, setServiceGroups] = React.useState<ServiceGroup[]>([]);
    const [selectedServiceGroupId, setSelectedServiceGroupId] = React.useState<number | null>(null);
    const [isServiceGroupsDialogOpen, setIsServiceGroupsDialogOpen] = React.useState(false);
    const [isResumeDialogOpen, setIsResumeDialogOpen] = React.useState(false);

    React.useEffect(() => {
        try {
            const stored = localStorage.getItem('attention_selected_group_id');
            if (stored) setSelectedGroupId(Number(stored));

            const storedSg = localStorage.getItem('attention_selected_service_group_id');
            if (storedSg) setSelectedServiceGroupId(Number(storedSg));
        } catch (e) {
            console.error('Failed to read from localStorage', e);
        }
    }, []);

    React.useEffect(() => {
        try {
            if (selectedGroupId !== null) {
                localStorage.setItem('attention_selected_group_id', selectedGroupId.toString());
            } else {
                localStorage.removeItem('attention_selected_group_id');
            }
        } catch (e) {
            console.error('Failed to write to localStorage', e);
        }
    }, [selectedGroupId]);

    React.useEffect(() => {
        try {
            if (selectedServiceGroupId !== null) {
                localStorage.setItem('attention_selected_service_group_id', selectedServiceGroupId.toString());
            } else {
                localStorage.removeItem('attention_selected_service_group_id');
            }
        } catch (e) {
            console.error('Failed to write to localStorage', e);
        }
    }, [selectedServiceGroupId]);

    const [expedientPatient, setExpedientPatient] = React.useState<any>(null);
    const [clinicalHistoryPatient, setClinicalHistoryPatient] = React.useState<any>(null);
    const [loadingHistory, setLoadingHistory] = React.useState(false);

    const [isPatientDialogOpen, setIsPatientDialogOpen] = React.useState(false);
    const [selectedPatient, setSelectedPatient] = React.useState<any>(null);

    const [isRescheduleTimeOpen, setIsRescheduleTimeOpen] = React.useState(false);
    const [rescheduleAppt, setRescheduleAppt] = React.useState<any>(null);

    const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);
    const [selectedStaffId, setSelectedStaffId] = React.useState<number | null>(null);

    const handleBadgeClick = (event: React.MouseEvent<HTMLDivElement>, staffId: number) => {
        setAnchorEl(event.currentTarget);
        setSelectedStaffId(staffId);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
        setSelectedStaffId(null);
    };

    const handleReadExpedient = async (patientId: string) => {
        try {
            const res = await apiClient.get(`/Patients/${patientId}`);
            setExpedientPatient(res.data);
        } catch(err) {
            console.error('Failed to load patient expedient', err);
        }
    };

    const handleReadClinicalHistory = async (patientId: string) => {
        setLoadingHistory(true);
        // Ensure dialog opens immediately in a loading state
        setClinicalHistoryPatient({ id: Number(patientId), firstName: 'Loading...', lastName: '' }); 
        try {
            const res = await apiClient.get(`/Patients/${patientId}/history`);
            setClinicalHistoryPatient(res.data);
        } catch (error) {
            console.error('Failed to fetch clinical history:', error);
            alert('Failed to load clinical history');
            setClinicalHistoryPatient(null);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchAppointments = async (mounted = true) => {
        try {
            const [apptRes, servRes, userRes, staffGroupsRes, serviceGroupsRes] = await Promise.all([
                apiClient.get('/Appointments'),
                apiClient.get('/Services'),
                apiClient.get('/Users'),
                apiClient.get('/StaffGroups').catch(() => ({ data: [] })),
                apiClient.get('/ServiceGroups').catch(() => ({ data: [] }))
            ]);
            
            if (mounted) {
                setAvailableServices(servRes.data.map((s: any) => ({ 
                    id: s.id, 
                    name: s.name, 
                    alias: s.alias,
                    color: s.color || '#ccc' 
                })));
                setAttendants(userRes.data.map((u: any) => ({ id: u.id, fullName: u.fullName })));
                setStaffGroups(staffGroupsRes.data || []);
                setServiceGroups(serviceGroupsRes.data || []);
                
                const data = apptRes.data;
                // Basic formatting to match what Attention view expected 
                const formatted = data.map((app: any) => ({
                    id: String(app.id),
                    patientId: String(app.patientId),
                    patient: { 
                        name: app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Unknown Patient',
                        isFirstVisit: app.patient?.isFirstVisit
                    },
                    services: app.services || [],
                    hour24: dayjs(app.appointmentDate).format('HH:mm'),
                    hour: dayjs(app.appointmentDate).format('h:mm A'),
                    date: dayjs(app.appointmentDate).format('YYYY-MM-DD'),
                    status: app.status || 'Scheduled',
                    serviceWork: app.serviceWork,
                    isGhost: app.isGhost,
                    appointmentDate: app.appointmentDate,
                    treatmentType: app.treatmentType,
                    statusUpdatedAt: app.statusUpdatedAt,
                    rawAppt: app
                }));
                setRawAppointments(formatted);
            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.error('Session expired or unauthorized. Please log in again.');
            } else {
                console.error('Failed to fetch data for Attention:', error);
            }
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
                if (isMounted) fetchAppointments(isMounted);
            });

            connection.start().catch((err: any) => {
                if (err?.message?.includes('stopped during negotiation')) {
                    return; // Ignore React 18 Strict Mode unmount aborts
                }
                if (isMounted) console.error('SignalR Connection Error in Attention:', err);
            });
        } catch (err) {
            console.error('Failed to initialize SignalR in Attention:', err);
        }

        return () => {
            isMounted = false;
            if (connection && connection.state !== 'Disconnected') connection.stop().catch(() => {});
        };
    }, []);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiClient.patch(`/Appointments/${id}/status`, { status: newStatus });
            await fetchAppointments(true);
        } catch (error) {
            console.error('Failed to update status in Attention:', error);
        }
    };

    const filteredAppointments = React.useMemo(() => {
        return rawAppointments.filter((app) => {
            if (app.isGhost) return false;
            if (app.date !== selectedDate) return false;
            
            if (searchTerm) {
                const matchesPatient = app.patient.name.toLowerCase().includes(searchTerm.toLowerCase());
                if (!matchesPatient) return false;
            }

            if (showOnlyEvaluations && app.treatmentType?.toLowerCase() !== 'evaluation') {
                return false;
            }

            if (selectedServiceIds.length > 0) {
                const hasMatchingService = app.services?.some((s: any) => selectedServiceIds.includes(s.id));
                if (!hasMatchingService) {
                    return false;
                }
            }
            
            // Staff Group filtering logic
            if (selectedGroupId !== null) {
                const group = staffGroups.find(g => g.id === selectedGroupId);
                if (group) {
                    // Check if appointment has unassigned services or assigned staff
                    const totalServicesCount = app.services?.length || 0;
                    const assignedStaffIds = new Set<number>();
                    let assignedServicesCount = 0;

                    app.serviceWork?.serviceWorkItems?.forEach((item: any) => {
                        if (item.attendantId) {
                            assignedStaffIds.add(item.attendantId);
                            assignedServicesCount++;
                        }
                    });

                    // If any service is missing an assigned staff, we keep it visible for this filter (do not return false)
                    // If all services are assigned, we hide it if NONE of the assigned staff belong to the selected group
                    if (assignedServicesCount >= totalServicesCount && assignedStaffIds.size > 0) {
                        const hasGroupMember = Array.from(assignedStaffIds).some(id => group.userIds.includes(id));
                        if (!hasGroupMember) return false;
                    }
                }
            }
            // Service Group filtering logic
            if (selectedServiceGroupId !== null) {
                const group = serviceGroups.find(g => g.id === selectedServiceGroupId);
                if (group) {
                    const hasGroupService = app.services?.some((s: any) => group.serviceIds.includes(s.id));
                    if (!hasGroupService) return false;
                }
            }
            
            // Turn filtering logic
            if (selectedTurn !== 'all' && app.hour24) {
                const parts = app.hour24.split(':');
                if (parts.length === 2) {
                    const minutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                    
                    if (selectedTurn === 'morning') {
                        // Morning: 8:00 AM (480) to 1:30 PM (810)
                        if (minutes < 480 || minutes > 810) return false;
                    } else if (selectedTurn === 'afternoon') {
                        // Afternoon: 2:30 PM (870) to 9:00 PM (1260)
                        if (minutes < 870 || minutes > 1260) return false;
                    }
                }
            }

            return true;
        });
    }, [rawAppointments, searchTerm, selectedDate, selectedServiceIds, showOnlyEvaluations, selectedGroupId, staffGroups, selectedServiceGroupId, serviceGroups, selectedTurn]);

    const staffStats = React.useMemo(() => {
        const stats: Record<number, { id: number; assigned: number; treated: number; canceled: number; absent: number; name: string; overlaps: Record<string, number> }> = {};

        attendants.forEach(a => {
            stats[a.id] = { id: a.id, assigned: 0, treated: 0, canceled: 0, absent: 0, name: a.fullName, overlaps: {} };
        });

        filteredAppointments.forEach(app => {
            const isTreated = app.status?.toLowerCase() === 'done' || app.status?.toLowerCase() === 'attended';
            const isCanceled = app.status?.toLowerCase() === 'canceled';
            const isAbsent = app.status?.toLowerCase() === 'absent';
            const hourLabel = dayjs(app.appointmentDate).format('h:mm A');
            const assignedIds = new Set<number>();
            
            app.serviceWork?.serviceWorkItems?.forEach((item: any) => {
                if (item.attendantId) assignedIds.add(item.attendantId);
            });

            assignedIds.forEach(attId => {
                if (stats[attId]) {
                    stats[attId].assigned += 1;
                    if (isTreated) stats[attId].treated += 1;
                    if (isCanceled) stats[attId].canceled += 1;
                    if (isAbsent) stats[attId].absent += 1;
                    
                    if (!stats[attId].overlaps[hourLabel]) {
                        stats[attId].overlaps[hourLabel] = 0;
                    }
                    stats[attId].overlaps[hourLabel] += 1;
                }
            });
        });

        return Object.values(stats)
            .filter(s => {
                // First filter out those with 0 assigned
                if (s.assigned === 0) return false;
                // Then filter by active group if selected
                if (selectedGroupId !== null) {
                    const group = staffGroups.find(g => g.id === selectedGroupId);
                    if (group && !group.userIds.includes(s.id)) return false;
                }
                return true;
            })
            .map(s => {
                const overloadedHours = Object.entries(s.overlaps)
                    .filter(([_, count]) => count > 2)
                    .map(([hour, _]) => hour);
                return { ...s, overloadedHours };
            })
            .sort((a,b) => b.assigned - a.assigned);
    }, [filteredAppointments, attendants, selectedGroupId, staffGroups]);

    return (
        <Stack spacing={1.5}>
            <StaffGroupsDialog
                open={isGroupsDialogOpen}
                onClose={() => setIsGroupsDialogOpen(false)}
                staffGroups={staffGroups}
                attendants={attendants}
                onGroupsUpdated={() => fetchAppointments()}
            />

            <ServiceGroupsDialog
                open={isServiceGroupsDialogOpen}
                onClose={() => setIsServiceGroupsDialogOpen(false)}
                serviceGroups={serviceGroups}
                availableServices={availableServices}
                onGroupsUpdated={() => fetchAppointments()}
            />
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    px: 0.5,
                    mb: 1
                }}
            >
                <Typography variant="h4">Attention Control Panel</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UserPlusIcon fontSize="var(--icon-fontSize-md)" />}
                    onClick={() => {
                        setSelectedPatient(null);
                        setIsPatientDialogOpen(true);
                    }}
                >
                    New Patient
                </Button>
            </Stack>

            <CustomersFilters
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                availableServices={availableServices}
                selectedServiceIds={selectedServiceIds}
                onServiceIdsChange={setSelectedServiceIds}
                showOnlyEvaluations={showOnlyEvaluations}
                onShowOnlyEvaluationsChange={setShowOnlyEvaluations}
                selectedTurn={selectedTurn}
                onTurnChange={setSelectedTurn}
                appointments={rawAppointments}
            />

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 0.5, rowGap: 1.5, width: '100%' }}>
                {staffGroups.length > 0 && (
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
                )}

                {serviceGroups.length > 0 && (
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
                )}

                <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5, flexGrow: 1, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 } }}>
                    {staffStats.map(stat => (
                        <Card 
                            key={stat.name} 
                            onClick={(e) => handleBadgeClick(e as any, stat.id)}
                            sx={{ 
                                display: 'flex', alignItems: 'center', flexShrink: 0, overflow: 'hidden', cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: 2,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            {stat.overloadedHours.length > 0 && (
                                <Tooltip title={`${stat.name} have more than 2 appointments assigned for this day at ${stat.overloadedHours.join(', ')}`} arrow placement="top">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pl: 1, color: 'warning.main', cursor: 'help' }}>
                                        <WarningCircleIcon size={20} weight="fill" />
                                    </Box>
                                </Tooltip>
                            )}

                            <Tooltip title={`${stat.name} - 🗓️ Assigned: ${stat.assigned} | ✅ Completed: ${stat.treated} | ❌ Canceled: ${stat.canceled} | 💤 Absent: ${stat.absent}`} arrow placement="top">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ 
                                        px: 1.5, py: 0.5, ml: stat.overloadedHours.length > 0 ? 1 : 0,
                                        bgcolor: stringToColor(stat.name), 
                                        color: getContrastColor(stringToColor(stat.name)), fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                    }}>
                                        {getInitials(stat.name)}
                                    </Box>
                                    <Box sx={{ px: 1.5, py: 0.5, fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                        <Typography variant="caption" color="success.main" fontWeight="bold">{stat.treated}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mx: 0.25 }}>/</Typography>
                                        <Typography variant="caption" color="text.primary" fontWeight="bold">{stat.assigned}</Typography>
                                    </Box>
                                </Box>
                            </Tooltip>
                        </Card>
                    ))}
                </Box>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setIsResumeDialogOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0, ml: 'auto' }}
                >
                    Appointments resume
                </Button>
            </Stack>

            <AppointmentsAttention
                appointments={filteredAppointments}
                attendants={selectedGroupId ? attendants.filter(a => staffGroups.find(g => g.id === selectedGroupId)?.userIds.includes(a.id)) : attendants}
                availableServices={selectedServiceGroupId ? availableServices.filter(s => serviceGroups.find(g => g.id === selectedServiceGroupId)?.serviceIds.includes(s.id)) : availableServices}
                onStatusChange={handleStatusChange}
                onRefresh={() => fetchAppointments(true)}
                onReadExpedient={handleReadExpedient}
                onReadClinicalHistory={handleReadClinicalHistory}
                onRescheduleTime={(appt: any) => {
                    setRescheduleAppt(appt.rawAppt);
                    setIsRescheduleTimeOpen(true);
                }}
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

            <ClinicalHistoryDialog
                open={Boolean(clinicalHistoryPatient)}
                onClose={() => setClinicalHistoryPatient(null)}
                loading={loadingHistory}
                patient={clinicalHistoryPatient}
                onEdit={() => {
                    if (clinicalHistoryPatient) {
                        setSelectedPatient(clinicalHistoryPatient);
                        setIsPatientDialogOpen(true);
                        setClinicalHistoryPatient(null);
                    }
                }}
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
                open={isRescheduleTimeOpen}
                onClose={() => {
                    setIsRescheduleTimeOpen(false);
                    setRescheduleAppt(null);
                }}
                onSuccess={() => fetchAppointments(true)}
                appointment={rescheduleAppt}
                timeOnly={true}
            />

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ sx: { width: { xs: '90vw', md: 550 }, p: 2, mt: 1, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
            >
                {(() => {
                    const staff = attendants.find(a => a.id === selectedStaffId);
                    if (!staff) return null;

                    const staffAppts = filteredAppointments.filter(app => {
                        return app.serviceWork?.serviceWorkItems?.some((item: any) => item.attendantId === staff.id);
                    }).map(app => {
                        const servicesAssignedToStaff = app.serviceWork?.serviceWorkItems
                            ?.filter((item: any) => item.attendantId === staff.id)
                            ?.map((item: any) => app.services?.find((s: any) => s.id === item.serviceId))
                            ?.filter(Boolean) || [];
                        
                        return {
                            id: app.id,
                            timeStr: dayjs(app.appointmentDate).format('h:mm A'),
                            timeVal: dayjs(app.appointmentDate).valueOf(),
                            patient: app.patient.name,
                            services: servicesAssignedToStaff,
                            state: app.status,
                            statusObj: statusMap[app.status.toLowerCase()]
                        };
                    }).sort((a, b) => a.timeVal - b.timeVal);

                    return <StaffPopoverContent staff={staff} staffAppts={staffAppts} handleClosePopover={handleClosePopover} />;
                })()}
            </Popover>

            <AppointmentsResumeDialog
                open={isResumeDialogOpen}
                onClose={() => setIsResumeDialogOpen(false)}
            />
        </Stack>
    );
}
