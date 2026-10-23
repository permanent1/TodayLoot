'use client';

import Link from 'next/link';
import type { CollectionItem } from '@/types';
import { RARITY_META } from '@/features/game/rarity';
import { formatCoins } from '@/features/game/scoring';
import { useAssetUrl } from '@/lib/hooks/useAssetUrl';
import { formatDate } from '@/lib/utils/text';

/** 战利品：高密度、快速浏览，稀有度颜色是唯一主角 */
export function HuntTile({ item }: { item: CollectionItem }) {
  const url = useAssetUrl(item.originalImageId);
  const cutoutUrl = useAssetUrl(item.cutoutImageId);
  const meta = RARITY_META[item.rarity];
  const href = item.status === 'pending_lock' ? `/reveal/${item.id}` : `/item/${item.id}`;

  return (
    <Link
      href={href}
      className="keep-dark group relative block overflow-hidden rounded-2xl border bg-[#0a0f1a] transition duration-300 hover:-translate-y-0.5 active:scale-[0.985]"
      style={{
        borderColor: `${meta.color}30`,
        boxShadow: `0 18px 34px -26px ${meta.color}`,
      }}
    >
      <div
        className="relative aspect-[3/4.15] overflow-hidden"
        style={{
          background: cutoutUrl
            ? `radial-gradient(circle at 50% 42%, ${meta.soft}, transparent 70%)`
            : undefined,
        }}
      >
        {cutoutUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cutoutUrl}
            alt={item.name}
            className="h-full w-full object-contain p-3 drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)] transition duration-500 group-hover:scale-[1.04]"
          />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={item.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="grid h-full place-items-center text-4xl"
            style={{
              color: meta.color,
              background: `radial-gradient(circle at 50% 40%, ${meta.soft}, #090e18 70%)`,
            }}
          >
            {meta.icon}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-[#060a12]/10 to-transparent" />
        <div
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }}
        />

        <div className="absolute left-2 top-2 flex items-center gap-1">
          <span
            className="rounded px-1.5 py-0.5 text-[8px] font-medium tracking-wider backdrop-blur"
            style={{ color: meta.color, background: 'rgba(0,0,0,0.52)' }}
          >
            {meta.label}
          </span>
          {item.status === 'pending_lock' && (
            <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[7.5px] text-gold backdrop-blur">
              待入藏
            </span>
          )}
        </div>

        <span className="absolute right-2 top-2 text-[7px] tracking-[0.22em] text-white/30">
          HUNT
        </span>

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="truncate text-[12px] font-medium text-white/90">{item.name}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="flex items-baseline gap-0.5 text-[9px] text-gold/80">
              <span className="text-[8px]">◎</span>
              <span className="tabular">{formatCoins(item.worth.low)}</span>
              <span className="text-white/25">~</span>
              <span className="tabular">{formatCoins(item.worth.high)}</span>
            </span>
            <span className="text-[7.5px] text-white/25">{formatDate(item.createdAt)}</span>
          </div>
        </div>
      </div>

      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 44px -16px ${meta.color}` }}
      />
    </Link>
  );
}
