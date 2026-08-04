'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { DotsThreeVertical as DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { 
  Eye as EyeIcon, 
  PencilSimple as PencilSimpleIcon, 
  CopySimple as CopySimpleIcon, 
  ArrowsLeftRight as CompareIcon, 
  ClipboardText as ClipboardIcon, 
  Notepad as NoteIcon, 
  ChatCircleText as ChatCircleTextIcon, 
  Pulse as ActivityIcon, 
  ListChecks as ListChecksIcon, 
  Stethoscope as StethoscopeIcon, 
  FirstAidKit as FirstAidKitIcon, 
  TrendUp as TrendUpIcon, 
  UsersThree as UsersThreeIcon 
} from '@phosphor-icons/react/dist/ssr';
import dayjs from 'dayjs';
import apiClient from '@/lib/api-client';
import { NewConsultationDialog } from './new-consultation-dialog';
import { ConsultationComparisonDialog } from './consultation-comparison-dialog';
import type { PatientRecord } from './patient-types';

export interface Assessment {
    id?: number;
    area: string;
    pain: number;
    painObservations: string;
    edema: string;
    romS: string;
    march: string;
    temperature: string;
    temperatureColoration: string;
    muscleTone: string;
    muscularForce: string;
    sensitivityAndReflexes: string;
    trophism: string;
    trophismObservations: string;
    recovery: number;
    observations: string;
    userId?: number;
    user?: { id: number; fullName: string };
}

export interface Prescription {
    id: number;
    patientId: number;
    consultationId?: number | null;
    number: number;
    date: string;
    prescriptionText: string;
}

export interface Indication {
    id?: number;
    consultationId?: number;
    tx0ServiceIds: string; // Comma-separated IDs
    txServiceIds: string;  // Comma-separated IDs
    periodicity: string;
    nextAssessmentAfterSessions: number;
    discharge: boolean;
    observations: string;
}

export interface Consultation {
    id: number;
    patientId: number;
    userId: number;
    contactId?: number;
    contact?: { id: number; firstName: string; lastName: string };
    date: string;
    reasonForConsultation: string;
    diagnostic: string;
    treatmentText: string;
    evolutionNotes: string;
    observations: string;
    interconsultation?: string;
    reference?: string;
    muscleGroups?: string;
    dateOfInjury?: string;
    nextAppointmentDate?: string;
    user?: { fullName: string };
    patient?: PatientRecord;
    assessments?: Assessment[];
    prescriptions?: Prescription[];
    indications?: Indication[];
    rehabilitationPrograms?: Array<{
        id: number;
        name: string;
        recurrenceRule?: {
            daysOfWeek: string;
            patternType: string;
        };
        services: Array<{
            id: number;
            name: string;
            color: string;
        }>;
    }>;
}

interface ServiceRecord {
    id: number;
    name: string;
    color?: string;
    technologies: { id: number; name: string; }[];
}

interface ConsultationsListViewProps {
    patientId: number;
    onUpdate?: () => void;
}

export function ConsultationsListView({ patientId, onUpdate }: ConsultationsListViewProps): React.JSX.Element {
    const [consultations, setConsultations] = React.useState<Consultation[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [openCompareDialog, setOpenCompareDialog] = React.useState(false);
    const [dialogMode, setDialogMode] = React.useState<'create' | 'view' | 'edit'>('create');
    const [selectedConsultation, setSelectedConsultation] = React.useState<Consultation | null>(null);

    const [allServices, setAllServices] = React.useState<ServiceRecord[]>([]);

    const fetchServices = React.useCallback(async () => {
        try {
            const res = await apiClient.get<ServiceRecord[]>('/Services');
            setAllServices(res.data);
        } catch (error) {
            console.error('Failed to fetch services', error);
        }
    }, []);

    const renderTechnologiesChips = React.useCallback((consultation: Consultation) => {
        if (!consultation.indications || consultation.indications.length === 0) return '—';
        const techMap = new Map<string, string>(); // techName -> color
        consultation.indications.forEach(ind => {
            const serviceIds = [
                ...(ind.tx0ServiceIds ? ind.tx0ServiceIds.split(',') : []),
                ...(ind.txServiceIds ? ind.txServiceIds.split(',') : [])
            ].map(idStr => parseInt(idStr.trim(), 10)).filter(id => !isNaN(id));

            serviceIds.forEach(srvId => {
                const srv = allServices.find(s => s.id === srvId);
                if (srv && srv.technologies) {
                    srv.technologies.forEach(tech => {
                        if (tech.name && !techMap.has(tech.name)) {
                            techMap.set(tech.name, srv.color || '#1976d2');
                        }
                    });
                }
            });
        });

        if (techMap.size === 0) return '—';

        return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ maxWidth: '200px', gap: 0.5 }}>
                {Array.from(techMap.entries()).map(([techName, color], idx) => (
                    <Chip
                        key={idx}
                        label={techName}
                        size="small"
                        sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: color,
                            color: '#fff',
                            fontWeight: 'bold'
                        }}
                    />
                ))}
            </Stack>
        );
    }, [allServices]);

    React.useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [menuConsultation, setMenuConsultation] = React.useState<Consultation | null>(null);
    const openMenu = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, consultation: Consultation) => {
        setAnchorEl(event.currentTarget);
        setMenuConsultation(consultation);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuConsultation(null);
    };

    const handleView = async () => {
        if (menuConsultation) {
            setLoading(true);
            try {
                const res = await apiClient.get<Consultation>(`MedicalRecords/consultations/${menuConsultation.id}`);
                setSelectedConsultation(res.data);
                setDialogMode('view');
                setOpenDialog(true);
            } catch (error) {
                console.error('Failed to fetch consultation details', error);
            } finally {
                setLoading(false);
            }
        }
        handleMenuClose();
    };

    const handleEdit = async () => {
        if (menuConsultation) {
            setLoading(true);
            try {
                const res = await apiClient.get<Consultation>(`MedicalRecords/consultations/${menuConsultation.id}`);
                setSelectedConsultation(res.data);
                setDialogMode('edit');
                setOpenDialog(true);
            } catch (error) {
                console.error('Failed to fetch consultation details', error);
            } finally {
                setLoading(false);
            }
        }
        handleMenuClose();
    };

    const handleDuplicate = async () => {
        if (menuConsultation) {
            setLoading(true);
            try {
                const res = await apiClient.get<Consultation>(`MedicalRecords/consultations/${menuConsultation.id}`);
                setSelectedConsultation(res.data);
                setDialogMode('create');
                setOpenDialog(true);
            } catch (error) {
                console.error('Failed to duplicate consultation details', error);
            } finally {
                setLoading(false);
            }
        }
        handleMenuClose();
    };

    const handleCreate = () => {
        setDialogMode('create');
        setSelectedConsultation(null);
        setOpenDialog(true);
    };

    const fetchConsultations = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<Consultation[]>(`MedicalRecords/patients/${patientId}/consultations`);
            setConsultations(res.data);
        } catch (error) {
            console.error('Failed to fetch consultations', error);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    const handleDialogSuccess = (keepOpen?: boolean) => {
        if (!keepOpen) {
            setOpenDialog(false);
        }
        fetchConsultations();
        if (onUpdate) onUpdate();
    };

    React.useEffect(() => {
        fetchConsultations();
    }, [fetchConsultations]);

    const getDayInitials = (daysOfWeek?: string) => {
        if (!daysOfWeek) return '';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return daysOfWeek.split(',').map(d => {
            const idx = parseInt(d.trim());
            return initials[idx] || '';
        }).filter(Boolean).join(', ');
    };

    const [openViewDialog, setOpenViewDialog] = React.useState(false);
    const [viewDialogData, setViewDialogData] = React.useState<{ type: 'treatment' | 'prescription', content: string } | null>(null);

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CompareIcon />}
                        onClick={() => setOpenCompareDialog(true)}
                        disabled={consultations.length < 2}
                    >
                        Compare consultations
                    </Button>
                    <Button size="small" variant="contained" startIcon={<PlusIcon />} onClick={handleCreate}>
                        New Consultation
                    </Button>
                </Stack>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary">Loading consultations...</Typography>
            ) : consultations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No consultations found.</Typography>
            ) : (
                <TableContainer sx={{
                    maxHeight: '100%',
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 }
                }}>
                    <Table size="small" sx={{ minWidth: '1200px' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell align="center">Reason for consultation</TableCell>
                                <TableCell align="center">Assessment</TableCell>
                                <TableCell align="center">Indications</TableCell>
                                <TableCell align="center">Diagnostic</TableCell>
                                <TableCell align="center">Treatment</TableCell>
                                <TableCell align="center">Evolution notes</TableCell>
                                <TableCell align="center">Interconsultation</TableCell>
                                <TableCell align="center">Prescriptions</TableCell>
                                <TableCell align="center">Observations</TableCell>
                                <TableCell>Reference</TableCell>
                                <TableCell>TX</TableCell>
                                <TableCell>In Charge</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {consultations.map((c) => {
                                return (
                                    <TableRow key={c.id}>
                                        <TableCell sx={{ py: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                #{c.id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap', py: 0.5 }}>
                                            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                                {dayjs(c.date).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.reasonForConsultation ? (
                                                <Tooltip title={`Reason: ${c.reasonForConsultation}`}>
                                                    <ChatCircleTextIcon size={20} style={{ color: '#0284c7' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.assessments && c.assessments.length > 0 ? (
                                                <Tooltip title="Has assessments">
                                                    <ActivityIcon size={20} style={{ color: '#10b981' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.indications && c.indications.length > 0 ? (
                                                <Tooltip title="Has indications">
                                                    <ListChecksIcon size={20} style={{ color: '#f59e0b' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.diagnostic ? (
                                                <Tooltip title={`Diagnostic: ${c.diagnostic}`}>
                                                    <StethoscopeIcon size={20} style={{ color: '#ef4444' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.treatmentText ? (
                                                <Tooltip title={`Treatment: ${c.treatmentText}`}>
                                                    <FirstAidKitIcon size={20} style={{ color: '#ec4899' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.evolutionNotes ? (
                                                <Tooltip title={`Evolution Notes: ${c.evolutionNotes}`}>
                                                    <TrendUpIcon size={20} style={{ color: '#8b5cf6' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">
                                            {c.interconsultation ? (
                                                <Tooltip title={`Interconsultation: ${c.interconsultation}`}>
                                                    <UsersThreeIcon size={20} style={{ color: '#3b82f6' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell align="center">{c.prescriptions?.length || 0}</TableCell>
                                        <TableCell align="center">
                                            {c.observations ? (
                                                <Tooltip title={`Observations: ${c.observations}`}>
                                                    <EyeIcon size={20} style={{ color: '#f97316' }} />
                                                </Tooltip>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>{c.reference || '—'}</TableCell>
                                        <TableCell>{renderTechnologiesChips(c)}</TableCell>
                                        <TableCell>{c.user ? c.user.fullName : '—'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={(e) => handleMenuClick(e, c)}>
                                                <DotsThreeVerticalIcon weight="bold" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleView}>
                    <EyeIcon style={{ marginRight: 8 }} />
                    View
                </MenuItem>
                <MenuItem onClick={handleEdit}>
                    <PencilSimpleIcon style={{ marginRight: 8 }} />
                    Edit
                </MenuItem>
                <MenuItem onClick={handleDuplicate}>
                    <CopySimpleIcon style={{ marginRight: 8 }} />
                    Duplicate
                </MenuItem>
            </Menu>

            <NewConsultationDialog
                open={openDialog}
                patientId={patientId}
                mode={dialogMode}
                consultation={selectedConsultation}
                onClose={() => setOpenDialog(false)}
                onSuccess={handleDialogSuccess}
            />

            <ConsultationComparisonDialog
                open={openCompareDialog}
                onClose={() => setOpenCompareDialog(false)}
                consultations={consultations}
            />

            <Dialog
                                                open={openViewDialog}
                                                onClose={() => setOpenViewDialog(false)}
                                                maxWidth="sm"
                                                fullWidth
                                                TransitionProps={{
                                                    onExited: () => setViewDialogData(null)
                                                }}
                                            >
                                                <DialogTitle sx={{ textTransform: 'capitalize' }}>
                                                    {viewDialogData?.type} Details
                                                </DialogTitle>
                                                <DialogContent dividers>
                                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                        {viewDialogData?.content}
                                                    </Typography>
                                                </DialogContent>
                                                <DialogActions>
                                                    <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
                                                </DialogActions>
                                            </Dialog>
        </Stack>
    );
}
