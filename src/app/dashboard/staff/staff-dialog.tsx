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
    InputAdornment,
    Tabs,
    Tab,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    Divider
} from '@mui/material';
import { Plus as PlusIcon, Trash as TrashIcon, Calendar as CalendarIcon } from '@phosphor-icons/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';

import apiClient from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';
import type { StaffRecord, ShiftSchedule, VacationRequest } from './staff-client';

export interface StaffDialogProps {
    open: boolean;
    staff?: StaffRecord;
    onClose: () => void;
    onSuccess: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
];

////////////////////////////////////////////////////////////////////////////////
// VACATION REQUEST DIALOG
////////////////////////////////////////////////////////////////////////////////

interface VacationRequestDialogProps {
    open: boolean;
    availableDays: number;
    onClose: () => void;
    onSubmit: (request: { startDate: string, endDate: string, totalDays: number, observations?: string }) => void;
}

function VacationRequestDialog({ open, availableDays, onClose, onSubmit }: VacationRequestDialogProps) {
    const [startDate, setStartDate] = React.useState<Dayjs | null>(dayjs());
    const [endDate, setEndDate] = React.useState<Dayjs | null>(dayjs().add(1, 'day'));
    const [observations, setObservations] = React.useState('');

    const totalDays = React.useMemo(() => {
        if (!startDate || !endDate) return 0;
        return endDate.diff(startDate, 'day') + 1;
    }, [startDate, endDate]);

    const isValid = totalDays > 0 && totalDays <= availableDays;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Request Vacations</DialogTitle>
            <DialogContent dividers>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Typography variant="body2" color={isValid ? "text.secondary" : "error"}>
                            Total Days: <strong>{totalDays}</strong> (Available: {availableDays})
                        </Typography>
                        <DatePicker label="Start Date" value={startDate} onChange={(v) => setStartDate(v)} />
                        <DatePicker label="End Date" value={endDate} onChange={(v) => setEndDate(v)} minDate={startDate || undefined} />
                        <TextField label="Observations" multiline rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
                    </Stack>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" disabled={!isValid} onClick={() => onSubmit({
                    startDate: startDate!.toISOString(),
                    endDate: endDate!.toISOString(),
                    totalDays,
                    observations
                })}>Request</Button>
            </DialogActions>
        </Dialog>
    );
}

export function StaffDialog({ open, staff, onClose, onSuccess }: StaffDialogProps): React.JSX.Element {
    const isEditMode = Boolean(staff);
    const { user: currentUser } = useUser();
    const isAdmin = currentUser?.role === 'admin';
    const [tabValue, setTabValue] = React.useState(0);
    const [vacationDialogOpen, setVacationDialogOpen] = React.useState(false);

    const [fullName, setFullName] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [role, setRole] = React.useState('Empleado');
    const [specialty, setSpecialty] = React.useState('');
    const [baseConsultationFee, setBaseConsultationFee] = React.useState<number>(0);
    const [address, setAddress] = React.useState('');
    const [telephone, setTelephone] = React.useState('');

    // New Fields
    const [dateOfBirth, setDateOfBirth] = React.useState<Dayjs | null>(null);
    const [dateOfEntry, setDateOfEntry] = React.useState<Dayjs | null>(null);
    const [salary, setSalary] = React.useState<number>(0);
    const [availableVacationDays, setAvailableVacationDays] = React.useState<number>(12);
    const [shiftSchedules, setShiftSchedules] = React.useState<ShiftSchedule[]>([]);

    // ID Management
    const [manualId, setManualId] = React.useState<number | ''>('');

    // Foreign Keys
    const [clinicId, setClinicId] = React.useState<number | ''>('');

    // Reference Data
    const [clinics, setClinics] = React.useState<{ id: number, name: string }[]>([]);

    React.useEffect(() => {
        if (!open) return;

        setTabValue(0);

        if (staff) {
            setFullName(staff.fullName);
            setUsername(staff.username || staff.fullName.toLowerCase().replace(/\s+/g, ''));
            setEmail(staff.email);
            setPassword('');
            setRole(staff.role || 'Empleado');
            setSpecialty(staff.specialty || '');
            setBaseConsultationFee(staff.baseConsultationFee || 0);
            setAddress(staff.address || '');
            setTelephone(staff.telephone || '');
            setDateOfBirth(staff.dateOfBirth ? dayjs(staff.dateOfBirth) : null);
            setDateOfEntry(staff.dateOfEntry ? dayjs(staff.dateOfEntry) : null);
            setSalary(staff.salary || 0);
            setAvailableVacationDays(staff.availableVacationDays ?? 12);
            setShiftSchedules(staff.shiftSchedules || []);
            setManualId(staff.id);
        } else {
            setFullName('');
            setUsername('');
            setEmail('');
            setPassword('');
            setRole('Empleado');
            setSpecialty('');
            setBaseConsultationFee(0);
            setAddress('');
            setTelephone('');
            setDateOfBirth(null);
            setDateOfEntry(null);
            setSalary(0);
            setAvailableVacationDays(12);
            setShiftSchedules([]);
            setManualId('');
        }

        let active = true;
        const fetchRefs = async () => {
            try {
                const clinicsRes = await apiClient.get('/Clinics').catch(() => ({ data: [{ id: 1, name: 'Main Store' }] }));
                if (active) {
                    setClinics(clinicsRes.data);
                    if (staff) {
                        setClinicId(staff.clinicId ?? (clinicsRes.data.length > 0 ? clinicsRes.data[0].id : ''));
                    } else {
                        if (clinicsRes.data.length > 0) setClinicId(clinicsRes.data[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to load reference data', err);
            }
        };
        fetchRefs();
        return () => { active = false; };
    }, [open, staff]);

    const handleAddShift = () => {
        setShiftSchedules([...shiftSchedules, { dayOfWeek: 1, entranceTime: '08:00', endTime: '17:00' }]);
    };

    const handleRemoveShift = (index: number) => {
        setShiftSchedules(shiftSchedules.filter((_, i) => i !== index));
    };

    const handleShiftChange = (index: number, field: keyof ShiftSchedule, value: any) => {
        const updated = [...shiftSchedules];
        updated[index] = { ...updated[index], [field]: value };
        setShiftSchedules(updated);
    };

    const handleSubmit = async () => {
        if (!fullName || !email || clinicId === '' || (!isEditMode && !password)) return;

        const payload = {
            fullName,
            username: username.replace(/\s+/g, ''),
            email,
            password: password || undefined,
            role,
            specialty,
            baseConsultationFee,
            address,
            telephone,
            clinicId,
            dateOfBirth: dateOfBirth?.toISOString(),
            dateOfEntry: dateOfEntry?.toISOString(),
            salary,
            availableVacationDays,
            shiftSchedules,
            newId: manualId === '' ? undefined : Number(manualId)
        };

        try {
            if (isEditMode && staff) {
                await apiClient.put(`/Users/${staff.id}`, payload);
            } else {
                await apiClient.post('/Users', payload);
            }
            onSuccess();
        } catch (error: any) {
            console.error('Failed to save staff:', error);
            alert(`Failed to save staff: ${error.response?.data || error.message}`);
        }
    };

    const handleDeleteStaff = async () => {
        if (!staff) return;
        if (!window.confirm(`Are you sure you want to delete ${fullName}? This will hide them from active staff lists and tables, but will NOT delete their past consultations or medical history records.`)) {
            return;
        }

        try {
            await apiClient.delete(`/Users/${staff.id}`);
            onSuccess();
        } catch (error: any) {
            console.error('Failed to delete staff:', error);
            alert(`Failed to delete staff: ${error.response?.data || error.message}`);
        }
    };

    const handleVacationSubmit = async (request: any) => {
        if (!staff) return;
        try {
            await apiClient.post(`/Users/${staff.id}/vacations`, request);
            setVacationDialogOpen(false);
            onSuccess(); // Refresh list to see updated balance and history
        } catch (error: any) {
            alert(`Failed to request vacations: ${error.response?.data || error.message}`);
        }
    };

    const isFormValid = !!fullName && !!email && clinicId !== '' && (isEditMode || !!password);

    const salaryLastChangedDate = staff?.salaryLastChanged ? dayjs(staff.salaryLastChanged) : null;
    const isSalaryOld = !salaryLastChangedDate || dayjs().diff(salaryLastChangedDate, 'year') >= 1;

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle>{isEditMode ? 'Edit Staff Member' : 'New Staff Member'}</DialogTitle>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                        <Tab label="Personal & Role" />
                        <Tab label="Store Info" />
                        <Tab label="Shift Schedule" />
                        <Tab label="Vacations" />
                        {isAdmin && isEditMode && <Tab label="Security" />}
                    </Tabs>
                </Box>
                <DialogContent dividers sx={{ p: 0 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TabPanel value={tabValue} index={0}>
                            <Stack spacing={3}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <TextField
                                        label="ID"
                                        type="number"
                                        sx={{ width: 100 }}
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value === '' ? '' : Number(e.target.value))}
                                        disabled={!isEditMode}
                                    />
                                    <TextField
                                        label="Full Name"
                                        fullWidth
                                        value={fullName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFullName(val);
                                            if (!isEditMode && !username) {
                                                setUsername(val.toLowerCase().replace(/\s+/g, ''));
                                            }
                                        }}
                                    />
                                    <TextField
                                        label="Username (Usuario)"
                                        fullWidth
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                                        helperText="Sin espacios"
                                    />
                                    <TextField label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
                                </Stack>
                                {!isEditMode && (
                                    <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} helperText="Required for new staff to log in." />
                                )}
                                <Stack direction="row" spacing={2}>
                                    <TextField select label="Rol de Usuario" fullWidth value={role} onChange={(e) => setRole(e.target.value)}>
                                        <MenuItem value="Administrador">Administrador</MenuItem>
                                        <MenuItem value="Desarrollador">Desarrollador</MenuItem>
                                        <MenuItem value="Jefe">Jefe</MenuItem>
                                        <MenuItem value="Gerente">Gerente</MenuItem>
                                        <MenuItem value="Empleado">Empleado</MenuItem>
                                        <MenuItem value="Bodega">Bodega</MenuItem>
                                    </TextField>
                                    <TextField label="Specialty" fullWidth value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiologist" />
                                </Stack>
                                <DatePicker label="Date of Birth" value={dateOfBirth} onChange={(v) => setDateOfBirth(v)} slotProps={{ textField: { fullWidth: true } }} />
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <Stack spacing={3}>
                                <Stack direction="row" spacing={2}>
                                    <TextField select label="Store" fullWidth value={clinicId} onChange={(e) => setClinicId(Number(e.target.value))}>
                                        {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                    </TextField>
                                    <TextField label="Base Consultation Fee" type="number" fullWidth value={baseConsultationFee} onChange={(e) => setBaseConsultationFee(Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                                </Stack>
                                <Stack direction="row" spacing={2}>
                                    <DatePicker label="Date of Entry" value={dateOfEntry} onChange={(v) => setDateOfEntry(v)} slotProps={{ textField: { fullWidth: true } }} />
                                    <TextField label="Telephone" fullWidth value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                                </Stack>
                                <TextField label="Address" fullWidth multiline rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                                <Box>
                                    <TextField label="Salary" type="number" fullWidth value={salary} onChange={(e) => setSalary(Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                                    {isSalaryOld && (
                                        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                                            Haven't changed since {salaryLastChangedDate?.format('DD/MM/YYYY') || 'Entry'}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={2}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button startIcon={<PlusIcon />} size="small" onClick={handleAddShift}>Add Shift</Button>
                                </Box>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Day</TableCell>
                                            <TableCell>Entrance</TableCell>
                                            <TableCell>End</TableCell>
                                            <TableCell align="right"></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {shiftSchedules.map((s, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell sx={{ minWidth: 150 }}>
                                                    <TextField select size="small" fullWidth value={s.dayOfWeek} onChange={(e) => handleShiftChange(idx, 'dayOfWeek', e.target.value)}>
                                                        {DAYS_OF_WEEK.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell>
                                                    <TimePicker value={dayjs(`1970-01-01T${s.entranceTime}`)} minutesStep={1} onChange={(v) => handleShiftChange(idx, 'entranceTime', v?.format('HH:mm'))} slotProps={{ textField: { size: 'small' } }} />
                                                </TableCell>
                                                <TableCell>
                                                    <TimePicker value={dayjs(`1970-01-01T${s.endTime}`)} minutesStep={1} onChange={(v) => handleShiftChange(idx, 'endTime', v?.format('HH:mm'))} slotProps={{ textField: { size: 'small' } }} />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton color="error" onClick={() => handleRemoveShift(idx)}><TrashIcon /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {shiftSchedules.length === 0 && (
                                            <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No shifts defined.</Typography></TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={3}>
                            <Stack spacing={3}>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" gutterBottom>Vacation Balance</Typography>
                                    <Stack direction="row" spacing={4} alignItems="center">
                                        <Box>
                                            <Typography variant="h4">{availableVacationDays}</Typography>
                                            <Typography variant="caption" color="text.secondary">Days Available</Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem />
                                        <Button variant="outlined" startIcon={<CalendarIcon />} onClick={() => setVacationDialogOpen(true)} disabled={!isEditMode}>
                                            Ask for Vacations
                                        </Button>
                                    </Stack>
                                </Box>

                                <Typography variant="subtitle2">Previous Requests</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Range</TableCell>
                                            <TableCell>Days</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(staff?.vacationRequests || []).length === 0 ? (
                                            <TableRow><TableCell colSpan={3} align="center">No vacation history.</TableCell></TableRow>
                                        ) : (
                                            staff?.vacationRequests?.map((v, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{dayjs(v.startDate).format('DD/MM/YYYY')} - {dayjs(v.endDate).format('DD/MM/YYYY')}</TableCell>
                                                    <TableCell>{v.totalDays}</TableCell>
                                                    <TableCell>{v.status}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Stack>
                        </TabPanel>

                        {isAdmin && isEditMode && (
                            <TabPanel value={tabValue} index={4}>
                                <Stack spacing={3}>
                                    <Typography variant="subtitle1" fontWeight="bold">Security Settings</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        As an administrator, you can change this user's password directly.
                                    </Typography>
                                    <TextField
                                        label="New Password"
                                        type="password"
                                        fullWidth
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        helperText="Leave blank to keep the current password."
                                    />
                                    <Box>
                                        <Button 
                                            variant="contained" 
                                            color="primary" 
                                            onClick={handleSubmit}
                                            disabled={!password}
                                        >
                                            Update Password
                                        </Button>
                                    </Box>
                                </Stack>
                            </TabPanel>
                        )}
                    </LocalizationProvider>
                </DialogContent>
                 <DialogActions sx={{ justifyContent: isEditMode && isAdmin ? 'space-between' : 'flex-end', px: 3, py: 2 }}>
                    {isEditMode && isAdmin && (
                        <Button 
                            color="error" 
                            variant="outlined" 
                            onClick={handleDeleteStaff}
                        >
                            Delete Staff
                        </Button>
                    )}
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose} color="inherit">Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={!isFormValid}>
                            {isEditMode ? 'Save' : 'Create'}
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <VacationRequestDialog
                open={vacationDialogOpen}
                availableDays={availableVacationDays}
                onClose={() => setVacationDialogOpen(false)}
                onSubmit={handleVacationSubmit}
            />
        </>
    );
}
