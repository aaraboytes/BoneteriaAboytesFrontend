'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import apiClient from '@/lib/api-client';
import type { PatientRecord } from './patient-types';

interface MergePatientsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MergePatientsDialog({ open, onClose, onSuccess }: MergePatientsDialogProps): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);
  const [duplicates, setDuplicates] = React.useState<PatientRecord[][]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = React.useState(0);
  const [primaryId, setPrimaryId] = React.useState<number | ''>('');
  const [merging, setMerging] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      fetchDuplicates();
    } else {
      setDuplicates([]);
      setCurrentGroupIndex(0);
      setPrimaryId('');
    }
  }, [open]);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/Patients/duplicates');
      setDuplicates(response.data);
      if (response.data.length > 0) {
        setPrimaryId(response.data[0][0].id);
      }
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextGroup = () => {
    if (currentGroupIndex < duplicates.length - 1) {
      const nextIndex = currentGroupIndex + 1;
      setCurrentGroupIndex(nextIndex);
      setPrimaryId(duplicates[nextIndex][0].id);
    }
  };

  const handleMerge = async () => {
    if (primaryId === '') return;
    const currentGroup = duplicates[currentGroupIndex];
    // Find secondary patients
    const secondaryIds = currentGroup.filter((p) => p.id !== primaryId).map((p) => p.id);
    if (secondaryIds.length === 0) return;

    setMerging(true);
    try {
      // Merge all secondary into primary sequentially
      for (const secId of secondaryIds) {
        await apiClient.post('/Patients/merge', {
          primaryPatientId: primaryId,
          secondaryPatientId: secId,
        });
      }
      // Successfully merged this group
      if (currentGroupIndex < duplicates.length - 1) {
        handleNextGroup();
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to merge patients:', error);
      alert('Failed to merge patients. Please check the logs.');
    } finally {
      setMerging(false);
    }
  };

  const currentGroup = duplicates[currentGroupIndex];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Merge Duplicate Patients</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : duplicates.length === 0 ? (
          <Alert severity="success">No duplicate patients found!</Alert>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info">
              Group {currentGroupIndex + 1} of {duplicates.length}. Select the primary patient to keep. Other patients in this group will be merged into the primary one.
            </Alert>
            <RadioGroup
              value={primaryId}
              onChange={(e) => setPrimaryId(Number(e.target.value))}
            >
              <Stack spacing={2}>
                {currentGroup?.map((patient) => (
                  <Card key={patient.id} variant="outlined" sx={{ borderColor: primaryId === patient.id ? 'primary.main' : 'divider', borderWidth: primaryId === patient.id ? 2 : 1 }}>
                    <CardContent>
                      <FormControlLabel
                        value={patient.id}
                        control={<Radio />}
                        label={
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="h6">
                              {patient.firstName} {patient.lastName} (ID: {patient.id})
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mt: 1, color: 'text.secondary' }}>
                              <Typography variant="body2">Phone: {patient.phone || 'N/A'}</Typography>
                              <Typography variant="body2">Email: {patient.email || 'N/A'}</Typography>
                              <Typography variant="body2">DOB: {new Date(patient.birthDate).toLocaleDateString()}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                              Appointments: {patient.appointmentCount}
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </RadioGroup>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={merging}>
          {duplicates.length === 0 ? 'Close' : 'Cancel'}
        </Button>
        {duplicates.length > 0 && currentGroupIndex < duplicates.length - 1 && (
          <Button onClick={handleNextGroup} disabled={merging}>
            Skip Group
          </Button>
        )}
        {duplicates.length > 0 && (
          <Button
            onClick={handleMerge}
            variant="contained"
            color="error"
            disabled={merging || primaryId === ''}
            startIcon={merging ? <CircularProgress size={20} /> : <UsersIcon />}
          >
            Merge Group
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
