'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import apiClient from '@/lib/api-client';
import { ServicesList } from '@/components/dashboard/services/services-list';
import { AddServiceDialog } from '@/components/dashboard/services/add-service-dialog';
import { ServiceDetailsDialog } from '@/components/dashboard/services/service-details-dialog';

export interface ServiceRecord {
    id: number;
    name: string;
    icon: string;
    duration: number;
    color: string;
    cost: number;
    performers?: { id: number; fullName: string; }[];
    technologies: { id: number; name: string; }[];
    updatedAt?: string;
}

export function ServicesClient(): React.JSX.Element {
    const [services, setServices] = React.useState<ServiceRecord[]>([]);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedService, setSelectedService] = React.useState<ServiceRecord | null>(null);
    const [serviceToEdit, setServiceToEdit] = React.useState<ServiceRecord | null>(null);

    const fetchServices = async (mounted = true) => {
        try {
            const response = await apiClient.get('/Services');
            if (mounted) {
                setServices(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch services:', error);
        }
    };

    React.useEffect(() => {
        let isMounted = true;
        fetchServices(isMounted);

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={3}>
                <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Typography variant="h4">Services</Typography>
                </Stack>
                <div>
                    <Button
                        startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
                        variant="contained"
                        onClick={() => {
                            setServiceToEdit(null);
                            setIsFormDialogOpen(true);
                        }}
                    >
                        Add service
                    </Button>
                </div>
            </Stack>

            <ServicesList services={services} onSelectService={setSelectedService} />

            <AddServiceDialog
                open={isFormDialogOpen}
                onClose={() => {
                    setIsFormDialogOpen(false);
                    setServiceToEdit(null);
                }}
                onSuccess={() => {
                    setIsFormDialogOpen(false);
                    setServiceToEdit(null);
                    fetchServices(true);
                }}
                serviceToEdit={serviceToEdit}
            />

            <ServiceDetailsDialog
                open={!!selectedService}
                onClose={() => setSelectedService(null)}
                service={selectedService}
                onEdit={(service) => {
                    setSelectedService(null);
                    setServiceToEdit(service);
                    setIsFormDialogOpen(true);
                }}
            />
        </Stack>
    );
}
