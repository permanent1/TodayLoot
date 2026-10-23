'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, Ticket, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { playSfx } from '@/lib/sfx';
import { formatCoins } from '@/features/game/scoring';
import { useHealth } from '@/lib/hooks/useHealth';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './ThemeToggle';

const DESKTOP_NAV = [
  { href: '/', label: '首页' },
  { href: '/appraise', label: '鉴定台' },
  { href: '/gallery', label: '展厅' },
  { href: '/showroom', label: '陈列室' },
  { href: '/settings', label: '设置' },
];

export function AppHeader() {
  const pathname = usePathname();
  const player = useAppStore((s) => s.player);
  const settings = useAppStore((s) => s.settings);
  const setSound = useAppStore((s) => s.setSound);
  const health = useHealth();

  const sound = settings?.sound ?? true;
  const isMock = health ? health.aiMode === 'mock' || !health.liveReady : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#080c16]/78 px-4 py-3 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="返回首页">
          <span className="relative grid h-9 w-9 place-items-center rounded-[11px] border border-gold/35 bg-[#0d1322]">
            <span className="absolute inset-0 rounded-[11px] bg-gold/10 blur-[6px]" />
            <svg viewBox="0 0 24 24" className="relative h-5 w-5" aria-hidden>
              <path
                d="M12 2.6l2.4 6.9 6.9 2.5-6.9 2.5L12 21.4l-2.4-6.9L2.7 12l6.9-2.5z"
                fill="url(#hg)"
              />
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff0cf" />
                  <stop offset="0.55" stopColor="#f7c66a" />
                  <stop offset="1" stopColor="#c08b36" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-[12.5px] font-semibold tracking-[0.18em] text-[#f3e5c6] lg:text-[14px]">
              零号鉴定局
            </span>
            <span className="flex items-center gap-1.5 text-[8.5px] tracking-[0.26em] text-mist">
              TODAY LOOT
              {isMock !== null && (
                <span
                  className={cn(
                    'rounded px-1 py-px text-[8px] tracking-wider',
                    isMock
                      ? 'bg-violet/15 text-violet'
                      : 'bg-emerald-400/15 text-emerald-300',
                  )}
                  title={isMock ? '当前为演示识别模式' : '当前为真实模型模式'}
                >
                  {isMock ? 'DEMO' : 'LIVE'}
                </span>
              )}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
          {DESKTOP_NAV.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : (pathname?.startsWith(item.href) ?? false);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative rounded-full px-3.5 py-2 text-[12px] tracking-[0.08em] transition',
                  active
                    ? 'text-gold'
                    : 'text-mist hover:bg-white/[0.04] hover:text-white',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 lg:gap-2">
          <Link
            href="/gallery"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1.5"
            aria-label="收藏币余额与我的展厅"
          >
            <Coins className="h-3.5 w-3.5 text-gold" />
            <span className="tabular text-[11px] font-semibold text-[#f0e4cd]">
              {player ? formatCoins(player.coins) : '—'}
            </span>
          </Link>
          {player && player.modelPasses > 0 && (
            <span
              className="flex items-center gap-1 rounded-full border border-violet/30 bg-violet/10 px-2 py-1.5"
              title="建模券"
            >
              <Ticket className="h-3.5 w-3.5 text-violet" />
              <span className="tabular text-[10px] text-violet">{player.modelPasses}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              playSfx('tap', true);
              void setSound(!sound);
            }}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-mist transition hover:text-white lg:h-9 lg:w-9"
            aria-label={sound ? '关闭音效' : '开启音效'}
          >
            {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
