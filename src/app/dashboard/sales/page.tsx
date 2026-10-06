import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { PosSalesWorkspace } from '@/components/dashboard/sales/pos-sales-workspace';

export const metadata = { title: `Punto de Venta | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    return <PosSalesWorkspace />;
}
