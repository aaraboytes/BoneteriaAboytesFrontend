'use client';

import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { SunIcon } from '@phosphor-icons/react/dist/ssr/Sun';

// The sun is lit in light mode; switching it off turns the dark mode on. MUI remembers the choice
// (localStorage) and applies it before the first paint, so there is no flash on reload.
export function ColorModeToggle(): React.JSX.Element {
  const { mode, setMode } = useColorScheme();
  // The mode is only known in the browser: render the neutral (light) state until then so the
  // server and client markup match.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const dark = mounted && mode === 'dark';
  const label = dark ? 'Modo oscuro activado. Pulsa para volver al modo claro' : 'Activar modo oscuro';

  return (
    <Tooltip title={dark ? 'Modo oscuro: activado' : 'Modo oscuro: desactivado'}>
      <IconButton
        aria-label={label}
        aria-pressed={dark}
        disabled={!mounted}
        onClick={() => setMode(dark ? 'light' : 'dark')}
        sx={{ color: dark ? 'text.disabled' : '#f59e0b' }}
      >
        <SunIcon size={22} weight={dark ? 'regular' : 'fill'} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}
