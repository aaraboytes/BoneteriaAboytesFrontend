import * as React from 'react';
import type { Metadata } from 'next';

import { SalesClient } from '@/components/dashboard/sales/sales-client';

export const metadata = { title: `Sales | Dashboard | Store System` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    return <SalesClient />;
}
