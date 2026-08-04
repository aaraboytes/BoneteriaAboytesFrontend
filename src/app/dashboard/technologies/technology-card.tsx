'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Person as PersonIcon } from '@phosphor-icons/react/dist/ssr/Person';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

import type { Technology } from './technologies-client';

export interface TechnologyCardProps {
    technology: Technology;
    onEdit: (tech: Technology) => void;
}

export function TechnologyCard({ technology, onEdit }: TechnologyCardProps): React.JSX.Element {
    // Calculate if maintenance is past due
    const isMaintenancePast = React.useMemo(() => {
        if (!technology.dateLastMaintenance) return true; // Needs maintenance if never maintained
        const lastMaintenance = new Date(technology.dateLastMaintenance);
        const nextMaintenanceDate = new Date(lastMaintenance.getTime() + technology.maintenancePeriodicityDays * 24 * 60 * 60 * 1000);
        return nextMaintenanceDate < new Date();
    }, [technology.dateLastMaintenance, technology.maintenancePeriodicityDays]);

    const getNextMaintenanceDisplayDate = () => {
        if (!technology.dateLastMaintenance) return 'Needs maintenance';
        const lastMaintenance = new Date(technology.dateLastMaintenance);
        const nextMaintenanceDate = new Date(lastMaintenance.getTime() + technology.maintenancePeriodicityDays * 24 * 60 * 60 * 1000);
        return nextMaintenanceDate.toLocaleDateString();
    };

    const formatTime = (timeStr: string) => {
        // timeStr usually comes as "HH:mm:ss" from backend TimeSpan
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        const d = new Date();
        d.setHours(parseInt(parts[0], 10));
        d.setMinutes(parseInt(parts[1], 10));
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const availableTimeRange = `${formatTime(technology.availableStartTime)} - ${formatTime(technology.availableEndTime)}`;

    const isActive = technology.status.toLowerCase() === 'active';

    const parsedMuscles = technology.muscleGroups ? technology.muscleGroups.split(',').map(m => m.trim()).filter(Boolean) : [];

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {technology.color && (
                                <Box
                                    sx={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        bgcolor: technology.color,
                                    }}
                                />
                            )}
                            <Typography variant="h6">{technology.name}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">Alias: {technology.alias}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <Tooltip title={isActive ? 'Active' : 'Inactive'}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: isActive ? 'success.main' : 'text.disabled',
                                    mt: 1
                                }}
                            />
                        </Tooltip>
                        <IconButton size="small" onClick={() => onEdit(technology)} sx={{ mt: 0.5 }}>
                            <PencilIcon fontSize="var(--icon-fontSize-sm)" />
                        </IconButton>
                    </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <WrenchIcon color="var(--mui-palette-text-secondary)" />
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Next Maintenance:</Typography>
                        <Typography variant="body2" color={isMaintenancePast ? 'error.main' : 'text.primary'} fontWeight={isMaintenancePast ? 600 : 400}>
                            {getNextMaintenanceDisplayDate()}
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <PersonIcon color="var(--mui-palette-text-secondary)" style={{ marginTop: 4 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, mt: 0.5 }}>Muscle Groups:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {parsedMuscles.length > 0 ? (
                                parsedMuscles.map(m => (
                                    <Chip key={m} label={m.replace(/-/g, ' ')} size="small" variant="outlined" color="primary" sx={{ textTransform: 'capitalize' }} />
                                ))
                            ) : (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>None specified</Typography>
                            )}
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <ClockIcon color="var(--mui-palette-text-secondary)" />
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Available Times:</Typography>
                        <Typography variant="body2">
                            {availableTimeRange}
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <TimerIcon color="var(--mui-palette-text-secondary)" />
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>Duration:</Typography>
                        <Typography variant="body2">
                            {technology.durationMinutes} min
                        </Typography>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}
