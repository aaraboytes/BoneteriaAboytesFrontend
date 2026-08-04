'use client';

import * as React from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Stack,
    Typography,
    Avatar,
    IconButton,
    Divider,
    Paper,
    OutlinedInput,
    InputAdornment,
    useMediaQuery,
    useTheme,
    Drawer
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PhoneCall as PhoneIcon } from '@phosphor-icons/react/dist/ssr/PhoneCall';
import { Envelope as EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import apiClient from '@/lib/api-client';
import { AddContactDialog, type ContactRecord } from './add-contact-dialog';

function stringToColor(string: string) {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
}

function getInitials(name: string): string {
    const words = name.trim().split(' ');
    if (words.length === 0 || words[0] === '') return 'N/A';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

export function ContactsClient(): React.JSX.Element {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [contacts, setContacts] = React.useState<ContactRecord[]>([]);
    const [selectedContact, setSelectedContact] = React.useState<ContactRecord | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingContact, setEditingContact] = React.useState<ContactRecord | null>(null);
    const [nameQuery, setNameQuery] = React.useState('');
    const [specialtyQuery, setSpecialtyQuery] = React.useState('');

    const renderDetailsContent = (contact: ContactRecord) => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Avatar
                    sx={{ 
                        width: 80, 
                        height: 80, 
                        bgcolor: stringToColor(`${contact.firstName} ${contact.lastName}`),
                        fontSize: '2rem'
                    }}
                >
                    {getInitials(`${contact.firstName} ${contact.lastName}`)}
                </Avatar>
                <Stack direction="row" spacing={1}>
                    {isMobile && (
                        <IconButton size="small" onClick={() => setSelectedContact(null)}>
                            <XIcon />
                        </IconButton>
                    )}
                    <IconButton size="small" onClick={() => handleEditClick(contact)}>
                        <PencilSimpleIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(contact.id)}>
                        <TrashIcon />
                    </IconButton>
                </Stack>
            </Stack>

            <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                {contact.firstName} {contact.lastName}
            </Typography>
            
            {contact.specialty && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: contact.clinic ? 1 : 3 }}>
                    <BriefcaseIcon color="var(--mui-palette-text-secondary)" />
                    <Typography variant="body2" color="text.secondary">
                        {contact.specialty}
                    </Typography>
                </Stack>
            )}

            {contact.clinic && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <BuildingsIcon color="var(--mui-palette-text-secondary)" />
                    <Typography variant="body2" color="text.secondary">
                        {contact.clinic}
                    </Typography>
                </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Email
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <EnvelopeIcon />
                        <Typography variant="body2">
                            {contact.email || '—'}
                        </Typography>
                    </Stack>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Telephone
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon />
                        <Typography variant="body2">
                            {contact.telephone || '—'}
                        </Typography>
                    </Stack>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Address
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        <MapPinIcon style={{ marginTop: 2 }} />
                        <Typography variant="body2">
                            {contact.address || '—'}
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        </>
    );

    const filteredContacts = React.useMemo(() => {
        return contacts.filter((contact) => {
            const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
            const specialty = (contact.specialty || '').toLowerCase();
            
            const matchesName = fullName.includes(nameQuery.toLowerCase());
            const matchesSpecialty = specialty.includes(specialtyQuery.toLowerCase());
            
            return matchesName && matchesSpecialty;
        });
    }, [contacts, nameQuery, specialtyQuery]);

    const fetchContacts = React.useCallback(async () => {
        try {
            const res = await apiClient.get('/Contacts');
            setContacts(res.data);
        } catch (error) {
            console.error('Failed to load contacts', error);
        }
    }, []);

    React.useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    // Re-sync selected contact when the contacts list updates
    React.useEffect(() => {
        if (selectedContact) {
            const updated = contacts.find((c: ContactRecord) => c.id === selectedContact.id);
            if (updated) {
                // Only update if there is an actual visual or structural change to avoid trigger-happy state sets
                if (
                    updated.firstName !== selectedContact.firstName ||
                    updated.lastName !== selectedContact.lastName ||
                    updated.telephone !== selectedContact.telephone ||
                    updated.email !== selectedContact.email ||
                    updated.specialty !== selectedContact.specialty ||
                    updated.clinic !== selectedContact.clinic ||
                    updated.address !== selectedContact.address
                ) {
                    setSelectedContact(updated);
                }
            } else {
                setSelectedContact(null);
            }
        }
    }, [contacts, selectedContact]);

    const handleAddClick = () => {
        setEditingContact(null);
        setIsAddDialogOpen(true);
    };

    const handleEditClick = (contact: ContactRecord) => {
        setEditingContact(contact);
        setIsAddDialogOpen(true);
    };

    const handleDeleteClick = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;
        try {
            await apiClient.delete(`/Contacts/${id}`);
            if (selectedContact && selectedContact.id === id) {
                setSelectedContact(null);
            }
            fetchContacts();
        } catch (error) {
            console.error('Failed to delete contact', error);
            alert('Encountered an error while deleting layout.');
        }
    };

    return (
        <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">Contacts</Typography>
                <Button
                    startIcon={<PlusIcon />}
                    variant="contained"
                    onClick={handleAddClick}
                >
                    Add contact
                </Button>
            </Stack>

            {/* Search Filters */}
            <Card sx={{ p: 2 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <OutlinedInput
                            fullWidth
                            placeholder="Search by name..."
                            value={nameQuery}
                            onChange={(e) => setNameQuery(e.target.value)}
                            startAdornment={
                                <InputAdornment position="start">
                                    <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                                </InputAdornment>
                            }
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <OutlinedInput
                            fullWidth
                            placeholder="Search by specialty..."
                            value={specialtyQuery}
                            onChange={(e) => setSpecialtyQuery(e.target.value)}
                            startAdornment={
                                <InputAdornment position="start">
                                    <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                                </InputAdornment>
                            }
                        />
                    </Grid>
                </Grid>
            </Card>

            <Grid container spacing={3}>
                {/* Contact Matrix */}
                <Grid size={{ xs: 12, md: selectedContact && !isMobile ? 8 : 12 }}>
                    <Grid container spacing={2}>
                        {filteredContacts.map((contact) => {
                            const fullName = `${contact.firstName} ${contact.lastName}`.trim();
                            const isSelected = selectedContact?.id === contact.id;

                            return (
                                <Grid size={{ xs: 12, sm: 6, md: selectedContact && !isMobile ? 6 : 4, lg: selectedContact && !isMobile ? 4 : 3 }} key={contact.id}>
                                    <Card 
                                        onClick={() => setSelectedContact(contact)}
                                        sx={{ 
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            border: isSelected ? '2px solid' : '1px solid transparent',
                                            borderColor: isSelected ? 'primary.main' : 'transparent',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: 3
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ textAlign: 'center', p: 3, paddingBottom: '24px !important' }}>
                                            <Avatar
                                                sx={{ 
                                                    width: 64, 
                                                    height: 64, 
                                                    margin: '0 auto 16px',
                                                    bgcolor: stringToColor(fullName),
                                                    fontSize: '1.5rem'
                                                }}
                                            >
                                                {getInitials(fullName)}
                                            </Avatar>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                                ID: {contact.id}
                                            </Typography>
                                            <Typography variant="subtitle1" fontWeight="bold" noWrap>
                                                {fullName}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {contact.specialty || '—'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                        {filteredContacts.length === 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default' }}>
                                    <Typography color="text.secondary">
                                        {contacts.length === 0 
                                            ? 'No contacts found. Click "Add contact" to create one.' 
                                            : 'No contacts match your search filters.'}
                                    </Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Grid>

                {/* Vertical Detail Panel (Desktop inline selection) */}
                {selectedContact && !isMobile && (
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 3, position: 'sticky', top: 24, borderRadius: 2 }}>
                            {renderDetailsContent(selectedContact)}
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Mobile View Detail Drawer */}
            <Drawer
                anchor="right"
                open={Boolean(selectedContact && isMobile)}
                onClose={() => setSelectedContact(null)}
                PaperProps={{
                    sx: { 
                        width: { xs: '100%', sm: 400 }, 
                        p: 3,
                        boxSizing: 'border-box'
                    }
                }}
            >
                {selectedContact && renderDetailsContent(selectedContact)}
            </Drawer>

            <AddContactDialog
                open={isAddDialogOpen}
                contact={editingContact}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    setEditingContact(null);
                }}
                onSuccess={() => {
                    setIsAddDialogOpen(false);
                    setEditingContact(null);
                    fetchContacts();
                }}
            />
        </Stack>
    );
}
