'use client';

import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-mist transition hover:text-gold lg:h-9 lg:w-9',
        className,
      )}
      aria-label={isLight ? '切换到深色主题' : '切换到浅色主题'}
      title={isLight ? '深色主题' : '浅色主题'}
      aria-pressed={isLight}
    >
      {isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
