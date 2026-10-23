'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, LayoutGrid, ScanLine, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/', label: '首页', icon: House },
  { href: '/appraise', label: '鉴定', icon: ScanLine, accent: true },
  { href: '/gallery', label: '展厅', icon: LayoutGrid },
  { href: '/settings', label: '设置', icon: SlidersHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-40 w-full max-w-[560px] -translate-x-1/2 border-t border-white/[0.07] bg-[#080c16]/92 px-2 pt-1.5 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href) ?? false;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition',
                active ? 'text-gold' : 'text-mist hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {item.accent && (
                <span
                  className={cn(
                    'absolute -top-1 h-[2px] w-8 rounded-full transition',
                    active ? 'bg-gold shadow-[0_0_12px_#f7c66a]' : 'bg-transparent',
                  )}
                />
              )}
              <Icon className={cn('h-[19px] w-[19px]', item.accent && 'h-5 w-5')} strokeWidth={1.8} />
              <span className={cn(item.accent && 'font-medium tracking-wide')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
