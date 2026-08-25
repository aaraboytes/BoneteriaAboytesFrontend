import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';

import { ReturnsWorkspace } from '@/components/dashboard/returns/returns-workspace';

export const metadata = { title: `Devoluciones | Dashboard | Store System` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    return (
        <Box sx={{ p: 3 }}>
            <ReturnsWorkspace />
        </Box>
    );
}
