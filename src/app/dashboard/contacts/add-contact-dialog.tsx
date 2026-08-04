import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    Grid
} from '@mui/material';
import apiClient from '@/lib/api-client';

export interface ContactRecord {
    id: number;
    firstName: string;
    lastName: string;
    telephone: string;
    email: string;
    specialty: string;
    clinic: string;
    address: string;
}

interface AddContactDialogProps {
    open: boolean;
    contact?: ContactRecord | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddContactDialog({ open, contact, onClose, onSuccess }: AddContactDialogProps): React.JSX.Element {
    const isEditMode = Boolean(contact);

    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [telephone, setTelephone] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [specialty, setSpecialty] = React.useState('');
    const [clinic, setClinic] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setFirstName(contact?.firstName || '');
            setLastName(contact?.lastName || '');
            setTelephone(contact?.telephone || '');
            setEmail(contact?.email || '');
            setSpecialty(contact?.specialty || '');
            setClinic(contact?.clinic || '');
            setAddress(contact?.address || '');
        }
    }, [open, contact]);

    const handleSubmit = async () => {
        if (!firstName || submitting) return;
        setSubmitting(true);
        
        const payload = {
            firstName,
            lastName,
            telephone,
            email,
            specialty,
            clinic,
            address
        };

        try {
            if (isEditMode && contact) {
                await apiClient.put(`Contacts/${contact.id}`, { id: contact.id, ...payload });
            } else {
                await apiClient.post('Contacts', payload);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save contact', error);
            alert('Failed to save contact');
        } finally {
            setSubmitting(false);
        }
    };

    const isFormValid = !!firstName;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEditMode ? 'Edit Contact' : 'New Contact'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ py: 1 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                                label="First Name" 
                                required 
                                fullWidth 
                                value={firstName} 
                                onChange={(e) => setFirstName(e.target.value)} 
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                                label="Last Name" 
                                fullWidth 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)} 
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                                label="Telephone" 
                                fullWidth 
                                value={telephone} 
                                onChange={(e) => setTelephone(e.target.value)} 
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                                label="Email" 
                                type="email" 
                                fullWidth 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                                label="Specialty" 
                                fullWidth 
                                value={specialty} 
                                onChange={(e) => setSpecialty(e.target.value)} 
                                helperText="e.g. Cardiologist, General Physician"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                                label="Clinic" 
                                fullWidth 
                                value={clinic} 
                                onChange={(e) => setClinic(e.target.value)} 
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField 
                                label="Address" 
                                fullWidth 
                                multiline 
                                rows={2} 
                                value={address} 
                                onChange={(e) => setAddress(e.target.value)} 
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!isFormValid || submitting}>
                    {submitting ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
