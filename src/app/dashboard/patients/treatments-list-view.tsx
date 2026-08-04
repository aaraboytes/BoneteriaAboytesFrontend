import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import apiClient from '@/lib/api-client';
import { NewTreatmentDialog } from './new-treatment-dialog';

interface Treatment {
    id: number;
    patientId: number;
    number: number;
    date: string;
    treatmentText: string;
}

interface TreatmentsListViewProps {
    patientId: number;
}

export function TreatmentsListView({ patientId }: TreatmentsListViewProps): React.JSX.Element {
    const [treatments, setTreatments] = React.useState<Treatment[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);

    const fetchTreatments = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<Treatment[]>(`/MedicalRecords/patients/${patientId}/treatments`);
            setTreatments(res.data);
        } catch (error) {
            console.error('Failed to fetch treatments', error);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    React.useEffect(() => {
        fetchTreatments();
    }, [fetchTreatments]);

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlusIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add new Treatment
                </Button>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary">Loading treatments...</Typography>
            ) : treatments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No treatments found.</Typography>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Treatment</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {treatments.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell>{t.number}</TableCell>
                                <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                                <TableCell>{t.treatmentText}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <NewTreatmentDialog
                open={openDialog}
                patientId={patientId}
                nextNumber={treatments.length ? Math.max(...treatments.map(t => t.number)) + 1 : 1}
                onClose={() => setOpenDialog(false)}
                onSuccess={() => {
                    setOpenDialog(false);
                    fetchTreatments();
                }}
            />
        </Stack>
    );
}
