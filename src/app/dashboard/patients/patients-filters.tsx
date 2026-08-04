'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

export interface PatientsFiltersProps {
    onSearch?: (term: string) => void;
    searchTerm?: string;
}

export function PatientsFilters({ onSearch, searchTerm }: PatientsFiltersProps): React.JSX.Element {
    return (
        <Card sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <OutlinedInput
                    value={searchTerm ?? ''}
                    onChange={(e) => onSearch?.(e.target.value)}
                    fullWidth
                    placeholder="Search patient by name"
                    startAdornment={
                        <InputAdornment position="start">
                            <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                        </InputAdornment>
                    }
                    sx={{ maxWidth: '500px' }}
                />
            </Stack>
        </Card>
    );
}
