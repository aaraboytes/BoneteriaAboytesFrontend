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
import { Printer as PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import IconButton from '@mui/material/IconButton';
import apiClient from '@/lib/api-client';
import { NewPrescriptionDialog } from './new-prescription-dialog';

interface Prescription {
    id: number;
    patientId: number;
    consultationId?: number | null;
    number: number;
    date: string;
    prescriptionText: string;
}

interface PrescriptionsListViewProps {
    patientId: number;
}

export function PrescriptionsListView({ patientId }: PrescriptionsListViewProps): React.JSX.Element {
    const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);

    const fetchPrescriptions = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<Prescription[]>(`/MedicalRecords/patients/${patientId}/prescriptions`);
            setPrescriptions(res.data);
        } catch (error) {
            console.error('Failed to fetch prescriptions', error);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    React.useEffect(() => {
        fetchPrescriptions();
    }, [fetchPrescriptions]);

    const handlePrint = (prescription: Prescription) => {
        // Implement printing logic later, e.g. opening a new window with a printable view
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head><title>Prescription #${prescription.number}</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 40px;">
                        <h2>Prescription #${prescription.number}</h2>
                        <p><strong>Date:</strong> ${new Date(prescription.date).toLocaleDateString()}</p>
                        <p><strong>Details:</strong></p>
                        <p style="white-space: pre-wrap;">${prescription.prescriptionText}</p>
                        <script>window.print();</script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlusIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add new Prescription
                </Button>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary">Loading prescriptions...</Typography>
            ) : prescriptions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No prescriptions found.</Typography>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Prescription</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {prescriptions.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>{p.number}</TableCell>
                                <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                                <TableCell>{p.prescriptionText}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handlePrint(p)}>
                                        <PrinterIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <NewPrescriptionDialog
                open={openDialog}
                patientId={patientId}
                nextNumber={prescriptions.length ? Math.max(...prescriptions.map(p => p.number)) + 1 : 1}
                onClose={() => setOpenDialog(false)}
                onSuccess={() => {
                    setOpenDialog(false);
                    fetchPrescriptions();
                }}
            />
        </Stack>
    );
}
