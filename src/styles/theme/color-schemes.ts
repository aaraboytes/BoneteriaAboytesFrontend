import type { ColorSystemOptions } from '@mui/material/styles';

import { california, kepple, neonBlue, nevada, redOrange, shakespeare, stormGrey } from './colors';
import type { ColorScheme } from './types';

export const colorSchemes = {
  dark: {
    palette: {
      action: { disabledBackground: 'rgba(0, 0, 0, 0.12)' },
      background: {
        default: '#0f172a',
        defaultChannel: '15 23 42',
        paper: '#1e2b49',
        paperChannel: '30 43 73',
        level1: '#19243e',
        level2: '#141d33',
        level3: '#0f1628',
      },
      common: { black: '#000000', white: '#ffffff' },
      divider: 'rgba(255, 255, 255, 0.12)',
      dividerChannel: '255 255 255',
      error: {
        ...redOrange,
        light: redOrange[300],
        main: redOrange[400],
        dark: redOrange[500],
        contrastText: '#ffffff',
      },
      info: {
        main: '#38bdf8',
        light: '#7dd3fc',
        dark: '#0284c7',
        contrastText: '#ffffff',
      },
      neutral: { ...nevada },
      primary: {
        main: '#1e2b49',
        light: '#2f4068',
        dark: '#121a2d',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#fee263',
        light: '#ffe985',
        dark: '#e5c942',
        contrastText: '#1e2b49',
      },
      success: {
        ...kepple,
        light: kepple[300],
        main: kepple[400],
        dark: kepple[500],
        contrastText: '#ffffff',
      },
      text: {
        primary: '#f4f8fa',
        primaryChannel: '244 248 250',
        secondary: '#94a3b8',
        secondaryChannel: '148 163 184',
        disabled: '#64748b',
      },
      warning: {
        ...california,
        light: california[300],
        main: california[400],
        dark: california[500],
        contrastText: '#000000',
      },
    },
  },
  light: {
    palette: {
      action: { disabledBackground: 'rgba(0, 0, 0, 0.06)' },
      background: {
        default: '#f4f8fa',
        defaultChannel: '244 248 250',
        paper: '#ffffff',
        paperChannel: '255 255 255',
        level1: '#e9eff3',
        level2: '#dee7ec',
        level3: '#d3dfe6',
      },
      common: { black: '#000000', white: '#ffffff' },
      divider: '#e2e8f0',
      dividerChannel: '226 232 240',
      error: {
        ...redOrange,
        light: redOrange[400],
        main: redOrange[500],
        dark: redOrange[600],
        contrastText: '#ffffff',
      },
      info: {
        main: '#0284c7',
        light: '#38bdf8',
        dark: '#0369a1',
        contrastText: '#ffffff',
      },
      neutral: { ...stormGrey },
      primary: {
        main: '#1e2b49',
        light: '#2f4068',
        dark: '#121a2d',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#fee263',
        light: '#ffe985',
        dark: '#e5c942',
        contrastText: '#1e2b49',
      },
      success: {
        ...kepple,
        light: kepple[400],
        main: kepple[500],
        dark: kepple[600],
        contrastText: '#ffffff',
      },
      text: {
        primary: '#1e2b49',
        primaryChannel: '30 43 73',
        secondary: '#64748b',
        secondaryChannel: '100 116 139',
        disabled: '#94a3b8',
      },
      warning: {
        ...california,
        light: california[400],
        main: california[500],
        dark: california[600],
        contrastText: '#1e2b49',
      },
    },
  },
} satisfies Partial<Record<ColorScheme, ColorSystemOptions>>;
