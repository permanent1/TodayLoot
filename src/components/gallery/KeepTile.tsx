'use client';

import Link from 'next/link';
import type { CollectionItem } from '@/types';
import { RARITY_META } from '@/features/game/rarity';
import { useAssetUrl } from '@/lib/hooks/useAssetUrl';
import { formatDate } from '@/lib/utils/text';

/**
 * 珍藏柜：证书式陈列。
 * 与战利品的"高密度战报"不同，这里用双线金框、拱形取景窗、烫金印章与编号，
 * 让每件藏品看起来像被单独装裱过。
 */
export function KeepTile({ item }: { item: CollectionItem }) {
  const url = useAssetUrl(item.originalImageId);
  const cutoutUrl = useAssetUrl(item.cutoutImageId);
  const meta = RARITY_META[item.rarity];
  const serial = item.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const href = item.status === 'pending_lock' ? `/reveal/${item.id}` : `/item/${item.id}`;

  return (
    <Link
      href={href}
      className="keep-dark group relative block overflow-hidden rounded-[20px] border border-[#c9a97a]/30 bg-[linear-gradient(158deg,#1e1911_0%,#15110b_54%,#0c0a07_100%)] p-[6px] transition duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
      style={{ boxShadow: '0 26px 48px -36px rgba(0,0,0,0.9)' }}
    >
      <div className="relative rounded-[15px] border border-[#c9a97a]/22 px-3 pb-3 pt-2.5">
        <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 rounded-tl-sm border-l border-t border-[#c9a97a]/45" />
        <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 rounded-tr-sm border-r border-t border-[#c9a97a]/45" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 rounded-bl-sm border-b border-l border-[#c9a97a]/45" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 rounded-br-sm border-b border-r border-[#c9a97a]/45" />

        <div className="flex items-center justify-between gap-2 text-[6.5px] tracking-[0.16em] text-[#8d7853]">
          <span className="whitespace-nowrap">ZERO APPRAISAL BUREAU</span>
          <span className="shrink-0" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>

        <div className="relative mt-2 overflow-hidden rounded-t-[78px] rounded-b-[8px] border border-[#c9a97a]/28 bg-[radial-gradient(circle_at_50%_34%,#2b2216,#100c07_72%)]">
          <div className="relative aspect-[4/4.5] overflow-hidden">
            {cutoutUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cutoutUrl}
                alt={item.name}
                className="h-full w-full object-contain p-3 drop-shadow-[0_14px_20px_rgba(0,0,0,0.6)] transition duration-700 group-hover:scale-[1.03]"
              />
            ) : url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={item.name}
                className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="grid h-full place-items-center text-4xl" style={{ color: meta.color }}>
                {meta.icon}
              </div>
            )}
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d0a06] to-transparent" />
            <span className="absolute inset-0 rounded-t-[78px] rounded-b-[8px] shadow-[inset_0_0_36px_rgba(0,0,0,0.55)]" />
            <span
              className="pointer-events-none absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-[#c9a97a]/45 text-[7px] tracking-[0.06em] text-[#e6cf9f] transition duration-500 group-hover:rotate-[10deg]"
              style={{
                background:
                  'radial-gradient(circle at 34% 28%, rgba(201,169,122,0.28), rgba(19,15,9,0.92))',
                boxShadow: '0 6px 16px -8px rgba(0,0,0,0.9)',
              }}
              aria-hidden
            >
              珍藏
            </span>
          </div>
          <span
            className="absolute inset-x-0 top-0 h-px opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }}
          />
        </div>

        <p className="mt-2.5 truncate text-[13px] tracking-[0.06em] text-[#f2e4c8]">{item.name}</p>
        <p className="mt-0.5 truncate text-[8px] tracking-[0.14em] text-[#9a8562]">
          {item.category} · {item.scene}
        </p>

        <div className="mt-2 flex items-end justify-between border-t border-[#c9a97a]/20 pt-2">
          <div>
            <div className="text-[6.5px] tracking-[0.2em] text-[#8a744f]">入藏</div>
            <div className="tabular text-[9px] text-[#d8c49d]">{formatDate(item.createdAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-[6.5px] tracking-[0.2em] text-[#8a744f]">探访</div>
            <div className="tabular text-[9px] text-[#d8c49d]">{item.visits ?? 0} 次</div>
          </div>
        </div>

        <div className="mt-1 text-right text-[6.5px] tracking-[0.2em] text-[#8a744f]">
          NO.{serial}
        </div>
      </div>

      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] opacity-0 transition duration-500 group-hover:opacity-100">
        <span className="absolute inset-y-0 -left-1/3 w-1/3 rotate-[12deg] bg-gradient-to-r from-transparent via-[#f2d9a6]/12 to-transparent" />
      </span>
    </Link>
  );
}
