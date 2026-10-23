'use client';

import { Check, Crosshair, ScrollText, Stamp } from 'lucide-react';
import type { BountyTask } from '@/types';
import { formatCoins } from '@/features/game/scoring';
import { cn } from '@/lib/utils/cn';

export const BOUNTY_BONUS = 20000;

/**
 * 赏金猎人告示牌：只对已命中的悬赏盖章，未命中保持安静（不打叉）。
 * 命中状态由本地引擎在鉴定时写入，次日按日期键自动更新。
 */
export function BountyBoard({
  tasks,
  loading = false,
  emptyText = '正在读取今日悬赏…',
  compact = false,
}: {
  tasks?: BountyTask[];
  loading?: boolean;
  emptyText?: string;
  compact?: boolean;
}) {
  const list = tasks ?? [];
  const claimed = list.filter((task) => task.claimed).length;
  const allDone = list.length > 0 && claimed === list.length;

  return (
    <div className="keep-dark relative overflow-hidden rounded-2xl border border-[#c9a97a]/30 bg-[linear-gradient(160deg,#161208_0%,#0c1018_46%,#0a0e16_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background:repeating-linear-gradient(135deg,rgba(201,169,122,0.35)_0_1px,transparent_1px_7px)]" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />

      <div className="relative flex items-center justify-between border-b border-[#c9a97a]/20 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-gold/40 bg-gold/10">
            <Crosshair className="h-3 w-3 text-gold" />
          </span>
          <div>
            <div className="text-[8px] tracking-[0.3em] text-gold/50">WANTED</div>
            <div className="text-[11px] font-semibold tracking-[0.14em] text-[#f0e3c9]">
              今日悬赏
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="tabular text-[13px] font-semibold text-gold">
            {claimed}
            <span className="text-[9px] text-white/25">/{list.length || 3}</span>
          </div>
          <div className="text-[7.5px] tracking-[0.16em] text-white/25">已盖章</div>
        </div>
      </div>

      <div className={cn('relative px-2.5 py-2', compact ? 'space-y-1' : 'space-y-1.5')}>
        {loading && list.length === 0 && (
          <div className="py-3 text-center text-[9px] text-white/25">{emptyText}</div>
        )}

        {list.map((task, index) => (
          <div
            key={task.id}
            className={cn(
              'relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition',
              task.claimed
                ? 'border-gold/35 bg-gold/[0.09]'
                : 'border-white/[0.06] bg-white/[0.015]',
            )}
          >
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[9px]',
                task.claimed
                  ? 'border-gold/60 bg-gold/20 text-gold'
                  : 'border-white/12 bg-white/[0.03] text-white/25',
              )}
              aria-hidden
            >
              {task.claimed ? <Check className="h-3.5 w-3.5" /> : <span>{`0${index + 1}`}</span>}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'truncate text-[11px]',
                    task.claimed ? 'text-[#f2e3c4]' : 'text-white/80',
                  )}
                >
                  {task.title}
                </span>
                {task.claimed && (
                  <span className="shrink-0 rounded border border-gold/40 px-1 py-[1px] text-[7px] tracking-[0.12em] text-gold/80">
                    已达成
                  </span>
                )}
              </div>
              {!compact && (
                <p className="mt-0.5 truncate text-[8.5px] text-white/35">{task.detail}</p>
              )}
            </div>

            <span
              className={cn(
                'shrink-0 text-[9.5px]',
                task.claimed ? 'text-gold/70 line-through' : 'text-gold/55',
              )}
            >
              +{formatCoins(task.reward)}
            </span>
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-between border-t border-[#c9a97a]/15 px-3.5 py-2">
        <span className="flex items-center gap-1 text-[8.5px] text-white/25">
          <Stamp className="h-2.5 w-2.5" />
          三项全达成额外 +{formatCoins(BOUNTY_BONUS)}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-[8.5px]',
            allDone ? 'text-gold' : 'text-white/25',
          )}
        >
          <ScrollText className="h-2.5 w-2.5" />
          {allDone ? '今日悬赏已清空' : '次日 00:00 刷新'}
        </span>
      </div>
    </div>
  );
}
