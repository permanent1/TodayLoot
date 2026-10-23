'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { CollectionItem } from '@/types';
import { RARITY_META } from '@/features/game/rarity';
import { useAssetUrl } from '@/lib/hooks/useAssetUrl';

function MiniLoot({ item }: { item: CollectionItem }) {
  const url = useAssetUrl(item.originalImageId);
  const cutoutUrl = useAssetUrl(item.cutoutImageId);
  const meta = RARITY_META[item.rarity];

  return (
    <Link
      href={item.status === 'pending_lock' ? `/reveal/${item.id}` : `/item/${item.id}`}
      className="group relative w-[104px] shrink-0 lg:w-[132px]"
    >
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-xl border bg-[#0a0f1a]"
        style={{ borderColor: `${meta.color}38` }}
      >
        {cutoutUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cutoutUrl}
            alt={item.name}
            className="h-full w-full object-contain p-1.5 drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)] transition duration-500 group-hover:scale-105"
          />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={item.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-2xl" style={{ color: meta.color }}>
            {meta.icon}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span
          className="absolute left-1.5 top-1.5 rounded px-1 py-0.5 text-[7.5px] font-medium"
          style={{ color: meta.color, background: 'rgba(0,0,0,0.5)' }}
        >
          {meta.label}
        </span>
        {item.status === 'pending_lock' && (
          <span className="absolute right-1.5 top-1.5 rounded bg-gold/20 px-1 py-0.5 text-[7px] text-gold">
            待入藏
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="truncate text-[10px] text-white/85">{item.name}</p>
          <p className="mt-0.5 text-[7.5px] tracking-wide text-white/35">
            {item.mode === 'keep' ? '珍藏' : '战利品'}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** 桌面端自绘滑条：跨平台都能看见，可点击跳转与拖动 */
function RailScrollbar({
  scrollerRef,
  contentKey,
}: {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  contentKey: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [state, setState] = useState({ visible: false, left: 0, width: 100 });

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) {
      setState({ visible: false, left: 0, width: 100 });
      return;
    }
    const width = Math.max(14, (el.clientWidth / el.scrollWidth) * 100);
    const left = (el.scrollLeft / max) * (100 - width);
    setState({ visible: true, left, width });
  }, [scrollerRef]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, scrollerRef, contentKey]);

  const seek = (clientX: number) => {
    const el = scrollerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
  };

  if (!state.visible) return null;

  return (
    <div
      ref={trackRef}
      aria-hidden
      className="rail-track mt-2.5 hidden h-[6px] w-full cursor-pointer touch-none items-center rounded-full lg:flex"
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        seek(event.clientX);
      }}
      onPointerMove={(event) => {
        if (draggingRef.current) seek(event.clientX);
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <span
        className="rail-thumb h-[6px] rounded-full"
        style={{
          marginLeft: `${state.left}%`,
          width: `${state.width}%`,
        }}
      />
    </div>
  );
}

export function RecentRail({ items }: { items: CollectionItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return (
      <div className="panel-flat flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-[11px] text-white/55">档案柜还空着</p>
          <p className="mt-1 text-[9px] text-white/25">第一件藏品会出现在这里</p>
        </div>
        <Link href="/appraise" className="chip border-gold/30 text-gold">
          去鉴定
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div
        ref={scrollerRef}
        tabIndex={0}
        aria-label="最近战利品，可横向滚动"
        className="rail-scroll -mx-4 flex w-full min-w-0 gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-1 lg:mx-0 lg:px-0"
      >
        {items.map((item) => (
          <MiniLoot key={item.id} item={item} />
        ))}
      </div>
      <RailScrollbar scrollerRef={scrollerRef} contentKey={`${items.length}-${items[0]?.id ?? ''}`} />
    </div>
  );
}
