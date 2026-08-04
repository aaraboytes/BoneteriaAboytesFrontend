'use client';

import * as React from 'react';

export interface SidebarContextValue {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

export const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

export interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps): React.JSX.Element {
  const [isCollapsed, setCollapsed] = React.useState<boolean>(false);

  // Initialize from localStorage on client side
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved === 'true') {
        setCollapsed(true);
      }
    } catch (error) {
      console.error('Failed to load sidebar state from localStorage', error);
    }
  }, []);

  const handleSetCollapsed = React.useCallback((collapsed: boolean) => {
    setCollapsed(collapsed);
    try {
      localStorage.setItem('sidebar-collapsed', String(collapsed));
    } catch (error) {
      console.error('Failed to save sidebar state to localStorage', error);
    }
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', String(next));
      } catch (error) {
        console.error('Failed to save sidebar state to localStorage', error);
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setCollapsed: handleSetCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
