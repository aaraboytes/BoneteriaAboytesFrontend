import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import apiClient from '@/lib/api-client';

export interface ServiceGroup {
    id: number;
    name: string;
    serviceIds: number[];
}

export interface ServiceGroupsDialogProps {
    open: boolean;
    onClose: () => void;
    serviceGroups: ServiceGroup[];
    availableServices: { id: number; name: string; alias?: string; color?: string }[];
    onGroupsUpdated: () => void;
}

export function ServiceGroupsDialog({
    open,
    onClose,
    serviceGroups,
    availableServices,
    onGroupsUpdated
}: ServiceGroupsDialogProps) {
    const [mode, setMode] = React.useState<'list' | 'edit'>('list');
    const [editingGroup, setEditingGroup] = React.useState<Partial<ServiceGroup> | null>(null);
    const [saving, setSaving] = React.useState(false);

    // Reset when opening
    React.useEffect(() => {
        if (open) {
            setMode('list');
            setEditingGroup(null);
        }
    }, [open]);

    const handleCreateNew = () => {
        setEditingGroup({ name: '', serviceIds: [] });
        setMode('edit');
    };

    const handleEdit = (group: ServiceGroup) => {
        setEditingGroup({ ...group });
        setMode('edit');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this service group?')) return;
        try {
            await apiClient.delete(`/ServiceGroups/${id}`);
            onGroupsUpdated();
        } catch (error) {
            console.error('Failed to delete group', error);
            alert('Failed to delete group');
        }
    };

    const handleSave = async () => {
        if (!editingGroup?.name?.trim()) {
            alert('Name is required');
            return;
        }

        setSaving(true);
        try {
            if (editingGroup.id) {
                await apiClient.put(`/ServiceGroups/${editingGroup.id}`, {
                    name: editingGroup.name,
                    serviceIds: editingGroup.serviceIds || []
                });
            } else {
                await apiClient.post('/ServiceGroups', {
                    name: editingGroup.name,
                    serviceIds: editingGroup.serviceIds || []
                });
            }
            onGroupsUpdated();
            setMode('list');
            setEditingGroup(null);
        } catch (error) {
            console.error('Failed to save service group', error);
            alert('Failed to save group');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'list' ? 'Manage Service Groups' : (editingGroup?.id ? 'Edit Group' : 'Create Group')}</DialogTitle>
            <DialogContent dividers>
                {mode === 'list' ? (
                    <Stack spacing={2}>
                        <Button variant="contained" onClick={handleCreateNew}>
                            Create New Group
                        </Button>
                        {serviceGroups.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" py={4}>
                                No groups created yet.
                            </Typography>
                        ) : (
                            <List>
                                {serviceGroups.map(group => (
                                    <ListItem
                                        key={group.id}
                                        secondaryAction={
                                            <Stack direction="row" spacing={1}>
                                                <IconButton edge="end" onClick={() => handleEdit(group)}>
                                                    <PencilIcon />
                                                </IconButton>
                                                <IconButton edge="end" color="error" onClick={() => handleDelete(group.id)}>
                                                    <TrashIcon />
                                                </IconButton>
                                            </Stack>
                                        }
                                    >
                                        <ListItemText 
                                            primary={group.name} 
                                            secondary={`${group.serviceIds.length} service(s)`} 
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Stack>
                ) : (
                    <Stack spacing={3} pt={1}>
                        <TextField
                            label="Group Name"
                            fullWidth
                            value={editingGroup?.name || ''}
                            onChange={(e) => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                        <Autocomplete
                            multiple
                            options={availableServices}
                            getOptionLabel={(option) => option.alias || option.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={availableServices.filter(s => editingGroup?.serviceIds?.includes(s.id))}
                            onChange={(event, newValue) => {
                                setEditingGroup(prev => prev ? { ...prev, serviceIds: newValue.map(n => n.id) } : null);
                            }}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    {option.alias || option.name}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} label="Group Services" placeholder="Select services..." />
                            )}
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                {mode === 'list' ? (
                    <Button onClick={onClose}>Close</Button>
                ) : (
                    <>
                        <Button onClick={() => setMode('list')} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} variant="contained" disabled={saving}>Save</Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
