import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { ReturnsWorkspace } from '@/components/dashboard/returns/returns-workspace';

export const metadata = { title: `Devoluciones | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    // useSearchParams (the sale preselected from the sales history) needs a Suspense boundary.
    return (
        <React.Suspense fallback={null}>
            <ReturnsWorkspace />
        </React.Suspense>
    );
}
