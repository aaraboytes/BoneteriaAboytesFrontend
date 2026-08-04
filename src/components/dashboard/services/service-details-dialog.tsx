'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import * as PhosphorIcons from '@phosphor-icons/react/dist/ssr';
// @ts-ignore
import Grid from '@mui/material/Grid';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import type { ServiceRecord } from '@/app/dashboard/services/services-client';

export interface ServiceDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    service: ServiceRecord | null;
    onEdit: (service: ServiceRecord) => void;
}

const DynamicIcon = ({ iconName, color }: { iconName?: string, color?: string }) => {
    if (!iconName) return <PhosphorIcons.Briefcase color={color || "#fff"} />;

    const formattedName = iconName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

    // @ts-ignore
    const IconComponent = PhosphorIcons[formattedName] || PhosphorIcons.Briefcase;
    return <IconComponent color={color || "#fff"} />;
};

export function ServiceDetailsDialog({ open, onClose, service, onEdit }: ServiceDetailsDialogProps): React.JSX.Element | null {
    if (!service) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Service Summary</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {/* @ts-ignore */}
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">Name</Typography>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                            <Avatar sx={{ bgcolor: service.color || '#6366f1', width: 32, height: 32 }}>
                                <DynamicIcon iconName={service.icon} />
                            </Avatar>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{service.name}</Typography>
                        </Stack>
                    </Grid>
                    {/* @ts-ignore */}
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">Performers</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                            {service.performers && service.performers.length > 0 ? service.performers.map(p => (
                                <Chip key={p.id} label={p.fullName} size="small" />
                            )) : <Typography variant="body2">N/A</Typography>}
                        </Stack>
                    </Grid>

                    {/* @ts-ignore */}
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="text.secondary">Duration & Cost</Typography>
                        <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                            <Typography variant="body1">{service.duration} mins</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                ${service.cost?.toFixed(2) || '0.00'}
                            </Typography>
                        </Stack>
                    </Grid>

                    {/* @ts-ignore */}
                    <Grid item xs={12}>
                        <Typography variant="overline" color="text.secondary">Technologies Involved</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                            {service.technologies && service.technologies.length > 0 ? service.technologies.map(t => (
                                <Chip key={t.id} label={t.name} size="small" variant="outlined" />
                            )) : <Typography variant="body2">None</Typography>}
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Close</Button>
                <Button
                    variant="contained"
                    startIcon={<PencilIcon />}
                    onClick={() => {
                        onClose();
                        onEdit(service);
                    }}
                >
                    Edit
                </Button>
            </DialogActions>
        </Dialog>
    );
}
