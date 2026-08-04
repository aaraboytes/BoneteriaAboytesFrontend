'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import apiClient from '@/lib/api-client';
import { PatientsTable } from './patients-table';
import { PatientDialog } from './patient-dialog';
import { PatientsFilters } from './patients-filters';
import { ExpedientDialog } from './expedient-drawer';
import { ClinicalHistoryDialog } from './clinical-history-dialog';
import { MergePatientsDialog } from './merge-patients-dialog';
import { SyncPatientsIdDialog } from './sync-patients-id-dialog';
import { ArrowsLeftRight } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import type { PatientRecord } from './patient-types';
export type { PatientRecord };

export function PatientsClient(): React.JSX.Element {
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(20);
    const [patients, setPatients] = React.useState<PatientRecord[]>([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isMergeDialogOpen, setIsMergeDialogOpen] = React.useState(false);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = React.useState(false);
    const [selectedPatient, setSelectedPatient] = React.useState<PatientRecord | null>(null);
    const [expedientPatient, setExpedientPatient] = React.useState<PatientRecord | null>(null);
    const [clinicalHistoryPatient, setClinicalHistoryPatient] = React.useState<any>(null);
    const [loadingHistory, setLoadingHistory] = React.useState(false);

    const fetchPatients = async (mounted = true) => {
        try {
            const response = await apiClient.get('/Patients', {
                params: {
                    query: searchTerm,
                    page: page + 1, // API is 1-indexed
                    pageSize: rowsPerPage
                }
            });
            if (mounted) {
                setPatients(response.data.items);
                setTotalCount(response.data.totalCount);
            }
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        }
    };

    const handleReadClinicalHistory = async (patient: PatientRecord) => {
        setClinicalHistoryPatient(patient);
        setLoadingHistory(true);
        try {
            const response = await apiClient.get(`/Patients/${patient.id}/history`);
            setClinicalHistoryPatient(response.data);
        } catch (error) {
            console.error('Failed to fetch clinical history:', error);
            alert('Failed to load clinical history');
            setClinicalHistoryPatient(null);
        } finally {
            setLoadingHistory(false);
        }
    };

    React.useEffect(() => {
        let isMounted = true;
        fetchPatients(isMounted);

        return () => {
            isMounted = false;
        };
    }, [page, rowsPerPage, searchTerm]);

    // Pagination and Filtering now handled server-side
    const paginatedPatients = patients;

    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={3}>
                <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Typography variant="h4">Patients</Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        color="primary"
                        startIcon={<ArrowsLeftRight fontSize="var(--icon-fontSize-md)" />}
                        variant="outlined"
                        onClick={() => setIsSyncDialogOpen(true)}
                    >
                        Sync patients ID
                    </Button>
                    <Button
                        color="primary"
                        startIcon={<UsersIcon fontSize="var(--icon-fontSize-md)" />}
                        variant="outlined"
                        onClick={() => setIsMergeDialogOpen(true)}
                    >
                        Merge duplicates
                    </Button>
                    <Button
                        startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
                        variant="contained"
                        onClick={() => setIsDialogOpen(true)}
                    >
                        New patient
                    </Button>
                </Stack>
            </Stack>

            <PatientsFilters
                searchTerm={searchTerm}
                onSearch={(term: string) => {
                    setSearchTerm(term);
                    setPage(0); // Reset page on search
                }}
            />

            <PatientsTable
                count={totalCount}
                page={page}
                rows={paginatedPatients}
                rowsPerPage={rowsPerPage}
                onPageChange={(p: number) => setPage(p)}
                onRowsPerPageChange={(r: number) => {
                    setRowsPerPage(r);
                    setPage(0);
                }}
                onReadExpedient={(patient) => setExpedientPatient(patient)}
            />

            <PatientDialog
                open={isDialogOpen}
                patient={selectedPatient ?? undefined}
                onClose={() => { setIsDialogOpen(false); setSelectedPatient(null); }}
                onSuccess={(savedPatient) => {
                    setIsDialogOpen(false);
                    setSelectedPatient(null);
                    fetchPatients(true);
                    setExpedientPatient(savedPatient);
                }}
            />

            <ExpedientDialog
                open={Boolean(expedientPatient)}
                patient={expedientPatient}
                onClose={() => setExpedientPatient(null)}
                onUpdate={() => fetchPatients(true)}
                onEdit={() => {
                    if (expedientPatient) {
                        setSelectedPatient(expedientPatient);
                        setIsDialogOpen(true);
                        setExpedientPatient(null);
                    }
                }}
            />

            <ClinicalHistoryDialog
                open={Boolean(clinicalHistoryPatient)}
                onClose={() => setClinicalHistoryPatient(null)}
                loading={loadingHistory}
                patient={clinicalHistoryPatient}
            />

            <MergePatientsDialog
                open={isMergeDialogOpen}
                onClose={() => setIsMergeDialogOpen(false)}
                onSuccess={() => {
                    setIsMergeDialogOpen(false);
                    fetchPatients(true);
                }}
            />

            <SyncPatientsIdDialog
                open={isSyncDialogOpen}
                onClose={() => setIsSyncDialogOpen(false)}
                onSuccess={() => {
                    setIsSyncDialogOpen(false);
                    fetchPatients(true);
                }}
            />
        </Stack>
    );
}
