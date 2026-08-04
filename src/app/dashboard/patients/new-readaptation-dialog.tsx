'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import apiClient from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';

export interface ReadaptationRecord {
    id?: string;
    patientId: number;
    userId: number;
    date?: string;
    caseDescription: string;
    patientProfile: string;
    rehabilitationPhase: string;
    sessionFrequency: string;
    objectives?: {
        mobility: string;
        core: string;
        muscularStrength: string;
        motorControlProprioception: string;
        impact: string;
    };
    measurements?: {
        quadricepsLeft: number | null;
        quadricepsRight: number | null;
        hamstringsLeft: number | null;
        hamstringsRight: number | null;
        ankleRangeCm: number | null;
        handMeasurement: string;
        rotationsLeft: string;
        rotationsRight: string;
        painObservations: string;
        coreAnterior: number | null;
        coreLateralLeft: number | null;
        coreLateralRight: number | null;
        corePosteriorPlank: number | null;
    };
    tests?: {
        balanceOpenEyesScore: number;
        balanceClosedEyesScore: number;
        postureCompensationsScore: number;
        painDiscomfortScore: number;
        chesterHrInitial: number | null;
        chesterHr80: number | null;
        chesterHr100: number | null;
        chesterHr110: number | null;
        chesterHr120: number | null;
        jumpTwoLegsWithImpulse: string;
        jumpTwoLegsWithoutImpulse: string;
        jumpRightLegWithImpulse: string;
        jumpLeftLegWithImpulse: string;
        jumpRightLegWithoutImpulse: string;
        jumpLeftLegWithoutImpulse: string;
        hipFlexionLeft: number | null;
        hipFlexionRight: number | null;
        hipExtensionLeft: number | null;
        hipExtensionRight: number | null;
        hipAdductionLeft: number | null;
        hipAdductionRight: number | null;
        hipAbductionLeft: number | null;
        hipAbductionRight: number | null;
        hipExternalRotationLeft: number | null;
        hipExternalRotationRight: number | null;
    };
    revaluationDates?: {
        dynamometryReviewDate: string | null;
        orthopedicReviewDate: string | null;
    };
    user?: { fullName: string };
}

interface FastTextFieldProps extends Omit<React.ComponentProps<typeof TextField>, 'onChange'> {
    value: string;
    onChange: (val: string) => void;
}

function FastTextField({ value, onChange, ...rest }: FastTextFieldProps) {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onChange(val);
        }, 150);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onChange(e.target.value);
        if (rest.onBlur) {
            rest.onBlur(e);
        }
    };

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <TextField
            {...rest}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
}

interface NewReadaptationDialogProps {
    open: boolean;
    patientId: number;
    onClose: () => void;
    onSuccess: () => void;
    readaptation?: ReadaptationRecord | null;
    mode?: 'create' | 'view' | 'edit';
}

const SCORE_LABELS = ['No Pain (0)', 'Mild (1)', 'Moderate (2)', 'Severe (3)'];
const SCORE_COLORS = ['success.main', 'warning.light', 'warning.main', 'error.main'];

export function NewReadaptationDialog({ open, patientId, onClose, onSuccess, readaptation: existingReadaptation, mode = 'create' }: NewReadaptationDialogProps): React.JSX.Element {
    const { user } = useUser();
    const isView = mode === 'view';
    const isEdit = mode === 'edit';

    const [submitting, setSubmitting] = React.useState(false);

    // Form State
    const [formState, setFormState] = React.useState({
        caseDescription: '',
        patientProfile: 'Non-Athlete',
        rehabilitationPhase: 'Phase 1',
        sessionFrequency: '',
        mobility: '',
        core: '',
        muscularStrength: '',
        motorControlProprioception: '',
        impact: '',
        quadricepsLeft: '' as number | '',
        quadricepsRight: '' as number | '',
        hamstringsLeft: '' as number | '',
        hamstringsRight: '' as number | '',
        ankleRangeCm: '' as number | '',
        handMeasurement: '',
        rotationsLeft: '',
        rotationsRight: '',
        painObservations: '',
        coreAnterior: '' as number | '',
        coreLateralLeft: '' as number | '',
        coreLateralRight: '' as number | '',
        corePosteriorPlank: '' as number | '',
        balanceOpenEyesScore: 0,
        balanceClosedEyesScore: 0,
        postureCompensationsScore: 0,
        painDiscomfortScore: 0,
        chesterHrInitial: '' as number | '',
        chesterHr80: '' as number | '',
        chesterHr100: '' as number | '',
        chesterHr110: '' as number | '',
        chesterHr120: '' as number | '',
        jumpTwoLegsWithImpulse: 'Green',
        jumpTwoLegsWithoutImpulse: 'Green',
        jumpRightLegWithImpulse: 'Green',
        jumpLeftLegWithImpulse: 'Green',
        jumpRightLegWithoutImpulse: 'Green',
        jumpLeftLegWithoutImpulse: 'Green',
        hipFlexionLeft: '' as number | '',
        hipFlexionRight: '' as number | '',
        hipExtensionLeft: '' as number | '',
        hipExtensionRight: '' as number | '',
        hipAdductionLeft: '' as number | '',
        hipAdductionRight: '' as number | '',
        hipAbductionLeft: '' as number | '',
        hipAbductionRight: '' as number | '',
        hipExternalRotationLeft: '' as number | '',
        hipExternalRotationRight: '' as number | '',
        dynamometryReviewDate: null as Dayjs | null,
        orthopedicReviewDate: null as Dayjs | null,
    });

    React.useEffect(() => {
        if (open) {
            if (existingReadaptation) {
                setFormState({
                    caseDescription: existingReadaptation.caseDescription || '',
                    patientProfile: existingReadaptation.patientProfile || 'Non-Athlete',
                    rehabilitationPhase: existingReadaptation.rehabilitationPhase || 'Phase 1',
                    sessionFrequency: existingReadaptation.sessionFrequency || '',
                    mobility: existingReadaptation.objectives?.mobility || '',
                    core: existingReadaptation.objectives?.core || '',
                    muscularStrength: existingReadaptation.objectives?.muscularStrength || '',
                    motorControlProprioception: existingReadaptation.objectives?.motorControlProprioception || '',
                    impact: existingReadaptation.objectives?.impact || '',
                    quadricepsLeft: existingReadaptation.measurements?.quadricepsLeft ?? '',
                    quadricepsRight: existingReadaptation.measurements?.quadricepsRight ?? '',
                    hamstringsLeft: existingReadaptation.measurements?.hamstringsLeft ?? '',
                    hamstringsRight: existingReadaptation.measurements?.hamstringsRight ?? '',
                    ankleRangeCm: existingReadaptation.measurements?.ankleRangeCm ?? '',
                    handMeasurement: existingReadaptation.measurements?.handMeasurement || '',
                    rotationsLeft: existingReadaptation.measurements?.rotationsLeft || '',
                    rotationsRight: existingReadaptation.measurements?.rotationsRight || '',
                    painObservations: existingReadaptation.measurements?.painObservations || '',
                    coreAnterior: existingReadaptation.measurements?.coreAnterior ?? '',
                    coreLateralLeft: existingReadaptation.measurements?.coreLateralLeft ?? '',
                    coreLateralRight: existingReadaptation.measurements?.coreLateralRight ?? '',
                    corePosteriorPlank: existingReadaptation.measurements?.corePosteriorPlank ?? '',
                    balanceOpenEyesScore: existingReadaptation.tests?.balanceOpenEyesScore ?? 0,
                    balanceClosedEyesScore: existingReadaptation.tests?.balanceClosedEyesScore ?? 0,
                    postureCompensationsScore: existingReadaptation.tests?.postureCompensationsScore ?? 0,
                    painDiscomfortScore: existingReadaptation.tests?.painDiscomfortScore ?? 0,
                    chesterHrInitial: existingReadaptation.tests?.chesterHrInitial ?? '',
                    chesterHr80: existingReadaptation.tests?.chesterHr80 ?? '',
                    chesterHr100: existingReadaptation.tests?.chesterHr100 ?? '',
                    chesterHr110: existingReadaptation.tests?.chesterHr110 ?? '',
                    chesterHr120: existingReadaptation.tests?.chesterHr120 ?? '',
                    jumpTwoLegsWithImpulse: existingReadaptation.tests?.jumpTwoLegsWithImpulse || 'Green',
                    jumpTwoLegsWithoutImpulse: existingReadaptation.tests?.jumpTwoLegsWithoutImpulse || 'Green',
                    jumpRightLegWithImpulse: existingReadaptation.tests?.jumpRightLegWithImpulse || 'Green',
                    jumpLeftLegWithImpulse: existingReadaptation.tests?.jumpLeftLegWithImpulse || 'Green',
                    jumpRightLegWithoutImpulse: existingReadaptation.tests?.jumpRightLegWithoutImpulse || 'Green',
                    jumpLeftLegWithoutImpulse: existingReadaptation.tests?.jumpLeftLegWithoutImpulse || 'Green',
                    hipFlexionLeft: existingReadaptation.tests?.hipFlexionLeft ?? '',
                    hipFlexionRight: existingReadaptation.tests?.hipFlexionRight ?? '',
                    hipExtensionLeft: existingReadaptation.tests?.hipExtensionLeft ?? '',
                    hipExtensionRight: existingReadaptation.tests?.hipExtensionRight ?? '',
                    hipAdductionLeft: existingReadaptation.tests?.hipAdductionLeft ?? '',
                    hipAdductionRight: existingReadaptation.tests?.hipAdductionRight ?? '',
                    hipAbductionLeft: existingReadaptation.tests?.hipAbductionLeft ?? '',
                    hipAbductionRight: existingReadaptation.tests?.hipAbductionRight ?? '',
                    hipExternalRotationLeft: existingReadaptation.tests?.hipExternalRotationLeft ?? '',
                    hipExternalRotationRight: existingReadaptation.tests?.hipExternalRotationRight ?? '',
                    dynamometryReviewDate: existingReadaptation.revaluationDates?.dynamometryReviewDate ? dayjs(existingReadaptation.revaluationDates.dynamometryReviewDate) : null,
                    orthopedicReviewDate: existingReadaptation.revaluationDates?.orthopedicReviewDate ? dayjs(existingReadaptation.revaluationDates.orthopedicReviewDate) : null,
                });
            } else {
                setFormState({
                    caseDescription: '',
                    patientProfile: 'Non-Athlete',
                    rehabilitationPhase: 'Phase 1',
                    sessionFrequency: '',
                    mobility: '',
                    core: '',
                    muscularStrength: '',
                    motorControlProprioception: '',
                    impact: '',
                    quadricepsLeft: '',
                    quadricepsRight: '',
                    hamstringsLeft: '',
                    hamstringsRight: '',
                    ankleRangeCm: '',
                    handMeasurement: '',
                    rotationsLeft: '',
                    rotationsRight: '',
                    painObservations: '',
                    coreAnterior: '',
                    coreLateralLeft: '',
                    coreLateralRight: '',
                    corePosteriorPlank: '',
                    balanceOpenEyesScore: 0,
                    balanceClosedEyesScore: 0,
                    postureCompensationsScore: 0,
                    painDiscomfortScore: 0,
                    chesterHrInitial: '',
                    chesterHr80: '',
                    chesterHr100: '',
                    chesterHr110: '',
                    chesterHr120: '',
                    jumpTwoLegsWithImpulse: 'Green',
                    jumpTwoLegsWithoutImpulse: 'Green',
                    jumpRightLegWithImpulse: 'Green',
                    jumpLeftLegWithImpulse: 'Green',
                    jumpRightLegWithoutImpulse: 'Green',
                    jumpLeftLegWithoutImpulse: 'Green',
                    hipFlexionLeft: '',
                    hipFlexionRight: '',
                    hipExtensionLeft: '',
                    hipExtensionRight: '',
                    hipAdductionLeft: '',
                    hipAdductionRight: '',
                    hipAbductionLeft: '',
                    hipAbductionRight: '',
                    hipExternalRotationLeft: '',
                    hipExternalRotationRight: '',
                    dynamometryReviewDate: null,
                    orthopedicReviewDate: null,
                });
            }
        }
    }, [open, existingReadaptation]);

    const getDiff = (l: number | '', r: number | '') => {
        if (l === '' || r === '') return '-';
        return Math.abs(Number(l) - Number(r)).toFixed(1);
    };

    const getDeficit = (l: number | '', r: number | '', isStrength = false) => {
        if (l === '' || r === '' || Number(l) === 0 || Number(r) === 0) return '-';
        const left = Number(l);
        const right = Number(r);
        if (isStrength) {
            const deficit = ((left - right) / left) * 100;
            return `${deficit > 0 ? '+' : ''}${deficit.toFixed(1)}%`;
        }
        const diff = Math.abs(left - right);
        const max = Math.max(left, right);
        return `${((diff / max) * 100).toFixed(1)}%`;
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const payload = {
                patientId,
                userId: user?.id || 1,
                caseDescription: formState.caseDescription,
                patientProfile: formState.patientProfile,
                rehabilitationPhase: formState.rehabilitationPhase,
                sessionFrequency: formState.sessionFrequency,
                objectives: {
                    mobility: formState.mobility,
                    core: formState.core,
                    muscularStrength: formState.muscularStrength,
                    motorControlProprioception: formState.motorControlProprioception,
                    impact: formState.impact
                },
                measurements: {
                    quadricepsLeft: formState.quadricepsLeft === '' ? null : Number(formState.quadricepsLeft),
                    quadricepsRight: formState.quadricepsRight === '' ? null : Number(formState.quadricepsRight),
                    hamstringsLeft: formState.hamstringsLeft === '' ? null : Number(formState.hamstringsLeft),
                    hamstringsRight: formState.hamstringsRight === '' ? null : Number(formState.hamstringsRight),
                    ankleRangeCm: formState.ankleRangeCm === '' ? null : Number(formState.ankleRangeCm),
                    handMeasurement: formState.handMeasurement,
                    rotationsLeft: formState.rotationsLeft,
                    rotationsRight: formState.rotationsRight,
                    painObservations: formState.painObservations,
                    coreAnterior: formState.coreAnterior === '' ? null : Number(formState.coreAnterior),
                    coreLateralLeft: formState.coreLateralLeft === '' ? null : Number(formState.coreLateralLeft),
                    coreLateralRight: formState.coreLateralRight === '' ? null : Number(formState.coreLateralRight),
                    corePosteriorPlank: formState.corePosteriorPlank === '' ? null : Number(formState.corePosteriorPlank)
                },
                tests: {
                    balanceOpenEyesScore: Number(formState.balanceOpenEyesScore) || 0,
                    balanceClosedEyesScore: Number(formState.balanceClosedEyesScore) || 0,
                    postureCompensationsScore: Number(formState.postureCompensationsScore) || 0,
                    painDiscomfortScore: Number(formState.painDiscomfortScore) || 0,
                    chesterHrInitial: formState.chesterHrInitial === '' ? null : Number(formState.chesterHrInitial),
                    chesterHr80: formState.chesterHr80 === '' ? null : Number(formState.chesterHr80),
                    chesterHr100: formState.chesterHr100 === '' ? null : Number(formState.chesterHr100),
                    chesterHr110: formState.chesterHr110 === '' ? null : Number(formState.chesterHr110),
                    chesterHr120: formState.chesterHr120 === '' ? null : Number(formState.chesterHr120),
                    jumpTwoLegsWithImpulse: formState.jumpTwoLegsWithImpulse,
                    jumpTwoLegsWithoutImpulse: formState.jumpTwoLegsWithoutImpulse,
                    jumpRightLegWithImpulse: formState.jumpRightLegWithImpulse,
                    jumpLeftLegWithImpulse: formState.jumpLeftLegWithImpulse,
                    jumpRightLegWithoutImpulse: formState.jumpRightLegWithoutImpulse,
                    jumpLeftLegWithoutImpulse: formState.jumpLeftLegWithoutImpulse,
                    hipFlexionLeft: formState.hipFlexionLeft === '' ? null : Number(formState.hipFlexionLeft),
                    hipFlexionRight: formState.hipFlexionRight === '' ? null : Number(formState.hipFlexionRight),
                    hipExtensionLeft: formState.hipExtensionLeft === '' ? null : Number(formState.hipExtensionLeft),
                    hipExtensionRight: formState.hipExtensionRight === '' ? null : Number(formState.hipExtensionRight),
                    hipAdductionLeft: formState.hipAdductionLeft === '' ? null : Number(formState.hipAdductionLeft),
                    hipAdductionRight: formState.hipAdductionRight === '' ? null : Number(formState.hipAdductionRight),
                    hipAbductionLeft: formState.hipAbductionLeft === '' ? null : Number(formState.hipAbductionLeft),
                    hipAbductionRight: formState.hipAbductionRight === '' ? null : Number(formState.hipAbductionRight),
                    hipExternalRotationLeft: formState.hipExternalRotationLeft === '' ? null : Number(formState.hipExternalRotationLeft),
                    hipExternalRotationRight: formState.hipExternalRotationRight === '' ? null : Number(formState.hipExternalRotationRight)
                },
                revaluationDates: {
                    dynamometryReviewDate: formState.dynamometryReviewDate ? formState.dynamometryReviewDate.toISOString() : null,
                    orthopedicReviewDate: formState.orthopedicReviewDate ? formState.orthopedicReviewDate.toISOString() : null
                }
            };

            if (isEdit && existingReadaptation) {
                await apiClient.put(`MedicalRecords/readaptations/${existingReadaptation.id}`, payload);
            } else {
                await apiClient.post(`MedicalRecords/readaptations`, payload);
            }

            onSuccess();
        } catch (error) {
            console.error('Failed to save readaptation report', error);
            alert('Failed to save readaptation report. Please check the fields and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FileTextIcon weight="bold" size={24} />
                    {isView ? 'View Readaptation Report' : isEdit ? 'Edit Readaptation Report' : 'New Readaptation Report'}
                </Typography>
                <IconButton onClick={onClose}>
                    <XIcon size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
                <Stack spacing={3}>
                    {/* Section 1: General Info */}
                    <Accordion defaultExpanded disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary expandIcon={<CaretDownIcon size={20} />} sx={{ bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Section 1: General Information</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FastTextField
                                label="Case Description"
                                value={formState.caseDescription}
                                onChange={(val) => setFormState(prev => ({ ...prev, caseDescription: val }))}
                                multiline
                                rows={4}
                                fullWidth
                                slotProps={{ input: { readOnly: isView } }}
                            />
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                                <TextField
                                    select
                                    label="Patient Profile"
                                    value={formState.patientProfile}
                                    onChange={(e) => setFormState(prev => ({ ...prev, patientProfile: e.target.value }))}
                                    fullWidth
                                    slotProps={{ select: { disabled: isView } }}
                                >
                                    <MenuItem value="Athlete">Athlete</MenuItem>
                                    <MenuItem value="Non-Athlete">Non-Athlete</MenuItem>
                                </TextField>
                                <TextField
                                    select
                                    label="Rehabilitation Phase"
                                    value={formState.rehabilitationPhase}
                                    onChange={(e) => setFormState(prev => ({ ...prev, rehabilitationPhase: e.target.value }))}
                                    fullWidth
                                    slotProps={{ select: { disabled: isView } }}
                                >
                                    <MenuItem value="Phase 1">Phase 1</MenuItem>
                                    <MenuItem value="Phase 2">Phase 2</MenuItem>
                                    <MenuItem value="Phase 3">Phase 3</MenuItem>
                                    <MenuItem value="Phase 4">Phase 4</MenuItem>
                                </TextField>
                                <FastTextField
                                    label="Sessions (Number/Frequency)"
                                    value={formState.sessionFrequency}
                                    onChange={(val) => setFormState(prev => ({ ...prev, sessionFrequency: val }))}
                                    placeholder="e.g. 3x per week"
                                    fullWidth
                                    slotProps={{ input: { readOnly: isView } }}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Section 2: Objectives and Work Plan */}
                    <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary expandIcon={<CaretDownIcon size={20} />} sx={{ bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Section 2: Objectives and Work Plan</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                                <FastTextField
                                    label="Mobility"
                                    value={formState.mobility}
                                    onChange={(val) => setFormState(prev => ({ ...prev, mobility: val }))}
                                    multiline
                                    rows={3}
                                    fullWidth
                                    slotProps={{ input: { readOnly: isView } }}
                                />
                                <FastTextField
                                    label="Core (Abdominal)"
                                    value={formState.core}
                                    onChange={(val) => setFormState(prev => ({ ...prev, core: val }))}
                                    multiline
                                    rows={3}
                                    fullWidth
                                    slotProps={{ input: { readOnly: isView } }}
                                />
                                <FastTextField
                                    label="Muscular Strength"
                                    value={formState.muscularStrength}
                                    onChange={(val) => setFormState(prev => ({ ...prev, muscularStrength: val }))}
                                    multiline
                                    rows={3}
                                    fullWidth
                                    slotProps={{ input: { readOnly: isView } }}
                                />
                                <FastTextField
                                    label="Motor Control and Proprioception"
                                    value={formState.motorControlProprioception}
                                    onChange={(val) => setFormState(prev => ({ ...prev, motorControlProprioception: val }))}
                                    multiline
                                    rows={3}
                                    fullWidth
                                    slotProps={{ input: { readOnly: isView } }}
                                />
                            </Box>
                            <FastTextField
                                label="Impact / Pliometry / Running"
                                value={formState.impact}
                                onChange={(val) => setFormState(prev => ({ ...prev, impact: val }))}
                                multiline
                                rows={3}
                                fullWidth
                                slotProps={{ input: { readOnly: isView } }}
                            />
                        </AccordionDetails>
                    </Accordion>

                    {/* Section 3: Physical Measurements */}
                    <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary expandIcon={<CaretDownIcon size={20} />} sx={{ bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Section 3: Physical Measurements</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Lower Limbs */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 'bold' }}>Lower Limbs (MMII)</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Muscle / Joint</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Left (kg/cm)</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Right (kg/cm)</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Difference</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Deficit</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {[
                                                { leftKey: 'quadricepsLeft', rightKey: 'quadricepsRight', label: 'Quadriceps (Strength)', isStrength: true },
                                                { leftKey: 'hamstringsLeft', rightKey: 'hamstringsRight', label: 'Hamstrings (Strength)', isStrength: true },
                                                { leftKey: 'ankleRangeCm', rightKey: 'ankleRangeCm', label: 'Ankle Range of Motion', isStrength: false }
                                            ].map((row) => {
                                                const lVal = (formState as any)[row.leftKey];
                                                const rVal = row.leftKey === 'ankleRangeCm' ? lVal : (formState as any)[row.rightKey];
                                                const diffVal = row.leftKey === 'ankleRangeCm' ? '-' : getDiff(lVal, rVal);
                                                const deficitVal = row.leftKey === 'ankleRangeCm' ? '-' : getDeficit(lVal, rVal, row.isStrength);
                                                const isSignificant = diffVal !== '-' && Number(diffVal) >= 3.0;

                                                return (
                                                    <TableRow key={row.label}>
                                                        <TableCell sx={{ py: 1, fontWeight: 'medium' }}>{row.label}</TableCell>
                                                        <TableCell sx={{ py: 1 }}>
                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                value={lVal}
                                                                onChange={(e) => setFormState(prev => ({ ...prev, [row.leftKey]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                                fullWidth
                                                                slotProps={{ input: { readOnly: isView } }}
                                                            />
                                                        </TableCell>
                                                        {row.leftKey === 'ankleRangeCm' ? (
                                                            <TableCell sx={{ py: 1 }} color="text.secondary">—</TableCell>
                                                        ) : (
                                                            <TableCell sx={{ py: 1 }}>
                                                                <TextField
                                                                    type="number"
                                                                    size="small"
                                                                    value={rVal}
                                                                    onChange={(e) => setFormState(prev => ({ ...prev, [row.rightKey]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                                    fullWidth
                                                                    slotProps={{ input: { readOnly: isView } }}
                                                                />
                                                            </TableCell>
                                                        )}
                                                        <TableCell sx={{ py: 1 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: isSignificant ? 'error.main' : 'text.primary' }}>
                                                                {diffVal}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                                {deficitVal}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            {/* Upper Limbs */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 'bold' }}>Upper Limbs (MMSS) & Rotations</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                                    <FastTextField
                                        label="Hand Measurement / Grip Strength"
                                        value={formState.handMeasurement}
                                        onChange={(val) => setFormState(prev => ({ ...prev, handMeasurement: val }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <FastTextField
                                        label="Pain Observations"
                                        value={formState.painObservations}
                                        onChange={(val) => setFormState(prev => ({ ...prev, painObservations: val }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <FastTextField
                                        label="Rotations (Left)"
                                        value={formState.rotationsLeft}
                                        onChange={(val) => setFormState(prev => ({ ...prev, rotationsLeft: val }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <FastTextField
                                        label="Rotations (Right)"
                                        value={formState.rotationsRight}
                                        onChange={(val) => setFormState(prev => ({ ...prev, rotationsRight: val }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                </Box>
                            </Box>

                            {/* Core Plank Times */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 'bold' }}>Core Endurance (seconds)</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                                    <TextField
                                        type="number"
                                        label="Anterior Plank"
                                        value={formState.coreAnterior}
                                        onChange={(e) => setFormState(prev => ({ ...prev, coreAnterior: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="Lateral Plank (Left)"
                                        value={formState.coreLateralLeft}
                                        onChange={(e) => setFormState(prev => ({ ...prev, coreLateralLeft: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="Lateral Plank (Right)"
                                        value={formState.coreLateralRight}
                                        onChange={(e) => setFormState(prev => ({ ...prev, coreLateralRight: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="Posterior Plank"
                                        value={formState.corePosteriorPlank}
                                        onChange={(e) => setFormState(prev => ({ ...prev, corePosteriorPlank: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Section 4: Functional Criteria & Tests */}
                    <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary expandIcon={<CaretDownIcon size={20} />} sx={{ bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Section 4: Functional Criteria & Tests</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Functional Criteria Score */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>Functional Criteria Scores (0 to 3)</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                                    {[
                                        { key: 'balanceOpenEyesScore', label: 'Balance (Open Eyes)' },
                                        { key: 'balanceClosedEyesScore', label: 'Balance (Closed Eyes)' },
                                        { key: 'postureCompensationsScore', label: 'Posture Compensations' },
                                        { key: 'painDiscomfortScore', label: 'Pain & Discomfort' },
                                    ].map((field) => {
                                        const val = (formState as any)[field.key];
                                        return (
                                            <Box key={field.key}>
                                                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                                    {field.label}:{' '}
                                                    <Typography component="span" variant="body2" sx={{ fontWeight: 'bold', color: SCORE_COLORS[val] }}>
                                                        {SCORE_LABELS[val]}
                                                    </Typography>
                                                </Typography>
                                                <Slider
                                                    value={val}
                                                    onChange={(_, newValue) => setFormState(prev => ({ ...prev, [field.key]: newValue as number }))}
                                                    step={1}
                                                    min={0}
                                                    max={3}
                                                    disabled={isView}
                                                    marks={SCORE_LABELS.map((label, idx) => ({ value: idx, label: String(idx) }))}
                                                    valueLabelDisplay="off"
                                                />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            {/* Chester Test */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 'bold' }}>Chester Step Test (Heart Rate / BPM)</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' }, gap: 2 }}>
                                    <TextField
                                        type="number"
                                        label="Initial HR"
                                        value={formState.chesterHrInitial}
                                        onChange={(e) => setFormState(prev => ({ ...prev, chesterHrInitial: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="HR @ Stage 1 (80 BPM)"
                                        value={formState.chesterHr80}
                                        onChange={(e) => setFormState(prev => ({ ...prev, chesterHr80: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="HR @ Stage 2 (100 BPM)"
                                        value={formState.chesterHr100}
                                        onChange={(e) => setFormState(prev => ({ ...prev, chesterHr100: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="HR @ Stage 3 (110 BPM)"
                                        value={formState.chesterHr110}
                                        onChange={(e) => setFormState(prev => ({ ...prev, chesterHr110: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                    <TextField
                                        type="number"
                                        label="HR @ Stage 4 (120 BPM)"
                                        value={formState.chesterHr120}
                                        onChange={(e) => setFormState(prev => ({ ...prev, chesterHr120: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        fullWidth
                                        slotProps={{ input: { readOnly: isView } }}
                                    />
                                </Box>
                            </Box>

                            {/* Jump Tests */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 'bold' }}>Jump Test Pain/Control Evaluation (EVA Color Scale)</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                                    {[
                                        { key: 'jumpTwoLegsWithImpulse', label: 'Two Legs (With Impulse)' },
                                        { key: 'jumpTwoLegsWithoutImpulse', label: 'Two Legs (Without Impulse)' },
                                        { key: 'jumpRightLegWithImpulse', label: 'Right Leg (With Impulse)' },
                                        { key: 'jumpLeftLegWithImpulse', label: 'Left Leg (With Impulse)' },
                                        { key: 'jumpRightLegWithoutImpulse', label: 'Right Leg (Without Impulse)' },
                                        { key: 'jumpLeftLegWithoutImpulse', label: 'Left Leg (Without Impulse)' },
                                    ].map((test) => (
                                        <TextField
                                            key={test.key}
                                            select
                                            size="small"
                                            label={test.label}
                                            value={(formState as any)[test.key]}
                                            onChange={(e) => setFormState(prev => ({ ...prev, [test.key]: e.target.value }))}
                                            fullWidth
                                            slotProps={{ select: { disabled: isView } }}
                                        >
                                            <MenuItem value="Green">Green (Excellent control / No pain)</MenuItem>
                                            <MenuItem value="Yellow">Yellow (Mild discomfort / Compensations)</MenuItem>
                                            <MenuItem value="Red">Red (High pain / Critical control deficit)</MenuItem>
                                        </TextField>
                                    ))}
                                </Box>
                            </Box>

                            {/* Hip Dynamometry */}
                            <Box>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 'bold' }}>Hip Dynamometry MMII (kg)</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Movement</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Left (kg)</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Right (kg)</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Difference</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {[
                                                { leftKey: 'hipFlexionLeft', rightKey: 'hipFlexionRight', label: 'Flexion' },
                                                { leftKey: 'hipExtensionLeft', rightKey: 'hipExtensionRight', label: 'Extension' },
                                                { leftKey: 'hipAdductionLeft', rightKey: 'hipAdductionRight', label: 'Adduction' },
                                                { leftKey: 'hipAbductionLeft', rightKey: 'hipAbductionRight', label: 'Abduction' },
                                                { leftKey: 'hipExternalRotationLeft', rightKey: 'hipExternalRotationRight', label: 'External Rotation' },
                                            ].map((row) => {
                                                const lVal = (formState as any)[row.leftKey];
                                                const rVal = (formState as any)[row.rightKey];
                                                const diffVal = getDiff(lVal, rVal);
                                                const isSignificant = diffVal !== '-' && Number(diffVal) >= 3.0;

                                                return (
                                                    <TableRow key={row.label}>
                                                        <TableCell sx={{ py: 1, fontWeight: 'medium' }}>{row.label}</TableCell>
                                                        <TableCell sx={{ py: 1 }}>
                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                value={lVal}
                                                                onChange={(e) => setFormState(prev => ({ ...prev, [row.leftKey]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                                fullWidth
                                                                slotProps={{ input: { readOnly: isView } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1 }}>
                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                value={rVal}
                                                                onChange={(e) => setFormState(prev => ({ ...prev, [row.rightKey]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                                fullWidth
                                                                slotProps={{ input: { readOnly: isView } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1 }}>
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    fontWeight: 'bold',
                                                                    color: isSignificant ? 'error.main' : 'text.primary'
                                                                }}
                                                            >
                                                                {diffVal} {diffVal !== '-' && 'kg'}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Section 5: Revaluation Dates */}
                    <Accordion disableGutters sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', overflow: 'hidden' }}>
                        <AccordionSummary expandIcon={<CaretDownIcon size={20} />} sx={{ bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Section 5: Revaluation Dates</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 3 }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                                    <DatePicker
                                        label="Dynamometry Review Date"
                                        value={formState.dynamometryReviewDate}
                                        onChange={(newValue) => setFormState(prev => ({ ...prev, dynamometryReviewDate: newValue }))}
                                        format="DD/MM/YYYY"
                                        readOnly={isView}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                    <DatePicker
                                        label="Orthopedic Review Date"
                                        value={formState.orthopedicReviewDate}
                                        onChange={(newValue) => setFormState(prev => ({ ...prev, orthopedicReviewDate: newValue }))}
                                        format="DD/MM/YYYY"
                                        readOnly={isView}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                </Box>
                            </LocalizationProvider>
                        </AccordionDetails>
                    </Accordion>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="outlined" color="secondary">
                    Close
                </Button>
                {!isView && (
                    <Button onClick={handleSave} variant="contained" color="primary" disabled={submitting}>
                        {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Report'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
