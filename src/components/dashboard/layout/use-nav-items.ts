'use client';

import * as React from 'react';

import sectionFlags from '@/config/section-flags.json';
import { useUser } from '@/hooks/use-user';

import { navGroups, navItems, type NavGroup } from './config';

export type VisibleNavItem = (typeof navItems)[number];

// Single source of truth for which sidebar entries the current user sees (desktop and mobile).
export function useNavItems(): { groups: { title: NavGroup; items: VisibleNavItem[] }[]; all: VisibleNavItem[] } {
  const { user } = useUser();

  return React.useMemo(() => {
    const allowed = navItems.filter((item) => {
      if ((sectionFlags.sections as Record<string, boolean>)[item.key] === false) return false;
      // These screens read the reports API, which requires the same permission.
      if (item.key === 'overview' || item.key === 'reports' || item.key === 'cashClosing') return user?.permissions?.includes('reports.view') ?? false;
      // Cameras are configured by users who manage security.
      if (item.key === 'security') return user?.permissions?.includes('security.manage') ?? false;
      return true;
    });
    const groups = navGroups
      .map((title) => ({ title, items: allowed.filter((i) => i.group === title && !('hidden' in i && i.hidden)) }))
      .filter((g) => g.items.length > 0);
    return { groups, all: allowed };
  }, [user]);
}
