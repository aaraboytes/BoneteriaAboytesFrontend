import * as React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { ChatTeardropText as ChatIcon } from '@phosphor-icons/react/dist/ssr/ChatTeardropText';
import { Stethoscope as StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { Pill as PillIcon } from '@phosphor-icons/react/dist/ssr/Pill';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { Pulse as ActivityIcon } from '@phosphor-icons/react/dist/ssr/Pulse';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import { ConsultationsListView } from './consultations-list-view';
import { ReadaptationsListView } from './readaptations-list-view';
import { TreatmentsListView } from './treatments-list-view';
import { PrescriptionsListView } from './prescriptions-list-view';
import { ReportsListView } from './reports-list-view';

interface MedicalRecordViewProps {
    patientId: number;
    onUpdate?: () => void;
}

export function MedicalRecordView({ patientId, onUpdate }: MedicalRecordViewProps): React.JSX.Element {
    const [subTab, setSubTab] = React.useState(0);

    const menuItems = [
        { label: 'Consultations', icon: <ChatIcon size={22} />, value: 0 },
        { label: 'Readaptation', icon: <ActivityIcon size={22} />, value: 1 },
        { label: 'Treatments', icon: <StethoscopeIcon size={22} />, value: 2 },
        { label: 'Prescriptions', icon: <PillIcon size={22} />, value: 3 },
        { label: 'Reports', icon: <FileTextIcon size={22} />, value: 4 },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            {/* Content Area */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', mb: 3 }}>
                {subTab === 0 && <ConsultationsListView patientId={patientId} onUpdate={onUpdate} />}
                {subTab === 1 && <ReadaptationsListView patientId={patientId} onUpdate={onUpdate} />}
                {subTab === 2 && <TreatmentsListView patientId={patientId} />}
                {subTab === 3 && <PrescriptionsListView patientId={patientId} />}
                {subTab === 4 && <ReportsListView patientId={patientId} />}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Bottom Navigation Bar */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                <Stack 
                    direction="row" 
                    spacing={1} 
                    sx={{ 
                        p: 1, 
                        overflowX: 'auto',
                        justifyContent: { xs: 'flex-start', sm: 'center' }
                    }}
                >
                    {menuItems.map((item) => (
                        <ListItemButton
                            key={item.value}
                            selected={subTab === item.value}
                            onClick={() => setSubTab(item.value)}
                            sx={{
                                borderRadius: 1.5,
                                py: 1,
                                px: 2,
                                minWidth: 'fit-content',
                                flex: { xs: '0 0 auto', sm: 1 },
                                maxWidth: { sm: 200 },
                                '&.Mui-selected': {
                                    bgcolor: 'primary.alpha12',
                                    color: 'primary.main',
                                    '&:hover': {
                                        bgcolor: 'primary.alpha16',
                                    },
                                    '& .MuiListItemIcon-root': {
                                        color: 'primary.main',
                                    },
                                    '& .MuiListItemText-primary': {
                                        fontWeight: 700,
                                    },
                                    borderBottom: 3,
                                    borderColor: 'primary.main',
                                    borderBottomLeftRadius: 0,
                                    borderBottomRightRadius: 0,
                                },
                                transition: 'all 0.2s ease-in-out',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.5
                            }}
                        >
                            <Box sx={{ color: subTab === item.value ? 'primary.main' : 'text.secondary' }}>
                                {item.icon}
                            </Box>
                            <ListItemText 
                                primary={item.label} 
                                primaryTypographyProps={{ 
                                    variant: 'caption',
                                    sx: { textAlign: 'center' }
                                }} 
                            />
                        </ListItemButton>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}
