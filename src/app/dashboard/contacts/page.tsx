import * as React from 'react';
import type { Metadata } from 'next';
import { ContactsClient } from './contacts-client';

export const metadata = { title: `Contacts | Dashboard` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <ContactsClient />;
}
