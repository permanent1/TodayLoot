'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils/cn';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const init = useAppStore((s) => s.init);
  const immersive =
    (pathname?.startsWith('/reveal/') || pathname === '/appraise/run') ?? false;

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet/10 blur-[120px] lg:h-[560px] lg:w-[1040px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-gold/[0.05] blur-[110px] lg:h-[420px] lg:w-[620px]" />
      </div>

      <aside className="pointer-events-none fixed left-8 top-1/2 hidden -translate-y-1/2 2xl:block">
        <div className="text-[10px] tracking-[0.5em] text-white/20 [writing-mode:vertical-rl]">
          万物皆可鉴定 · 今天你出货了吗
        </div>
      </aside>
      <aside className="pointer-events-none fixed right-8 top-1/2 hidden -translate-y-1/2 2xl:block">
        <div className="text-[9px] tracking-[0.45em] text-white/15 [writing-mode:vertical-rl]">
          ZERO APPRAISAL BUREAU · TODAY LOOT
        </div>
      </aside>

      <div
        className={cn(
          'stage-shell relative mx-auto flex min-h-dvh w-full max-w-[560px] flex-col border-white/[0.055] bg-[#070b15]/35 lg:max-w-[1240px] lg:border-x-0 lg:bg-transparent',
          !immersive && 'sm:border-x',
        )}
      >
        {!immersive && <AppHeader />}
        <main
          className={cn(
            'flex flex-1 flex-col',
            immersive ? '' : 'pb-24 lg:pb-12',
          )}
        >
          {children}
        </main>
        {!immersive && <BottomNav />}
      </div>
    </div>
  );
}
