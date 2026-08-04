'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Typography,
    Grid,
    Autocomplete,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    IconButton,
    Divider
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { ArrowsLeftRight as CompareIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { FilePlus as FilePlusIcon } from '@phosphor-icons/react/dist/ssr/FilePlus';
import apiClient from '@/lib/api-client';
import type { Consultation, Assessment } from './consultations-list-view';
import { GenerateReportDialog, type ComparisonArea } from './generate-report-dialog';

export interface ConsultationComparisonDialogProps {
    open: boolean;
    onClose: () => void;
    consultations: Consultation[];
}

export function ConsultationComparisonDialog({ open, onClose, consultations }: ConsultationComparisonDialogProps): React.JSX.Element {
    const [leftConsultationId, setLeftConsultationId] = React.useState<number | null>(null);
    const [rightConsultationId, setRightConsultationId] = React.useState<number | null>(null);
    const [leftDetails, setLeftDetails] = React.useState<Consultation | null>(null);
    const [rightDetails, setRightDetails] = React.useState<Consultation | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [openReportDialog, setOpenReportDialog] = React.useState(false);

    const patientId = consultations[0]?.patientId; // Get patientId from consultations list

    React.useEffect(() => {
        if (!open) {
            setLeftConsultationId(null);
            setRightConsultationId(null);
            setLeftDetails(null);
            setRightDetails(null);
        }
    }, [open]);

    const fetchDetails = async (id: number, side: 'left' | 'right') => {
        setLoading(true);
        try {
            const res = await apiClient.get<Consultation>(`/MedicalRecords/consultations/${id}`);
            if (side === 'left') setLeftDetails(res.data);
            else setRightDetails(res.data);
        } catch (error) {
            console.error('Failed to fetch consultation details', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeftChange = (id: number | null) => {
        setLeftConsultationId(id);
        if (id) fetchDetails(id, 'left');
        else setLeftDetails(null);
    };

    const handleRightChange = (id: number | null) => {
        setRightConsultationId(id);
        if (id) fetchDetails(id, 'right');
        else setRightDetails(null);
    };

    // Get unique areas from both consultations
    const areas = Array.from(new Set([
        ...(leftDetails?.assessments?.map(a => a.area) || []),
        ...(rightDetails?.assessments?.map(a => a.area) || [])
    ]));

    const renderComparisonRow = (area: string, field: keyof Assessment, label: string) => {
        const leftAssessment = leftDetails?.assessments?.find(a => a.area === area);
        const rightAssessment = rightDetails?.assessments?.find(a => a.area === area);

        const leftValue = leftAssessment ? leftAssessment[field] : '—';
        const rightValue = rightAssessment ? rightAssessment[field] : '—';

        // Styling for differences (optional)
        const isDifferent = leftAssessment && rightAssessment && leftValue !== rightValue;

        return (
            <TableRow key={`${area}-${field}`}>
                <TableCell sx={{ pl: 4, py: 1 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: isDifferent ? 'rgba(25, 118, 210, 0.04)' : 'inherit' }}>
                    <Typography variant="body2">{leftValue?.toString()}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: isDifferent ? 'rgba(25, 118, 210, 0.04)' : 'inherit' }}>
                    <Typography variant="body2">{rightValue?.toString()}</Typography>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <CompareIcon size={24} weight="duotone" color="#1976d2" />
                        <Typography variant="h6">Compare Consultations</Typography>
                    </Stack>
                    <IconButton onClick={onClose} size="small">
                        <XIcon size={20} />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    {/* Selectors */}
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Autocomplete
                                options={consultations.filter(c => c.id !== rightConsultationId)}
                                getOptionLabel={(option) => `${new Date(option.date).toLocaleDateString()} - ${option.reasonForConsultation || 'No reason'}`}
                                value={consultations.find(c => c.id === leftConsultationId) || null}
                                onChange={(_, newValue) => handleLeftChange(newValue?.id || null)}
                                renderInput={(params) => <TextField {...params} label="Consultation A (Left)" fullWidth />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Autocomplete
                                options={consultations.filter(c => c.id !== leftConsultationId)}
                                getOptionLabel={(option) => `${new Date(option.date).toLocaleDateString()} - ${option.reasonForConsultation || 'No reason'}`}
                                value={consultations.find(c => c.id === rightConsultationId) || null}
                                onChange={(_, newValue) => handleRightChange(newValue?.id || null)}
                                renderInput={(params) => <TextField {...params} label="Consultation B (Right)" fullWidth />}
                            />
                        </Grid>
                    </Grid>

                    <Divider />

                    {/* Comparison Table */}
                    {(!leftDetails && !rightDetails) ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                            <Typography color="text.secondary">Select consultations above to compare assessments.</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'background.default' }}>
                                        <TableCell sx={{ fontWeight: 700, width: '30%' }}>Assessment Field</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, width: '35%' }}>
                                            {leftDetails ? new Date(leftDetails.date).toLocaleDateString() : 'A'}
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, width: '35%' }}>
                                            {rightDetails ? new Date(rightDetails.date).toLocaleDateString() : 'B'}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {areas.map(area => (
                                        <React.Fragment key={area}>
                                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                                                    Area: {area}
                                                </TableCell>
                                            </TableRow>
                                            {renderComparisonRow(area, 'pain', 'Pain (1-10)')}
                                            {renderComparisonRow(area, 'painObservations', 'Pain Observations')}
                                            {renderComparisonRow(area, 'recovery', 'Recovery (%)')}
                                            {renderComparisonRow(area, 'edema', 'Edema')}
                                            {renderComparisonRow(area, 'romS', 'ROM S')}
                                            {renderComparisonRow(area, 'march', 'March')}
                                            {renderComparisonRow(area, 'temperature', 'Temperature')}
                                            {renderComparisonRow(area, 'temperatureColoration', 'Temperature & Coloration')}
                                            {renderComparisonRow(area, 'muscleTone', 'Muscle Tone')}
                                            {renderComparisonRow(area, 'muscularForce', 'Muscular Force')}
                                            {renderComparisonRow(area, 'sensitivityAndReflexes', 'Sensitivity')}
                                            {renderComparisonRow(area, 'trophism', 'Trophism')}
                                            {renderComparisonRow(area, 'trophismObservations', 'Trophism Observations')}
                                            {renderComparisonRow(area, 'observations', 'Observations')}
                                        </React.Fragment>
                                    ))}
                                    {areas.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                                No assessments found for comparison.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose} variant="outlined">Close</Button>
                <Button
                    variant="contained"
                    startIcon={<FilePlusIcon size={20} />}
                    disabled={!leftDetails || !rightDetails}
                    onClick={() => setOpenReportDialog(true)}
                >
                    Generate report
                </Button>
            </DialogActions>

            {leftDetails && rightDetails && (
                <GenerateReportDialog
                    open={openReportDialog}
                    onClose={() => setOpenReportDialog(false)}
                    patientId={patientId}
                    leftConsultation={leftDetails}
                    rightConsultation={rightDetails}
                    comparisonAreas={areas.map(area => ({
                        area,
                        fields: [
                            { field: 'pain', label: 'Pain (1-10)', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.pain, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.pain },
                            { field: 'painObservations', label: 'Pain Observations', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.painObservations, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.painObservations },
                            { field: 'recovery', label: 'Recovery (%)', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.recovery, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.recovery },
                            { field: 'edema', label: 'Edema', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.edema, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.edema },
                            { field: 'romS', label: 'ROM S', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.romS, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.romS },
                            { field: 'march', label: 'March', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.march, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.march },
                            { field: 'temperature', label: 'Temperature', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.temperature, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.temperature },
                            { field: 'temperatureColoration', label: 'Temperature & Coloration', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.temperatureColoration, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.temperatureColoration },
                            { field: 'muscleTone', label: 'Muscle Tone', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.muscleTone, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.muscleTone },
                            { field: 'muscularForce', label: 'Muscular Force', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.muscularForce, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.muscularForce },
                            { field: 'sensitivityAndReflexes', label: 'Sensitivity', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.sensitivityAndReflexes, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.sensitivityAndReflexes },
                            { field: 'trophism', label: 'Trophism', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.trophism, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.trophism },
                            { field: 'trophismObservations', label: 'Trophism Observations', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.trophismObservations, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.trophismObservations },
                            { field: 'observations', label: 'Observations', leftValue: leftDetails?.assessments?.find(a => a.area === area)?.observations, rightValue: rightDetails?.assessments?.find(a => a.area === area)?.observations }
                        ] as any
                    }))}
                />
            )}
        </Dialog>
    );
}
