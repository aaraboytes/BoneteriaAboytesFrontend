import * as React from 'react';
import type { Metadata } from 'next';

import { PosSalesWorkspace } from '@/components/dashboard/sales/pos-sales-workspace';

export const metadata = { title: `Sales | Dashboard | Store System` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    return <PosSalesWorkspace />;
}
