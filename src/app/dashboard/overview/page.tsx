import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { DashboardView } from '@/components/dashboard/overview/dashboard-view';

export const metadata = { title: `Resumen | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <DashboardView />;
}
