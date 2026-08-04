import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { AppointmentsClient } from './appointments-client';

export const metadata = { title: `Appointments | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
    return <AppointmentsClient />;
}
