'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import type { PatientRecord } from './patients-client';

interface PatientsTableProps {
    count?: number;
    page?: number;
    rows?: PatientRecord[];
    rowsPerPage?: number;
    onPageChange?: (page: number) => void;
    onRowsPerPageChange?: (rowsPerPage: number) => void;
    onReadExpedient?: (patient: PatientRecord) => void;
}

function stringToColor(string: string) {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
}

function stringAvatar(name: string, size: number = 40) {
    const parts = name.trim().split(' ').filter(Boolean);
    const firstInitial = parts[0] ? parts[0][0] : '';
    const secondInitial = parts[1] ? parts[1][0] : '';
    return {
        sx: {
            bgcolor: stringToColor(name),
            width: size,
            height: size,
            fontSize: `${size / 2}px`,
        },
        children: `${firstInitial}${secondInitial}`.toUpperCase(),
    };
}



export function PatientsTable({
    count = 0,
    rows = [],
    page = 0,
    rowsPerPage = 10,
    onPageChange,
    onRowsPerPageChange,
    onReadExpedient,
}: PatientsTableProps): React.JSX.Element {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Card>
            <Box sx={{ overflowX: 'auto' }}>
                {isMobile ? (
                    <Box sx={{ p: 2 }}>
                        <Stack spacing={2} divider={<Divider />}>
                            {rows.map((row) => (
                                <Box 
                                    key={row.id} 
                                    onClick={() => onReadExpedient?.(row)}
                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, p: 1 }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                        <Stack spacing={0.5}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Badge
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                    variant="dot"
                                                    sx={{
                                                        '& .MuiBadge-badge': {
                                                            backgroundColor: row.status === 'Active' ? 'success.main' : 'text.disabled',
                                                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                        }
                                                    }}
                                                >
                                                    <Avatar 
                                                        src={row.photoUrl} 
                                                        alt={`${row.firstName} ${row.lastName}`} 
                                                        {...(!row.photoUrl ? stringAvatar(`${row.firstName} ${row.lastName}`, 40) : { sx: { width: 40, height: 40 } })} 
                                                    />
                                                </Badge>
                                                <Typography variant="subtitle2" fontWeight={700}>
                                                    #{row.id} {row.firstName} {row.lastName}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary">
                                                {row.group?.name || 'No Group'} • {row.clinic?.name || 'No Clinic'} • <strong style={{ color: (row.balance ?? 0) < 0 ? 'var(--mui-palette-error-main)' : (row.balance ?? 0) > 0 ? 'var(--mui-palette-success-main)' : 'inherit' }}>${(row.balance ?? 0).toFixed(2)}</strong>
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                {row.activeRehabServices?.map(s => (
                                                    <Chip key={s.id} label={s.name} size="small" sx={{ bgcolor: s.color, color: '#fff', height: 16, fontSize: '0.6rem' }} />
                                                ))}
                                                {row.nextAppointmentType === 'Revaloracion' && (
                                                    <Chip label="Reeval" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                        {rows.length === 0 && (
                            <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No patients found
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <Table sx={{ minWidth: rows.length > 0 ? '800px' : 'auto' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Profile</TableCell>
                                <TableCell>First Name</TableCell>
                                <TableCell>Last Name</TableCell>
                                <TableCell>Services</TableCell>
                                <TableCell>Balance</TableCell>
                                <TableCell># appts</TableCell>
                                <TableCell align="center">Reevaluation?</TableCell>
                                <TableCell>Patient Group</TableCell>
                                <TableCell>Clinic</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow 
                                    hover 
                                    key={row.id}
                                    onClick={() => onReadExpedient?.(row)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>
                                        <Badge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            title={row.status}
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    backgroundColor: row.status === 'Active' ? 'success.main' : 'text.disabled',
                                                    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                }
                                            }}
                                        >
                                            <Avatar 
                                                src={row.photoUrl} 
                                                alt={`${row.firstName} ${row.lastName}`} 
                                                {...(!row.photoUrl ? stringAvatar(`${row.firstName} ${row.lastName}`, 40) : { sx: { width: 40, height: 40 } })} 
                                            />
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{row.firstName}</TableCell>
                                    <TableCell>{row.lastName}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                                            {row.activeRehabServices?.map(s => (
                                                <Chip 
                                                    key={s.id} 
                                                    label={s.name} 
                                                    size="small" 
                                                    sx={{ 
                                                        bgcolor: s.color, 
                                                        color: '#fff', 
                                                        height: 20, 
                                                        fontSize: '0.65rem',
                                                        fontWeight: 'bold'
                                                    }} 
                                                />
                                            ))}
                                            {(!row.activeRehabServices || row.activeRehabServices.length === 0) && '—'}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ 
                                            fontWeight: 600, 
                                            color: (row.balance ?? 0) < 0 ? 'error.main' : (row.balance ?? 0) > 0 ? 'success.main' : 'text.primary' 
                                        }}>
                                            ${(row.balance ?? 0).toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{row.appointmentCount ?? 0}</TableCell>
                                    <TableCell align="center">
                                        {row.nextAppointmentType === 'Revaloracion' ? (
                                            <Tooltip title="Next appointment is Revaloración">
                                                <Box sx={{ 
                                                    width: 14, 
                                                    height: 14, 
                                                    borderRadius: '50%', 
                                                    bgcolor: 'warning.main', 
                                                    mx: 'auto',
                                                    boxShadow: 1
                                                }} />
                                            </Tooltip>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>{row.group?.name || 'N/A'}</TableCell>
                                    <TableCell>{row.clinic?.name || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>
            <Divider />
            <TablePagination
                component="div"
                count={count}
                onPageChange={(e, newPage) => onPageChange?.(newPage)}
                onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value, 10))}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10, 20, 50, 100]}
            />
        </Card>
    );
}
