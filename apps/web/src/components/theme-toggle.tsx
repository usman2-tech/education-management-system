'use client';

/**
 * MODULE: Theme Switcher Component
 *
 * PURPOSE:
 * Provides user toggling between Light, Dark, and System preference appearance modes.
 */

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-9 w-24 items-center justify-center rounded-lg border border-border bg-card opacity-50" />
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme switcher"
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-muted-foreground"
    >
      <button
        type="button"
        id="theme-light-btn"
        aria-label="Light mode"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          theme === 'light'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sun className="mr-1.5 h-3.5 w-3.5" />
        Light
      </button>

      <button
        type="button"
        id="theme-dark-btn"
        aria-label="Dark mode"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          theme === 'dark'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Moon className="mr-1.5 h-3.5 w-3.5" />
        Dark
      </button>

      <button
        type="button"
        id="theme-system-btn"
        aria-label="System mode"
        aria-pressed={theme === 'system'}
        onClick={() => setTheme('system')}
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
          theme === 'system'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Laptop className="mr-1.5 h-3.5 w-3.5" />
        System
      </button>
    </div>
  );
}
