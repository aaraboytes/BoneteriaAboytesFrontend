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
    Divider,
    Grid,
    IconButton,
    Box,
    Paper,
    Avatar
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import type { PatientRecord, ClinicalHistory, Treatment } from './patient-types';
import { DocxGenerator } from '@/lib/docx-generator';

export interface ClinicalHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    loading?: boolean;
    patient: {
        id: number;
        firstName: string;
        lastName: string;
        birthDate: string;
        gender: string;
        phone?: string;
        email?: string;
        referredBy?: string;
        clinicalHistory?: ClinicalHistory;
        patientFiles?: any[];
        photoUrl?: string;
        treatments?: Treatment[];
    } | null;
    onEdit?: () => void;
}

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
    const parts = name.trim().split(' ');
    const firstInitial = parts[0] ? parts[0][0] : '';
    const secondInitial = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return {
        sx: {
            bgcolor: stringToColor(name),
        },
        children: `${firstInitial}${secondInitial}`.toUpperCase(),
    };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5, mt: 0.5 }}>
            {children}
        </Typography>
    );
}

function InfoItem({ label, value, fullWidth = false }: { label: string; value?: string | boolean; fullWidth?: boolean }) {
    if (value === undefined || value === null || value === '' || value === false) return null;

    const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;

    return (
        <Grid size={{ xs: 12, sm: fullWidth ? 12 : 6 }}>
            <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </Typography>
                <Typography variant="body2">
                    {displayValue}
                </Typography>
            </Stack>
        </Grid>
    );
}

function BooleanNoteItem({ label, checked, notes }: { label: string; checked: boolean; notes?: string }) {
    if (!checked) return null;
    return (
        <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </Typography>
                <Typography variant="body2">
                    Yes {notes ? `— ${notes}` : ''}
                </Typography>
            </Stack>
        </Grid>
    );
}

function calculateAge(birthDate?: string) {
    if (!birthDate) return 'N/A';
    const diff = Date.now() - new Date(birthDate).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
}

export function ClinicalHistoryDialog({ open, onClose, loading, patient, onEdit }: ClinicalHistoryDialogProps): React.JSX.Element {
    const clinicalHistory = patient?.clinicalHistory;
    const treatments = patient?.treatments || [];
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
    const latestTreatment = treatments.length > 0 ? [...treatments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

    if (loading) {
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6" component="div">Clinical History - {patientName}</Typography>
                        <IconButton onClick={onClose} size="small">
                            <XIcon size={20} />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        Loading clinical history...
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    {onEdit && (
                        <Button 
                            variant="outlined" 
                            color="secondary"
                            onClick={() => { onEdit(); onClose(); }}
                        >
                            Edit Patient
                        </Button>
                    )}
                    <Button variant="contained" onClick={onClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    if (!clinicalHistory && !latestTreatment) {
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6" component="div">Clinical History - {patientName}</Typography>
                        <IconButton onClick={onClose} size="small">
                            <XIcon size={20} />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        No clinical history or treatments found for this patient.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    {onEdit && (
                        <Button 
                            variant="outlined" 
                            color="secondary"
                            onClick={() => { onEdit(); onClose(); }}
                        >
                            Edit Patient
                        </Button>
                    )}
                    <Button variant="contained" onClick={onClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    const handlePrintDocx = async () => {
        if (!patient) return;

        // Helper to provide PascalCase keys for template compatibility
        const toPascalCase = (obj: Record<string, any>) => {
            const result: Record<string, any> = {};
            Object.keys(obj).forEach(key => {
                const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
                result[pascalKey] = obj[key];
            });
            return result;
        };

        const patientAge = calculateAge(patient.birthDate);
        const patientBirthDate = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'N/A';
        const treatmentDateFormatted = latestTreatment?.date ? new Date(latestTreatment.date).toLocaleDateString() : '—';

        const data = {
            // 1. Explicitly named common tags (English & Spanish)
            patientName,
            fullName: patientName, // Exact match for {fullName}
            NombrePaciente: patientName,
            Nombre: patientName,
            FullName: patientName,
            
            patientAge,
            age: patientAge, // Exact match for {age}
            Edad: patientAge,
            Age: patientAge,
            
            patientBirthDate,
            FechaNacimiento: patientBirthDate,
            BirthDate: patientBirthDate,
            
            patientPhone: patient.phone || 'N/A',
            Telefono: patient.phone || 'N/A',
            Phone: patient.phone || 'N/A',
            
            patientEmail: patient.email || 'N/A',
            Email: patient.email || 'N/A',
            
            patientGender: patient.gender || 'N/A',
            Genero: patient.gender || 'N/A',
            
            treatmentNumber: latestTreatment?.number || '—',
            NumeroTratamiento: latestTreatment?.number || '—',
            
            treatmentDate: treatmentDateFormatted,
            date: treatmentDateFormatted, // Exact match for {date}
            FechaTratamiento: treatmentDateFormatted,
            Date: treatmentDateFormatted,
            
            treatmentText: latestTreatment?.treatmentText || '—',
            treatment: latestTreatment?.treatmentText || '—', // Exact match for {treatment}
            TextoTratamiento: latestTreatment?.treatmentText || '—',
            Treatment: latestTreatment?.treatmentText || '—',
            
            currentDate: new Date().toLocaleDateString(),
            FechaActual: new Date().toLocaleDateString(),

            // 2. Spread all patient and clinical history fields directly (camelCase and PascalCase)
            ...patient,
            ...toPascalCase(patient),
            ...(clinicalHistory || {}),
            ...toPascalCase(clinicalHistory || {}),

            // 3. Support for nested structures if template uses them
            patient: {
                ...patient,
                ...toPascalCase(patient),
                fullName: patientName,
                age: patientAge
            },
            clinicalHistory: {
                ...(clinicalHistory || {}),
                ...toPascalCase(clinicalHistory || {})
            },
            latestTreatment: {
                ...(latestTreatment || {}),
                ...toPascalCase(latestTreatment || {}),
                dateFormatted: treatmentDateFormatted
            }
        };

        try {
            await DocxGenerator.generateFromTemplate('/templates/treatmentTemplate.docx', data, `Tratamiento_${patient.lastName}_${patient.firstName}`);
        } catch (err) {
            console.error(err);
            alert('Error al generar el documento Word. Verifique que la plantilla exista.');
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="md"
            PaperProps={{
                sx: { borderRadius: 2, minHeight: '60vh' }
            }}
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <FileTextIcon size={24} weight="duotone" color="#1976d2" />
                        <Typography variant="h6" component="div">Full Clinical History</Typography>
                    </Stack>
                    <IconButton onClick={onClose} size="small">
                        <XIcon size={20} />
                    </IconButton>
                </Stack>
                <Typography variant="subtitle2" component="div" color="text.secondary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {(() => {
                        const profilePhoto = patient?.patientFiles?.find(f => 
                            f.fileName === 'foto_perfil.jpg' || 
                            f.fileUrl?.startsWith('data:image') || 
                            f.fileType?.includes('image')
                        )?.fileUrl;
                        return (
                            <Avatar 
                                src={profilePhoto || patient?.photoUrl} 
                                {...(!profilePhoto && !patient?.photoUrl ? stringAvatar(patientName) : {})}
                                sx={{ width: 24, height: 24, fontSize: '0.75rem' }} 
                            />
                        );
                    })()}
                    Patient: {patientName}
                </Typography>
            </DialogTitle>
            
            <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
                <Stack spacing={4} sx={{ py: 1 }}>
                    {/* Latest Treatment Section */}
                    {latestTreatment && (
                        <Box>
                            <SectionTitle>Latest Treatment Summary</SectionTitle>
                            <Paper sx={{ p: 2.5, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            Treatment #{latestTreatment.number}
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                            {new Date(latestTreatment.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </Typography>
                                    </Stack>
                                    <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                        {latestTreatment.treatmentText}
                                    </Typography>
                                </Stack>
                            </Paper>
                            {!clinicalHistory && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}>
                                    Note: No structured clinical history available for this patient. Only recent treatments are shown.
                                </Typography>
                            )}
                        </Box>
                    )}

                    {clinicalHistory && latestTreatment && <Divider />}

                    {clinicalHistory && (
                        <React.Fragment>
                            {/* Basic Info (from Patient object) */}
                            <Box>
                                <SectionTitle>Patient Basic Information</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <InfoItem label="Full Name" value={patientName} />
                                    <InfoItem label="Gender" value={patient?.gender} />
                                    <InfoItem label="Birth Date" value={patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString() : undefined} />
                                    <InfoItem label="Phone" value={patient?.phone} />
                                    <InfoItem label="Email" value={patient?.email} />
                                    <InfoItem label="Referred By" value={patient?.referredBy} />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* General Section */}
                            <Box>
                                <SectionTitle>General Background</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <InfoItem label="Occupation" value={clinicalHistory.occupation} />
                                    <InfoItem label="Civil Status" value={clinicalHistory.civilStatus} />
                                    <InfoItem label="Current Address" value={clinicalHistory.address} fullWidth />
                                    <InfoItem label="Recommended By" value={clinicalHistory.recommendedBy} />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Hereditary Antecedents */}
                            <Box>
                                <SectionTitle>Hereditary Antecedents</SectionTitle>
                                <Grid container spacing={2}>
                                    <BooleanNoteItem label="Diabetes" checked={clinicalHistory.hereditaryDiabetes} notes={clinicalHistory.hereditaryDiabetesNotes} />
                                    <BooleanNoteItem label="Heart Disease" checked={clinicalHistory.hereditaryHeartDisease} notes={clinicalHistory.hereditaryHeartDiseaseNotes} />
                                    <BooleanNoteItem label="Thyroid" checked={clinicalHistory.hereditaryThyroid} notes={clinicalHistory.hereditaryThyroidNotes} />
                                    <BooleanNoteItem label="Rheumatic" checked={clinicalHistory.hereditaryRheumatic} notes={clinicalHistory.hereditaryRheumaticNotes} />
                                    <BooleanNoteItem label="Hypertension" checked={clinicalHistory.hereditaryHypertension} notes={clinicalHistory.hereditaryHypertensionNotes} />
                                    <BooleanNoteItem label="Cancer" checked={clinicalHistory.hereditaryCancer} notes={clinicalHistory.hereditaryCancerNotes} />
                                    <BooleanNoteItem label="Respiratory" checked={clinicalHistory.hereditaryRespiratory} notes={clinicalHistory.hereditaryRespiratoryNotes} />
                                    <BooleanNoteItem label="Depression" checked={clinicalHistory.hereditaryDepression} notes={clinicalHistory.hereditaryDepressionNotes} />
                                    <BooleanNoteItem label="Tumors" checked={clinicalHistory.hereditaryTumors} notes={clinicalHistory.hereditaryTumorsNotes} />
                                    <InfoItem label="Other Hereditary" value={clinicalHistory.hereditaryOthers} fullWidth />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Personal Pathological */}
                            <Box>
                                <SectionTitle>Personal Pathological Antecedents</SectionTitle>
                                <Grid container spacing={2}>
                                    <BooleanNoteItem label="Diabetes" checked={clinicalHistory.personalDiabetes} notes={clinicalHistory.personalDiabetesNotes} />
                                    <BooleanNoteItem label="Heart Disease" checked={clinicalHistory.personalHeartDisease} notes={clinicalHistory.personalHeartDiseaseNotes} />
                                    <BooleanNoteItem label="Thyroid" checked={clinicalHistory.personalThyroid} notes={clinicalHistory.personalThyroidNotes} />
                                    <BooleanNoteItem label="Rheumatic" checked={clinicalHistory.personalRheumatic} notes={clinicalHistory.personalRheumaticNotes} />
                                    <BooleanNoteItem label="Hypertension" checked={clinicalHistory.personalHypertension} notes={clinicalHistory.personalHypertensionNotes} />
                                    <BooleanNoteItem label="Cancer" checked={clinicalHistory.personalCancer} notes={clinicalHistory.personalCancerNotes} />
                                    <BooleanNoteItem label="Respiratory" checked={clinicalHistory.personalRespiratory} notes={clinicalHistory.personalRespiratoryNotes} />
                                    <BooleanNoteItem label="Depression" checked={clinicalHistory.personalDepression} notes={clinicalHistory.personalDepressionNotes} />
                                    <BooleanNoteItem label="Tumors" checked={clinicalHistory.personalTumors} notes={clinicalHistory.personalTumorsNotes} />
                                    <InfoItem label="Allergies" value={clinicalHistory.allergies} fullWidth />
                                    <InfoItem label="Current Illnesses" value={clinicalHistory.currentIllnesses} fullWidth />
                                    <InfoItem label="Surgical Background" value={clinicalHistory.surgical} fullWidth />
                                    <InfoItem label="Traumatic Background" value={clinicalHistory.traumatic} fullWidth />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Systems Review */}
                            <Box>
                                <SectionTitle>Systems Review</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <InfoItem label="Gastrointestinal" value={clinicalHistory.systemGastrointestinal} fullWidth />
                                    <InfoItem label="Respiratory" value={clinicalHistory.systemRespiratory} fullWidth />
                                    <InfoItem label="Cardiac" value={clinicalHistory.systemCardiac} fullWidth />
                                    <InfoItem label="Reproductive" value={clinicalHistory.systemReproductive} fullWidth />
                                    <InfoItem label="Renal" value={clinicalHistory.systemRenal} fullWidth />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Medications */}
                            <Box>
                                <SectionTitle>Medications</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <InfoItem label="Analgesics" value={clinicalHistory.medsAnalgesics} />
                                    <InfoItem label="Anti-inflammatories" value={clinicalHistory.medsAntiInflammatories} />
                                    <InfoItem label="Antidepressants" value={clinicalHistory.medsAntidepressants} />
                                    <InfoItem label="Laxatives" value={clinicalHistory.medsLaxatives} />
                                    <InfoItem label="Anxiolytics" value={clinicalHistory.medsAnxiolytics} />
                                    <InfoItem label="Cholesterol" value={clinicalHistory.medsCholesterol} />
                                    <InfoItem label="Others" value={clinicalHistory.medsOthers} fullWidth />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Non-Pathological / Lifestyle */}
                            <Box>
                                <SectionTitle>Non-Pathological Antecedents & Lifestyle</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <BooleanNoteItem label="Smoker" checked={clinicalHistory.isSmoker} notes={clinicalHistory.smokerNotes} />
                                    <BooleanNoteItem label="Toxicomania" checked={clinicalHistory.hasToxicomania} notes={clinicalHistory.toxicomaniaNotes} />
                                    <InfoItem label="Alcohol Frequency" value={clinicalHistory.alcoholFrequency} />
                                    <InfoItem label="Physical Activity" value={clinicalHistory.physicalActivity} />
                                    <InfoItem label="Sleep Hours" value={clinicalHistory.sleepHours} />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Current Condition */}
                            <Box>
                                <SectionTitle>Current Condition</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <InfoItem label="Start Date" value={clinicalHistory.startDate ? new Date(clinicalHistory.startDate).toLocaleDateString() : undefined} />
                                    <InfoItem label="What happens?" value={clinicalHistory.complaintQue} fullWidth />
                                    <InfoItem label="How?" value={clinicalHistory.complaintComo} fullWidth />
                                    <InfoItem label="When?" value={clinicalHistory.complaintCuando} fullWidth />
                                    <InfoItem label="Where?" value={clinicalHistory.complaintDonde} fullWidth />
                                    <InfoItem label="Mechanism of Injury" value={clinicalHistory.mechanismOfInjury} fullWidth />
                                    <InfoItem label="Previous Treatments" value={clinicalHistory.previousTreatments} fullWidth />
                                    <InfoItem label="Physical Exploration" value={clinicalHistory.physicalExploration} fullWidth />
                                    <InfoItem label="Indications" value={clinicalHistory.indications} fullWidth />
                                </Grid>
                            </Box>

                            <Divider />

                            {/* Informed Consent */}
                            <Box>
                                <SectionTitle>Informed Consent</SectionTitle>
                                <Grid container spacing={2.5}>
                                    <InfoItem label="Signed as" value={clinicalHistory.consentType} />
                                    <InfoItem label="Tutor/Representative" value={clinicalHistory.consentTutorName} />
                                    <InfoItem label="Contact Phone" value={clinicalHistory.consentPhone} />
                                    <InfoItem label="Address" value={clinicalHistory.consentAddress} fullWidth />
                                    <InfoItem label="Consent Date" value={clinicalHistory.consentDate ? new Date(clinicalHistory.consentDate).toLocaleDateString() : undefined} />
                                </Grid>
                                
                                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, fontStyle: 'italic' }}>
                                        "I grant my consent and authorize Terapia Física del Potosí, S.C. to perform the treatment described... in full use of my mental faculties and in legal capacity."
                                    </Typography>
                                    {clinicalHistory.consentSignature ? (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="subtitle2" gutterBottom>Signature:</Typography>
                                            <Box 
                                                component="img" 
                                                src={clinicalHistory.consentSignature} 
                                                alt="Signature"
                                                sx={{ 
                                                    maxWidth: '100%', 
                                                    height: 'auto', 
                                                    maxHeight: 150,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    bgcolor: '#fff'
                                                }} 
                                            />
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="error">No signature on file.</Typography>
                                    )}
                                </Box>
                            </Box>
                        </React.Fragment>
                    )}
                </Stack>
            </DialogContent>
            
            <DialogActions sx={{ px: 3, pb: 2 }}>
                {onEdit && (
                    <Button 
                        variant="outlined" 
                        color="secondary"
                        onClick={() => { onEdit(); onClose(); }}
                    >
                        Edit Patient
                    </Button>
                )}
                <Button variant="contained" onClick={onClose}>
                    Close
                </Button>
                <Button 
                    variant="outlined" 
                    onClick={handlePrintDocx} 
                    startIcon={<FileTextIcon />}
                    disabled={loading || !patient}
                >
                    Print (Word)
                </Button>
                <Button variant="text" onClick={() => window.print()} color="inherit" size="small">
                    Browser Print
                </Button>
            </DialogActions>
        </Dialog>
    );
}
