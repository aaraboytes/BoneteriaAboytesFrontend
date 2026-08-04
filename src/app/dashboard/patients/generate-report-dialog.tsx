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
    Divider,
    CircularProgress
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Printer as PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import apiClient from '@/lib/api-client';
import type { Consultation, Assessment } from './consultations-list-view';

export interface ComparisonArea {
    area: string;
    fields: {
        field: keyof Assessment;
        label: string;
        leftValue: any;
        rightValue: any;
    }[];
}

export interface GenerateReportDialogProps {
    open: boolean;
    onClose: () => void;
    patientId: number;
    leftConsultation: Consultation;
    rightConsultation: Consultation;
    comparisonAreas: ComparisonArea[];
    mode?: 'generate' | 'view';
    reportData?: any; // For view mode
}

export function GenerateReportDialog({ 
    open, 
    onClose, 
    patientId, 
    leftConsultation, 
    rightConsultation, 
    comparisonAreas,
    mode = 'generate',
    reportData
}: GenerateReportDialogProps): React.JSX.Element {
    const [patient, setPatient] = React.useState<any>(null);
    const [reportNumber, setReportNumber] = React.useState('');
    const [reportDate, setReportDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [procedureToDate, setProcedureToDate] = React.useState('');
    const [observations, setObservations] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const fetchPatient = async () => {
                setLoading(true);
                try {
                    const res = await apiClient.get(`/Patients/${patientId}`);
                    setPatient(res.data);
                } catch (error) {
                    console.error('Failed to fetch patient', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchPatient();

            if (mode === 'view' && reportData) {
                setReportNumber(reportData.reportNumber);
                setReportDate(reportData.date.split('T')[0]);
                setProcedureToDate(reportData.procedureToDate);
                setObservations(reportData.observations);
            } else {
                setReportNumber(`REP-${new Date().getTime()}`);
                setProcedureToDate('');
                setObservations('');
            }
        }
    }, [open, patientId, mode, reportData]);

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return '—';
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = {
                patientId,
                reportNumber,
                date: new Date(reportDate).toISOString(),
                diagnostic: leftConsultation.diagnostic || rightConsultation.diagnostic || '—',
                procedureToDate,
                observations,
                comparativeTableJson: JSON.stringify(comparisonAreas),
                leftConsultationId: leftConsultation.id,
                rightConsultationId: rightConsultation.id
            };
            await apiClient.post('/MedicalRecords/reports', data);
            alert('Report saved successfully');
        } catch (error) {
            console.error('Failed to save report', error);
            alert('Failed to save report');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const isReadOnly = mode === 'view';

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <FileTextIcon size={24} weight="duotone" color="#1976d2" />
                    <Typography variant="h6">{isReadOnly ? 'View Report' : 'Generate Clinical Report'}</Typography>
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <XIcon size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box id="printable-report" sx={{ p: 4 }}>
                        {/* Printable Header - Only visible in print */}
                        <Box sx={{ display: 'none', mb: 4, '@media print': { display: 'block' } }}>
                            <Typography variant="h4" align="center" gutterBottom>CLINICAL EVOLUTION REPORT</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Box>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    label="Number of report"
                                    fullWidth
                                    value={reportNumber}
                                    onChange={(e) => setReportNumber(e.target.value)}
                                    size="small"
                                    disabled={isReadOnly}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    label="Date"
                                    type="date"
                                    fullWidth
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    size="small"
                                    disabled={isReadOnly}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    label="Patient Name"
                                    fullWidth
                                    value={patient ? `${patient.firstName} ${patient.lastName}` : ''}
                                    size="small"
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    label="Age"
                                    fullWidth
                                    value={patient ? calculateAge(patient.birthDate) : ''}
                                    size="small"
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Diagnostic"
                                    fullWidth
                                    value={leftConsultation.diagnostic || rightConsultation.diagnostic || '—'}
                                    size="small"
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Procedure to date"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={procedureToDate}
                                    onChange={(e) => setProcedureToDate(e.target.value)}
                                    disabled={isReadOnly}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Observations"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    disabled={isReadOnly}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 4 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>COMPARATIVE TABLE</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'background.default' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>
                                                {new Date(leftConsultation.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>
                                                {new Date(rightConsultation.date).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {comparisonAreas.map(area => (
                                            <React.Fragment key={area.area}>
                                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                                                        Area: {area.area}
                                                    </TableCell>
                                                </TableRow>
                                                {area.fields.map(f => (
                                                    <TableRow key={`${area.area}-${f.field}`}>
                                                        <TableCell sx={{ pl: 4 }}>
                                                            <Typography variant="body2" color="text.secondary">{f.label}</Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2">{f.leftValue?.toString() || '—'}</Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2">{f.rightValue?.toString() || '—'}</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                        
                        {/* Print styles */}
                        <style>
                        {`
                            @media print {
                                body * { visibility: hidden; }
                                #printable-report, #printable-report * { visibility: visible; }
                                #printable-report { 
                                    position: absolute; 
                                    left: 0; 
                                    top: 0; 
                                    width: 100%;
                                    padding: 20px;
                                }
                                .MuiButtonBase-root, .MuiDialogActions-root { display: none !important; }
                                .MuiInputBase-root.Mui-disabled { color: rgba(0, 0, 0, 0.87); -webkit-text-fill-color: rgba(0, 0, 0, 0.87); }
                                .MuiOutlinedInput-notchedOutline { border-color: rgba(0, 0, 0, 0.12) !important; }
                            }
                        `}
                        </style>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit">Close</Button>
                <Stack direction="row" spacing={1}>
                    {!isReadOnly && (
                        <Button 
                            variant="contained" 
                            onClick={handleSave}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : null}
                        >
                            Save Report
                        </Button>
                    )}
                    <Button 
                        variant="outlined" 
                        onClick={handlePrint} 
                        startIcon={<PrinterIcon size={20} />}
                    >
                        Print
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
