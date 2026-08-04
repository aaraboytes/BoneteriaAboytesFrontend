'use client';

import * as React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    CircularProgress
} from '@mui/material';
import { DotsThreeVertical as DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Printer as PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import apiClient from '@/lib/api-client';
import { GenerateReportDialog } from './generate-report-dialog';
import type { Consultation } from './consultations-list-view';

interface Report {
    id: number;
    patientId: number;
    reportNumber: string;
    date: string;
    diagnostic: string;
    procedureToDate: string;
    observations: string;
    comparativeTableJson: string;
    leftConsultationId: number;
    rightConsultationId: number;
}

interface ReportsListViewProps {
    patientId: number;
}

export function ReportsListView({ patientId }: ReportsListViewProps): React.JSX.Element {
    const [reports, setReports] = React.useState<Report[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [selectedReport, setSelectedReport] = React.useState<Report | null>(null);
    const [openDialog, setOpenDialog] = React.useState(false);
    
    // We'll need these to show the report comparison
    const [leftConsultation, setLeftConsultation] = React.useState<Consultation | null>(null);
    const [rightConsultation, setRightConsultation] = React.useState<Consultation | null>(null);

    const openMenu = Boolean(anchorEl);

    const fetchReports = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<Report[]>(`/MedicalRecords/patients/${patientId}/reports`);
            setReports(res.data);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    React.useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, report: Report) => {
        setAnchorEl(event.currentTarget);
        setSelectedReport(report);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleView = async () => {
        if (selectedReport) {
            setLoading(true);
            try {
                // Fetch consultations used in the report
                const [leftRes, rightRes] = await Promise.all([
                    apiClient.get<Consultation>(`/MedicalRecords/consultations/${selectedReport.leftConsultationId}`),
                    apiClient.get<Consultation>(`/MedicalRecords/consultations/${selectedReport.rightConsultationId}`)
                ]);
                setLeftConsultation(leftRes.data);
                setRightConsultation(rightRes.data);
                setOpenDialog(true);
            } catch (error) {
                console.error('Failed to fetch consultations for report', error);
            } finally {
                setLoading(false);
            }
        }
        handleMenuClose();
    };

    const handlePrint = async () => {
        // To print, we need to open the dialog and trigger print
        await handleView();
        // The dialog handles printing
    };

    return (
        <Stack spacing={2}>
            {loading && !openDialog ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : reports.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No reports generated for this patient.</Typography>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Report Number</TableCell>
                            <TableCell>Diagnostic</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reports.map((report) => (
                            <TableRow key={report.id}>
                                <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                                <TableCell>{report.reportNumber}</TableCell>
                                <TableCell>{report.diagnostic}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={(e) => handleMenuClick(e, report)}>
                                        <DotsThreeVerticalIcon weight="bold" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
                <MenuItem onClick={handleView}>
                    <EyeIcon weight="bold" style={{ marginRight: 8 }} />
                    View
                </MenuItem>
                <MenuItem onClick={handlePrint}>
                    <PrinterIcon weight="bold" style={{ marginRight: 8 }} />
                    Print
                </MenuItem>
            </Menu>

            {selectedReport && leftConsultation && rightConsultation && (
                <GenerateReportDialog
                    open={openDialog}
                    onClose={() => setOpenDialog(false)}
                    patientId={patientId}
                    leftConsultation={leftConsultation}
                    rightConsultation={rightConsultation}
                    comparisonAreas={JSON.parse(selectedReport.comparativeTableJson)}
                    mode="view"
                    reportData={selectedReport}
                />
            )}
        </Stack>
    );
}
