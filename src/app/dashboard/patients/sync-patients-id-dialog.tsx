'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import apiClient from '@/lib/api-client';

interface Candidate {
    dbPatientId: number;
    dbPatientName: string;
    csvPatientId: number;
    csvPatientName: string;
    hasConflict: boolean;
    conflictPatientName: string | null;
}

interface SyncPatientsIdDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SyncPatientsIdDialog({ open, onClose, onSuccess }: SyncPatientsIdDialogProps): React.JSX.Element {
    const [candidates, setCandidates] = React.useState<Candidate[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState(false);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<Candidate[]>('/Patients/sync-id-candidates');
            setCandidates(res.data);
            setCurrentIndex(0);
        } catch (error) {
            console.error('Failed to fetch sync candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (open) {
            fetchCandidates();
        }
    }, [open]);

    const handleReplace = async () => {
        if (candidates.length === 0) return;
        const current = candidates[currentIndex];
        
        setActionLoading(true);
        try {
            await apiClient.post('/Patients/sync-id', {
                oldPatientId: current.dbPatientId,
                newPatientId: current.csvPatientId
            });
            
            // Advance to next
            if (currentIndex < candidates.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                onSuccess();
            }
        } catch (error) {
            console.error('Failed to sync patient ID:', error);
            alert('Failed to sync patient ID. Please check the logs.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSkip = () => {
        if (currentIndex < candidates.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const currentCandidate = candidates[currentIndex];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Sync Patient IDs</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : candidates.length === 0 ? (
                    <Typography>No patient ID discrepancies found.</Typography>
                ) : (
                    <Stack spacing={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Discrepancy {currentIndex + 1} of {candidates.length}
                        </Typography>

                        <Stack direction="row" spacing={2} justifyContent="space-between">
                            <Box sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Local Database Record
                                </Typography>
                                <Typography variant="body2">Name: {currentCandidate.dbPatientName}</Typography>
                                <Typography variant="body2" color="text.secondary">ID: {currentCandidate.dbPatientId}</Typography>
                            </Box>
                            <Box sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    API / CSV Record
                                </Typography>
                                <Typography variant="body2">Name: {currentCandidate.csvPatientName}</Typography>
                                <Typography variant="body2" color="text.secondary">ID: {currentCandidate.csvPatientId}</Typography>
                            </Box>
                        </Stack>

                        {currentCandidate.hasConflict && (
                            <Alert severity="warning">
                                <strong>Conflict Detected:</strong> The target ID <strong>{currentCandidate.csvPatientId}</strong> is already used by <strong>{currentCandidate.conflictPatientName}</strong> in the local database. Proceeding will overwrite/merge records under this ID.
                            </Alert>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={actionLoading}>
                    Close
                </Button>
                {candidates.length > 0 && (
                    <>
                        <Button onClick={handleSkip} disabled={actionLoading}>
                            Skip
                        </Button>
                        <Button 
                            onClick={handleReplace} 
                            variant="contained" 
                            color={currentCandidate?.hasConflict ? "warning" : "primary"}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <CircularProgress size={24} /> : "Replace ID"}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
