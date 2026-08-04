'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { DotsThreeVertical as DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { CalendarBlank as CalendarIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';

import apiClient from '@/lib/api-client';
import { NewReadaptationDialog, ReadaptationRecord } from './new-readaptation-dialog';

interface ReadaptationsListViewProps {
    patientId: number;
    onUpdate?: () => void;
}

export function ReadaptationsListView({ patientId, onUpdate }: ReadaptationsListViewProps): React.JSX.Element {
    const [readaptations, setReadaptations] = React.useState<ReadaptationRecord[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [dialogMode, setDialogMode] = React.useState<'create' | 'view' | 'edit'>('create');
    const [selectedReadaptation, setSelectedReadaptation] = React.useState<ReadaptationRecord | null>(null);

    // Delete Confirmation
    const [openDeleteConfirm, setOpenDeleteConfirm] = React.useState(false);
    const [toDeleteId, setToDeleteId] = React.useState<string | null>(null);

    // Action Menu
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [menuRecord, setMenuRecord] = React.useState<ReadaptationRecord | null>(null);
    const openMenu = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, record: ReadaptationRecord) => {
        setAnchorEl(event.currentTarget);
        setMenuRecord(record);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuRecord(null);
    };

    const fetchReadaptations = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<ReadaptationRecord[]>(`MedicalRecords/patients/${patientId}/readaptations`);
            setReadaptations(res.data);
        } catch (error) {
            console.error('Failed to fetch readaptation records', error);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    React.useEffect(() => {
        fetchReadaptations();
    }, [fetchReadaptations]);

    const handleCreate = () => {
        setDialogMode('create');
        setSelectedReadaptation(null);
        setOpenDialog(true);
    };

    const handleView = async () => {
        if (menuRecord) {
            setLoading(true);
            try {
                const res = await apiClient.get<ReadaptationRecord>(`MedicalRecords/readaptations/${menuRecord.id}`);
                setSelectedReadaptation(res.data);
                setDialogMode('view');
                setOpenDialog(true);
            } catch (error) {
                console.error('Failed to fetch readaptation details', error);
            } finally {
                setLoading(false);
            }
        }
        handleMenuClose();
    };

    const handleEdit = async () => {
        if (menuRecord) {
            setLoading(true);
            try {
                const res = await apiClient.get<ReadaptationRecord>(`MedicalRecords/readaptations/${menuRecord.id}`);
                setSelectedReadaptation(res.data);
                setDialogMode('edit');
                setOpenDialog(true);
            } catch (error) {
                console.error('Failed to fetch readaptation details', error);
            } finally {
                setLoading(false);
            }
        }
        handleMenuClose();
    };

    const handleDeleteClick = () => {
        if (menuRecord?.id) {
            setToDeleteId(menuRecord.id);
            setOpenDeleteConfirm(true);
        }
        handleMenuClose();
    };

    const handleDeleteConfirm = async () => {
        if (toDeleteId) {
            try {
                await apiClient.delete(`MedicalRecords/readaptations/${toDeleteId}`);
                fetchReadaptations();
                if (onUpdate) onUpdate();
            } catch (error) {
                console.error('Failed to delete readaptation record', error);
            } finally {
                setOpenDeleteConfirm(false);
                setToDeleteId(null);
            }
        }
    };

    const handleDialogSuccess = () => {
        setOpenDialog(false);
        fetchReadaptations();
        if (onUpdate) onUpdate();
    };

    const formatReviewDates = (dates?: ReadaptationRecord['revaluationDates']) => {
        if (!dates) return '—';
        const dDate = dates.dynamometryReviewDate ? new Date(dates.dynamometryReviewDate).toLocaleDateString() : null;
        const oDate = dates.orthopedicReviewDate ? new Date(dates.orthopedicReviewDate).toLocaleDateString() : null;
        if (!dDate && !oDate) return '—';
        
        return (
            <Stack spacing={0.5}>
                {dDate && (
                    <Chip
                        icon={<CalendarIcon size={12} />}
                        label={`Dynamometry: ${dDate}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                )}
                {oDate && (
                    <Chip
                        icon={<CalendarIcon size={12} />}
                        label={`Orthopedic: ${oDate}`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                )}
            </Stack>
        );
    };

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" variant="contained" startIcon={<PlusIcon />} onClick={handleCreate}>
                    New Readaptation Report
                </Button>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary">Loading readaptations...</Typography>
            ) : readaptations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No readaptation reports found.</Typography>
            ) : (
                <TableContainer sx={{
                    maxHeight: '100%',
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 }
                }}>
                    <Table size="small" sx={{ minWidth: { xs: 800, sm: '100%' } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Case Description</TableCell>
                                <TableCell>Profile</TableCell>
                                <TableCell>Phase</TableCell>
                                <TableCell>Sessions</TableCell>
                                <TableCell>Reevaluation Dates</TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Practitioner</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {readaptations.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell sx={{ whiteSpace: 'nowrap', py: 1 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                            {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200, py: 1 }}>
                                        <Tooltip title={r.caseDescription || ''} placement="top-start">
                                            <Typography variant="body2" noWrap sx={{ fontSize: '0.75rem' }}>
                                                {r.caseDescription || '—'}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Chip
                                            label={r.patientProfile}
                                            size="small"
                                            color={r.patientProfile === 'Athlete' ? 'success' : 'default'}
                                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                            {r.rehabilitationPhase}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                            {r.sessionFrequency || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        {formatReviewDates(r.revaluationDates)}
                                    </TableCell>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, py: 1, fontSize: '0.75rem' }}>
                                        {r.user ? r.user.fullName : '—'}
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 1 }}>
                                        <IconButton size="small" onClick={(e) => handleMenuClick(e, r)}>
                                            <DotsThreeVerticalIcon weight="bold" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Menu for Row Actions */}
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
                <MenuItem onClick={handleView}>View Details</MenuItem>
                <MenuItem onClick={handleEdit}>Edit</MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>Delete</MenuItem>
            </Menu>

            {/* New/Edit/View Dialog */}
            <NewReadaptationDialog
                open={openDialog}
                patientId={patientId}
                onClose={() => setOpenDialog(false)}
                onSuccess={handleDialogSuccess}
                readaptation={selectedReadaptation}
                mode={dialogMode}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to permanently delete this readaptation report? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteConfirm(false)} color="secondary">Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
