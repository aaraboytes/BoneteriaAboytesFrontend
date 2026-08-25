import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';

import { RolesTable } from '@/components/dashboard/roles/roles-table';

export const metadata = { title: `Roles y Permisos | Dashboard | Store System` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    return (
        <Box sx={{ p: 3 }}>
            <RolesTable />
        </Box>
    );
}
