'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import apiClient from '@/lib/api-client';
import { TechnologyCard } from './technology-card';
import { TechnologyDialog, type TechnologyPayload } from './technology-dialog';

export interface Technology {
    id: number;
    name: string;
    alias: string;
    dateLastMaintenance?: string;
    maintenancePeriodicityDays: number;
    durationMinutes: number;
    status: string;
    color: string;
    muscleGroups: string;
    availableStartTime: string;
    availableEndTime: string;
}

export function TechnologiesClient(): React.JSX.Element {
    const [technologies, setTechnologies] = React.useState<Technology[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editingTechnology, setEditingTechnology] = React.useState<Technology | null>(null);

    const fetchTechnologies = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/Technologies');
            setTechnologies(response.data);
        } catch (error) {
            console.error('Failed to fetch technologies', error);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchTechnologies();
    }, [fetchTechnologies]);

    const handleAddTechnology = async (payload: TechnologyPayload) => {
        try {
            if (editingTechnology) {
                await apiClient.put(`/Technologies/${editingTechnology.id}`, payload);
            } else {
                await apiClient.post('/Technologies', payload);
            }
            setDialogOpen(false);
            setEditingTechnology(null);
            fetchTechnologies();
        } catch (error) {
            console.error('Failed to save technology', error);
            alert('Failed to save technology');
        }
    };

    const handleEditTechnology = (tech: Technology) => {
        setEditingTechnology(tech);
        setDialogOpen(true);
    };

    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">Technologies</Typography>
                <Button
                    startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
                    variant="contained"
                    onClick={() => {
                        setEditingTechnology(null);
                        setDialogOpen(true);
                    }}
                >
                    Add machine
                </Button>
            </Stack>

            {loading ? (
                <Typography color="text.secondary">Loading...</Typography>
            ) : technologies.length === 0 ? (
                <Typography color="text.secondary">No technologies found.</Typography>
            ) : (
                <Grid container spacing={3}>
                    {technologies.map((tech) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tech.id}>
                            <TechnologyCard technology={tech} onEdit={handleEditTechnology} />
                        </Grid>
                    ))}
                </Grid>
            )}

            <TechnologyDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setEditingTechnology(null);
                }}
                onSubmit={handleAddTechnology}
                initialData={editingTechnology}
            />
        </Stack>
    );
}