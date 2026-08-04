import * as React from 'react';
import type { Metadata } from 'next';
import { AttentionClient } from './attention-client';

export const metadata: Metadata = { title: `Attention | Dashboard` };

export default function Page(): React.JSX.Element {
  return <AttentionClient />;
}