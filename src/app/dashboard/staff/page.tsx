import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';

import { config } from '@/config';
import { StaffClient } from './staff-client';
 
export const metadata = { title: `Staff | Dashboard | ${config.site.name}` } satisfies Metadata;
 
export default function Page(): React.JSX.Element {
    return (
        <Stack spacing={3}>
            <StaffClient />
        </Stack>
    );
}
