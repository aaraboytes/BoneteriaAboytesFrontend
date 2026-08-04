import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import type { SxProps } from '@mui/material/styles';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import type { ServiceRecord } from '@/app/dashboard/services/services-client';
import * as PhosphorIcons from '@phosphor-icons/react/dist/ssr';

export interface ServicesListProps {
    services?: ServiceRecord[];
    onSelectService?: (service: ServiceRecord) => void;
    sx?: SxProps;
}

const DynamicIcon = ({ iconName }: { iconName?: string }) => {
    if (!iconName) return <BriefcaseIcon color="#fff" />;

    const formattedName = iconName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

    // @ts-ignore
    const IconComponent = PhosphorIcons[formattedName] || BriefcaseIcon;
    return <IconComponent color="#fff" />;
};

export function ServicesList({ services = [], onSelectService, sx }: ServicesListProps): React.JSX.Element {
    return (
        <Card sx={sx}>
            <CardHeader title="Available Services" />
            <Divider />
            <List>
                {services.length === 0 ? (
                    <ListItem>
                        <ListItemText primary="No services found." />
                    </ListItem>
                ) : services.map((service, index) => (
                    <ListItem
                        divider={index < services.length - 1}
                        key={service.id}
                        onClick={() => onSelectService?.(service)}
                        sx={{
                            cursor: onSelectService ? 'pointer' : 'default',
                            '&:hover': onSelectService ? { bgcolor: 'var(--mui-palette-action-hover)' } : {}
                        }}
                    >
                        <ListItemAvatar>
                            <Avatar sx={{ bgcolor: service.color || 'var(--mui-palette-primary-main)' }}>
                                <DynamicIcon iconName={service.icon} />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={service.name}
                            primaryTypographyProps={{ variant: 'subtitle1' }}
                            secondary={`Performers: ${service.performers?.length ? service.performers.map(p => p.fullName).join(', ') : 'N/A'} | Duration: ${service.duration} mins | Cost: $${service.cost?.toFixed(2) || '0.00'}`}
                            secondaryTypographyProps={{ variant: 'body2' }}
                        />
                    </ListItem>
                ))}
            </List>
        </Card>
    );
}
