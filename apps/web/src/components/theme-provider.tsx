'use client';

/**
 * MODULE: Theme Provider
 *
 * PURPOSE:
 * Wraps next-themes ThemeProvider to deliver Light, Dark, and System preference themes.
 * Default theme is set to 'light' per specification.
 */

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
