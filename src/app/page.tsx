'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ScanLine, Sparkles, Target } from 'lucide-react';
import type { BountyDay, CollectionItem } from '@/types';
import { BountyBoard } from '@/components/bounties/BountyBoard';
import { RecentRail } from '@/components/home/RecentRail';
import { RARITY_META, RARITY_ORDER } from '@/features/game/rarity';
import { getBountyDay, getGalleryStats, listItems } from '@/lib/db/repository';
import { useAppStore } from '@/lib/store';

const TIER_TICKER = RARITY_ORDER.map((tier) => ({
  tier,
  label: RARITY_META[tier].label,
  en: RARITY_META[tier].en,
  color: RARITY_META[tier].color,
}));

export default function HomePage() {
  const player = useAppStore((s) => s.player);
  const init = useAppStore((s) => s.init);

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<{ total: number; legendary: number } | null>(null);
  const [bounty, setBounty] = useState<BountyDay | null>(null);

  useEffect(() => {
    void init();
    Promise.all([listItems(), getGalleryStats(), getBountyDay()])
      .then(([list, gallery, day]) => {
        setItems(list.slice(0, 8));
        setStats({ total: gallery.total, legendary: gallery.byRarity.legendary });
        setBounty(day);
      })
      .catch(() => undefined);
  }, [init]);

  return (
    <div className="flex flex-1 flex-col px-4 lg:px-10">
      <section className="relative -mx-4 overflow-hidden px-4 pb-6 pt-6 lg:-mx-10 lg:grid lg:grid-cols-[1.04fr_0.96fr] lg:grid-rows-[auto_1fr] lg:items-center lg:gap-x-14 lg:px-10 lg:pb-12 lg:pt-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[#c9863c]/25 blur-[70px] lg:h-96 lg:w-96" />
          <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-gold/15 blur-[60px] lg:h-80 lg:w-80" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </div>

        <div className="pointer-events-none absolute -right-6 top-4 hidden h-36 w-36 opacity-50 sm:block lg:right-2 lg:top-1/2 lg:h-56 lg:w-56 lg:-translate-y-1/2">
          <div className="absolute inset-0 rounded-full border border-gold/15" />
          <div className="absolute inset-4 rounded-full border border-gold/25 animate-floaty" />
          <div className="absolute inset-8 rounded-full border border-gold/20" />
          <div className="absolute inset-0 grid place-items-center text-[26px] text-gold/70 lg:text-[34px]">
            ✦
          </div>
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(247,198,106,0.45)_36deg,transparent_76deg)] opacity-40 [animation:spin_9s_linear_infinite]" />
        </div>

        <div className="relative lg:col-start-1 lg:row-start-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-7 bg-gradient-to-r from-gold/80 to-transparent" />
            <span className="section-label">ZERO APPRAISAL BUREAU</span>
            <span className="ml-auto rounded-full border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[7.5px] tracking-[0.18em] text-gold/80 lg:hidden">
              NO.000
            </span>
          </div>

          <h1 className="mt-4 text-[46px] font-semibold leading-[0.96] tracking-[-0.035em] text-[#f7f2e6] lg:mt-6 lg:text-[70px] xl:text-[84px]">
            今天
            <br />
            <span className="gold-shine">出货</span>
            <span>了吗？</span>
          </h1>
        </div>

        <div className="relative mt-3 -mx-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:mt-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pngs/鉴定师.png"
            alt="零号鉴定局的三位鉴定师：老周、小 K、阿黎"
            className="mx-auto block w-full max-w-[520px] select-none [filter:drop-shadow(0_22px_26px_rgba(0,0,0,0.72))]"
          />
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 lg:mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[7.5px] tracking-[0.3em] text-gold/60">ON DUTY</span>
              <span className="text-[12px] font-medium text-[#f6eeda] lg:text-[13px]">
                老周 · 小 K · 阿黎
              </span>
            </div>
            <span className="shrink-0 text-[8.5px] tracking-[0.1em] text-white/35">三位在岗</span>
          </div>
        </div>

        <div className="relative lg:col-start-1 lg:row-start-2 lg:pt-6">
          <p className="mt-3 max-w-[280px] text-[11.5px] leading-relaxed text-white/45 lg:mt-0 lg:max-w-[320px] lg:text-[13px]">
            拍下身边任何一件东西，
            <span className="text-gold/85">它就能变成一张藏品卡</span>
            ——稀有度、估价、档案，一次成卡。
          </p>

          <div className="mt-4 flex items-center gap-2.5 lg:mt-7 lg:max-w-[400px]">
            <Link href="/appraise" className="btn-primary flex-1 px-5 py-3.5 text-[14px] lg:py-4 lg:text-[15px]">
              <ScanLine className="h-4 w-4" />
              开始鉴定
            </Link>
            <Link
              href="/showroom"
              className="btn-ghost px-3.5 py-3.5 text-[11px] lg:py-4 lg:text-[12px]"
              aria-label="进入效果陈列室"
            >
              五档卡面
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="-mx-4 mt-6 overflow-hidden border-y border-white/[0.06] bg-white/[0.04] py-2 lg:col-span-2 lg:-mx-10 lg:mt-10">
          <div className="flex w-max animate-marquee items-center gap-5 px-4 lg:gap-8">
            {[...TIER_TICKER, ...TIER_TICKER, ...TIER_TICKER].map((tier, index) => (
              <span key={`${tier.tier}-${index}`} className="flex items-center gap-1.5">
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ background: tier.color, boxShadow: `0 0 8px ${tier.color}` }}
                />
                <span className="text-[10px] font-medium lg:text-[11px]" style={{ color: tier.color }}>
                  {tier.label}
                </span>
                <span className="text-[7.5px] tracking-[0.2em] text-white/20">{tier.en}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 flex items-center justify-between rounded-2xl border border-gold/15 bg-[linear-gradient(120deg,rgba(247,198,106,0.07),rgba(255,255,255,0.015))] px-4 py-3 lg:mt-8 lg:px-8 lg:py-5">
        {[
          { label: '鉴定', value: player?.totalIdentify ?? 0 },
          { label: '建档', value: stats?.total ?? 0 },
          { label: '传说', value: stats?.legendary ?? 0, accent: true },
        ].map((stat, index) => (
          <div key={stat.label} className="flex flex-1 items-center justify-center gap-2">
            {index > 0 && (
              <span className="mr-2 h-6 w-px bg-gradient-to-b from-transparent via-white/12 to-transparent lg:mr-6 lg:h-10" />
            )}
            <div className="flex items-baseline gap-1 lg:gap-2">
              <span
                className={
                  stat.accent
                    ? 'tabular text-[20px] font-semibold text-[#ff6b7e] lg:text-[26px]'
                    : 'tabular text-[20px] font-semibold text-[#f2ead8] lg:text-[26px]'
                }
              >
                {stat.value}
              </span>
              <span className="text-[8.5px] tracking-[0.16em] text-white/30 lg:text-[10px]">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
        <section className="min-w-0">
          <div className="mb-2.5 flex items-center justify-between lg:mb-3">
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-[#ffcf7a]" />
              <span className="text-[13px] font-semibold tracking-wide text-[#f3ecdd] lg:text-[15px]">
                今日悬赏
              </span>
            </div>
            <Link href="/appraise" className="flex items-center gap-0.5 text-[9px] text-white/35">
              去完成
              <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
          <BountyBoard
            tasks={bounty?.tasks}
            loading={!bounty}
            compact
            emptyText="正在读取今日悬赏…"
          />
        </section>

        <section className="mt-6 min-w-0 lg:mt-0">
          <div className="mb-2.5 flex items-center justify-between lg:mb-3">
            <span className="text-[13px] font-semibold tracking-wide text-[#f3ecdd] lg:text-[15px]">
              最近战利品
            </span>
            <Link href="/gallery" className="flex items-center gap-0.5 text-[9px] text-white/35">
              展厅
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
          <RecentRail items={items} />
        </section>
      </div>

      <Link
        href="/showroom"
        className="group mt-6 flex items-center justify-between overflow-hidden rounded-2xl border border-violet/25 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(166,124,255,0.18),rgba(166,124,255,0.04))] px-4 py-3.5 lg:mt-8 lg:px-6 lg:py-5"
      >
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-violet lg:text-[14px]">
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            效果陈列室
          </div>
          <p className="mt-1 text-[9px] text-white/35 lg:text-[11px]">五档卡面 · 传说红卡 · 大红 3D</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-violet/70 transition group-hover:translate-x-0.5" />
      </Link>

      <div className="h-6 lg:h-10" />
    </div>
  );
}
