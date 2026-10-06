'use client';

import * as React from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import { NoSsr } from '@/components/core/no-ssr';

// 'light' is always white (for the always-navy sidebar/drawer and the login brand panel);
// 'dark' follows the theme text colour: navy on light surfaces, near-white on dark ones.
type Color = 'dark' | 'light';

export interface LogoProps extends BoxProps {
  color?: Color;
  emblem?: boolean;
  height?: number | string;
  width?: number | string;
}

export function Logo({
  color = 'dark',
  height = 200,
  width = 300,
  sx,
  ...props
}: LogoProps): React.JSX.Element {
  const formattedWidth = typeof width === 'number' ? `${width}px` : width;
  const formattedHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <Box
      role="img"
      aria-label="Boneterías Aboytes"
      {...props}
      sx={{
        // The artwork is a white SVG; painting it through a mask lets it take any colour.
        backgroundColor: color === 'light' ? '#ffffff' : 'var(--mui-palette-text-primary)',
        WebkitMaskImage: 'url(/assets/aboytes.svg)',
        maskImage: 'url(/assets/aboytes.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        display: 'inline-block',
        width: formattedWidth,
        height: formattedHeight,
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}

export interface DynamicLogoProps extends LogoProps {
  colorDark?: Color;
  colorLight?: Color;
}

export function DynamicLogo({
  height,
  width,
  colorDark = 'light',
  colorLight = 'dark',
  ...props
}: DynamicLogoProps): React.JSX.Element {
  return (
    <NoSsr fallback={<Box sx={{ height, width }} />}>
      <Logo height={height} width={width} color={colorDark} {...props} />
    </NoSsr>
  );
}
