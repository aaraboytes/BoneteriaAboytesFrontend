import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { HandWaving as HandWavingIcon } from '@phosphor-icons/react/dist/ssr/HandWaving';
import { FolderUser as FolderUserIcon } from '@phosphor-icons/react/dist/ssr/FolderUser';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { PaperPlaneRight as PaperPlaneIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneRight';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUp as CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { ChatTeardropText as ChatIcon } from '@phosphor-icons/react/dist/ssr/ChatTeardropText';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import Badge from '@mui/material/Badge';
import { useTheme, keyframes } from '@mui/material/styles';

const blinkAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
`;
import useMediaQuery from '@mui/material/useMediaQuery';
import dayjs from 'dayjs';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';

import { ServiceWorkDialog } from './service-work-dialog';
import { ReplaceServicesDialog } from './replace-services-dialog';
import apiClient from '@/lib/api-client';

export interface Service {
    id: number;
    name: string;
    alias?: string;
    color: string;
}

export interface ServiceWorkItem {
    id: number;
    serviceId: number;
    attendantId?: number | null;
    service?: Service;
    attendant?: { id: number; fullName: string };
}

export interface AppointmentAttentionData {
    id: string;
    patientId: string;
    patient: { name: string; isFirstVisit?: boolean };
    services: Service[];
    hour: string;
    hour24: string;
    date: string;
    status: string;
    serviceWork?: {
        id: number;
        serviceWorkItems: ServiceWorkItem[];
        notes?: string;
    };
    statusUpdatedAt?: string;
}

export const statusMap: Record<string, { label: string; color: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default'; hex?: string }> = {
    scheduled: { label: 'Scheduled', color: 'info' },
    waiting: { label: 'Waiting', color: 'warning' },
    in_progress: { label: 'In Progress', color: 'primary' },
    done: { label: 'Done', color: 'success' },
    ghost: { label: 'Rescheduled', color: 'default' },
    delayed: { label: 'Delayed', color: 'info', hex: '#4877c2' },
    absent: { label: 'Absent', color: 'error' },
    canceled: { label: 'Canceled', color: 'error' }
};

function getInitials(name?: string) {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function stringToColor(string: string) {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
        hash = (string.codePointAt(i) ?? 0) + ((hash << 5) - hash);
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

function AttentionCard({
    appt,
    attendants,
    availableServices,
    onStatusChange,
    onNotesSave,
    onAttendantChange,
    onAppointmentClick,
    onServiceChipClick,
    onReadExpedient,
    onReadClinicalHistory,
    onReplaceServices,
    onRescheduleTime,
    waitingOrder
}: {
    appt: AppointmentAttentionData;
    attendants: { id: number; fullName: string }[];
    availableServices: { id: number; name: string; alias?: string; color: string }[];
    onStatusChange?: (id: string, newStatus: string) => void;
    onNotesSave?: (id: string, notes: string) => void;
    onAttendantChange?: (appointmentId: string, serviceId: number, attendantId: number | null) => void;
    onAppointmentClick?: (appt: AppointmentAttentionData) => void;
    onServiceChipClick?: (appt: AppointmentAttentionData, service: Service) => void;
    onReadExpedient?: (patientId: string) => void;
    onReadClinicalHistory?: (patientId: string) => void;
    onReplaceServices?: (appt: AppointmentAttentionData) => void;
    onRescheduleTime?: (appt: AppointmentAttentionData) => void;
    waitingOrder?: number;
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isCanceled = appt.status.toLowerCase() === 'canceled';

    const assignedAttendants = React.useMemo(() => {
        const ids = new Set<number>();
        appt.serviceWork?.serviceWorkItems?.forEach((item: any) => {
            if (item.attendantId) {
                ids.add(item.attendantId);
            }
        });
        return Array.from(ids)
            .map(id => attendants.find(a => a.id === id))
            .filter(Boolean) as { id: number; fullName: string }[];
    }, [appt.serviceWork?.serviceWorkItems, attendants]);

    const rawNotes = appt.serviceWork?.notes || '';
    const initialComments = React.useMemo(() => {
        try {
            const parsed = JSON.parse(rawNotes);
            if (Array.isArray(parsed)) return parsed;
            return rawNotes ? [{ text: rawNotes, color: '#546e7a', time: new Date().toISOString() }] : [];
        } catch {
            return rawNotes ? [{ text: rawNotes, color: '#546e7a', time: new Date().toISOString() }] : [];
        }
    }, [rawNotes]);

    const [isCollapsed, setIsCollapsed] = React.useState(true);

    // Auto-collapse if canceled
    React.useEffect(() => {
        if (isCanceled) setIsCollapsed(true);
    }, [isCanceled]);

    const [comments, setComments] = React.useState<Array<{ text: string, color: string, time: string }>>(initialComments);

    const [newComment, setNewComment] = React.useState('');
    const [selectedColor, setSelectedColor] = React.useState('#1976d2');
    const [isSaving, setIsSaving] = React.useState(false);
    const [editingCommentIndex, setEditingCommentIndex] = React.useState<number | null>(null);
    const [editCommentText, setEditCommentText] = React.useState('');
    const [currentTime, setCurrentTime] = React.useState(dayjs());
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const interval = setInterval(() => setCurrentTime(dayjs()), 60000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        try {
            const parsed = JSON.parse(appt.serviceWork?.notes || '[]');
            if (Array.isArray(parsed)) setComments(parsed);
        } catch {
            if (appt.serviceWork?.notes) {
                setComments([{ text: appt.serviceWork.notes, color: '#546e7a', time: new Date().toISOString() }]);
            } else {
                setComments([]);
            }
        }
    }, [appt.serviceWork?.notes]);

    const handleSendComment = async () => {
        if (!newComment.trim() || isSaving) return;

        setIsSaving(true);
        const newArr = [...comments, { text: newComment.trim(), color: selectedColor, time: new Date().toISOString() }];
        setComments(newArr);
        setNewComment('');

        if (onNotesSave) {
            await onNotesSave(appt.id, JSON.stringify(newArr));
        }
        setIsSaving(false);
    };

    const handleSaveEdit = async (index: number) => {
        if (!editCommentText.trim() || isSaving) return;
        setIsSaving(true);
        const newArr = [...comments];
        newArr[index] = { ...newArr[index], text: editCommentText.trim(), time: new Date().toISOString() };
        setComments(newArr);
        setEditingCommentIndex(null);
        if (onNotesSave) {
            await onNotesSave(appt.id, JSON.stringify(newArr));
        }
        setIsSaving(false);
    };

    const handleDeleteComment = async (index: number) => {
        if (isSaving) return;
        setIsSaving(true);
        const newArr = comments.filter((_, i) => i !== index);
        setComments(newArr);
        if (onNotesSave) {
            await onNotesSave(appt.id, JSON.stringify(newArr));
        }
        setIsSaving(false);
    };

    const delayMinutes = React.useMemo(() => {
        if (appt.status.toLowerCase() !== 'delayed') return 0;
        const appDt = dayjs(appt.date + 'T' + appt.hour24);
        return currentTime.diff(appDt, 'minute');
    }, [appt, currentTime]);

    const serviceColors = appt.services?.map(s => s.color).filter(Boolean) || [];
    const colorIndicator = serviceColors.length > 1
        ? `linear-gradient(180deg, ${serviceColors.join(', ')})`
        : (serviceColors[0] || '#ccc');

    return (
        <Card sx={{
            mb: 1,
            overflow: 'hidden',
            position: 'relative',
            opacity: isCanceled ? 0.6 : 1,
            filter: isCanceled ? 'grayscale(0.5)' : 'none',
            transition: 'all 0.3s ease',
            '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '6px',
                background: colorIndicator,
                zIndex: 1
            }
        }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                height: (isCanceled || isCollapsed) ? 'auto' : 'initial'
            }}>
                {/* Left Side: Info & Services */}
                <Box sx={{
                    p: (isCanceled || isCollapsed) ? 1 : 1.5,
                    borderRight: (!isCanceled && !isCollapsed) ? { md: '1px solid' } : 'none',
                    borderColor: 'divider',
                    flex: (isCanceled || isCollapsed) ? 1 : ({ xs: 1, md: 2 })
                }}>
                    <Stack spacing={(isCanceled || isCollapsed) ? 0.5 : 1} sx={{ height: '100%' }}>

                        {/* Header: Patient & Status & Collapse Toggle */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                flexWrap: { xs: 'wrap', md: 'nowrap' },
                                width: { md: 350, lg: 400 },
                                flexShrink: 0,
                                minWidth: 0
                            }}>
                                <Select
                                    value={appt.status.toLowerCase()}
                                    onChange={(e) => onStatusChange?.(appt.id, e.target.value)}
                                    size="small"
                                    disabled={false}
                                    sx={{
                                        boxShadow: 'none',
                                        '.MuiOutlinedInput-notchedOutline': { border: 0 },
                                        '& .MuiSelect-select': { padding: 0 }
                                    }}
                                    renderValue={(selected) => (
                                        <Chip
                                            sx={{
                                                bgcolor: statusMap[selected]?.hex || undefined,
                                                color: statusMap[selected]?.hex ? '#fff' : 'inherit',
                                                cursor: 'pointer',
                                                height: (isCanceled || isCollapsed) ? 24 : 32,
                                                fontSize: (isCanceled || isCollapsed) ? '0.7rem' : '0.8125rem',
                                                animation: selected === 'waiting' ? `${blinkAnimation} 1.5s ease-in-out infinite` : 'none'
                                            }}
                                            color={statusMap[selected]?.hex ? undefined : (statusMap[selected]?.color ?? 'default')}
                                            label={selected === 'waiting' && waitingOrder ? `${statusMap[selected]?.label ?? selected} #${waitingOrder}` : (statusMap[selected]?.label ?? selected)}
                                            size={(isCanceled || isCollapsed) ? "small" : "medium"}
                                        />
                                    )}
                                >
                                    {Object.entries(statusMap).map(([key, value]) => (
                                        <MenuItem key={key} value={key}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: value.hex ? value.hex : value.color === 'default' ? 'action.active' : `${value.color}.main`
                                                }} />
                                                <Typography variant="body2">{value.label}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>

                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ cursor: isCanceled ? 'default' : 'pointer', minWidth: 0 }} onClick={() => !isCanceled && onReadExpedient?.(appt.patientId)}>
                                    {assignedAttendants.length === 0 ? (
                                        <Avatar
                                            sx={{
                                                bgcolor: '#bdc3c7',
                                                width: (isCanceled || isCollapsed) ? 32 : 40,
                                                height: (isCanceled || isCollapsed) ? 32 : 40,
                                                fontSize: (isCanceled || isCollapsed) ? '0.8rem' : '1rem',
                                                flexShrink: 0
                                            }}
                                        >
                                            ?
                                        </Avatar>
                                    ) : (
                                        <AvatarGroup
                                            max={3}
                                            sx={{
                                                '& .MuiAvatar-root': {
                                                    width: (isCanceled || isCollapsed) ? 32 : 40,
                                                    height: (isCanceled || isCollapsed) ? 32 : 40,
                                                    fontSize: (isCanceled || isCollapsed) ? '0.75rem' : '0.875rem',
                                                }
                                            }}
                                        >
                                            {assignedAttendants.map(att => (
                                                <Avatar
                                                    key={att.id}
                                                    sx={{
                                                        bgcolor: stringToColor(att.fullName),
                                                        color: getContrastColor(stringToColor(att.fullName)),
                                                        fontWeight: 'bold'
                                                    }}
                                                    title={att.fullName}
                                                >
                                                    {getInitials(att.fullName)}
                                                </Avatar>
                                            ))}
                                        </AvatarGroup>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                        <Typography
                                            variant={(isCanceled || isCollapsed) ? 'body2' : 'subtitle1'}
                                            noWrap
                                            sx={{
                                                fontWeight: 700,
                                                lineHeight: 1.2,
                                                textDecoration: isCanceled ? 'line-through' : 'none',
                                                maxWidth: { md: 160, lg: 220 }
                                            }}
                                        >
                                            {appt.patient.name}
                                        </Typography>
                                        {appt.patient.isFirstVisit && !isCanceled && (
                                            <Tooltip title="Is the first time for this patient. Give him a warm welcome 👋" arrow placement="top">
                                                <Box sx={{ color: 'warning.main', display: 'flex', cursor: 'help', flexShrink: 0 }}>
                                                    <HandWavingIcon size={24} weight="fill" />
                                                </Box>
                                            </Tooltip>
                                        )}
                                        {isCollapsed && comments.length > 0 && (
                                            <Tooltip title={`${comments.length} notes in thread`}>
                                                <Badge badgeContent={comments.length} color="primary" sx={{ ml: 1, '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16 }, flexShrink: 0 }}>
                                                    <ChatIcon size={18} weight="bold" />
                                                </Badge>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Stack>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {isCollapsed && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end', mr: 1 }}>
                                        {availableServices.map((srv) => {
                                            const isAssignedToPatient = appt.services.some(s => s.id === srv.id);
                                            const swItem = appt.serviceWork?.serviceWorkItems?.find(item => item.serviceId === srv.id);
                                            const currentAttendantId = swItem?.attendantId || '';

                                            const attendant = attendants.find(a => a.id === currentAttendantId);
                                            return (
                                                <Tooltip key={srv.id} title={`${srv.alias || srv.name}${attendant ? ` - Assigned to: ${attendant.fullName}` : (isAssignedToPatient ? ' - No staff assigned' : ' - Not assigned to patient')}${isAssignedToPatient && !isCanceled ? ' (Click to change staff)' : ''}`}>
                                                    <Chip
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isAssignedToPatient && !isCanceled) {
                                                                onServiceChipClick?.(appt, srv);
                                                            } else if (onAppointmentClick) {
                                                                onAppointmentClick(appt);
                                                            }
                                                        }}
                                                        label={
                                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                {!currentAttendantId && !isCanceled && isAssignedToPatient && (
                                                                    <WarningCircleIcon size={14} weight="fill" color={isAssignedToPatient ? "#fff" : "#64748b"} />
                                                                )}
                                                                <span>{srv.alias || srv.name}</span>
                                                                {attendant && !isCanceled && (
                                                                    <Box sx={{
                                                                        bgcolor: stringToColor(attendant.fullName),
                                                                        color: getContrastColor(stringToColor(attendant.fullName)),
                                                                        fontSize: '0.6rem',
                                                                        px: 0.5,
                                                                        py: 0.1,
                                                                        borderRadius: '2px',
                                                                        fontWeight: 'bold',
                                                                        ml: 0.5,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        minWidth: '18px'
                                                                    }}>
                                                                        {getInitials(attendant.fullName)}
                                                                    </Box>
                                                                )}
                                                            </Stack>
                                                        }
                                                        sx={{
                                                            bgcolor: isAssignedToPatient
                                                                ? (srv.color || 'primary.main')
                                                                : `color-mix(in srgb, ${srv.color || '#6366f1'} 12%, transparent)`,
                                                            color: isAssignedToPatient
                                                                ? '#fff'
                                                                : (srv.color || '#6366f1'),
                                                            border: isAssignedToPatient
                                                                ? 'none'
                                                                : `1px solid color-mix(in srgb, ${srv.color || '#6366f1'} 30%, transparent)`,
                                                            fontSize: '0.65rem',
                                                            height: 20,
                                                            opacity: isCanceled ? 0.6 : 1,
                                                            textDecoration: isCanceled ? 'line-through' : 'none',
                                                            '& .MuiChip-label': {
                                                                px: 0.8,
                                                                width: '100%',
                                                                display: 'flex',
                                                                justifyContent: 'center'
                                                            },
                                                            width: 95,
                                                            justifyContent: 'center',
                                                            cursor: isAssignedToPatient && !isCanceled ? 'pointer' : 'default'
                                                        }}
                                                    />
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                )}

                                {!isCanceled && (
                                    <>
                                        <Tooltip title="Reschedule Time" arrow>
                                            <IconButton size="small" onClick={() => onRescheduleTime?.(appt)}>
                                                <ClockIcon size={20} color="#0288d1" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Last Treatment / Clinical History" arrow>
                                            <IconButton size="small" onClick={() => onReadClinicalHistory?.(appt.patientId)}>
                                                <FileTextIcon size={20} color="#9c27b0" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Replace Services" arrow>
                                            <IconButton size="small" onClick={() => onReplaceServices?.(appt)}>
                                                <PencilIcon size={20} color="#ed6c02" />
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                )}
                                {!isCanceled && (
                                    <IconButton size="small" onClick={() => setIsCollapsed(!isCollapsed)} sx={{ ml: 0.5 }}>
                                        {isCollapsed ? <CaretDownIcon size={18} /> : <CaretUpIcon size={18} />}
                                    </IconButton>
                                )}
                            </Box>
                        </Stack>

                        {(!isCanceled && !isCollapsed) && <Divider />}

                        {/* Body: Individual Service Capsules */}
                        {(!isCanceled && !isCollapsed) && (
                            <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>SERVICES</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {availableServices.map((srv) => {
                                        const isAssignedToPatient = appt.services.some(s => s.id === srv.id);
                                        const swItem = appt.serviceWork?.serviceWorkItems?.find(item => item.serviceId === srv.id);
                                        const currentAttendantId = swItem?.attendantId || '';

                                        if (!isAssignedToPatient) return null;

                                        return (
                                            <Box key={srv.id} sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                bgcolor: isAssignedToPatient ? (srv.color || 'primary.main') : '#f1f5f9',
                                                color: isAssignedToPatient ? '#fff' : '#64748b',
                                                border: '1px solid',
                                                borderColor: isAssignedToPatient ? 'transparent' : '#cbd5e1',
                                                borderRadius: '24px',
                                                pl: 1,
                                                pr: 1.5,
                                                py: 0.25,
                                                gap: 1,
                                                minWidth: { xs: '100%', md: '300px' },
                                                transition: 'all 0.2s',
                                                opacity: appt.status.toLowerCase() === 'ghost' ? 0.7 : 1,
                                                '&:hover': { filter: appt.status.toLowerCase() === 'ghost' ? 'none' : 'brightness(1.05)', boxShadow: appt.status.toLowerCase() === 'ghost' ? 0 : 1 }
                                            }}>
                                                <Autocomplete
                                                    size="small"
                                                    disabled={appt.status.toLowerCase() === 'ghost'}
                                                    options={attendants}
                                                    getOptionLabel={(option) => option.fullName}
                                                    renderOption={(props, option) => {
                                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                        const { key, ...optionProps } = props;
                                                        return (
                                                            <li key={option.id} {...optionProps}>
                                                                {option.fullName}
                                                            </li>
                                                        );
                                                    }}
                                                    value={attendants.find(a => a.id === currentAttendantId) || null}
                                                    onChange={(_, newValue) => onAttendantChange?.(appt.id, srv.id, newValue?.id || null)}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            placeholder="Staff..."
                                                            sx={{
                                                                '& .MuiInputBase-root': {
                                                                    color: isAssignedToPatient ? '#fff' : '#64748b',
                                                                    fontSize: '0.8rem',
                                                                    '& fieldset': { border: 'none' },
                                                                    bgcolor: isAssignedToPatient ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                                                                    borderRadius: '12px',
                                                                    px: 1,
                                                                    minWidth: '120px'
                                                                },
                                                                '& .MuiInputBase-input': {
                                                                    color: isAssignedToPatient ? '#fff' : '#64748b',
                                                                    '&::placeholder': { color: isAssignedToPatient ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', opacity: 1 }
                                                                },
                                                                '& .MuiAutocomplete-endAdornment .MuiSvgIcon-root': { color: isAssignedToPatient ? '#fff' : '#64748b' }
                                                            }}
                                                        />
                                                    )}
                                                    sx={{ width: '180px' }}
                                                    disableClearable={!currentAttendantId}
                                                />
                                                <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>{srv.alias || srv.name}</Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Stack>
                        )}

                        {/* Notes preview when collapsed */}
                        {isCollapsed && comments.length > 0 && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                                <Stack spacing={0.75}>
                                    {comments.map((c, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color, mt: 0.5, flexShrink: 0 }} />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {c.text}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                </Box>

                {/* Right Side: Chat / Notes */}
                {(!isCanceled && !isCollapsed) && (
                    <Box sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        maxHeight: '100%',
                        overflow: 'hidden',
                        borderTop: { xs: '1px solid', md: 'none' },
                        borderLeft: { xs: 'none', md: '1px solid' },
                        borderColor: 'divider'
                    }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>Notes Thread</Typography>

                        {/* Chat container */}
                        <Box sx={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            mb: 1.5,
                            pr: 0.5,
                            minHeight: '20px',
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' }
                        }}>
                            {comments.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', mt: 2 }}>No notes yet.</Typography>
                            ) : (
                                comments.map((c, i) => (
                                    <Box key={i} sx={{ bgcolor: c.color, color: '#fff', p: 1, px: 1.5, borderRadius: '12px', borderTopLeftRadius: '2px', alignSelf: 'flex-start', maxWidth: '95%', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', '&:hover .comment-actions': { opacity: 1 } }}>
                                        {editingCommentIndex === i ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: '150px' }}>
                                                <TextField
                                                    size="small"
                                                    multiline
                                                    autoFocus
                                                    value={editCommentText}
                                                    onChange={(e) => setEditCommentText(e.target.value)}
                                                    sx={{ '& .MuiInputBase-root': { color: '#fff', bgcolor: 'rgba(0,0,0,0.1)', fontSize: '0.8rem', p: 1 } }}
                                                />
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <IconButton size="small" onClick={() => setEditingCommentIndex(null)} sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.2)', width: 24, height: 24 }}><XIcon size={14} /></IconButton>
                                                    <IconButton size="small" onClick={() => handleSaveEdit(i)} sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.2)', width: 24, height: 24 }}><CheckIcon size={14} /></IconButton>
                                                </Stack>
                                            </Box>
                                        ) : (
                                            <>
                                                <Box className="comment-actions" sx={{ position: 'absolute', top: -10, right: -10, opacity: 0, transition: 'opacity 0.2s', bgcolor: 'background.paper', borderRadius: '12px', boxShadow: 1, display: 'flex' }}>
                                                    <IconButton size="small" onClick={() => { setEditingCommentIndex(i); setEditCommentText(c.text); }} sx={{ width: 20, height: 20, color: 'text.secondary' }}><PencilIcon size={12} /></IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteComment(i)} sx={{ width: 20, height: 20, color: 'error.main' }}><XIcon size={12} /></IconButton>
                                                </Box>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.3 }}>{c.text}</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.65rem' }}>
                                                    {dayjs(c.time).format('h:mm A')}
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </Box>

                        {/* Input Area */}
                        <Stack spacing={1} sx={{ mt: 'auto' }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-start">
                                {['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#546e7a'].map(color => (
                                    <Box
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        sx={{
                                            width: 18, height: 18, borderRadius: '50%', bgcolor: color, cursor: 'pointer',
                                            boxShadow: selectedColor === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    />
                                ))}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="flex-end">
                                <TextField
                                    size="small"
                                    fullWidth
                                    multiline
                                    maxRows={3}
                                    placeholder="Type a new comment..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                    disabled={isSaving || appt.status.toLowerCase() === 'ghost'}
                                    sx={{
                                        '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '0.85rem' }
                                    }}
                                />
                                <IconButton
                                    color="primary"
                                    onClick={handleSendComment}
                                    disabled={!newComment.trim() || isSaving || appt.status.toLowerCase() === 'ghost'}
                                    sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'divider', color: 'text.disabled' }, p: 1, mb: 0.25 }}
                                >
                                    <PaperPlaneIcon size={18} weight="fill" />
                                </IconButton>
                            </Stack>
                        </Stack>
                    </Box>
                )}
            </Box>
        </Card>
    );
}

export interface AppointmentsAttentionProps {
    appointments: AppointmentAttentionData[];
    attendants?: { id: number; fullName: string }[];
    availableServices?: { id: number; name: string; alias?: string; color: string }[];
    onStatusChange?: (id: string, newStatus: string) => void;
    onRefresh?: () => void;
    onReadExpedient?: (patientId: string) => void;
    onReadClinicalHistory?: (patientId: string) => void;
    onRescheduleTime?: (appt: AppointmentAttentionData) => void;
}

export function AppointmentsAttention({
    appointments = [],
    attendants = [],
    availableServices = [],
    onStatusChange,
    onRefresh,
    onReadExpedient,
    onReadClinicalHistory,
    onRescheduleTime
}: AppointmentsAttentionProps): React.JSX.Element {
    const [replaceDialogOpen, setReplaceDialogOpen] = React.useState(false);
    const [apptToReplace, setApptToReplace] = React.useState<AppointmentAttentionData | null>(null);

    const [attendantDialogOpen, setAttendantDialogOpen] = React.useState(false);
    const [selectedApptForAttendant, setSelectedApptForAttendant] = React.useState<AppointmentAttentionData | null>(null);
    const [selectedServiceForAttendant, setSelectedServiceForAttendant] = React.useState<Service | null>(null);

    const handleServiceChipClick = (appt: AppointmentAttentionData, srv: Service) => {
        setSelectedApptForAttendant(appt);
        setSelectedServiceForAttendant(srv);
        setAttendantDialogOpen(true);
    };

    const handleReplaceClick = (appt: AppointmentAttentionData) => {
        setApptToReplace(appt);
        setReplaceDialogOpen(true);
    };

    const handleNotesSave = async (appointmentId: string, notes: string) => {
        const appt = appointments.find(a => a.id === appointmentId);
        if (!appt) return;

        try {
            await apiClient.patch(`/Appointments/${appointmentId}/notes`, {
                patientId: parseInt(appt.patientId),
                notes: notes
            });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to save notes:', err);
        }
    };

    const handleAttendantChange = async (appointmentId: string, serviceId: number, attendantId: number | null) => {
        const appt = appointments.find(a => a.id === appointmentId);
        if (!appt) return;

        const numericId = parseInt(appointmentId);
        if (isNaN(numericId) || numericId === 0) {
            console.warn('Cannot save service work for virtual/ghost appointments.');
            return;
        }

        // Construct the full request to SaveServiceWork
        try {
            const currentItems = appt.serviceWork?.serviceWorkItems || [];

            // Ensure all current services are preserved in the payload
            let newItems = appt.services.map(s => {
                const existing = currentItems.find((ci: any) => ci.serviceId === s.id);
                return existing ? { ...existing } : { id: 0, serviceId: s.id, attendantId: null };
            });

            const existingIdx = newItems.findIndex(i => i.serviceId === serviceId);

            if (existingIdx >= 0) {
                newItems[existingIdx].attendantId = attendantId;
            } else {
                newItems.push({ id: 0, serviceId, attendantId });
            }

            await apiClient.post(`/Appointments/service-work`, {
                appointmentId: numericId,
                patientId: parseInt(appt.patientId),
                serviceItems: newItems.map(ni => ({ serviceId: ni.serviceId, attendantId: ni.attendantId })),
                notes: appt.serviceWork?.notes
            });

            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to update attendant:', err);
        }
    };

    const waitingOrders = new Map<string, number>();
    [...appointments]
        .filter(a => a.status.toLowerCase() === 'waiting')
        .sort((a, b) => {
            if (a.statusUpdatedAt && b.statusUpdatedAt) {
                return new Date(a.statusUpdatedAt).getTime() - new Date(b.statusUpdatedAt).getTime();
            }
            if (a.statusUpdatedAt) return -1;
            if (b.statusUpdatedAt) return 1;

            const timeA = a.date + 'T' + a.hour24;
            const timeB = b.date + 'T' + b.hour24;
            return timeA.localeCompare(timeB);
        })
        .forEach((a, idx) => waitingOrders.set(a.id, idx + 1));

    // Group by hour
    const grouped = appointments.reduce((acc, appt) => {
        const h = appt.hour24 || '00:00';
        if (!acc[h]) acc[h] = [];
        acc[h].push(appt);
        return acc;
    }, {} as Record<string, AppointmentAttentionData[]>);

    const sortedHours = Object.keys(grouped).sort();

    return (
        <Box sx={{ pb: 4 }}>
            <ReplaceServicesDialog
                open={replaceDialogOpen}
                onClose={() => {
                    setReplaceDialogOpen(false);
                    setApptToReplace(null);
                }}
                appointmentId={apptToReplace?.id || ''}
                currentServiceIds={apptToReplace?.services.map(s => s.id) || []}
                patientName={apptToReplace?.patient.name || ''}
                onSaved={onRefresh}
            />

            <ServiceWorkDialog
                open={attendantDialogOpen}
                onClose={() => {
                    setAttendantDialogOpen(false);
                    setSelectedApptForAttendant(null);
                    setSelectedServiceForAttendant(null);
                }}
                appointmentId={selectedApptForAttendant?.id || ''}
                patientName={selectedApptForAttendant?.patient.name || ''}
                serviceId={selectedServiceForAttendant?.id || 0}
                serviceName={selectedServiceForAttendant?.name || ''}
                currentAttendantId={
                    selectedApptForAttendant?.serviceWork?.serviceWorkItems?.find(
                        item => item.serviceId === selectedServiceForAttendant?.id
                    )?.attendantId || null
                }
                attendants={attendants}
                onSaved={handleAttendantChange}
            />

            {sortedHours.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No appointments match the current filters.</Typography>
                </Box>
            ) : (
                sortedHours.map((hour24) => {
                    const d = dayjs(`2026-01-01T${hour24}:00`);
                    const end = d.add(30, 'minute');
                    const groupTitle = d.isValid() ? `${d.format('h:mm A')} - ${end.format('h:mm A')}` : String(hour24);
                    const groupAppts = grouped[hour24];

                    return (
                        <Box key={hour24} sx={{ mb: 4 }}>
                            {/* Time Separator */}
                            <Divider sx={{ mb: 3 }}>
                                <Chip
                                    label={groupTitle}
                                    sx={{
                                        fontWeight: 'bold',
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        px: 1
                                    }}
                                    size="medium"
                                />
                            </Divider>

                            {/* Cards for this time block */}
                            {groupAppts.map(appt => (
                                <AttentionCard
                                    key={appt.id}
                                    appt={appt}
                                    attendants={attendants}
                                    availableServices={availableServices}
                                    waitingOrder={waitingOrders.get(appt.id)}
                                    onStatusChange={onStatusChange}
                                    onNotesSave={handleNotesSave}
                                    onAttendantChange={handleAttendantChange}
                                    onReadExpedient={onReadExpedient}
                                    onReadClinicalHistory={onReadClinicalHistory}
                                    onReplaceServices={handleReplaceClick}
                                    onRescheduleTime={onRescheduleTime}
                                    onServiceChipClick={handleServiceChipClick}
                                />
                            ))}
                        </Box>
                    );
                })
            )}
        </Box>
    );
}
