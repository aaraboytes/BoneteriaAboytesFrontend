'use client';

import * as React from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import { NoSsr } from '@/components/core/no-ssr';

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
      {...props}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: formattedWidth,
        height: formattedHeight,
        flexShrink: 0,
        ...sx,
      }}
    >
      <img
        src="/assets/aboytes.svg"
        alt="Aboytes Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: color === 'light' ? 'brightness(0) invert(1)' : undefined,
        }}
      />
    </Box>
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
