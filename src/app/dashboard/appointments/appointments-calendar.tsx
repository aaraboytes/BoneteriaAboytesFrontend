'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import dayjs from 'dayjs';
import apiClient from '@/lib/api-client';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 64;
const TIME_GUTTER_WIDTH = 56;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; main: string }> = {
    scheduled: { bg: '#e3f2fd', border: '#1976d2', text: '#1565c0', main: '#0288d1' },
    waiting: { bg: '#fff3e0', border: '#ed6c02', text: '#e65100', main: '#ed6c02' },
    in_progress: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2', main: '#9c27b0' },
    done: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', main: '#2e7d32' },
    canceled: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c', main: '#d32f2f' },
    failed: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c', main: '#d32f2f' },
    absent: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c', main: '#d32f2f' },
    pending: { bg: '#fff8e1', border: '#f9a825', text: '#f57f17', main: '#f9a825' },
    delayed: { bg: '#e3f2fd', border: '#4877c2', text: '#1565c0', main: '#4877c2' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawAppointment = Record<string, any>;

function getAppointmentColors(app: RawAppointment): { bg: string; border: string; text: string } {
    const isCanceled = app.status?.toLowerCase() === 'canceled';
    if (app.isGhost || isCanceled) {
        return { bg: '#f8fafc', border: '#94a3b8', text: '#64748b' };
    }
    const serviceColors: string[] = [];
    
    // Check services collection
    if (Array.isArray(app.services)) {
        app.services.forEach((s: any) => {
            if (s.color && !serviceColors.includes(s.color)) {
                serviceColors.push(s.color);
            }
        });
    }

    if (app.rehabilitationSession?.services && Array.isArray(app.rehabilitationSession.services)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (app.rehabilitationSession.services as any[]).forEach(s => {
            if (s.color && !serviceColors.includes(s.color)) {
                serviceColors.push(s.color as string);
            }
        });
    }

    if (serviceColors.length === 0) {
        const sc = STATUS_COLORS[app.status?.toLowerCase() as string] || STATUS_COLORS.scheduled;
        return { bg: sc.bg, border: sc.border, text: sc.text };
    }
    if (serviceColors.length === 1) {
        return { bg: serviceColors[0], border: 'rgba(0,0,0,0.2)', text: '#ffffff' };
    }
    // Gradient for multiple services
    return { bg: `linear-gradient(135deg, ${serviceColors.join(', ')})`, border: 'rgba(0,0,0,0.25)', text: '#ffffff' };
}

function getTopOffset(dateStr: string): number {
    const d = dayjs(dateStr);
    return ((d.hour() - START_HOUR) + d.minute() / 60) * HOUR_HEIGHT;
}

function getBlockHeight(startStr: string, endStr: string): number {
    const start = dayjs(startStr);
    const end = dayjs(endStr);
    if (!end.isValid() || end.year() < 1970) return HOUR_HEIGHT;
    return Math.max(end.diff(start, 'minute') / 60 * HOUR_HEIGHT, 22);
}

function formatHour(h: number): string {
    if (h === 12) return '12 PM';
    if (h === 0 || h === 24) return '12 AM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

type LaidOutAppointment = RawAppointment & { colIndex?: number; numCols?: number };

function calculateLayout(appointments: RawAppointment[]): LaidOutAppointment[] {
    const validAppointments = appointments.map(app => {
        const copy = { ...app };
        if (!copy.appointmentEndTime || !dayjs(copy.appointmentEndTime as string).isValid() || dayjs(copy.appointmentEndTime as string).year() < 1970) {
            copy.appointmentEndTime = dayjs(copy.appointmentDate as string).add(1, 'hour').toISOString();
        }
        return copy as LaidOutAppointment;
    });

    const sorted = validAppointments.sort((a, b) => {
        const startA = dayjs(a.appointmentDate as string).valueOf();
        const startB = dayjs(b.appointmentDate as string).valueOf();
        if (startA !== startB) return startA - startB;
        const endA = dayjs(a.appointmentEndTime as string).valueOf();
        const endB = dayjs(b.appointmentEndTime as string).valueOf();
        return endB - endA;
    });

    const laidOut: LaidOutAppointment[] = [];
    let currentGroup: LaidOutAppointment[] = [];
    let groupEnd = 0;

    const processGroup = (group: LaidOutAppointment[]) => {
        const columns: LaidOutAppointment[][] = [];
        for (const app of group) {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                const lastInCol = col[col.length - 1];
                if (dayjs(lastInCol.appointmentEndTime as string).valueOf() <= dayjs(app.appointmentDate as string).valueOf()) {
                    col.push(app);
                    app.colIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                app.colIndex = columns.length;
                columns.push([app]);
            }
        }
        const numCols = columns.length;
        for (const app of group) {
            app.numCols = numCols;
            laidOut.push(app);
        }
    };

    for (const rawApp of sorted) {
        const app = { ...rawApp } as LaidOutAppointment;
        const start = dayjs(app.appointmentDate as string).valueOf();
        const end = dayjs(app.appointmentEndTime as string).valueOf();

        if (currentGroup.length === 0 || start < groupEnd) {
            currentGroup.push(app);
            groupEnd = Math.max(groupEnd, end);
        } else {
            processGroup(currentGroup);
            currentGroup = [app];
            groupEnd = end;
        }
    }
    if (currentGroup.length > 0) {
        processGroup(currentGroup);
    }

    return laidOut;
}

function CustomDay(props: PickersDayProps & { appointments?: Record<string, unknown>[], day: dayjs.Dayjs }) {
    const { appointments, day, outsideCurrentMonth, ...other } = props;

    const apptsThisDay = appointments?.filter((app: Record<string, unknown>) => {
        if (!app.appointmentDate) return false;
        return dayjs(app.appointmentDate as string).format('YYYY-MM-DD') === day.format('YYYY-MM-DD');
    }) || [];

    const count = apptsThisDay.length;

    return (
        <Badge
            key={day.toString()}
            overlap="circular"
            badgeContent={count > 0 ? count : undefined}
            color="primary"
            sx={{
                '& .MuiBadge-badge': {
                    right: 4,
                    top: 4,
                    fontSize: '0.6rem',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                }
            }}
        >
            <PickersDay {...other} day={day} outsideCurrentMonth={outsideCurrentMonth} />
        </Badge>
    );
}

function RealTimeClock() {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {dayjs(time).format('hh:mm:ss A')}
        </Typography>
    );
}

export function AppointmentCalendar({ 
    events, 
    viewMode = 'weekly', 
    selectedDate, 
    onDateChange,
    onStatusChange,
    rawAppointments = []
}: { 
    events?: RawAppointment[], 
    viewMode?: 'daily' | 'weekly' | 'monthly', 
    selectedDate?: string, 
    onDateChange?: (date: string) => void,
    onStatusChange?: (id: string, newStatus: string) => void,
    rawAppointments?: RawAppointment[]
}): React.JSX.Element {
    const [fetchedAppointments, setFetchedAppointments] = React.useState<RawAppointment[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const [statusMenuAnchorEl, setStatusMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [selectedMenuApp, setSelectedMenuApp] = React.useState<RawAppointment | null>(null);

    const getAppStringId = (app: RawAppointment) => {
        if (app.id === 0) {
            const listToSearch = events !== undefined ? (rawAppointments || []) : fetchedAppointments;
            const idx = listToSearch.findIndex((r) => r === app);
            return `virtual-0-${idx >= 0 ? idx : 0}`;
        }
        return String(app.id);
    };

    const handleStatusMenuClick = (event: React.MouseEvent, app: RawAppointment) => {
        event.stopPropagation();
        event.preventDefault();
        if (app.isGhost) return;
        setStatusMenuAnchorEl(event.currentTarget as HTMLElement);
        setSelectedMenuApp(app);
    };

    const handleStatusMenuClose = () => {
        setStatusMenuAnchorEl(null);
        setSelectedMenuApp(null);
    };

    const handleStatusSelect = (newStatus: string) => {
        if (selectedMenuApp && onStatusChange) {
            const appStringId = getAppStringId(selectedMenuApp);
            onStatusChange(appStringId, newStatus);
        }
        handleStatusMenuClose();
    };

    React.useEffect(() => {
        if (viewMode === 'monthly' || !scrollRef.current) return;

        const timer = setTimeout(() => {
            if (scrollRef.current) {
                const currentHour = dayjs().hour();
                const currentMinute = dayjs().minute();
                const timeFraction = currentHour + (currentMinute / 60);

                const targetOffset = Math.max(0, (timeFraction - START_HOUR) * HOUR_HEIGHT);
                const containerHeight = scrollRef.current.clientHeight || 580;

                const targetScrollTop = Math.max(0, targetOffset - (containerHeight / 2));
                scrollRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [viewMode, selectedDate]);

    const appointments = events !== undefined ? events : fetchedAppointments;

    const weekDays = React.useMemo(() => {
        let baseDate = selectedDate ? dayjs(selectedDate).startOf('day') : dayjs().startOf('day');
        if (!baseDate.isValid()) {
            baseDate = dayjs().startOf('day');
        }
        if (viewMode === 'daily') {
            return [baseDate];
        } else if (viewMode === 'weekly') {
            let start = baseDate;
            while (start.day() !== 1) { // 1 is Monday
                start = start.subtract(1, 'day');
            }
            return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
        } else {
            // monthly view: start on the Monday of the first week of the month
            let start = baseDate.startOf('month');
            while (start.day() !== 1) { // 1 is Monday
                start = start.subtract(1, 'day');
            }
            const end = baseDate.endOf('month');
            let current = start;
            const days = [];
            while (current.isBefore(end) || current.day() !== 1) { // until we hit the next Monday after the month ends
                days.push(current);
                current = current.add(1, 'day');
            }
            return days;
        }
    }, [selectedDate, viewMode]);

    const hours = React.useMemo(
        () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
        []
    );

    // Fetch appointments for the visible date range whenever weekDays change
    React.useEffect(() => {
        if (events !== undefined) return;

        let active = true;
        setLoading(true);

        const startDay = weekDays[0] && weekDays[0].isValid() ? weekDays[0] : dayjs().startOf('day');
        const endDay = weekDays[weekDays.length - 1] && weekDays[weekDays.length - 1].isValid() ? weekDays[weekDays.length - 1] : dayjs().endOf('day');

        const start = startDay.toISOString();
        const end = endDay.endOf('day').toISOString();

        // Use correct parameter names: rangeStart and rangeEnd (matched with backend AppointmentsController.cs)
        apiClient
            .get(`/Appointments?rangeStart=${encodeURIComponent(start)}&rangeEnd=${encodeURIComponent(end)}`)
            .then((res) => { if (active) setFetchedAppointments(res.data); })
            .catch((err) => console.error('Failed to fetch calendar appointments', err))
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        weekDays[0] && weekDays[0].isValid() ? weekDays[0].toISOString() : '',
        weekDays[weekDays.length - 1] && weekDays[weekDays.length - 1].isValid() ? weekDays[weekDays.length - 1].toISOString() : '',
        events
    ]);

    // Group by day column
    const { layoutMap, map } = React.useMemo(() => {
        const mapObj: Record<number, RawAppointment[]> = {};
        for (let i = 0; i < weekDays.length; i++) {
            mapObj[i] = [];
        }

        appointments.forEach((app) => {
            const idx = weekDays.findIndex((d) => d.isSame(dayjs(app.appointmentDate as string), 'day'));
            if (idx >= 0) mapObj[idx].push(app);
        });

        const lMap: Record<number, LaidOutAppointment[]> = {};
        for (let i = 0; i < weekDays.length; i++) {
            lMap[i] = calculateLayout(mapObj[i]);
        }
        return { layoutMap: lMap, map: mapObj };
    }, [appointments, weekDays]);

    const handleDragStart = (e: React.DragEvent, app: RawAppointment) => {
        if (app.isGhost) {
            e.preventDefault();
            return;
        }

        setIsDragging(true);

        // Calculate offset within the appointment block to maintain relative cursor position
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        e.dataTransfer.setData('grabOffset', String(offsetY));

        e.dataTransfer.setData('appointmentId', String(app.id));
        e.dataTransfer.setData('isVirtual', String(app.id === 0));
        if (app.id === 0) {
            e.dataTransfer.setData('originalDate', String(app.appointmentDate));
        }
        // Store full app in hidden data to simplify drop
        e.dataTransfer.setData('fullApp', JSON.stringify(app));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetDay: dayjs.Dayjs, isTimeGrid = false) => {
        e.preventDefault();
        const fullAppStr = e.dataTransfer.getData('fullApp');
        if (!fullAppStr) return;

        try {
            const app = JSON.parse(fullAppStr);
            const originalStart = dayjs(app.appointmentDate);
            const originalEnd = dayjs(app.appointmentEndTime);
            const diffMinutes = originalEnd.isValid() ? originalEnd.diff(originalStart, 'minute') : 60;

            let newStart;
            if (isTimeGrid) {
                const rect = e.currentTarget.getBoundingClientRect();
                const grabOffset = Number(e.dataTransfer.getData('grabOffset') || 0);
                
                // Subtract the grabOffset so the appointment's TOP aligns correctly
                const y = (e.clientY - rect.top) - grabOffset;
                
                const hourFraction = y / HOUR_HEIGHT;
                const totalMinutes = hourFraction * 60;
                const snappedMinutes = Math.round(totalMinutes / 15) * 15; // 15-min snap for better precision
                
                const finalHour = START_HOUR + Math.floor(snappedMinutes / 60);
                const finalMin = snappedMinutes % 60;
                
                newStart = targetDay.hour(finalHour).minute(finalMin).second(0).millisecond(0);
            } else {
                newStart = targetDay.hour(originalStart.hour()).minute(originalStart.minute()).second(0).millisecond(0);
            }

            const newEnd = newStart.add(diffMinutes, 'minute');

            const updatedApp = {
                ...app,
                appointmentDate: newStart.toISOString(),
                appointmentEndTime: newEnd.toISOString(),
                // If it was a virtual occurrence, we need to treat it as a new override
                originalScheduledDate: app.id === 0 ? app.appointmentDate : app.originalScheduledDate
            };

            // Remove internal layout props and navigation objects to avoid backend validation errors
            // (Navigation properties like 'patient' often fail model validation if they aren't complete)
            const cleanApp = { ...updatedApp };
            delete (cleanApp as any).colIndex;
            delete (cleanApp as any).numCols;
            delete (cleanApp as any).patient;
            delete (cleanApp as any).user;
            delete (cleanApp as any).equipment;
            delete (cleanApp as any).rehabilitationSession;
            delete (cleanApp as any).serviceWork;
            delete (cleanApp as any).recurrenceRule;
            
            // Preserve services by sending only their IDs
            if (Array.isArray((updatedApp as any).services)) {
                (cleanApp as any).services = (updatedApp as any).services.map((s: any) => ({ id: s.id }));
            }

            // Also lowercase keys to be safe (if not already handled)
            const payload = { ...cleanApp };
            // Ensure ID is correct (can be string or number)
            const numericId = typeof app.id === 'string' ? parseInt(app.id) : app.id;
            const finalId = numericId === 0 ? 0 : numericId;

            await apiClient.put(`/Appointments/${finalId}`, payload);
            // Refresh will happen via SignalR or parent refresh
        } catch (err) {
            console.error('Failed to reschedule appointment via drag and drop', err);
            window.alert('Failed to reschedule. Please try again.');
        }
    };

    const today = dayjs();

    const handlePrev = () => {
        let baseDate = selectedDate ? dayjs(selectedDate) : dayjs();
        if (!baseDate.isValid()) {
            baseDate = dayjs();
        }
        let newDate = baseDate;
        if (viewMode === 'monthly') newDate = baseDate.subtract(1, 'month');
        else newDate = baseDate.subtract(viewMode === 'daily' ? 1 : 7, 'day');

        onDateChange?.(newDate.format('YYYY-MM-DD'));
    };

    const handleNext = () => {
        let baseDate = selectedDate ? dayjs(selectedDate) : dayjs();
        if (!baseDate.isValid()) {
            baseDate = dayjs();
        }
        let newDate = baseDate;
        if (viewMode === 'monthly') newDate = baseDate.add(1, 'month');
        else newDate = baseDate.add(viewMode === 'daily' ? 1 : 7, 'day');

        onDateChange?.(newDate.format('YYYY-MM-DD'));
    };

    return (
        <Box>
            {/* Navigation header */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onDateChange?.(dayjs().format('YYYY-MM-DD'))}
                >
                    Today
                </Button>
                <Stack direction="row" sx={{ alignItems: 'center' }}>
                    <IconButton size="small" onClick={handlePrev}>
                        <CaretLeftIcon />
                    </IconButton>
                    {viewMode === 'daily' ? (
                        <Stack sx={{ alignItems: 'center', mx: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', fontSize: '0.65rem', lineHeight: 1 }}>
                              {selectedDate && dayjs(selectedDate).isValid() ? dayjs(selectedDate).format('dddd') : '-'}
                            </Typography>
                            <RealTimeClock />
                            <Box sx={{ maxWidth: '160px', mt: 0.5 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        format="DD/MM/YYYY"
                                        value={selectedDate && dayjs(selectedDate).isValid() ? dayjs(selectedDate) : null}
                                        onChange={(newValue) => {
                                            if (newValue && newValue.isValid() && onDateChange) {
                                                onDateChange(newValue.format('YYYY-MM-DD'));
                                            }
                                        }}
                                        slots={{ day: CustomDay }}
                                        slotProps={{
                                            day: { appointments } as any,
                                            textField: { size: 'small' }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Box>
                        </Stack>
                    ) : (
                        <Typography variant="h6" sx={{ fontWeight: 500, mx: 1 }}>
                            {viewMode === 'monthly'
                                ? dayjs(selectedDate || dayjs()).format('MMMM YYYY')
                                : `${weekDays[0].format('MMM D')} – ${weekDays[weekDays.length - 1].format('MMM D, YYYY')}`}
                        </Typography>
                    )}
                    <IconButton size="small" onClick={handleNext}>
                        <CaretRightIcon />
                    </IconButton>
                </Stack>
                {loading && <CircularProgress size={18} />}
            </Stack>

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                {viewMode === 'monthly' ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', width: '100%' }}>
                        {/* Monthly Day Headers */}
                        {Array.from({ length: 7 }).map((_, i) => {
                            // Mon (1) to Sun (0)
                            const dayNum = i === 6 ? 0 : i + 1;
                            return (
                                <Box key={`m-head-${i}`} sx={{ p: 1, borderBottom: '1px solid', borderRight: i < 6 ? '1px solid' : 'none', borderColor: 'divider', textAlign: 'center', bgcolor: 'background.paper', overflow: 'hidden' }}>
                                    <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ fontSize: { xs: '0.65rem', sm: 'inherit' } }}>
                                        {DAY_LABELS[dayNum]}
                                    </Typography>
                                </Box>
                            );
                        })}
                        {/* Monthly Day Cells */}
                        {weekDays.map((day, idx) => {
                            const isToday = day.isSame(today, 'day');
                            const baseDateForMonth = selectedDate ? dayjs(selectedDate) : dayjs();
                            const isCurrentMonth = day.isSame(baseDateForMonth, 'month');
                            const dayAppointments = map[idx] || [];
                            return (
                                <Box 
                                    key={`m-cell-${idx}`} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day)}
                                    sx={{
                                        borderRight: (idx + 1) % 7 !== 0 ? '1px solid' : 'none',
                                        borderBottom: idx < weekDays.length - 7 ? '1px solid' : 'none',
                                        borderColor: 'divider',
                                        minHeight: 120,
                                        p: 0.5,
                                        bgcolor: isToday ? 'primary.50' : 'background.paper',
                                        opacity: isCurrentMonth ? 1 : 0.5,
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, px: 0.5 }}>
                                        <Typography variant="body2" fontWeight={isToday ? 700 : 400} color={isToday ? 'primary.main' : 'text.primary'}>
                                            {day.date()}
                                        </Typography>
                                        {dayAppointments.length > 0 && (
                                            <Typography variant="caption" color="text.secondary">
                                                {dayAppointments.length}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Stack spacing={0.5}>
                                        {dayAppointments.slice(0, 4).map((app, appIdx) => {
                                            const colors = getAppointmentColors(app);
                                            const patientName = app.patient
                                                ? `${(app.patient.firstName as string) ?? ''} ${(app.patient.lastName as string) ?? ''}`.trim()
                                                : 'Unknown';
                                            const serviceNames = new Set<string>();
                                            let subtitle = ''; 
                                            let treatment = ''; 

                                            // 1. Direct multiple services
                                            if (Array.isArray(app.services)) {
                                                app.services.forEach((s: any) => {
                                                    if (s.name) serviceNames.add(s.name as string);
                                                });
                                            }

                                            // 2. Rehab session services
                                            if (app.rehabilitationSession?.services) {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                (app.rehabilitationSession.services as any[]).forEach(s => {
                                                    if (s.name) serviceNames.add(s.name as string);
                                                });
                                            }

                                            if (serviceNames.size > 0) {
                                                treatment = Array.from(serviceNames).join(', ');
                                                subtitle = treatment;
                                            }

                                            if (!subtitle || subtitle === 'TBD') {
                                                subtitle = (app.treatmentType as string) || (app.equipment?.name as string) || '';
                                            }
                                            if (subtitle === 'TBD') subtitle = '';
                                            
                                            return (
                                                <Tooltip
                                                    key={appIdx}
                                                    placement="right"
                                                    title={isDragging ? "" : (
                                                        <Stack spacing={0.25}>
                                                            <Typography variant="caption" fontWeight={700}>{patientName}</Typography>
                                                            <Typography variant="caption">{dayjs(app.appointmentDate as string).format('HH:mm')}</Typography>
                                                            {subtitle && <Typography variant="caption">{subtitle}</Typography>}
                                                            <Typography variant="caption" sx={{ textTransform: 'capitalize', opacity: 0.8 }}>
                                                                {app.status as string}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                >
                                                    <Box 
                                                        draggable={!app.isGhost}
                                                        onDragStart={(e) => handleDragStart(e, app)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={onStatusChange && !app.isGhost ? (e) => handleStatusMenuClick(e, app) : undefined}
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                            p: 0.5,
                                                            borderRadius: 1,
                                                            background: colors.bg,
                                                            color: colors.text,
                                                            borderLeft: `2px solid ${colors.border}`,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            cursor: app.isGhost ? 'default' : 'pointer',
                                                            opacity: (app.isGhost || app.status?.toLowerCase() === 'canceled') ? 0.7 : 1,
                                                            filter: app.status?.toLowerCase() === 'canceled' ? 'grayscale(0.5)' : 'none',
                                                            '&:active': { cursor: app.isGhost ? 'default' : 'grabbing' }
                                                        }}
                                                    >
                                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                                            <Typography variant="inherit" fontWeight="bold">
                                                                {dayjs(app.appointmentDate as string).format('HH:mm')}
                                                            </Typography>
                                                            <Typography variant="inherit" noWrap sx={{ fontWeight: app.isGhost ? 400 : 700, flexGrow: 1 }}>
                                                                {patientName}
                                                            </Typography>
                                                            {!app.isGhost && (
                                                                <Box sx={{ 
                                                                    px: 0.5, 
                                                                    py: 0, 
                                                                    borderRadius: '4px', 
                                                                    bgcolor: STATUS_COLORS[app.status?.toLowerCase() as string]?.main || '#ccc', 
                                                                    color: '#fff',
                                                                    fontSize: '0.55rem',
                                                                    fontWeight: 700,
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {(app.status as string)?.substring(0, 3)}
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                        {app.isGhost ? (
                                                            <Typography variant="inherit" sx={{ fontSize: '0.55rem', fontWeight: 700, fontStyle: 'italic' }}>
                                                                Moved to: {dayjs(app.rescheduledTo as string).format('MMM D, HH:mm')}
                                                            </Typography>
                                                        ) : (
                                                            subtitle && (
                                                                <Typography variant="inherit" sx={{ opacity: 0.9, fontSize: '0.6rem' }}>
                                                                    {subtitle}
                                                                </Typography>
                                                            )
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            );
                                        })}
                                        {dayAppointments.length > 4 && (
                                            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, fontSize: '0.65rem' }}>
                                                +{dayAppointments.length - 4} more
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>
                            );

                        })}
                    </Box>
                ) : (
                    <>
                        {/* Day header row */}
                        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
                            <Box sx={{ width: TIME_GUTTER_WIDTH, flexShrink: 0 }} />
                            {weekDays.map((day, i) => {
                                const isToday = day.isSame(today, 'day');
                                return (
                                    <Box
                                        key={i}
                                        sx={{
                                            flex: 1,
                                            textAlign: 'center',
                                            py: 1,
                                            borderLeft: '1px solid',
                                            borderColor: 'divider',
                                            backgroundColor: isToday ? 'primary.50' : 'inherit',
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {DAY_LABELS[day.day()]}
                                        </Typography>
                                        <Box
                                            sx={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: '50%',
                                                bgcolor: isToday ? 'primary.main' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mx: 'auto',
                                                mt: 0.25,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                fontWeight={isToday ? 700 : 400}
                                                color={isToday ? 'primary.contrastText' : 'text.primary'}
                                            >
                                                {day.date()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Scrollable time grid */}
                        <Box ref={scrollRef} sx={{ overflowY: 'auto', maxHeight: 580 }}>
                            <Box sx={{ display: 'flex', position: 'relative', minHeight: GRID_HEIGHT }}>
                                {/* Time gutter */}
                                <Box sx={{ width: TIME_GUTTER_WIDTH, flexShrink: 0 }}>
                                    {hours.map((hour) => (
                                        <Box
                                            key={hour}
                                            sx={{
                                                height: HOUR_HEIGHT,
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'flex-end',
                                                pr: 1,
                                                pt: '3px',
                                            }}
                                        >
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                                                {formatHour(hour)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Day columns */}
                                {weekDays.map((_, dayIdx) => (
                                    <Box
                                        key={dayIdx}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, weekDays[dayIdx], true)}
                                        sx={{
                                            flex: 1,
                                            position: 'relative',
                                            borderLeft: '1px solid',
                                            borderColor: 'divider',
                                            height: GRID_HEIGHT,
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        {/* Hour lines */}
                                        {hours.map((hour) => (
                                            <Box
                                                key={hour}
                                                sx={{
                                                    position: 'absolute',
                                                    top: (hour - START_HOUR) * HOUR_HEIGHT,
                                                    left: 0, right: 0,
                                                    borderTop: '1px solid',
                                                    borderColor: 'divider',
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                        ))}

                                        {/* Half-hour lines */}
                                        {hours.map((hour) => (
                                            <Box
                                                key={`h-${hour}`}
                                                sx={{
                                                    position: 'absolute',
                                                    top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                                                    left: 0, right: 0,
                                                    borderTop: '1px dashed',
                                                    borderColor: 'divider',
                                                    opacity: 0.5,
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                        ))}

                                        {/* Appointment blocks */}
                                        {(layoutMap[dayIdx] ?? []).map((app, apIdx) => {
                                            const top = getTopOffset(app.appointmentDate as string);
                                            const height = getBlockHeight(app.appointmentDate as string, app.appointmentEndTime as string);
                                            // Clamp to visible range
                                            const clampedTop = Math.max(top, 0);
                                            const clampedHeight = Math.min(height - (clampedTop - top), GRID_HEIGHT - clampedTop);
                                            if (top >= GRID_HEIGHT || top + height <= 0) return null;

                                            const colors = getAppointmentColors(app);
                                            const patientName = app.patient
                                                ? `${(app.patient.firstName as string) ?? ''} ${(app.patient.lastName as string) ?? ''}`.trim()
                                                : 'Unknown';
                                            const timeLabel = `${dayjs(app.appointmentDate as string).format('HH:mm')} – ${dayjs(app.appointmentEndTime as string).format('HH:mm')}`;
                                            const serviceNames = new Set<string>();
                                            let treatment = '';
                                            
                                            // 1. Direct multiple services
                                            if (Array.isArray(app.services)) {
                                                app.services.forEach((s: any) => {
                                                    if (s.name) serviceNames.add(s.name as string);
                                                });
                                            }

                                            // 2. Rehab session services
                                            if (app.rehabilitationSession?.services && Array.isArray(app.rehabilitationSession.services)) {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                (app.rehabilitationSession.services as any[]).forEach(s => {
                                                    if (s.name) serviceNames.add(s.name as string);
                                                });
                                            }

                                            if (serviceNames.size > 0) {
                                                treatment = Array.from(serviceNames).join(', ');
                                            }

                                            if (!treatment || treatment === 'TBD') {
                                                treatment = (app.treatmentType as string) || (app.equipment?.name as string) || '';
                                            }
                                            if (treatment === 'TBD') treatment = '';

                                            const colIndex = (app as LaidOutAppointment).colIndex ?? 0;
                                            const numCols = (app as LaidOutAppointment).numCols ?? 1;
                                            const widthPercent = 100 / numCols;
                                            const leftPercent = colIndex * widthPercent;

                                            return (
                                                <Tooltip
                                                    key={apIdx}
                                                    placement="right"
                                                    title={isDragging ? "" : (
                                                        <Stack spacing={0.25}>
                                                            <Typography variant="caption" fontWeight={700}>{patientName}</Typography>
                                                            <Typography variant="caption">{timeLabel}</Typography>
                                                            {treatment && <Typography variant="caption">{treatment}</Typography>}
                                                            {app.user?.fullName && (
                                                                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                                                    {app.user.fullName as string}
                                                                </Typography>
                                                            )}
                                                            <Typography variant="caption" sx={{ textTransform: 'capitalize', opacity: 0.8 }}>
                                                                {app.status as string}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                >
                                                    <Box
                                                        draggable={!app.isGhost}
                                                        onDragStart={(e) => handleDragStart(e, app)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={onStatusChange && !app.isGhost ? (e) => handleStatusMenuClick(e, app) : undefined}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: clampedTop + 1,
                                                            left: `calc(${leftPercent}% + 2px)`,
                                                            width: `calc(${widthPercent}% - 4px)`,
                                                            height: Math.max(clampedHeight - 2, 20),
                                                            borderRadius: '4px',
                                                            background: colors.bg,
                                                            borderLeft: `3px solid ${colors.border}`,
                                                            px: 0.75,
                                                            py: 0.25,
                                                            overflow: 'hidden',
                                                            cursor: app.isGhost ? 'default' : 'pointer',
                                                            zIndex: 1,
                                                            opacity: (app.isGhost || app.status?.toLowerCase() === 'canceled') ? 0.7 : 1,
                                                            filter: app.status?.toLowerCase() === 'canceled' ? 'grayscale(0.5)' : 'none',
                                                            transition: 'filter 0.1s',
                                                            '&:hover': { filter: 'brightness(0.93)', zIndex: 2 },
                                                            '&:active': { cursor: app.isGhost ? 'default' : 'grabbing' }
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={600}
                                                            color={colors.text}
                                                            display="block"
                                                            noWrap
                                                            sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
                                                        >
                                                            {patientName}
                                                        </Typography>
                                                        {app.isGhost ? (
                                                             <Typography
                                                                variant="caption"
                                                                sx={{ display: 'block', fontSize: '0.6rem', fontStyle: 'italic', fontWeight: 600, color: colors.text }}
                                                            >
                                                                Rescheduled to: {dayjs(app.rescheduledTo as string).format('MMM D, HH:mm')}
                                                            </Typography>
                                                        ) : (
                                                            height > 34 && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color={colors.text}
                                                                    display="block"
                                                                    noWrap
                                                                    sx={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: 1.2 }}
                                                                >
                                                                    {timeLabel}
                                                                </Typography>
                                                            )
                                                        )}
                                                        {height > 54 && treatment && (
                                                            <Typography
                                                                variant="caption"
                                                                color={colors.text}
                                                                display="block"
                                                                noWrap
                                                                sx={{ fontSize: '0.65rem', opacity: 0.7, lineHeight: 1.2 }}
                                                            >
                                                                {treatment}
                                                            </Typography>
                                                        )}
                                                        {height > 40 && !app.isGhost && (
                                                            <Box sx={{ 
                                                                display: 'inline-block',
                                                                mt: 0.5,
                                                                px: 0.75, 
                                                                py: 0, 
                                                                borderRadius: '4px', 
                                                                bgcolor: STATUS_COLORS[app.status?.toLowerCase() as string]?.main || 'rgba(0,0,0,0.2)', 
                                                                color: '#fff',
                                                                fontSize: '0.55rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                            }}>
                                                                {app.status as string}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </>
                )}
            </Paper>
            <Menu
                anchorEl={statusMenuAnchorEl}
                open={Boolean(statusMenuAnchorEl)}
                onClose={handleStatusMenuClose}
                onClick={(e) => e.stopPropagation()}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Change Status
                    </Typography>
                </Box>
                <Divider />
                {Object.entries(STATUS_COLORS).map(([statusKey, colors]) => {
                    const displayStatus = statusKey.toLowerCase();
                    const isSelectable = ['scheduled', 'waiting', 'in_progress', 'done', 'canceled', 'absent'].includes(displayStatus);
                    if (!isSelectable) return null;

                    const label = displayStatus === 'in_progress' ? 'In Progress' : displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);

                    return (
                        <MenuItem 
                            key={statusKey} 
                            onClick={() => handleStatusSelect(displayStatus)}
                            selected={selectedMenuApp?.status?.toLowerCase() === displayStatus}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ 
                                    width: 12, 
                                    height: 12, 
                                    borderRadius: '50%', 
                                    bgcolor: colors.main 
                                }} />
                                <Typography variant="body2">{label}</Typography>
                            </Box>
                        </MenuItem>
                    );
                })}
            </Menu>
        </Box>
    );
}
