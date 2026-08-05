'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { File as FileIcon } from '@phosphor-icons/react/dist/ssr/File';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { DownloadSimple as DownloadIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PencilLine as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilLine';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { Printer as PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import Tooltip from '@mui/material/Tooltip';
import { RehabilitationProgramDialog } from './rehabilitation-program-dialog';
import { RehabilitationProgramDetailsDialog, type RehabilitationProgramFull } from './rehabilitation-program-details-dialog';
import { AppointmentDialog } from '../appointments/appointment-dialog';
import { CancelAppointmentDialog } from '../appointments/cancel-appointment-dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import apiClient from '@/lib/api-client';
import type { PatientRecord } from './patients-client';
import { MedicalRecordView } from './medical-record-view';
import { ClinicalHistoryDialog } from './clinical-history-dialog';
import { CustomBodyModel } from '@/components/dashboard/services/custom-body-model';

interface Appointment {
    id: number;
    appointmentDate: string;
    appointmentEndTime: string;
    reason: string;
    treatmentType: string;
    status: string;
    user?: { firstName: string; lastName: string };
    technology?: { name: string; color: string };
    equipment?: { name: string };
    rehabilitationSession?: {
        services?: Array<{ name: string; technologies?: Array<{ name: string; color: string }> }>
    };
    services?: Array<{ id: number; name: string }>;
    serviceWork?: {
        serviceWorkItems?: Array<{
            serviceId: number;
            attendant?: { firstName: string; lastName: string };
            service?: { name: string; color: string };
        }>
    };
}

interface PatientFile {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
}

interface ServiceRecord {
    id: number;
    name: string;
    color?: string;
    technologies?: Array<{ id: number; name: string; }>;
}

interface Transaction {
    id: number;
    createdAt: string;
    type: string | number;
    description: string;
    cost: number;
    initialBalance: number;
    paidWithBalance: number;
    cashPayment: number;
    creditPayment: number;
    debitPayment: number;
    finalBalance: number;
    debtGenerated: number;
    revenue: number;
    discount: number;
    appointment?: { id: number };
    userId?: number;
    user?: { id: number; fullName: string };
    folio?: string;
}

const formatCurrency = (val: number | string | undefined): string => {
    const num = typeof val === 'number' ? val : Number(val || 0);
    return `$${num.toFixed(2)}`;
};

interface Payment {
    id: number;
    amountPaid: number;
    paymentDate: string;
}

interface Sale {
    id: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    appointmentId?: number;
    payments?: Payment[];
}

interface PatientTaxData {
    id?: number;
    patientId?: number;
    rfc?: string;
    companyName?: string;
    address?: string;
    cp?: string;
    suburb?: string;
    city?: string;
    state?: string;
    taxRegime?: string;
    cfdiUse?: string;
}

interface RehabilitationProgram {
    id: number;
    patientId: number;
    muscleGroups: string;
    name: string;
    startDate: string;
    status: string;
    sessions?: Array<{ id: number; isCompleted: boolean }>;
}

interface ConsultationRecord {
    id: number;
    date: string;
    reasonForConsultation: string;
    diagnostic: string;
    muscleGroups?: string;
}

interface PatientDetail extends PatientRecord {
    phone?: string;
    email?: string;
    group?: { id: number; name: string };
    appointments?: Appointment[];
    patientFiles?: PatientFile[];
    sales?: Sale[];
    transactions?: Transaction[];
    consultations?: ConsultationRecord[];
    taxData?: PatientTaxData;
    balance?: number;
    photoUrl?: string;
    rehabilitationPrograms?: RehabilitationProgram[];
}

export interface ExpedientDialogProps {
    open: boolean;
    patient: PatientRecord | null;
    onClose: () => void;
    onEdit?: () => void;
    onUpdate?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    scheduled: { bg: '#e3f2fd', border: '#1976d2', text: '#1565c0' },
    waiting: { bg: '#fff3e0', border: '#ed6c02', text: '#e65100' },
    in_progress: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' },
    done: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20' },
    canceled: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c' },
    absent: { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Stack direction="row" spacing={1} sx={{ py: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                {label}
            </Typography>
            <Typography variant="body2">{value ?? '—'}</Typography>
        </Stack>
    );
}

const FILE_TYPES = ['PDF', 'JPG', 'PNG', 'DOCX', 'XLSX', 'Other'];

function stringToColor(string: string) {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
}

function stringAvatar(name: string) {
    const parts = name.split(' ');
    const firstInitial = parts[0] ? parts[0][0] : '';
    const secondInitial = parts[1] ? parts[1][0] : '';
    return {
        sx: {
            bgcolor: stringToColor(name),
            width: 56,
            height: 56,
            fontSize: '1.5rem',
        },
        children: `${firstInitial}${secondInitial}`.toUpperCase(),
    };
}

export function ExpedientDialog({ open, patient: patientProp, onClose, onEdit, onUpdate }: ExpedientDialogProps): React.JSX.Element {
    const [lastPatient, setLastPatient] = React.useState<PatientRecord | null>(patientProp);

    React.useEffect(() => {
        if (patientProp) {
            setLastPatient(patientProp);
        }
    }, [patientProp]);

    const patient = patientProp || lastPatient;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [tab, setTab] = React.useState(0);
    const [detail, setDetail] = React.useState<PatientDetail | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [allServices, setAllServices] = React.useState<ServiceRecord[]>([]);

    React.useEffect(() => {
        if (!open) return;
        apiClient.get<ServiceRecord[]>('/Services')
            .then((res) => setAllServices(res.data))
            .catch((err) => console.error('Failed to load services', err));
    }, [open]);

    // Add file dialog state
    const [addFileOpen, setAddFileOpen] = React.useState(false);
    const [fileName, setFileName] = React.useState('');
    const [fileUrl, setFileUrl] = React.useState('');
    const [fileType, setFileType] = React.useState('PDF');
    const [submitting, setSubmitting] = React.useState(false);


    const [selectedRehabProgram, setSelectedRehabProgram] = React.useState<RehabilitationProgramFull | null>(null);
    const [editingRehabProgram, setEditingRehabProgram] = React.useState<RehabilitationProgramFull | null>(null);
    const [scheduleProgramForAppointment, setScheduleProgramForAppointment] = React.useState<RehabilitationProgramFull | null>(null);

    const [createSaleOpen, setCreateSaleOpen] = React.useState(false);
    const [creatingSale, setCreatingSale] = React.useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false);

    // New Charge Dialog State
    const [chargeDialogOpen, setChargeDialogOpen] = React.useState(false);
    const [chargeAmount, setChargeAmount] = React.useState<number | ''>('');
    const [chargeDescription, setChargeDescription] = React.useState('');
    const [savingCharge, setSavingCharge] = React.useState(false);

    // New Payment Dialog State
    const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
    const [paymentCash, setPaymentCash] = React.useState<number | ''>('');
    const [paymentCredit, setPaymentCredit] = React.useState<number | ''>('');
    const [paymentDebit, setPaymentDebit] = React.useState<number | ''>('');
    const [paymentDiscount, setPaymentDiscount] = React.useState<number | ''>('');
    const [savingPayment, setSavingPayment] = React.useState(false);

    // Receipt Dialog State
    const [receiptDialogOpen, setReceiptDialogOpen] = React.useState(false);
    const [selectedTx, setSelectedTx] = React.useState<Transaction | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !patient) return;

        setUploadingPhoto(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await apiClient.post(`/Patients/${patient.id}/files`, {
                    fileName: 'foto_perfil.jpg',
                    fileUrl: base64String,
                    fileType: file.type
                });
                fetchDetail(patient.id);
                if (onUpdate) onUpdate();
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Failed to upload photo', err);
            alert('Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const [syncing, setSyncing] = React.useState(false);

    const handleSync = async () => {
        if (!patient) return;
        setSyncing(true);
        try {
            await apiClient.post(`/Patients/${patient.id}/sync`);
            fetchDetail(patient.id);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Failed to sync patient data from Innergy API', err);
            alert('Failed to sync patient data from Innergy API');
        } finally {
            setSyncing(false);
        }
    };

    const fetchDetail = React.useCallback((patientId: number) => {
        setLoading(true);
        apiClient.get(`/Patients/${patientId}/history`)
            .then((res) => {
                setDetail(res.data);
                if (res.data.taxData) {
                    setTaxForm(res.data.taxData);
                }
            })
            .catch((err) => console.error('Failed to load expedient', err))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        if (!open || !patient) return;
        setTab(0);
        setDetail(null);
        setTaxForm({});
        fetchDetail(patient.id);
    }, [open, patient]);

    const handleAddFile = async () => {
        if (!patient || !fileName || !fileUrl) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/Patients/${patient.id}/files`, { fileName, fileUrl, fileType });
            setAddFileOpen(false);
            setFileName('');
            setFileUrl('');
            setFileType('PDF');
            fetchDetail(patient.id);
        } catch (err) {
            console.error('Failed to add file', err);
            alert('Failed to add file');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateDirectSale = async () => {
        if (!patient) return;
        setCreatingSale(true);
        try {
            await apiClient.post('/Sales', {
                patientId: patient.id,
                totalAmount: 0,
                status: 'pending'
            });
            setCreateSaleOpen(false);
            fetchDetail(patient.id);
            alert('Sale created successfully');
        } catch (err: any) {
            console.error('Failed to create sale', err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            alert(`Error creating sale: ${msg}`);
        } finally {
            setCreatingSale(false);
        }
    };

    const handleCreateCharge = async () => {
        if (!patient || !chargeAmount) return;
        setSavingCharge(true);
        try {
            await apiClient.post('/transactions/manual', {
                patientId: patient.id,
                type: 'EXPENSE',
                amount: Number(chargeAmount),
                discount: 0,
                description: chargeDescription
            });
            setChargeDialogOpen(false);
            setChargeAmount('');
            setChargeDescription('');
            fetchDetail(patient.id);
            alert('Charge created successfully');
        } catch (err: any) {
            console.error('Failed to create charge', err);
            alert(`Error creating charge: ${err.message}`);
        } finally {
            setSavingCharge(false);
        }
    };

    const handleCreatePayment = async () => {
        if (!patient) return;
        setSavingPayment(true);
        try {
            await apiClient.post(`/transactions/checkout/${patient.id}`, {
                cash: Number(paymentCash || 0),
                credit: Number(paymentCredit || 0),
                debit: Number(paymentDebit || 0),
                discount: Number(paymentDiscount || 0)
            });
            setPaymentDialogOpen(false);
            setPaymentCash('');
            setPaymentCredit('');
            setPaymentDebit('');
            setPaymentDiscount('');
            fetchDetail(patient.id);
            alert('Payment processed successfully');
        } catch (err: any) {
            console.error('Failed to process payment', err);
            alert(`Error processing payment: ${err.message}`);
        } finally {
            setSavingPayment(false);
        }
    };

    const [taxForm, setTaxForm] = React.useState<PatientTaxData>({});
    const [savingTax, setSavingTax] = React.useState(false);

    const handleSaveTaxData = async () => {
        if (!patient) return;
        setSavingTax(true);
        try {
            await apiClient.put(`/Patients/${patient.id}/taxdata`, taxForm);
            alert('Tax data saved successfully');
            fetchDetail(patient.id);
        } catch (err) {
            console.error(err);
            alert('Failed to save tax data');
        } finally {
            setSavingTax(false);
        }
    };

    const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
    const [cancelingAppointmentId, setCancelingAppointmentId] = React.useState<number | null>(null);

    const [editingAppointment, setEditingAppointment] = React.useState<Record<string, unknown> | undefined>(undefined);
    const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = React.useState(false);

    const renderServicesAsChips = React.useCallback((appt: Appointment) => {
        const chipItems: Array<{ name: string; color: string }> = [];

        const getServiceColor = (serviceName?: string, serviceId?: number): string => {
            if (serviceId) {
                const found = allServices.find(s => s.id === serviceId);
                if (found?.color) return found.color;
            }
            if (serviceName) {
                const found = allServices.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
                if (found?.color) return found.color;
            }
            return '#78909c';
        };

        if (appt.serviceWork?.serviceWorkItems?.length) {
            const workMap = new Map(appt.serviceWork.serviceWorkItems.map(sw => [
                sw.serviceId || (sw as any).service?.id,
                {
                    attendant: sw.attendant ? `${sw.attendant.firstName} ${sw.attendant.lastName}` : null,
                    color: sw.service?.color || getServiceColor(undefined, sw.serviceId || (sw as any).service?.id)
                }
            ]));

            const apptServices = appt.services || [];
            if (apptServices.length > 0) {
                apptServices.forEach(s => {
                    const workInfo = workMap.get(s.id);
                    const att = workInfo?.attendant;
                    const label = att ? `${s.name} (${att})` : s.name;
                    const color = workInfo?.color || getServiceColor(s.name, s.id);
                    chipItems.push({ name: label, color });
                });
            }
        }

        if (chipItems.length === 0 && appt.technology?.name) {
            const color = appt.technology.color || getServiceColor(appt.technology.name);
            chipItems.push({ name: appt.technology.name, color });
        }

        if (chipItems.length === 0 && appt.rehabilitationSession?.services?.length) {
            appt.rehabilitationSession.services.forEach((s: any) => {
                if (s.name) {
                    let color = getServiceColor(s.name);
                    if (s.technologies?.length && s.technologies[0].color) {
                        color = s.technologies[0].color;
                    }
                    chipItems.push({ name: s.name, color });
                }
            });
        }

        if (chipItems.length === 0 && appt.equipment?.name) {
            chipItems.push({ name: appt.equipment.name, color: '#607d8b' });
        }

        if (chipItems.length === 0 && appt.services?.length) {
            appt.services.forEach(s => {
                if (s.name) {
                    const color = getServiceColor(s.name, s.id);
                    chipItems.push({ name: s.name, color });
                }
            });
        }

        if (chipItems.length === 0) {
            const label = appt.treatmentType || appt.reason || '—';
            chipItems.push({ name: label, color: '#78909c' });
        }

        return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                {chipItems.map((item, idx) => (
                    <Chip
                        key={idx}
                        label={item.name}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            bgcolor: item.color,
                            color: '#fff',
                            fontWeight: 'medium'
                        }}
                    />
                ))}
            </Stack>
        );
    }, [allServices]);

    const handleAppointmentStatusChange = async (apptId: number, newStatus: string) => {
        if (newStatus === 'canceled' || newStatus === 'absent') {
            if (newStatus === 'absent') {
                await commitStatusChange(apptId, newStatus);
            } else {
                setCancelingAppointmentId(apptId);
                setCancelDialogOpen(true);
            }
        } else {
            await commitStatusChange(apptId, newStatus);
        }
    };

    const commitStatusChange = async (apptId: number, newStatus: string, reason?: string, comment?: string) => {
        try {
            await apiClient.patch(`/Appointments/${apptId}/status`, {
                status: newStatus,
                cancellationReason: reason,
                cancellationComment: comment
            });
            if (patient) fetchDetail(patient.id);
        } catch (err) {
            console.error('Failed to update appointment status', err);
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
        if (cancelingAppointmentId && detail?.appointments) {
            await commitStatusChange(cancelingAppointmentId, 'canceled', reason, comment);

            const appt = detail.appointments.find(a => a.id === cancelingAppointmentId);
            if (appt) {
                setEditingAppointment(appt as unknown as Record<string, unknown>);
                setIsAppointmentDialogOpen(true);
            }
        }
        setCancelDialogOpen(false);
        setCancelingAppointmentId(null);
    };

    const handleDeleteFile = async (fileId: number) => {
        if (!patient || !window.confirm('Are you sure you want to delete this file?')) return;
        try {
            await apiClient.delete(`/Patients/${patient.id}/files/${fileId}`);
            fetchDetail(patient.id);
        } catch (err) {
            console.error('Failed to delete file', err);
            alert('Failed to delete file');
        }
    };

    const handleDownloadFile = (file: PatientFile) => {
        const link = document.createElement('a');
        link.href = file.fileUrl;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRenameFile = async (fileId: number, currentName: string) => {
        if (!patient) return;
        const newName = window.prompt('Enter new filename:', currentName);
        if (!newName || newName === currentName) return;

        try {
            await apiClient.patch(`/Patients/${patient.id}/files/${fileId}/rename?newName=${encodeURIComponent(newName)}`);
            fetchDetail(patient.id);
        } catch (err) {
            console.error('Failed to rename file', err);
            alert('Failed to rename file');
        }
    };

    const handleGoToRehab = async (programId: number) => {
        if (!patient) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/Patients/${patient.id}/rehabilitation-programs/${programId}`);
            setSelectedRehabProgram(res.data);
            setIsAppointmentDialogOpen(false);
            setScheduleProgramForAppointment(null);
        } catch (err) {
            console.error('Failed to load rehab program details', err);
            alert('Failed to load program details');
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return '—';
        const diff = Date.now() - new Date(birthDate).getTime();
        const age = new Date(diff);
        return Math.abs(age.getUTCFullYear() - 1970);
    };

    const fullName = patient ? `${patient.firstName} ${patient.lastName}` : '';

    const profilePhoto = detail?.patientFiles
        ?.filter(f =>
            f.fileName === 'foto_perfil.jpg' ||
            f.fileUrl.startsWith('data:image') ||
            f.fileType.includes('image')
        )
        ?.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]?.fileUrl;

    const aggregatedMuscles = React.useMemo(() => {
        if (!detail?.consultations) return [];
        const muscles = new Set<string>();
        detail.consultations.forEach(c => {
            if (c.muscleGroups) {
                c.muscleGroups.split(',').forEach((m: string) => muscles.add(m.trim()));
            }
        });
        return Array.from(muscles);
    }, [detail?.consultations]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xl"
        >
            {/* Header */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 2, sm: 0 }}
                sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}
            >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Box
                        sx={{
                            position: 'relative',
                            cursor: 'pointer',
                            '&:hover .avatar-overlay': { opacity: 1 }
                        }}
                        onClick={handleAvatarClick}
                    >
                        <Avatar
                            src={profilePhoto || detail?.photoUrl || patient?.photoUrl}
                            {...stringAvatar(fullName || 'Unknown')}
                            alt={fullName}
                            sx={{
                                ...stringAvatar(fullName || 'Unknown').sx,
                                opacity: uploadingPhoto ? 0.5 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        />
                        <Box
                            className="avatar-overlay"
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                bgcolor: 'rgba(0,0,0,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                color: 'white'
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 'bold', textAlign: 'center', px: 0.5 }}>
                                {uploadingPhoto ? '...' : 'Change'}
                            </Typography>
                        </Box>
                    </Box>
                    <Stack spacing={0.5}>
                        <Typography variant="h6">{fullName}</Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">ID #{patient?.id}</Typography>
                            {patient?.status ? (
                                <Chip
                                    size="small"
                                    label={patient.status}
                                    color={patient.status === 'Active' ? 'success' : 'default'}
                                />
                            ) : null}
                        </Stack>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<PencilIcon />}
                        onClick={() => onEdit ? onEdit() : console.warn('onEdit not provided')}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<FileTextIcon />}
                        onClick={() => setHistoryDialogOpen(true)}
                    >
                        Full Clinical History
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? 'Syncing...' : 'Sync'}
                    </Button>
                    <IconButton onClick={() => onClose()}>
                        <XIcon />
                    </IconButton>
                </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ flex: 1, overflow: 'hidden' }}>
                <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
                    {loading && !detail && (
                        <Typography color="text.secondary" variant="body2">Loading patient information...</Typography>
                    )}

                    {/* Top view details are shown outside tabs or inside the drawer top, but user requested top-level details so we'll add them at the top of the content area or above tabs */}

                    {(!loading || detail) && (
                        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Patient Details</Typography>
                            <Stack component="div" direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ minWidth: 150 }}><Typography variant="caption" color="text.secondary" display="block">Age of birth</Typography><Typography variant="body2">{detail?.birthDate ? new Date(detail.birthDate).toLocaleDateString() : '—'}</Typography></Box>
                                <Box sx={{ minWidth: 150 }}><Typography variant="caption" color="text.secondary" display="block">Age</Typography><Typography variant="body2">{calculateAge(detail?.birthDate)}</Typography></Box>
                                <Box sx={{ minWidth: 150 }}><Typography variant="caption" color="text.secondary" display="block">Gender</Typography><Typography variant="body2">{detail?.gender || '—'}</Typography></Box>
                                <Box sx={{ minWidth: 150 }}><Typography variant="caption" color="text.secondary" display="block">Group</Typography><Typography variant="body2">{detail?.group?.name || patient?.group?.name || '—'}</Typography></Box>
                                <Box sx={{ minWidth: 150 }}><Typography variant="caption" color="text.secondary" display="block">Telephone</Typography><Typography variant="body2">{detail?.phone || '—'}</Typography></Box>
                                <Box sx={{ minWidth: 150 }}><Typography variant="caption" color="text.secondary" display="block">Email</Typography><Typography variant="body2">{detail?.email || '—'}</Typography></Box>
                                <Box sx={{ minWidth: 150 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">Current Balance</Typography>
                                    <Typography
                                        variant="body2"
                                        color={
                                            (detail?.balance ?? patient?.balance ?? 0) > 0 ? "success.main" :
                                                (detail?.balance ?? patient?.balance ?? 0) < 0 ? "error.main" : "text.primary"
                                        }
                                    >
                                        ${(detail?.balance ?? patient?.balance ?? 0).toFixed(2)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}

                    {(!loading || detail) && (
                        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                            <Tab label="Medical record" />
                            <Tab label={`Rehabilitation programs${detail?.rehabilitationPrograms ? ` (${detail.rehabilitationPrograms.length})` : ''}`} />
                            <Tab label="Account details" />
                            <Tab label={`Appointments${detail?.appointments ? ` (${detail.appointments.length})` : ''}`} />
                            <Tab label="Tax data" />
                            <Tab label={`Files${detail?.patientFiles ? ` (${detail.patientFiles.length})` : ''}`} />
                        </Tabs>
                    )}

                    {/* Tab 0: Medical record */}
                    {(!loading || detail) && tab === 0 && patient && (
                        <MedicalRecordView patientId={patient.id} onUpdate={() => fetchDetail(patient.id)} />
                    )}

                    {/* Tab 1: Rehabilitation programs */}
                    {(!loading || detail) && tab === 1 && (
                        <Stack spacing={2}>

                            {detail?.rehabilitationPrograms?.length ? (
                                isMobile ? (
                                    <Stack spacing={2}>
                                        {detail.rehabilitationPrograms
                                            .slice()
                                            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                            .map((prog) => {
                                                const total = prog.sessions?.length || 0;
                                                const completed = prog.sessions?.filter(s => s.isCompleted).length || 0;
                                                return (
                                                    <Box
                                                        key={prog.id}
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: 1,
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            bgcolor: 'background.paper'
                                                        }}
                                                    >
                                                        <Stack spacing={1.5}>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                                <Box>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{prog.name || 'Untitled Program'}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">ID: #{prog.id} · {new Date(prog.startDate).toLocaleDateString()}</Typography>
                                                                </Box>
                                                                <IconButton size="small" onClick={() => setSelectedRehabProgram(prog as unknown as RehabilitationProgramFull)}>
                                                                    <EyeIcon />
                                                                </IconButton>
                                                            </Stack>

                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Treated Muscles</Typography>
                                                                <Typography variant="body2">{prog.muscleGroups || '—'}</Typography>
                                                            </Box>

                                                            <Stack direction="row" spacing={2} alignItems="center">
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Sessions</Typography>
                                                                    <Typography variant="body2" fontWeight="bold">{completed}/{total}</Typography>
                                                                </Box>
                                                                <Box sx={{ flexGrow: 1 }} />
                                                                <Chip
                                                                    size="small"
                                                                    label={prog.status}
                                                                    color={prog.status === 'Active' ? 'success' : 'default'}
                                                                    variant="outlined"
                                                                />
                                                                <Chip
                                                                    size="small"
                                                                    label={(prog as any).recurrenceRuleId ? "Scheduled" : "Unscheduled"}
                                                                    color={(prog as any).recurrenceRuleId ? "info" : "default"}
                                                                    variant="outlined"
                                                                />
                                                            </Stack>
                                                        </Stack>
                                                    </Box>
                                                );
                                            })}
                                    </Stack>
                                ) : (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>ID</TableCell>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Start Date</TableCell>
                                                <TableCell>Treated Muscles</TableCell>
                                                <TableCell>Sessions</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Schedule Status</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {detail.rehabilitationPrograms
                                                .slice()
                                                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                                .map((prog) => {
                                                    const total = prog.sessions?.length || 0;
                                                    const completed = prog.sessions?.filter(s => s.isCompleted).length || 0;
                                                    return (
                                                        <TableRow key={prog.id}>
                                                            <TableCell>#{prog.id}</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>{prog.name || 'Untitled Program'}</TableCell>
                                                            <TableCell>{new Date(prog.startDate).toLocaleDateString()}</TableCell>
                                                            <TableCell>{prog.muscleGroups || '—'}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="bold">
                                                                    {completed}/{total}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    size="small"
                                                                    label={prog.status}
                                                                    color={prog.status === 'Active' ? 'success' : 'default'}
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    size="small"
                                                                    label={(prog as any).recurrenceRuleId ? "Scheduled" : "Unscheduled"}
                                                                    color={(prog as any).recurrenceRuleId ? "info" : "default"}
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <IconButton size="small" onClick={() => setSelectedRehabProgram(prog as unknown as RehabilitationProgramFull)}>
                                                                    <EyeIcon />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                )
                            ) : (
                                <Typography variant="body2" color="text.secondary">No rehabilitation programs found.</Typography>
                            )}
                        </Stack>
                    )}

                    {/* Tab 2: Account details */}
                    {(!loading || detail) && tab === 2 && (() => {
                        const txs = detail?.transactions || [];
                        const totalCharges = txs.reduce((acc, t) => {
                            const isApptCharge = t.type === 'APPOINTMENT_CHARGE' || t.type === 0 || String(t.type) === '0';
                            const isWithdrawal = t.type === 'CASH_WITHDRAWAL' || t.type === 3 || String(t.type) === '3';
                            if (isApptCharge) return acc + t.cost;
                            if (isWithdrawal) return acc + Math.abs(t.cashPayment);
                            return acc;
                        }, 0);
                        const totalPaid = txs.reduce((acc, t) => {
                            const isPmt = t.type === 'POS_PAYMENT' || t.type === 1 || String(t.type) === '1';
                            const isTopUp = t.type === 'TOP_UP' || t.type === 2 || String(t.type) === '2';
                            const isInflow = t.type === 'CASH_INFLOW' || t.type === 4 || String(t.type) === '4';
                            if (isPmt || isTopUp || isInflow) {
                                return acc + (t.cashPayment + t.creditPayment + t.debitPayment);
                            }
                            return acc;
                        }, 0);
                        const currentBalance = detail?.balance || 0;

                        const sortedTransactions = txs.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                        return (
                            <Stack spacing={2}>
                                {/* Top Actions */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            startIcon={<PlusIcon />}
                                            onClick={() => setChargeDialogOpen(true)}
                                        >
                                            New charge
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            startIcon={<PlusIcon />}
                                            onClick={() => setPaymentDialogOpen(true)}
                                        >
                                            New payment
                                        </Button>
                                    </Stack>
                                </Box>

                                {/* Summary Statistics */}
                                <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                                    <Box sx={{ flex: 1, p: 2, border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#f8fafc' }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>CHARGES</Typography>
                                        <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mt: 0.5 }}>
                                            {formatCurrency(totalCharges)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, p: 2, border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#f8fafc' }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>PAYED</Typography>
                                        <Typography variant="h6" fontWeight={600} color="success.main" sx={{ mt: 0.5 }}>
                                            {formatCurrency(totalPaid)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{
                                        flex: 1,
                                        p: 2,
                                        border: '1px solid',
                                        borderColor: currentBalance >= 0 ? 'success.light' : 'error.light',
                                        borderRadius: 1,
                                        bgcolor: currentBalance >= 0 ? '#f0fdf4' : '#fef2f2'
                                    }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>BALANCE</Typography>
                                        <Typography
                                            variant="h6"
                                            fontWeight={600}
                                            color={currentBalance >= 0 ? 'success.main' : 'error.main'}
                                            sx={{ mt: 0.5 }}
                                        >
                                            {currentBalance >= 0 ? '+' : ''}{formatCurrency(currentBalance)}
                                        </Typography>
                                    </Box>
                                </Stack>

                                {/* Transactions Table */}
                                {sortedTransactions.length ? (
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>#</TableCell>
                                                    <TableCell>TransactionId</TableCell>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell align="right">Charge</TableCell>
                                                    <TableCell align="right">Payed</TableCell>
                                                    <TableCell align="right">Final balance</TableCell>
                                                    <TableCell>Folio</TableCell>
                                                    <TableCell>ApptId</TableCell>
                                                    <TableCell align="center">Receipt</TableCell>
                                                    <TableCell>Employee (User id)</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sortedTransactions.map((tx, idx) => {
                                                    const isApptCharge = tx.type === 'APPOINTMENT_CHARGE' || tx.type === 0 || String(tx.type) === '0';
                                                    const isWithdrawal = tx.type === 'CASH_WITHDRAWAL' || tx.type === 3 || String(tx.type) === '3';
                                                    const isCharge = isApptCharge || isWithdrawal;
                                                    const chargeAmt = isApptCharge ? tx.cost : (isWithdrawal ? Math.abs(tx.cashPayment) : 0);

                                                    const isPmt = tx.type === 'POS_PAYMENT' || tx.type === 1 || String(tx.type) === '1';
                                                    const isTopUp = tx.type === 'TOP_UP' || tx.type === 2 || String(tx.type) === '2';
                                                    const isInflow = tx.type === 'CASH_INFLOW' || tx.type === 4 || String(tx.type) === '4';
                                                    const isPayment = isPmt || isTopUp || isInflow;
                                                    const paidAmt = isPayment ? (tx.cashPayment + tx.creditPayment + tx.debitPayment) : (tx.paidWithBalance > 0 ? tx.paidWithBalance : 0);

                                                    const displayCharge = isCharge ? formatCurrency(chargeAmt) : '—';
                                                    const displayPaid = paidAmt > 0 ? formatCurrency(paidAmt) : '—';

                                                    return (
                                                        <TableRow key={tx.id}>
                                                            <TableCell>{sortedTransactions.length - idx}</TableCell>
                                                            <TableCell>#{tx.id}</TableCell>
                                                            <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                                                            <TableCell>{tx.description || '—'}</TableCell>
                                                            <TableCell align="right" sx={{ color: isCharge ? 'error.main' : 'inherit' }}>
                                                                {displayCharge}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ color: paidAmt > 0 ? 'success.main' : 'inherit' }}>
                                                                {displayPaid}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{
                                                                fontWeight: 500,
                                                                color: tx.finalBalance >= 0 ? 'success.main' : 'error.main'
                                                            }}>
                                                                {formatCurrency(tx.finalBalance)}
                                                            </TableCell>
                                                            <TableCell>{tx.folio || '—'}</TableCell>
                                                            <TableCell>{tx.appointment?.id ? `#${tx.appointment.id}` : '—'}</TableCell>
                                                            <TableCell align="center">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() => {
                                                                        setSelectedTx(tx);
                                                                        setReceiptDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <ReceiptIcon size={18} />
                                                                </IconButton>
                                                            </TableCell>
                                                            <TableCell>
                                                                {tx.user ? `${tx.user.fullName} (${tx.user.id})` : (tx.userId ? `ID: ${tx.userId}` : '—')}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">No transactions found.</Typography>
                                )}
                            </Stack>
                        );
                    })()}

                    {/* Tab 3: Appointments */}
                    {(!loading || detail) && tab === 3 && (
                        detail?.appointments?.length ? (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell># Appt</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Start Time</TableCell>
                                        <TableCell>End Time</TableCell>
                                        <TableCell>Service</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detail.appointments
                                        .slice()
                                        .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
                                        .map((appt) => {
                                            const apptStatus = appt.status?.toLowerCase() === 'ghost' ? 'scheduled' : (appt.status || 'scheduled').toLowerCase();
                                            return (
                                                <TableRow key={appt.id}>
                                                    <TableCell>#{appt.id}</TableCell>
                                                    <TableCell>
                                                        {new Date(appt.appointmentDate).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(appt.appointmentEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell>
                                                        {renderServicesAsChips(appt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={apptStatus}
                                                            onChange={(e) => handleAppointmentStatusChange(appt.id, e.target.value)}
                                                            sx={{
                                                                width: 130,
                                                                '& .MuiInputBase-root': {
                                                                    fontSize: '0.75rem',
                                                                    backgroundColor: STATUS_COLORS[apptStatus]?.bg || 'transparent',
                                                                    color: STATUS_COLORS[apptStatus]?.text || 'inherit',
                                                                    fontWeight: 600,
                                                                },
                                                                '& .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: STATUS_COLORS[apptStatus]?.border || 'rgba(0,0,0,0.23)',
                                                                }
                                                            }}
                                                        >
                                                            {Object.keys(STATUS_COLORS).map(s => (
                                                                <MenuItem
                                                                    key={s}
                                                                    value={s}
                                                                    sx={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        bgcolor: STATUS_COLORS[s].bg,
                                                                        color: STATUS_COLORS[s].text,
                                                                        my: 0.5,
                                                                        mx: 1,
                                                                        borderRadius: 1,
                                                                        '&:hover': {
                                                                            bgcolor: STATUS_COLORS[s].border,
                                                                            color: '#fff'
                                                                        }
                                                                    }}
                                                                >
                                                                    {s.toUpperCase().replace('_', ' ')}
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        ) : (
                            <Typography variant="body2" color="text.secondary">No appointments found.</Typography>
                        )
                    )}

                    {/* Tab 4: Tax data */}
                    {(!loading || detail) && tab === 4 && (
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField label="RFC" value={taxForm.rfc || ''} onChange={e => setTaxForm({ ...taxForm, rfc: e.target.value })} fullWidth />
                            <TextField label="Company Name" value={taxForm.companyName || ''} onChange={e => setTaxForm({ ...taxForm, companyName: e.target.value })} fullWidth />
                            <TextField label="Address" value={taxForm.address || ''} onChange={e => setTaxForm({ ...taxForm, address: e.target.value })} fullWidth />
                            <Stack direction="row" spacing={2}>
                                <TextField label="CP" value={taxForm.cp || ''} onChange={e => setTaxForm({ ...taxForm, cp: e.target.value })} sx={{ flex: 1 }} />
                                <TextField label="Suburb" value={taxForm.suburb || ''} onChange={e => setTaxForm({ ...taxForm, suburb: e.target.value })} sx={{ flex: 2 }} />
                            </Stack>
                            <Stack direction="row" spacing={2}>
                                <TextField label="City" value={taxForm.city || ''} onChange={e => setTaxForm({ ...taxForm, city: e.target.value })} fullWidth />
                                <TextField label="State" value={taxForm.state || ''} onChange={e => setTaxForm({ ...taxForm, state: e.target.value })} fullWidth />
                            </Stack>
                            <TextField select label="Tax Regime" value={taxForm.taxRegime || ''} onChange={e => setTaxForm({ ...taxForm, taxRegime: e.target.value })} fullWidth>
                                <MenuItem value="601">601 - General de Ley Personas Morales</MenuItem>
                                <MenuItem value="603">603 - Personas Morales con Fines no Lucrativos</MenuItem>
                                <MenuItem value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</MenuItem>
                                <MenuItem value="606">606 - Arrendamiento</MenuItem>
                                <MenuItem value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</MenuItem>
                                <MenuItem value="626">626 - Régimen Simplificado de Confianza</MenuItem>
                            </TextField>
                            <TextField select label="CFDI Use" value={taxForm.cfdiUse || ''} onChange={e => setTaxForm({ ...taxForm, cfdiUse: e.target.value })} fullWidth>
                                <MenuItem value="G01">G01 - Adquisición de mercancias</MenuItem>
                                <MenuItem value="G03">G03 - Gastos en general</MenuItem>
                                <MenuItem value="I01">I01 - Construcciones</MenuItem>
                                <MenuItem value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</MenuItem>
                                <MenuItem value="P01">P01 - Por definir</MenuItem>
                            </TextField>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button variant="contained" disabled={savingTax} onClick={handleSaveTaxData}>Save Tax Data</Button>
                            </Box>
                        </Stack>
                    )}

                    {/* Tab 5: Files */}
                    {(!loading || detail) && tab === 5 && (
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PlusIcon />}
                                    onClick={() => setAddFileOpen(true)}
                                >
                                    Add File
                                </Button>
                            </Box>
                            {detail?.patientFiles?.length ? (
                                <Stack spacing={1}>
                                    {detail.patientFiles.map((file) => (
                                        <Stack
                                            key={file.id}
                                            direction="row"
                                            spacing={2}
                                            sx={{
                                                alignItems: 'center',
                                                p: 1.5,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <FileIcon size={24} />
                                            <Stack sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" noWrap>{file.fileName}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {file.fileType} · {new Date(file.uploadedAt).toLocaleDateString()}
                                                </Typography>
                                            </Stack>
                                            <Stack direction="row" spacing={0.5}>
                                                {file.fileUrl && (
                                                    <Tooltip title="Open">
                                                        <IconButton
                                                            size="small"
                                                            component="a"
                                                            href={file.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            color="primary"
                                                        >
                                                            <EyeIcon size={20} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Download">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDownloadFile(file)}
                                                        color="primary"
                                                    >
                                                        <DownloadIcon size={20} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Rename">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRenameFile(file.id, file.fileName)}
                                                        color="primary"
                                                    >
                                                        <PencilIcon size={20} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteFile(file.id)}
                                                    >
                                                        <TrashIcon size={20} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">No files uploaded.</Typography>
                            )}
                        </Stack>
                    )}
                </Box>

                {!loading && (
                    <Box sx={{
                        width: { xs: '100%', md: 280 },
                        borderLeft: { xs: 0, md: 1 },
                        borderTop: { xs: 1, md: 0 },
                        borderColor: 'divider',
                        p: 2,
                        bgcolor: 'background.paper',
                        overflowY: 'auto'
                    }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, textAlign: 'center' }}>Targeted Muscles</Typography>
                        <Stack spacing={3} alignItems="center">
                            <Box sx={{ width: '100%', maxWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>Front (Anterior)</Typography>
                                <CustomBodyModel
                                    data={aggregatedMuscles}
                                    type="anterior"
                                    gender={patient?.gender?.toLowerCase() === 'female' ? 'female' : 'male'}
                                    onClick={() => { }}
                                    highlightedColors={['var(--mui-palette-primary-main)', 'var(--mui-palette-primary-light)']}
                                    style={{ width: '100%' }}
                                />
                            </Box>
                            <Box sx={{ width: '100%', maxWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>Back (Posterior)</Typography>
                                <CustomBodyModel
                                    data={aggregatedMuscles}
                                    type="posterior"
                                    gender={patient?.gender?.toLowerCase() === 'female' ? 'female' : 'male'}
                                    onClick={() => { }}
                                    highlightedColors={['var(--mui-palette-primary-main)', 'var(--mui-palette-primary-light)']}
                                    style={{ width: '100%' }}
                                />
                            </Box>
                        </Stack>
                    </Box>
                )}
            </Stack>
            {/* Add File Dialog */}
            <Dialog open={addFileOpen} onClose={() => setAddFileOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Add File</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <TextField
                            label="File Name"
                            fullWidth
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                        />
                        <TextField
                            label="File URL"
                            fullWidth
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                        />
                        <TextField
                            select
                            label="File Type"
                            fullWidth
                            value={fileType}
                            onChange={(e) => setFileType(e.target.value)}
                        >
                            {FILE_TYPES.map((t) => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddFileOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleAddFile}
                        variant="contained"
                        disabled={!fileName || !fileUrl || submitting}
                    >
                        Upload
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Sale Dialog */}
            <Dialog open={createSaleOpen} onClose={() => setCreateSaleOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Create Direct Sale</DialogTitle>
                <DialogContent dividers>
                    <Typography>
                        Are you sure you want to create a new direct sale for <strong>{fullName}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateSaleOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleCreateDirectSale}
                        variant="contained"
                        disabled={creatingSale}
                    >
                        {creatingSale ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Rehab Dialog */}
            {!!editingRehabProgram && (
                <RehabilitationProgramDialog
                    open={!!editingRehabProgram}
                    existingProgram={editingRehabProgram}
                    patientId={patient?.id || null}
                    onClose={() => { setEditingRehabProgram(null); }}
                    onSuccess={() => {
                        setEditingRehabProgram(null);
                        if (patient) fetchDetail(patient.id);
                    }}
                />
            )}

            {/* View Rehab Details Dialog */}
            {selectedRehabProgram && (
                <RehabilitationProgramDetailsDialog
                    open={!!selectedRehabProgram}
                    program={selectedRehabProgram}
                    onClose={() => setSelectedRehabProgram(null)}
                    onEdit={(p) => {
                        setSelectedRehabProgram(null);
                        setEditingRehabProgram(p);
                    }}
                    onScheduleSuccess={() => {
                        if (patient) fetchDetail(patient.id);
                    }}
                    onDeleteSuccess={() => {
                        if (patient) fetchDetail(patient.id);
                    }}
                />
            )}

            {/* Appointment Bulk Scheduler Dialog */}
            {scheduleProgramForAppointment && patient && (
                <AppointmentDialog
                    open={!!scheduleProgramForAppointment}
                    onClose={() => setScheduleProgramForAppointment(null)}
                    onSuccess={() => {
                        setScheduleProgramForAppointment(null);
                        fetchDetail(patient.id);
                        onClose(); // Optional: Close expedient or keep open
                    }}
                    existingAppointments={[]} // We don't need existing checks for bulk create usually
                    schedulePlanForProgram={scheduleProgramForAppointment}
                    schedulePlanPatient={patient}
                    onGoToRehab={handleGoToRehab}
                />
            )}

            {isAppointmentDialogOpen && patient && (
                <AppointmentDialog
                    open={isAppointmentDialogOpen}
                    onClose={() => { setIsAppointmentDialogOpen(false); setEditingAppointment(undefined); }}
                    onSuccess={() => {
                        setIsAppointmentDialogOpen(false);
                        setEditingAppointment(undefined);
                        fetchDetail(patient.id);
                    }}
                    existingAppointments={[]}
                    appointment={{ ...editingAppointment, patientId: patient.id }}
                    onGoToRehab={handleGoToRehab}
                />
            )}

            <ClinicalHistoryDialog
                open={historyDialogOpen}
                onClose={() => setHistoryDialogOpen(false)}
                patient={detail || patient}
                onEdit={onEdit}
            />

            <CancelAppointmentDialog
                open={cancelDialogOpen}
                onClose={() => { setCancelDialogOpen(false); setCancelingAppointmentId(null); }}
                onConfirmCancel={handleConfirmCancel}
                onReschedule={handleCancelAndReschedule}
            />

            {/* New Charge Dialog */}
            <Dialog open={chargeDialogOpen} onClose={() => setChargeDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>New Manual Charge</DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Charge Amount"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={3}
                            value={chargeDescription}
                            onChange={(e) => setChargeDescription(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setChargeDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleCreateCharge}
                        variant="contained"
                        disabled={savingCharge || !chargeAmount}
                    >
                        {savingCharge ? 'Saving...' : 'Add Charge'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* New Payment Dialog */}
            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>New Payment</DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Cash Payment"
                            value={paymentCash}
                            onChange={(e) => setPaymentCash(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Credit Payment"
                            value={paymentCredit}
                            onChange={(e) => setPaymentCredit(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Debit Payment"
                            value={paymentDebit}
                            onChange={(e) => setPaymentDebit(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Discount"
                            value={paymentDiscount}
                            onChange={(e) => setPaymentDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleCreatePayment}
                        variant="contained"
                        disabled={savingPayment}
                    >
                        {savingPayment ? 'Saving...' : 'Record Payment'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Printable Receipt Dialog */}
            <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0f4c75', color: '#fff' }}>
                    <Typography variant="subtitle1" component="span" fontWeight={600}>
                        Receipt
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <IconButton onClick={() => window.print()} sx={{ color: '#fff', p: 0.5 }}>
                            <PrinterIcon size={20} />
                        </IconButton>
                        <IconButton onClick={() => setReceiptDialogOpen(false)} sx={{ color: '#fff', p: 0.5 }}>
                            <XIcon size={20} />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent id="receipt-print-area" sx={{ p: 4 }}>
                    <style>
                        {`
                          @media print {
                            body * {
                              visibility: hidden;
                            }
                            .no-print {
                              display: none !important;
                            }
                            #receipt-print-area, #receipt-print-area * {
                              visibility: visible;
                            }
                            #receipt-print-area {
                              position: absolute;
                              left: 0;
                              top: 0;
                              width: 100%;
                            }
                          }
                        `}
                    </style>
                    {selectedTx && (
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                            <Box sx={{ mb: 2, textAlign: 'center' }}>
                                <Typography variant="h6" fontWeight={700} color="primary">STORE SYSTEM</Typography>
                                <Typography variant="caption" color="text.secondary">Receipt of Transaction</Typography>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Stack spacing={1} sx={{ mb: 3 }}>
                                <Typography variant="body2"><strong>Folio:</strong> {selectedTx.folio || `TR-${selectedTx.id}`}</Typography>
                                <Typography variant="body2"><strong>Date:</strong> {new Date(selectedTx.createdAt).toLocaleString()}</Typography>
                                <Typography variant="body2"><strong>Patient Name:</strong> {fullName}</Typography>
                                <Typography variant="body2"><strong>Patient ID:</strong> {patient?.id}</Typography>
                                <Typography variant="body2">
                                    <strong>Employee:</strong> {selectedTx.user ? `${selectedTx.user.fullName} (${selectedTx.user.id})` : (selectedTx.userId ? `ID: ${selectedTx.userId}` : '—')}
                                </Typography>
                            </Stack>

                            <Table size="small" sx={{ mb: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>{selectedTx.description || 'General Transaction'}</TableCell>
                                        <TableCell align="right">
                                            {formatCurrency(
                                                (selectedTx.type === 'APPOINTMENT_CHARGE' || selectedTx.type === 0 || String(selectedTx.type) === '0') ? selectedTx.cost :
                                                    (selectedTx.type === 'CASH_WITHDRAWAL' || selectedTx.type === 3 || String(selectedTx.type) === '3') ? Math.abs(selectedTx.cashPayment) :
                                                        (selectedTx.cashPayment + selectedTx.creditPayment + selectedTx.debitPayment)
                                            )}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            <Stack spacing={1} sx={{ maxWidth: 220, ml: 'auto', textAlign: 'right' }}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {formatCurrency(
                                            (selectedTx.type === 'APPOINTMENT_CHARGE' || selectedTx.type === 0 || String(selectedTx.type) === '0') ? selectedTx.cost :
                                                (selectedTx.type === 'CASH_WITHDRAWAL' || selectedTx.type === 3 || String(selectedTx.type) === '3') ? Math.abs(selectedTx.cashPayment) :
                                                    (selectedTx.cashPayment + selectedTx.creditPayment + selectedTx.debitPayment)
                                        )}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Discount:</Typography>
                                    <Typography variant="body2" fontWeight={500}>{formatCurrency(selectedTx.discount)}</Typography>
                                </Stack>
                                <Divider />
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="subtitle2" fontWeight={700}>Total:</Typography>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {formatCurrency(
                                            (selectedTx.type === 'APPOINTMENT_CHARGE' || selectedTx.type === 0 || String(selectedTx.type) === '0') ? (selectedTx.cost - selectedTx.discount) :
                                                (selectedTx.type === 'CASH_WITHDRAWAL' || selectedTx.type === 3 || String(selectedTx.type) === '3') ? (Math.abs(selectedTx.cashPayment) - selectedTx.discount) :
                                                    (selectedTx.cashPayment + selectedTx.creditPayment + selectedTx.debitPayment - selectedTx.discount)
                                        )}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Paid:</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {formatCurrency(
                                            (selectedTx.type === 'APPOINTMENT_CHARGE' || selectedTx.type === 0 || String(selectedTx.type) === '0') ? selectedTx.paidWithBalance :
                                                (selectedTx.type === 'CASH_WITHDRAWAL' || selectedTx.type === 3 || String(selectedTx.type) === '3') ? 0 :
                                                    (selectedTx.cashPayment + selectedTx.creditPayment + selectedTx.debitPayment)
                                        )}
                                    </Typography>
                                </Stack>
                                <Divider />
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="subtitle2" fontWeight={700} color={selectedTx.finalBalance >= 0 ? 'success.main' : 'error.main'}>
                                        Final Balance:
                                    </Typography>
                                    <Typography variant="subtitle2" fontWeight={700} color={selectedTx.finalBalance >= 0 ? 'success.main' : 'error.main'}>
                                        {formatCurrency(selectedTx.finalBalance)}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions className="no-print">
                    <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
