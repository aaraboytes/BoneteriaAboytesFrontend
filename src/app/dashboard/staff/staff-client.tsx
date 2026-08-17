'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import apiClient from '@/lib/api-client';
import { StaffTable } from './staff-table';
import { StaffDialog } from './staff-dialog';
import { StaffFilters } from './staff-filters';

export interface ShiftSchedule {
    id?: number;
    dayOfWeek: number;
    entranceTime: string;
    endTime: string;
}

export interface VacationRequest {
    id?: number;
    startDate: string;
    endDate: string;
    totalDays: number;
    status?: string;
    observations?: string;
}

export interface StaffRecord {
    id: number;
    fullName: string;
    username?: string;
    email: string;
    role: string;
    specialty: string;
    baseConsultationFee: number;
    address: string;
    telephone: string;
    clinicId?: number;
    dateOfBirth?: string;
    dateOfEntry?: string;
    salary?: number;
    salaryLastChanged?: string;
    availableVacationDays?: number;
    shiftSchedules?: ShiftSchedule[];
    vacationRequests?: VacationRequest[];
}

export function StaffClient(): React.JSX.Element {
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [staff, setStaff] = React.useState<StaffRecord[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedStaff, setSelectedStaff] = React.useState<StaffRecord | null>(null);

    const fetchStaff = async (mounted = true) => {
        try {
            const response = await apiClient.get('/Users');
            if (mounted) {
                // We show all users here, or filter by role doctor. Assuming all users are shown.
                setStaff(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        }
    };

    React.useEffect(() => {
        let isMounted = true;
        fetchStaff(isMounted);

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredStaff = React.useMemo(() => {
        if (!searchTerm) {
            return staff;
        }

        const lowerTerm = searchTerm.toLowerCase();
        return staff.filter((doc) => {
            return doc.fullName?.toLowerCase().includes(lowerTerm) ||
                doc.specialty?.toLowerCase().includes(lowerTerm);
        });
    }, [staff, searchTerm]);

    const paginatedStaff = filteredStaff.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Stack spacing={3}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1.5, sm: 3 }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
            >
                <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>Staff</Typography>
                </Stack>
                <div>
                    <Button
                        startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
                        variant="contained"
                        onClick={() => setIsDialogOpen(true)}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        New Staff Member
                    </Button>
                </div>
            </Stack>

            <StaffFilters
                searchTerm={searchTerm}
                onSearch={(term: string) => {
                    setSearchTerm(term);
                    setPage(0); // Reset page on search
                }}
            />

            <StaffTable
                count={filteredStaff.length}
                page={page}
                rows={paginatedStaff}
                rowsPerPage={rowsPerPage}
                onPageChange={(p: number) => setPage(p)}
                onRowsPerPageChange={(r: number) => {
                    setRowsPerPage(r);
                    setPage(0);
                }}
                onEdit={(staffMember) => { setSelectedStaff(staffMember); setIsDialogOpen(true); }}
            />

            <StaffDialog
                open={isDialogOpen}
                staff={selectedStaff ?? undefined}
                onClose={() => { setIsDialogOpen(false); setSelectedStaff(null); }}
                onSuccess={() => {
                    setIsDialogOpen(false);
                    setSelectedStaff(null);
                    fetchStaff(true);
                }}
            />
        </Stack>
    );
}
