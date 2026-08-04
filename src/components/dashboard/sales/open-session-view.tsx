'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import apiClient from '@/lib/api-client';
import type { User } from '@/types/user';

interface OpenSessionViewProps {
    onSessionOpened: () => void;
}

export function OpenSessionView({ onSessionOpened }: OpenSessionViewProps): React.JSX.Element {
    const [users, setUsers] = React.useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = React.useState<number | ''>('');
    const [openingBalance, setOpeningBalance] = React.useState<number>(0);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await apiClient.get('/Users');
                setUsers(response.data);
                if (response.data.length > 0) {
                    setSelectedUserId(response.data[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, []);

    const handleOpenSession = async () => {
        if (selectedUserId === '') return;
        setLoading(true);
        try {
            await apiClient.post('/cash/sessions/open', {
                userId: selectedUserId,
                openingBalance: openingBalance
            });
            onSessionOpened();
        } catch (error: any) {
            console.error('Failed to open session:', error);
            alert(`Failed to open session: ${error.response?.data || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
            <Card sx={{ p: 4, width: '100%', maxWidth: 480, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>Open Register Session</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Before you can process sales, you must open a register session for the day.
                </Typography>

                <Stack spacing={3}>
                    <TextField
                        select
                        fullWidth
                        label="Who is opening the session?"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    >
                        {users.map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                                {user.fullName || `${user.firstName} ${user.lastName}`} ({user.role || 'Staff'})
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        fullWidth
                        type="number"
                        label="Opening Cash Balance"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(Number(e.target.value))}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                    />

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleOpenSession}
                        disabled={loading || selectedUserId === ''}
                        sx={{ mt: 2 }}
                    >
                        {loading ? 'Opening...' : 'Open Session'}
                    </Button>
                </Stack>
            </Card>
        </Box>
    );
}
