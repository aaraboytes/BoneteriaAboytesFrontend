'use client';

import * as React from 'react';
import { useColorScheme, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

// With CSS variables, `theme.palette` always holds the default (light) scheme: styles that go through
// `sx` tokens switch with the mode by themselves, but JavaScript that needs real colour values (the
// chart libraries paint SVG attributes) must read the palette of the scheme that is on screen.
export function useActiveTheme(): Theme {
  const theme = useTheme();
  const { mode, systemMode } = useColorScheme();
  const active = mode === 'system' ? systemMode : mode;
  // `colorSchemes` exists at runtime (cssVariables theme) but is not part of the base Theme type.
  const schemes = (theme as unknown as { colorSchemes?: Record<string, { palette: Theme['palette'] } | undefined> }).colorSchemes;
  const scheme = active ? schemes?.[active] : undefined;

  return React.useMemo(() => (scheme ? ({ ...theme, palette: scheme.palette } as Theme) : theme), [theme, scheme]);
}
