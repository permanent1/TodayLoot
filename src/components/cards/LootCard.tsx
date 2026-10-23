'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CollectionItem, Mode, Rarity, Worth } from '@/types';
import { RARITY_META } from '@/features/game/rarity';
import { formatCoins } from '@/features/game/scoring';
import { cn } from '@/lib/utils/cn';
import { useMotionEnabled } from '@/lib/store';

export interface LootCardData {
  id: string;
  name: string;
  category: string;
  scene: string;
  rarity: Rarity;
  mode: Mode;
  worth: Worth;
  affixes: string[];
  desc: string;
  visibleFeatures: string[];
  userNote?: string;
  origin?: string;
  story?: string;
  monologue?: string;
  signature?: string;
  scoreTotal: number;
  scores: Record<string, number>;
  createdAt: string;
  broadcast?: string;
  analysisSource: 'qwen' | 'mock';
  status?: CollectionItem['status'];
}

const CARD_SCORES: Record<string, string> = {
  rarity: '稀缺',
  surprise: '惊喜',
  aesthetic: '美学',
  craft: '工艺',
  story: '故事',
  condition: '状态',
  bond: '羁绊',
};

export function RarityBadge({
  rarity,
  size = 'md',
}: {
  rarity: Rarity;
  size?: 'sm' | 'md';
}) {
  const meta = RARITY_META[rarity];
  return (
    <span
      className={cn(
        'rarity-ink inline-flex items-center gap-1 rounded-full border font-semibold tracking-[0.18em]',
        size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]',
      )}
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        background: meta.soft,
      }}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function CardFace({
  data,
  imageUrl,
  cutoutUrl,
  keepSide,
}: {
  data: LootCardData;
  imageUrl?: string | null;
  cutoutUrl?: string | null;
  keepSide: boolean;
}) {
  const meta = RARITY_META[data.rarity];
  const serial = data.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const isKeep = data.mode === 'keep';
  const [cutoutFailed, setCutoutFailed] = useState(false);

  useEffect(() => {
    setCutoutFailed(false);
  }, [cutoutUrl]);

  const hasCutout = Boolean(cutoutUrl) && !cutoutFailed;

  if (keepSide) {
    return (
      <div className="keep-dark keep-paper card-frame relative h-full w-full">
        <div className="relative z-10 flex h-full flex-col p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[8px] tracking-[0.32em] text-[#b49a72]">
                ZERO APPRAISAL BUREAU
              </div>
              <div className="mt-1 text-[13px] tracking-[0.2em] text-[#f0e3c9]">
                藏品证书
              </div>
            </div>
            <RarityBadge rarity={data.rarity} size="sm" />
          </div>

          <div className="my-2 h-px w-full bg-[#c9a97a]/25" />

          <div className="text-[15px] font-semibold tracking-wide text-[#f6ead2]">
            {data.name}
          </div>
          <div className="mt-0.5 text-[9px] tracking-[0.14em] text-[#a58f6c]">
            {data.category} · {data.scene}
          </div>

          <div className="mt-2.5 space-y-2 text-[10.5px] leading-[1.7] text-[#d9c8a9]">
            <p className={isKeep ? 'line-clamp-3' : 'line-clamp-4'}>{data.desc}</p>
            {data.origin && (
              <p className="line-clamp-2 text-[#bfa885]">来历：{data.origin}</p>
            )}
            {data.story && <p className="line-clamp-2 text-[#bfa885]">{data.story}</p>}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {data.affixes.slice(0, 4).map((affix) => (
              <span
                key={affix}
                className="rounded border border-[#c9a97a]/25 bg-[#c9a97a]/10 px-1.5 py-0.5 text-[8.5px] text-[#d9c39a]"
              >
                {affix}
              </span>
            ))}
          </div>

          {!isKeep && (
            <>
              <div className="mt-2 border-t border-[#c9a97a]/15 pt-2">
                <div className="text-[8px] tracking-[0.2em] text-[#9a8562]">
                  可见特征
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.visibleFeatures.slice(0, 3).map((feature) => (
                    <span
                      key={feature}
                      className="rounded bg-[#c9a97a]/10 px-1.5 py-0.5 text-[8px] text-[#c9b894]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {Object.entries(CARD_SCORES).map(([key, label]) => {
                  const value = data.scores[key] ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-[7.5px]">
                        <span className="text-[#9a8562]">{label}</span>
                        <span className="tabular text-[#c9b894]">{value}</span>
                      </div>
                      <div className="mt-0.5 h-[2px] overflow-hidden rounded-full bg-[#c9a97a]/15">
                        <div
                          className="h-full rounded-full bg-[#c9a97a]/70"
                          style={{ width: `${Math.min(100, value)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.broadcast && (
                <p className="mt-2 border-l border-[#c9a97a]/30 pl-2 text-[9px] italic leading-relaxed text-[#bfa885]">
                  「{data.broadcast}」
                </p>
              )}
              {data.userNote && (
                <p className="mt-1.5 line-clamp-2 text-[8.5px] leading-relaxed text-[#8f7a5b]">
                  附言：{data.userNote}
                </p>
              )}
            </>
          )}

          <div className="mt-auto">
            <div className="mt-2 flex items-end justify-between border-t border-[#c9a97a]/20 pt-2">
              <div>
                <div className="text-[8px] tracking-[0.2em] text-[#9a8562]">
                  档案编号
                </div>
                <div className="tabular text-[10px] text-[#e2d3b7]">NO.{serial}</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] tracking-[0.2em] text-[#9a8562]">
                  鉴定综合
                </div>
                <div className="tabular text-[13px] text-[#f6ead2]">
                  {data.scoreTotal}
                </div>
              </div>
            </div>
            {data.signature && (
              <div className="mt-1.5 text-right text-[9px] italic text-[#a58f6c]">
                {data.signature}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('keep-dark card-frame h-full w-full', isKeep && 'keep-paper')}
      style={{ ['--rarity' as string]: meta.color }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${meta.soft}, transparent 62%), linear-gradient(180deg, #0d1422 0%, #080c16 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-12 opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 38%, ${meta.glow}, transparent 62%)` }}
      />

      {data.rarity !== 'common' && <div className="card-sheen play" />}

      <div className="relative z-10 flex h-full flex-col p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RarityBadge rarity={data.rarity} />
            <span className="text-[8px] tracking-[0.18em] text-white/30">
              {isKeep ? 'KEEP' : 'HUNT'}
            </span>
          </div>
          <span className="text-[8px] tracking-[0.2em] text-white/35">
            {isKeep ? '珍藏柜' : '战利品'}
          </span>
        </div>

        <div
          className={`relative mt-2.5 flex-1 overflow-hidden ${
            hasCutout ? '' : 'rounded-[13px] border'
          }`}
          style={hasCutout ? undefined : { borderColor: `${meta.color}33` }}
        >
          {hasCutout ? (
            <div className="relative flex h-full w-full items-center justify-center">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 46%, ${meta.soft}, transparent 66%)`,
                }}
              />
              <div className="absolute bottom-[5%] h-3 w-[54%] rounded-full bg-black/45 blur-md" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cutoutUrl ?? ''}
                alt={data.name}
                className="relative max-h-[93%] max-w-[94%] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.58)]"
                draggable={false}
                onError={() => setCutoutFailed(true)}
              />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#080c16]/80 to-transparent" />
              <span
                className="absolute bottom-2 left-2 rounded bg-black/35 px-1.5 py-0.5 text-[7px] tracking-[0.12em] text-white/40 backdrop-blur"
              >
                本地抠图
              </span>
            </div>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={data.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="grid h-full w-full place-items-center"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${meta.soft}, #0a0f1a 70%)`,
              }}
            >
              <span className="text-5xl opacity-60" style={{ color: meta.color }}>
                {meta.icon}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080c16] via-transparent to-transparent" />
          <div
            className="absolute inset-x-0 top-0 h-px opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }}
          />
          {data.analysisSource === 'mock' && (
            <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[7.5px] tracking-[0.14em] text-white/60 backdrop-blur">
              演示数据
            </span>
          )}
          <span
            className="absolute bottom-2 right-2 text-lg leading-none opacity-80"
            style={{ color: meta.color }}
            aria-hidden
          >
            {meta.icon}
          </span>
        </div>

        <div className="mt-2.5">
          <h3 className="text-[17px] font-semibold leading-tight tracking-wide text-[#f4f1ea]">
            {data.name}
          </h3>
          <p className="mt-0.5 truncate text-[9px] tracking-[0.1em] text-white/40">
            {data.category} · {data.scene}
          </p>
        </div>

        <div className="mt-1.5 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-gold" aria-hidden>
              ◎
            </span>
            <span className="tabular text-[12.5px] font-semibold text-[#f0e2c4]">
              {formatCoins(data.worth.low)}
            </span>
            <span className="text-[9px] text-white/35">~</span>
            <span className="tabular text-[12.5px] font-semibold text-[#f0e2c4]">
              {formatCoins(data.worth.high)}
            </span>
          </div>
          <span className="text-[8px] tracking-[0.16em] text-white/25">
            NO.{serial}
          </span>
        </div>

        <div className="mt-2 flex min-h-[20px] flex-wrap gap-1">
          {data.affixes.slice(0, 4).map((affix) => (
            <span
              key={affix}
              className="rounded border px-1.5 py-0.5 text-[8px]"
              style={{
                borderColor: `${meta.color}30`,
                color: `${meta.color}dd`,
                background: `${meta.color}0d`,
              }}
            >
              {affix}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LootCard({
  data,
  imageUrl,
  cutoutUrl,
  className,
  interactive = true,
  defaultSide = 'front',
}: {
  data: LootCardData;
  imageUrl?: string | null;
  cutoutUrl?: string | null;
  className?: string;
  interactive?: boolean;
  defaultSide?: 'front' | 'back';
}) {
  const motionEnabled = useMotionEnabled();
  const [flipped, setFlipped] = useState(defaultSide === 'back');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const meta = RARITY_META[data.rarity];

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !motionEnabled) return;
    if (event.pointerType === 'touch') return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 9, y: px * 12 });
  };

  return (
    <div className={cn('w-full', className)} ref={ref}>
      <div
        className="relative w-full [perspective:1400px]"
        style={{ aspectRatio: '3 / 4.28' }}
        onPointerMove={handleMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div
          className="relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          <div
            className={cn(
              'absolute inset-0 h-full w-full transition-transform duration-700 [transform-style:preserve-3d]',
              flipped && '[transform:rotateY(180deg)]',
            )}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <CardFace
                data={data}
                imageUrl={imageUrl}
                cutoutUrl={cutoutUrl}
                keepSide={false}
              />
            </div>
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <CardFace data={data} imageUrl={imageUrl} cutoutUrl={cutoutUrl} keepSide />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 -bottom-3 mx-auto h-6 w-2/3 rounded-full blur-xl"
          style={{ background: meta.glow, opacity: 0.35 }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] py-2 text-[10px] tracking-[0.16em] text-white/55 transition hover:text-white"
      >
        <RotateCcw className="h-3 w-3" />
        {flipped ? '翻回正面' : data.mode === 'keep' ? '翻到证书' : '查看背面'}
      </button>
    </div>
  );
}
