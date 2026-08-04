import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { TechnologiesClient } from './technologies-client';

export const metadata: Metadata = { title: `Technologies | Dashboard | ${config.site.name}` };

export default function Page(): React.JSX.Element {
    return <TechnologiesClient />;
}

// Restored technologies module page configuration
