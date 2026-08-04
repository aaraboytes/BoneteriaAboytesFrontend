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

export interface StaffGroup {
    id: number;
    name: string;
    userIds: number[];
}

export interface StaffGroupsDialogProps {
    open: boolean;
    onClose: () => void;
    staffGroups: StaffGroup[];
    attendants: { id: number; fullName: string }[];
    onGroupsUpdated: () => void;
}

export function StaffGroupsDialog({
    open,
    onClose,
    staffGroups,
    attendants,
    onGroupsUpdated
}: StaffGroupsDialogProps) {
    const [mode, setMode] = React.useState<'list' | 'edit'>('list');
    const [editingGroup, setEditingGroup] = React.useState<Partial<StaffGroup> | null>(null);
    const [saving, setSaving] = React.useState(false);

    // Reset when opening
    React.useEffect(() => {
        if (open) {
            setMode('list');
            setEditingGroup(null);
        }
    }, [open]);

    const handleCreateNew = () => {
        setEditingGroup({ name: '', userIds: [] });
        setMode('edit');
    };

    const handleEdit = (group: StaffGroup) => {
        setEditingGroup({ ...group });
        setMode('edit');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this group?')) return;
        try {
            await apiClient.delete(`/StaffGroups/${id}`);
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
                await apiClient.put(`/StaffGroups/${editingGroup.id}`, {
                    name: editingGroup.name,
                    userIds: editingGroup.userIds || []
                });
            } else {
                await apiClient.post('/StaffGroups', {
                    name: editingGroup.name,
                    userIds: editingGroup.userIds || []
                });
            }
            onGroupsUpdated();
            setMode('list');
            setEditingGroup(null);
        } catch (error) {
            console.error('Failed to save group', error);
            alert('Failed to save group');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'list' ? 'Manage Staff Groups' : (editingGroup?.id ? 'Edit Group' : 'Create Group')}</DialogTitle>
            <DialogContent dividers>
                {mode === 'list' ? (
                    <Stack spacing={2}>
                        <Button variant="contained" onClick={handleCreateNew}>
                            Create New Group
                        </Button>
                        {staffGroups.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" py={4}>
                                No groups created yet.
                            </Typography>
                        ) : (
                            <List>
                                {staffGroups.map(group => (
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
                                            secondary={`${group.userIds.length} member(s)`} 
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
                            options={attendants}
                            getOptionLabel={(option) => option.fullName}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={attendants.filter(a => editingGroup?.userIds?.includes(a.id))}
                            onChange={(event, newValue) => {
                                setEditingGroup(prev => prev ? { ...prev, userIds: newValue.map(n => n.id) } : null);
                            }}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    {option.fullName}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} label="Group Members" placeholder="Select staff..." />
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
