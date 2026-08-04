'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    MenuItem,
    Tabs,
    Tab,
    Box,
    FormControlLabel,
    Checkbox,
    Typography,
    Divider,
    Grid,
    Avatar,
    Table,
    TableBody,
    TableRow,
    TableCell
} from '@mui/material';
import apiClient from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';
import type { PatientRecord, ClinicalHistory } from './patient-types';
import { SignaturePad } from './signature-pad';
import { WarningCircle as WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';

export interface PatientDialogProps {
    open: boolean;
    patient?: PatientRecord;
    onClose: () => void;
    onSuccess: (patient: PatientRecord) => void;
}

const initialHistory: ClinicalHistory = {
    hereditaryDiabetes: false,
    hereditaryHeartDisease: false,
    hereditaryThyroid: false,
    hereditaryRheumatic: false,
    hereditaryHypertension: false,
    hereditaryCancer: false,
    hereditaryRespiratory: false,
    hereditaryDepression: false,
    hereditaryTumors: false,
    personalDiabetes: false,
    personalHeartDisease: false,
    personalThyroid: false,
    personalRheumatic: false,
    personalHypertension: false,
    personalCancer: false,
    personalRespiratory: false,
    personalDepression: false,
    personalTumors: false,
    isSmoker: false,
    hasToxicomania: false,
    useMedicalDevices: false,
};

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

function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function PatientDialog({ open, patient, onClose, onSuccess }: PatientDialogProps): React.JSX.Element {
    const { user } = useUser();
    const isDeveloper = user?.role?.toLowerCase() === 'developer';
    const isEditMode = Boolean(patient);
    const [tabValue, setTabValue] = React.useState(0);

    // Basic Info
    const [editedId, setEditedId] = React.useState<number | ''>('');
    const [conflictingPatientName, setConflictingPatientName] = React.useState<string | null>(null);
    const [firstName, setFirstName] = React.useState('');
    const [hasDuplicate, setHasDuplicate] = React.useState(false);
    const [proceedWithDuplicate, setProceedWithDuplicate] = React.useState(false);
    const [lastName, setLastName] = React.useState('');
    const [birthDate, setBirthDate] = React.useState('');
    const [gender, setGender] = React.useState('Male');
    const [medicalHistoryLegacy, setMedicalHistoryLegacy] = React.useState(''); // Legacy string field
    const [status, setStatus] = React.useState('Active');
    const [phone, setPhone] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [referredBy, setReferredBy] = React.useState('');
    const [clinicId, setClinicId] = React.useState<number | ''>('');
    const [groupId, setGroupId] = React.useState<number | ''>('');

    // Clinical History Fields
    const [history, setHistory] = React.useState<ClinicalHistory>(initialHistory);
    const [patientFiles, setPatientFiles] = React.useState<any[]>([]);

    // Staff Defaults
    const [defaultAttendants, setDefaultAttendants] = React.useState<any[]>([]);
    const [services, setServices] = React.useState<any[]>([]);
    const [users, setUsers] = React.useState<any[]>([]);

    // Reference Data
    const [clinics, setClinics] = React.useState<{ id: number, name: string }[]>([]);
    const [groups, setGroups] = React.useState<{ id: number, name: string }[]>([]);

    React.useEffect(() => {
        if (!open) return;
        setTabValue(0);

        const loadFullPatient = async () => {
            if (patient) {
                try {
                    const res = await apiClient.get(`/Patients/${patient.id}/history`);
                    const fullPatient = res.data;
                    setPatientFiles(fullPatient.patientFiles || []);
                    setFirstName(fullPatient.firstName || '');
                    setLastName(fullPatient.lastName || '');
                    setBirthDate(fullPatient.birthDate ? fullPatient.birthDate.split('T')[0] : '');
                    setGender(fullPatient.gender || 'Male');
                    setMedicalHistoryLegacy(fullPatient.medicalHistory || '');
                    setStatus(fullPatient.status || 'Active');
                    setPhone(fullPatient.phone || '');
                    setEmail(fullPatient.email || '');
                    setReferredBy(fullPatient.referredBy || '');
                    setDefaultAttendants(fullPatient.defaultAttendants || []);

                    if (fullPatient.clinicalHistory) {
                        const ch = { ...fullPatient.clinicalHistory };
                        if (ch.startDate) ch.startDate = ch.startDate.split('T')[0];
                        setHistory(ch);
                    }

                    if (fullPatient.clinicId) setClinicId(fullPatient.clinicId);
                    if (fullPatient.groupId) setGroupId(fullPatient.groupId);
                    setDefaultAttendants(fullPatient.defaultAttendants || []);
                } catch (err) {
                    console.error('Failed to load full patient data', err);
                }
            }
        };

        if (patient) {
            setFirstName(patient.firstName || '');
            setLastName(patient.lastName || '');
            setBirthDate(patient.birthDate ? patient.birthDate.split('T')[0] : '');
            setGender(patient.gender || 'Male');
            setMedicalHistoryLegacy(patient.medicalHistory || '');
            setStatus(patient.status || 'Active');
            setPhone(patient.phone || '');
            setEmail(patient.email || '');
            setReferredBy(patient.referredBy || '');

            setEditedId(patient.id);
            setConflictingPatientName(null);
            if (patient.clinicalHistory) {
                // Ensure dates are formatted for input
                const ch = { ...patient.clinicalHistory };
                if (ch.startDate) ch.startDate = ch.startDate.split('T')[0];
                setHistory(ch);
            } else {
                setHistory(initialHistory);
                loadFullPatient(); // Fetch it if it's missing
            }
            setDefaultAttendants(patient.defaultAttendants || []);
            setHasDuplicate(false);
            setProceedWithDuplicate(false);
        } else {
            setEditedId('');
            setConflictingPatientName(null);
            setFirstName('');
            setLastName('');
            setBirthDate('');
            setGender('Male');
            setMedicalHistoryLegacy('');
            setStatus('Active');
            setPhone('');
            setEmail('');
            setReferredBy('');
            setHistory(initialHistory);
            setDefaultAttendants([]);
            setHasDuplicate(false);
            setProceedWithDuplicate(false);
        }

        let active = true;
        const fetchRefs = async () => {
            try {
                const clinicsRes = await apiClient.get('/Clinics').catch(() => ({ data: [{ id: 1, name: 'Main Clinic' }] }));
                const groupsRes = await apiClient.get('/PatientGroups').catch(() => ({ data: [{ id: 1, name: 'General' }, { id: 2, name: 'VIP' }] }));
                const servicesRes = await apiClient.get('/Services').catch(() => ({ data: [] }));
                const usersRes = await apiClient.get('/Users').catch(() => ({ data: [] }));

                if (active) {
                    setClinics(clinicsRes.data);
                    setGroups(groupsRes.data);
                    setServices(servicesRes.data);
                    setUsers(usersRes.data);

                    if (patient) {
                        setClinicId(patient.clinicId ?? (clinicsRes.data.length > 0 ? clinicsRes.data[0].id : ''));
                        setGroupId(patient.groupId ?? (groupsRes.data.length > 0 ? groupsRes.data[0].id : ''));
                    } else {
                        if (clinicsRes.data.length > 0) setClinicId(clinicsRes.data[0].id);
                        if (groupsRes.data.length > 0) setGroupId(groupsRes.data[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to load reference data', err);
            }
        };
        fetchRefs();
        return () => { active = false; };
    }, [open, patient]);

    React.useEffect(() => {
        if (isEditMode || !firstName.trim() || !lastName.trim() || !open) {
            setHasDuplicate(false);
            setProceedWithDuplicate(false);
            return;
        }

        let active = true;
        const checkDuplicate = setTimeout(async () => {
            try {
                const fullName = `${firstName.trim()} ${lastName.trim()}`;
                const res = await apiClient.get('/Patients', {
                    params: { query: fullName, page: 1, pageSize: 10 }
                });
                
                if (active && res.data && res.data.items) {
                    const cleanFirstNameInput = removeAccents(firstName.trim().toLowerCase());
                    const cleanLastNameInput = removeAccents(lastName.trim().toLowerCase());

                    const exactMatch = res.data.items.some((p: any) => {
                        const cleanFirstDb = removeAccents((p.firstName || '').trim().toLowerCase());
                        const cleanLastDb = removeAccents((p.lastName || '').trim().toLowerCase());
                        return cleanFirstDb === cleanFirstNameInput && cleanLastDb === cleanLastNameInput;
                    });

                    setHasDuplicate(exactMatch);
                    if (!exactMatch) {
                        setProceedWithDuplicate(false);
                    }
                }
            } catch (err) {
                console.error('Failed to check for duplicate patient name', err);
            }
        }, 500);

        return () => {
            active = false;
            clearTimeout(checkDuplicate);
        };
    }, [firstName, lastName, isEditMode, open]);

    React.useEffect(() => {
        if (!open || !isEditMode || editedId === '' || editedId === patient?.id) {
            setConflictingPatientName(null);
            return;
        }
        const checkConflict = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/Patients/${editedId}`);
                if (res.data) {
                    setConflictingPatientName(`${res.data.firstName} ${res.data.lastName}`);
                } else {
                    setConflictingPatientName(null);
                }
            } catch (err) {
                setConflictingPatientName(null);
            }
        }, 500);
        return () => clearTimeout(checkConflict);
    }, [editedId, patient, isEditMode, open]);

    const handleHistoryChange = (field: keyof ClinicalHistory, value: any) => {
        setHistory(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!firstName || !lastName || !birthDate || clinicId === '' || groupId === '') return;

        const formatISODate = (val: string | undefined | null) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d.toISOString();
        };

        const payload = {
            id: isEditMode && editedId !== '' ? editedId : undefined,
            firstName,
            lastName,
            birthDate: formatISODate(birthDate),
            gender,
            medicalHistory: medicalHistoryLegacy,
            status,
            phone,
            email,
            referredBy,
            clinicId,
            groupId,
            defaultAttendants: defaultAttendants.filter(da => da.attendantId !== ''),
            clinicalHistory: {
                occupation: history.occupation,
                civilStatus: history.civilStatus,
                address: history.address,
                recommendedBy: history.recommendedBy,
                hereditaryDiabetes: !!history.hereditaryDiabetes,
                hereditaryDiabetesNotes: history.hereditaryDiabetesNotes,
                hereditaryHeartDisease: !!history.hereditaryHeartDisease,
                hereditaryHeartDiseaseNotes: history.hereditaryHeartDiseaseNotes,
                hereditaryThyroid: !!history.hereditaryThyroid,
                hereditaryThyroidNotes: history.hereditaryThyroidNotes,
                hereditaryRheumatic: !!history.hereditaryRheumatic,
                hereditaryRheumaticNotes: history.hereditaryRheumaticNotes,
                hereditaryHypertension: !!history.hereditaryHypertension,
                hereditaryHypertensionNotes: history.hereditaryHypertensionNotes,
                hereditaryCancer: !!history.hereditaryCancer,
                hereditaryCancerNotes: history.hereditaryCancerNotes,
                hereditaryRespiratory: !!history.hereditaryRespiratory,
                hereditaryRespiratoryNotes: history.hereditaryRespiratoryNotes,
                hereditaryDepression: !!history.hereditaryDepression,
                hereditaryDepressionNotes: history.hereditaryDepressionNotes,
                hereditaryTumors: !!history.hereditaryTumors,
                hereditaryTumorsNotes: history.hereditaryTumorsNotes,
                hereditaryOthers: history.hereditaryOthers,
                personalDiabetes: !!history.personalDiabetes,
                personalDiabetesNotes: history.personalDiabetesNotes,
                personalHeartDisease: !!history.personalHeartDisease,
                personalHeartDiseaseNotes: history.personalHeartDiseaseNotes,
                personalThyroid: !!history.personalThyroid,
                personalThyroidNotes: history.personalThyroidNotes,
                personalRheumatic: !!history.personalRheumatic,
                personalRheumaticNotes: history.personalRheumaticNotes,
                personalHypertension: !!history.personalHypertension,
                personalHypertensionNotes: history.personalHypertensionNotes,
                personalCancer: !!history.personalCancer,
                personalCancerNotes: history.personalCancerNotes,
                personalRespiratory: !!history.personalRespiratory,
                personalRespiratoryNotes: history.personalRespiratoryNotes,
                personalDepression: !!history.personalDepression,
                personalDepressionNotes: history.personalDepressionNotes,
                personalTumors: !!history.personalTumors,
                personalTumorsNotes: history.personalTumorsNotes,
                currentIllnesses: history.currentIllnesses,
                allergies: history.allergies,
                surgical: history.surgical,
                traumatic: history.traumatic,
                medsAnalgesics: history.medsAnalgesics,
                medsAntiInflammatories: history.medsAntiInflammatories,
                medsAntidepressants: history.medsAntidepressants,
                medsLaxatives: history.medsLaxatives,
                medsAnxiolytics: history.medsAnxiolytics,
                medsCholesterol: history.medsCholesterol,
                medsOthers: history.medsOthers,
                systemGastrointestinal: history.systemGastrointestinal,
                systemRespiratory: history.systemRespiratory,
                systemCardiac: history.systemCardiac,
                systemReproductive: history.systemReproductive,
                systemRenal: history.systemRenal,
                isSmoker: !!history.isSmoker,
                smokerNotes: history.smokerNotes,
                hasToxicomania: !!history.hasToxicomania,
                toxicomaniaNotes: history.toxicomaniaNotes,
                alcoholFrequency: history.alcoholFrequency,
                physicalActivity: history.physicalActivity,
                sleepHours: history.sleepHours,
                complaintQue: history.complaintQue,
                complaintComo: history.complaintComo,
                complaintCuando: history.complaintCuando,
                complaintDonde: history.complaintDonde,
                mechanismOfInjury: history.mechanismOfInjury,
                startDate: formatISODate(history.startDate),
                previousTreatments: history.previousTreatments,
                physicalExploration: history.physicalExploration,
                indications: history.indications,
                consentTutorName: history.consentTutorName,
                consentType: history.consentType,
                consentDate: formatISODate(history.consentDate),
                consentSignature: history.consentSignature,
                consentAddress: history.consentAddress,
                consentPhone: history.consentPhone,
                useMedicalDevices: !!history.useMedicalDevices,
                medicalDevicesNotes: history.medicalDevicesNotes,
            }
        };

        console.log('Saving patient payload:', payload);

        try {
            let savedPatient: PatientRecord;
            if (isEditMode && patient) {
                const res = await apiClient.put(`/Patients/${patient.id}`, payload);
                savedPatient = res.data;
            } else {
                const res = await apiClient.post('/Patients', payload);
                savedPatient = res.data;
            }
            onSuccess(savedPatient);
        } catch (error) {
            console.error('Failed to save patient', error);
            alert('Failed to save patient');
        }
    };

    const isFormValid = !!firstName && !!lastName && !!birthDate && !!phone && !!email && clinicId !== '' && groupId !== '';
    const canSubmit = isFormValid && (!hasDuplicate || proceedWithDuplicate);

    const renderHistoryRow = (label: string, boolField: keyof ClinicalHistory, noteField: keyof ClinicalHistory) => (
        <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!history[boolField]}
                            onChange={(e) => handleHistoryChange(boolField, e.target.checked)}
                        />
                    }
                    label={label}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Notes"
                    value={history[noteField] || ''}
                    onChange={(e) => handleHistoryChange(noteField, e.target.value)}
                    disabled={!history[boolField]}
                />
            </Grid>
        </Grid>
    );

    const profilePhoto = patientFiles?.find(f => 
        f.fileName === 'foto_perfil.jpg' || 
        f.fileUrl?.startsWith('data:image') || 
        f.fileType?.includes('image')
    )?.fileUrl;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            sx={{ '& .MuiDialog-paper': { minHeight: '80vh' } }}
        >
            <DialogTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                    {isEditMode && (
                        <Avatar 
                            src={profilePhoto} 
                            {...stringAvatar(`${firstName} ${lastName}`)}
                        />
                    )}
                    <Typography variant="h6">{isEditMode ? 'Edit Patient' : 'New Patient'}</Typography>
                </Stack>
            </DialogTitle>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                    <Tab label="General Info" />
                    <Tab label="Antecedents" />
                    <Tab label="Systems & Lifestyle" />
                    <Tab label="Current Condition" />
                    <Tab label="Informed Consent" />
                    <Tab label="Staff Defaults" />
                </Tabs>
            </Box>

            <DialogContent dividers sx={{ bgcolor: tabValue === 4 ? '#f9fafb' : 'inherit' }}>
                {tabValue === 0 && (
                    <Stack spacing={2} sx={{ py: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            * Required fields to enable the creation of a new patient.
                        </Typography>

                        {isDeveloper && isEditMode && (
                            <Stack spacing={1} sx={{ mt: 1, mb: 1 }}>
                                <TextField
                                    label="Patient ID (Developer Only)"
                                    type="number"
                                    fullWidth
                                    value={editedId}
                                    onChange={(e) => setEditedId(e.target.value === '' ? '' : Number(e.target.value))}
                                    helperText="Warning: Changing this ID modifies the primary key of the patient."
                                />
                                {conflictingPatientName && (
                                    <Box sx={{ p: 1.5, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
                                        <Typography variant="body2" fontWeight="bold">
                                            Replacing this ID will overwrite the patient "{conflictingPatientName}"
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        )}

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required label="First Name" fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required label="Last Name" fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required label="Birth Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField select label="Gender" fullWidth value={gender} onChange={(e) => setGender(e.target.value)}>
                                    <MenuItem value="Male">Male</MenuItem>
                                    <MenuItem value="Female">Female</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required label="Phone" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required label="Email" fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Occupation" fullWidth value={history.occupation || ''} onChange={(e) => handleHistoryChange('occupation', e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField select label="Civil Status" fullWidth value={history.civilStatus || ''} onChange={(e) => handleHistoryChange('civilStatus', e.target.value)}>
                                    <MenuItem value="Single">Single</MenuItem>
                                    <MenuItem value="Married">Married</MenuItem>
                                    <MenuItem value="Divorced">Divorced</MenuItem>
                                    <MenuItem value="Widowed">Widowed</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField label="Address" fullWidth value={history.address || ''} onChange={(e) => handleHistoryChange('address', e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Referred By" fullWidth value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required select label="Clinic" fullWidth value={clinicId} onChange={(e) => setClinicId(Number(e.target.value))}>
                                    {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField required select label="Patient Group" fullWidth value={groupId} onChange={(e) => setGroupId(Number(e.target.value))}>
                                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField select label="Status" fullWidth value={status} onChange={(e) => setStatus(e.target.value)}>
                                    <MenuItem value="Active">Active</MenuItem>
                                    <MenuItem value="Inactive">Inactive</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>

                        {hasDuplicate && (
                            <Box 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1.5, 
                                    p: 1.5, 
                                    borderRadius: 1, 
                                    backgroundColor: 'rgba(237, 108, 2, 0.08)',
                                    border: '1px solid #ed6c02',
                                    mt: 2
                                }}
                            >
                                <WarningCircleIcon size={24} weight="fill" color="#ed6c02" />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={proceedWithDuplicate}
                                            onChange={(e) => setProceedWithDuplicate(e.target.checked)}
                                            color="warning"
                                            sx={{ p: 0.5, mr: 0.5 }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" color="#b05400" fontWeight="medium">
                                            There is already a patient with this name, do you want to proceed?
                                        </Typography>
                                    }
                                />
                            </Box>
                        )}
                    </Stack>
                )}

                {tabValue === 1 && (
                    <Stack spacing={3} sx={{ py: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Hereditary History</Typography>
                        <Stack spacing={1}>
                            {renderHistoryRow('Diabetes', 'hereditaryDiabetes', 'hereditaryDiabetesNotes')}
                            {renderHistoryRow('Heart Disease', 'hereditaryHeartDisease', 'hereditaryHeartDiseaseNotes')}
                            {renderHistoryRow('Thyroid', 'hereditaryThyroid', 'hereditaryThyroidNotes')}
                            {renderHistoryRow('Rheumatic', 'hereditaryRheumatic', 'hereditaryRheumaticNotes')}
                            {renderHistoryRow('Hypertension', 'hereditaryHypertension', 'hereditaryHypertensionNotes')}
                            {renderHistoryRow('Cancer', 'hereditaryCancer', 'hereditaryCancerNotes')}
                            {renderHistoryRow('Respiratory', 'hereditaryRespiratory', 'hereditaryRespiratoryNotes')}
                            {renderHistoryRow('Depression', 'hereditaryDepression', 'hereditaryDepressionNotes')}
                            {renderHistoryRow('Tumors', 'hereditaryTumors', 'hereditaryTumorsNotes')}
                            <TextField label="Other Hereditary Antecedents" fullWidth multiline rows={2} value={history.hereditaryOthers || ''} onChange={(e) => handleHistoryChange('hereditaryOthers', e.target.value)} />
                        </Stack>

                        <Divider />

                        <Typography variant="subtitle1" fontWeight="bold">Personal History</Typography>
                        <Stack spacing={1}>
                            {renderHistoryRow('Diabetes', 'personalDiabetes', 'personalDiabetesNotes')}
                            {renderHistoryRow('Heart Disease', 'personalHeartDisease', 'personalHeartDiseaseNotes')}
                            {renderHistoryRow('Thyroid', 'personalThyroid', 'personalThyroidNotes')}
                            {renderHistoryRow('Rheumatic', 'personalRheumatic', 'personalRheumaticNotes')}
                            {renderHistoryRow('Hypertension', 'personalHypertension', 'personalHypertensionNotes')}
                            {renderHistoryRow('Cancer', 'personalCancer', 'personalCancerNotes')}
                            {renderHistoryRow('Respiratory', 'personalRespiratory', 'personalRespiratoryNotes')}
                            {renderHistoryRow('Depression', 'personalDepression', 'personalDepressionNotes')}
                            {renderHistoryRow('Tumors', 'personalTumors', 'personalTumorsNotes')}
                        </Stack>

                        <Divider />

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Allergies" fullWidth multiline rows={2} value={history.allergies || ''} onChange={(e) => handleHistoryChange('allergies', e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Current Illnesses" fullWidth multiline rows={2} value={history.currentIllnesses || ''} onChange={(e) => handleHistoryChange('currentIllnesses', e.target.value)} />
                            </Grid>
                        </Grid>
                    </Stack>
                )}

                {tabValue === 2 && (
                    <Stack spacing={3} sx={{ py: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Systems Review</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Gastrointestinal" fullWidth multiline rows={2} value={history.systemGastrointestinal || ''} onChange={(e) => handleHistoryChange('systemGastrointestinal', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Respiratory" fullWidth multiline rows={2} value={history.systemRespiratory || ''} onChange={(e) => handleHistoryChange('systemRespiratory', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Cardiac" fullWidth multiline rows={2} value={history.systemCardiac || ''} onChange={(e) => handleHistoryChange('systemCardiac', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Reproductive (Menopause, Births)" fullWidth multiline rows={2} value={history.systemReproductive || ''} onChange={(e) => handleHistoryChange('systemReproductive', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Renal" fullWidth multiline rows={2} value={history.systemRenal || ''} onChange={(e) => handleHistoryChange('systemRenal', e.target.value)} /></Grid>
                        </Grid>

                        <Divider />

                        <Typography variant="subtitle1" fontWeight="bold">Lifestyle</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControlLabel control={<Checkbox checked={!!history.isSmoker} onChange={(e) => handleHistoryChange('isSmoker', e.target.checked)} />} label="Smoker" />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField fullWidth size="small" placeholder="Smoker Notes" value={history.smokerNotes || ''} onChange={(e) => handleHistoryChange('smokerNotes', e.target.value)} disabled={!history.isSmoker} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControlLabel control={<Checkbox checked={!!history.hasToxicomania} onChange={(e) => handleHistoryChange('hasToxicomania', e.target.checked)} />} label="Toxicomania" />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField fullWidth size="small" placeholder="Toxicomania Notes" value={history.toxicomaniaNotes || ''} onChange={(e) => handleHistoryChange('toxicomaniaNotes', e.target.value)} disabled={!history.hasToxicomania} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Alcohol Freq." fullWidth value={history.alcoholFrequency || ''} onChange={(e) => handleHistoryChange('alcoholFrequency', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Physical Activity" fullWidth value={history.physicalActivity || ''} onChange={(e) => handleHistoryChange('physicalActivity', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Sleep Hours" fullWidth value={history.sleepHours || ''} onChange={(e) => handleHistoryChange('sleepHours', e.target.value)} /></Grid>
                        </Grid>

                        <Divider />

                        <Typography variant="subtitle1" fontWeight="bold">Medications</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Analgesics" fullWidth value={history.medsAnalgesics || ''} onChange={(e) => handleHistoryChange('medsAnalgesics', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Anti-inflammatories" fullWidth value={history.medsAntiInflammatories || ''} onChange={(e) => handleHistoryChange('medsAntiInflammatories', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Antidepressants" fullWidth value={history.medsAntidepressants || ''} onChange={(e) => handleHistoryChange('medsAntidepressants', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Laxatives" fullWidth value={history.medsLaxatives || ''} onChange={(e) => handleHistoryChange('medsLaxatives', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Anxiolytics" fullWidth value={history.medsAnxiolytics || ''} onChange={(e) => handleHistoryChange('medsAnxiolytics', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Cholesterol Control" fullWidth value={history.medsCholesterol || ''} onChange={(e) => handleHistoryChange('medsCholesterol', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Others" fullWidth multiline rows={2} value={history.medsOthers || ''} onChange={(e) => handleHistoryChange('medsOthers', e.target.value)} /></Grid>
                        </Grid>
                    </Stack>
                )}

                {tabValue === 3 && (
                    <Stack spacing={3} sx={{ py: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Current Condition</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}><TextField label="What happens?" fullWidth multiline rows={2} value={history.complaintQue || ''} onChange={(e) => handleHistoryChange('complaintQue', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="How?" fullWidth multiline rows={2} value={history.complaintComo || ''} onChange={(e) => handleHistoryChange('complaintComo', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="When?" fullWidth multiline rows={2} value={history.complaintCuando || ''} onChange={(e) => handleHistoryChange('complaintCuando', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Where?" fullWidth multiline rows={2} value={history.complaintDonde || ''} onChange={(e) => handleHistoryChange('complaintDonde', e.target.value)} /></Grid>
                        </Grid>
                        <Divider />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Start Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={history.startDate || ''} onChange={(e) => handleHistoryChange('startDate', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Previous Treatments" fullWidth multiline rows={2} value={history.previousTreatments || ''} onChange={(e) => handleHistoryChange('previousTreatments', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Physical Exploration" fullWidth multiline rows={2} value={history.physicalExploration || ''} onChange={(e) => handleHistoryChange('physicalExploration', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Indications" fullWidth multiline rows={2} value={history.indications || ''} onChange={(e) => handleHistoryChange('indications', e.target.value)} /></Grid>
                            <Grid size={{ xs: 12 }}><TextField label="Mechanism of Injury" fullWidth multiline rows={2} value={history.mechanismOfInjury || ''} onChange={(e) => handleHistoryChange('mechanismOfInjury', e.target.value)} /></Grid>
                        </Grid>
                        <Divider />
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={!!history.useMedicalDevices}
                                            onChange={(e) => handleHistoryChange('useMedicalDevices', e.target.checked)}
                                        />
                                    }
                                    label="I use medical electronic devices"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Medical electronic devices that I use"
                                    value={history.medicalDevicesNotes || ''}
                                    onChange={(e) => handleHistoryChange('medicalDevicesNotes', e.target.value)}
                                    disabled={!history.useMedicalDevices}
                                />
                            </Grid>
                        </Grid>

                    </Stack>
                )}

                {tabValue === 4 && (
                    <Stack spacing={3} sx={{ py: 1, px: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <Box sx={{ p: 4 }}>
                            <Typography variant="h5" align="center" gutterBottom fontWeight="bold">INFORMED CONSENT</Typography>
                            <Typography variant="subtitle1" align="center" gutterBottom fontWeight="bold">Terapia Física del Potosí, S.C.</Typography>

                            <Box sx={{ mt: 4, mb: 1.5 }}>
                                <Typography variant="body2" component="p" sx={{ mb: 1.5, textAlign: 'justify' }}>
                                    I, the undersigned, of legal age, in my capacity as patient or legal representative thereof, having voluntarily requested the rehabilitation services from Terapia Física del Potosí, S.C., and/or its work team, being in full use of my mental faculties and with sufficient legal capacity, hereby freely and voluntarily declare that:
                                </Typography>
                                <Typography variant="body2" component="p" sx={{ mb: 1.5, textAlign: 'justify' }}>
                                    Through this document, the work team and/or physical therapy graduates of Terapia Física del Potosí, S.C., have fully explained to me the current condition of my injury and/or physical state, as well as the treatments, procedures, and/or therapies that are recommended for my situation. I have understood and known to my full satisfaction the treatment(s) or procedure(s) or therapies to which I will be subjected, as well as their scope, benefits, progressions, alternatives, and risks, which may include, but are not limited to: physical therapy, physical agents such as: High-power laser, High-intensity laser, Tecartherapy, Radial shock waves, High-intensity electromagnetic fields, Robotic decompression treadmill, Anti-gravity treadmill, Low and medium frequency electrotherapy, Thermotherapy by hot moist pack and microwave, Mechanical ultrasound, among others, and which are part of the treatment to which I give my full consent to be subjected.
                                </Typography>
                                <Typography variant="body2" component="p" sx={{ mb: 1.5, textAlign: 'justify' }}>
                                    Now then, derived from the treatments and therapies to which I will be subjected, I understand that there are different risks derived from the handling of the different techniques and methods that can be used in the same, among which there may be irritation, redness, allergic reactions, burns by the different devices or materials used, hematomas, injuries to the different parts of the body such as cervical, dorsal, lumbar, sacral areas, extremities in their entirety, joints and soft tissues, or any area prone to it, reduction of mobilization in different parts of the body, weakening of the same, nerve injuries, as well as there may be complications that derive in internal or external hemorrhages, paralysis in its different modes or any other complication, injury or problem not mentioned above, including death.
                                </Typography>
                                <Typography variant="body2" component="p" sx={{ mb: 1.5, textAlign: 'justify' }}>
                                    In the same way, I understand that the treatment according to the method used may require maneuvers or interventions that have to be carried out in order to progress in rehabilitation, which may require contact with intimate parts of my body, a situation of which I am aware and manifest my conformity, being able, if it is my desire, at any time to suspend or stop the treatment, prior notice to the clinic staff.
                                </Typography>
                                <Typography variant="body2" component="p" sx={{ mb: 1.5, textAlign: 'justify' }}>
                                    I grant my consent and authorize Terapia Física del Potosí, S.C. to perform the treatment described above and in full use of my mental faculties and in legal capacity (articles 80, 81, 82 and 83 of the Health Law), or in my condition of:
                                </Typography>

                                <Stack spacing={2} sx={{ mt: 3 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField select label="I sign as" fullWidth value={history.consentType || ''} onChange={(e) => handleHistoryChange('consentType', e.target.value)}>
                                                <MenuItem value="Patient">Patient</MenuItem>
                                                <MenuItem value="Tutor">Tutor / Parental Authority</MenuItem>
                                                <MenuItem value="LegalRepresentative">Legal Representative</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField label="Tutor/Representative Full Name" fullWidth value={history.consentTutorName || ''} onChange={(e) => handleHistoryChange('consentTutorName', e.target.value)} disabled={history.consentType === 'Patient'} />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField label="Contact Phone" fullWidth value={history.consentPhone || ''} onChange={(e) => handleHistoryChange('consentPhone', e.target.value)} />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField label="Full Address" fullWidth value={history.consentAddress || ''} onChange={(e) => handleHistoryChange('consentAddress', e.target.value)} />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField label="Consent Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={history.consentDate ? history.consentDate.split('T')[0] : ''} onChange={(e) => handleHistoryChange('consentDate', e.target.value)} />
                                        </Grid>
                                    </Grid>
                                </Stack>

                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Signature</Typography>
                                    <SignaturePad
                                        value={history.consentSignature}
                                        onChange={(sig: string) => handleHistoryChange('consentSignature', sig)}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Stack>
                )}

                {tabValue === 5 && (
                    <Stack spacing={2} sx={{ py: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Default Staff per Service</Typography>
                        <Typography variant="body2" color="text.secondary">
                            When scheduling appointments, these staff members will be assigned by default for each service.
                        </Typography>
                        
                        <Table size="small">
                            <TableBody>
                                {services.map(s => {
                                    const da = defaultAttendants.find(d => d.serviceId === s.id);
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell sx={{ border: 'none', pl: 0, py: 1.5 }}>
                                                <Typography variant="subtitle2">{s.name}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ border: 'none', py: 1.5 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Default Staff"
                                                    value={da?.attendantId || ''}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value === '' ? '' : Number(e.target.value);
                                                        if (newVal === '') {
                                                            setDefaultAttendants(prev => prev.filter(p => p.serviceId !== s.id));
                                                        } else {
                                                            const exists = defaultAttendants.some(p => p.serviceId === s.id);
                                                            if (exists) {
                                                                setDefaultAttendants(prev => prev.map(p => p.serviceId === s.id ? { ...p, attendantId: newVal } : p));
                                                            } else {
                                                                setDefaultAttendants(prev => [...prev, { serviceId: s.id, attendantId: newVal, patientId: patient?.id || 0 }]);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <MenuItem value=""><em>None</em></MenuItem>
                                                    {users.map(u => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)}
                                                </TextField>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                {tabValue > 0 && <Button onClick={() => setTabValue(v => v - 1)}>Previous</Button>}
                
                {isEditMode && (
                    <Button onClick={handleSubmit} variant="contained" color="primary" disabled={!canSubmit}>
                        Save
                    </Button>
                )}

                {tabValue === 0 ? (
                    <Stack direction="row" spacing={1}>
                        {!isEditMode && (
                            <Button onClick={handleSubmit} variant="outlined" disabled={!canSubmit}>
                                Create
                            </Button>
                        )}
                        <Button onClick={() => setTabValue(1)} variant="contained" disabled={!canSubmit}>
                            Fill clinical history
                        </Button>
                    </Stack>
                ) : (
                    tabValue < 5 ? (
                        <Button onClick={() => setTabValue(v => v + 1)} variant="contained">Next</Button>
                    ) : (
                        !isEditMode && (
                            <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit}>
                                Create
                            </Button>
                        )
                    )
                )}
            </DialogActions>
        </Dialog>
    );
}
