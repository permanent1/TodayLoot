'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownWideNarrow, ArrowUpRight, Coins, Gem, ScanLine } from 'lucide-react';
import type { CollectionItem, Rarity } from '@/types';
import { RARITY_META, RARITY_ORDER, RARITY_RANK } from '@/features/game/rarity';
import { getGalleryStats, listItems } from '@/lib/db/repository';
import { HuntTile } from '@/components/gallery/HuntTile';
import { KeepTile } from '@/components/gallery/KeepTile';
import { cn } from '@/lib/utils/cn';

export default function GalleryPage() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    kept: number;
    pending: number;
    byRarity: Record<Rarity, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'hunt' | 'keep'>('hunt');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [sort, setSort] = useState<'new' | 'rare'>('new');

  useEffect(() => {
    let alive = true;
    Promise.all([listItems(), getGalleryStats()])
      .then(([list, gallery]) => {
        if (!alive) return;
        setItems(list);
        setStats(gallery);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const tabItems = useMemo(
    () => items.filter((item) => item.mode === tab),
    [items, tab],
  );

  const filtered = useMemo(() => {
    const list =
      rarity === 'all' ? tabItems : tabItems.filter((item) => item.rarity === rarity);
    return [...list].sort((a, b) => {
      if (sort === 'rare') {
        const diff = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        if (diff !== 0) return diff;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [tabItems, rarity, sort]);

  const huntCount = items.filter((item) => item.mode === 'hunt').length;
  const keepCount = items.filter((item) => item.mode === 'keep').length;

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 pt-4 lg:px-10 lg:pb-12 lg:pt-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label">MY COLLECTION</p>
          <h1 className="mt-1 text-[25px] font-semibold tracking-[0.06em] text-[#f4f0e6] lg:text-[32px]">
            我的展厅
          </h1>
        </div>
        <Link href="/appraise" className="btn-ghost px-3 py-2 text-[10px] lg:text-[11.5px]">
          <ScanLine className="h-3.5 w-3.5" />
          再鉴定
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 lg:mt-6 lg:gap-4">
        <div className="panel-flat px-3 py-2.5 lg:px-5 lg:py-4">
          <div className="tabular text-[18px] font-semibold text-[#f0e6d2] lg:text-[24px]">
            {stats?.total ?? '—'}
          </div>
          <div className="mt-0.5 text-[8.5px] tracking-[0.14em] text-white/30 lg:text-[10px]">
            全部藏品
          </div>
        </div>
        <div className="panel-flat px-3 py-2.5 lg:px-5 lg:py-4">
          <div className="tabular text-[18px] font-semibold text-[#f0e6d2] lg:text-[24px]">
            {keepCount}
          </div>
          <div className="mt-0.5 text-[8.5px] tracking-[0.14em] text-white/30 lg:text-[10px]">
            珍藏柜
          </div>
        </div>
        <div className="panel-flat px-3 py-2.5 lg:px-5 lg:py-4">
          <div className="tabular text-[18px] font-semibold text-[#ff6b7e] lg:text-[24px]">
            {stats?.byRarity.legendary ?? '—'}
          </div>
          <div className="mt-0.5 text-[8.5px] tracking-[0.14em] text-white/30 lg:text-[10px]">
            传说
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1 lg:mt-6 lg:max-w-[420px]">
        {(
          [
            { id: 'hunt', label: '战利品', count: huntCount },
            { id: 'keep', label: '珍藏柜', count: keepCount },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] transition lg:text-[12.5px]',
              tab === entry.id
                ? entry.id === 'keep'
                  ? 'bg-[linear-gradient(120deg,#f3e2bd,#c9a97a)] font-semibold text-[#241a0b]'
                  : 'bg-gradient-to-br from-[#ffe4ac] to-[#e6b25a] font-semibold text-[#241707]'
                : 'text-white/45',
            )}
            aria-pressed={tab === entry.id}
          >
            {entry.id === 'keep' && <Gem className="h-3 w-3" />}
            {entry.label}
            <span
              className={cn(
                'tabular rounded-full px-1.5 text-[8px]',
                tab === entry.id ? 'bg-[#241707]/15' : 'bg-white/10 text-white/40',
              )}
            >
              {entry.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 lg:mt-4">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setRarity('all')}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-[9px] transition lg:text-[10.5px]',
              rarity === 'all'
                ? 'border-gold/50 bg-gold/10 text-gold'
                : 'border-white/10 text-white/40',
            )}
          >
            全部
          </button>
          {RARITY_ORDER.map((r) => {
            const meta = RARITY_META[r];
            const active = rarity === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRarity(active ? 'all' : r)}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[9px] transition lg:text-[10.5px]',
                  active
                    ? 'rarity-ink'
                    : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/60',
                )}
                style={
                  active
                    ? {
                        borderColor: `${meta.color}88`,
                        background: meta.soft,
                        color: meta.color,
                      }
                    : undefined
                }
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setSort((v) => (v === 'new' ? 'rare' : 'new'))}
          className="flex shrink-0 items-center gap-1 text-[8.5px] text-white/35 lg:text-[10px]"
        >
          <ArrowDownWideNarrow className="h-3 w-3" />
          {sort === 'new' ? '最新' : '稀有度'}
        </button>
      </div>

      {tab === 'keep' && !loading && keepCount > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#c9a97a]/25 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(201,169,122,0.14),transparent_62%)] px-4 py-3 lg:max-w-[520px]">
          <Gem className="h-4 w-4 shrink-0 text-[#c9a97a]" />
          <p className="text-[9.5px] leading-relaxed text-white/45 lg:text-[11px]">
            珍藏柜里每件藏品都有独立编号与入藏日期，
            <span className="text-[#d8c49d]">点击卡片可查看证书与探访记录</span>。
          </p>
        </div>
      )}

      <div className="mt-3 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[3/4.15] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel mt-2 flex flex-col items-center px-6 py-10 text-center lg:py-16">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
              {tab === 'keep' ? (
                <Gem className="h-5 w-5 text-white/25" />
              ) : (
                <Coins className="h-5 w-5 text-white/25" />
              )}
            </div>
            <p className="mt-3 text-[12px] text-white/55">
              {tab === 'hunt' ? '战利品柜还空着' : '珍藏柜还空着'}
            </p>
            <p className="mt-1.5 max-w-[320px] text-[9.5px] leading-relaxed text-white/25">
              {rarity !== 'all'
                ? '当前筛选下没有藏品，试试切换到「全部」。'
                : tab === 'hunt'
                  ? '拍一件身边的物品，让 AI 为它写一份档案。'
                  : '在战利品里点「加入珍藏柜」，它就会搬到这里。'}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/appraise" className="btn-primary px-4 py-2 text-[11px]">
                去鉴定
              </Link>
              {tab === 'hunt' && keepCount > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('keep')}
                  className="btn-ghost px-3 py-2 text-[10px]"
                >
                  看珍藏柜
                </button>
              )}
            </div>
          </div>
        ) : tab === 'keep' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 lg:gap-5 xl:grid-cols-3">
            {filtered.map((item) => (
              <KeepTile key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {filtered.map((item) => (
              <HuntTile key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {stats && stats.total > 0 && (
        <div className="mt-5 flex justify-end">
          <Link href="/showroom" className="flex items-center gap-0.5 text-[9px] text-gold/60">
            效果陈列室 <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
