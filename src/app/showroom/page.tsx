'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Play, RotateCcw, ScanLine, Sparkles, X } from 'lucide-react';
import type { Rarity } from '@/types';
import { RARITY_META, RARITY_ORDER, TIER_RANGE } from '@/features/game/rarity';
import { RevealSequence } from '@/components/reveal/RevealSequence';
import type { LootCardData } from '@/components/cards/LootCard';
import { formatCoins } from '@/features/game/scoring';
import { cn } from '@/lib/utils/cn';

const ModelViewer = dynamic(() => import('@/components/model3d/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[340px] place-items-center rounded-2xl border border-white/[0.06] bg-[#080d17]">
      <span className="text-[10px] tracking-[0.16em] text-white/30">正在加载样例 3D…</span>
    </div>
  ),
});

const EFFECTS: Record<Rarity, string> = {
  common: '哑光纸张 · 轻落位',
  fine: '蓝色描边 · 扫描流光',
  rare: '紫色雾面 · 全息折射 · 粒子',
  epic: '金色光柱 · 射线 · 浮雕',
  legendary: '全屏震屏 · 红色裂隙 · 星尘 · 专属音效',
};

/** 五档示例全部使用仓库 images/ 下的真实照片（复制到 /public/images 供页面引用） */
const PREVIEW: Record<Rarity, { image: string; name: string; scene: string; category: string }> = {
  common: {
    image: '/images/image6.jpg',
    name: '黑色软皮笔记本',
    category: '文具',
    scene: '桌面 · 通勤包',
  },
  fine: {
    image: '/images/image2.jpg',
    name: '白色无线鼠标',
    category: '数码',
    scene: '书桌 · 工位',
  },
  rare: {
    image: '/images/image1.jpg',
    name: '希腊风味酸奶',
    category: '食品',
    scene: '办公室 · 早餐',
  },
  epic: {
    image: '/images/image5.jpg',
    name: '蓝白机械键盘',
    category: '数码',
    scene: '工作台 · 深夜',
  },
  legendary: {
    image: '/images/image4.jpg',
    name: '大红 · 芝士奶盖',
    category: '饮品',
    scene: '下午茶 · 高光时刻',
  },
};

const LEGENDARY_3D = '/models/dahong.glb';

function buildPreview(tier: Rarity): LootCardData {
  const range = TIER_RANGE[tier];
  const rank = RARITY_ORDER.indexOf(tier);
  const base = 48 + rank * 9;
  const sample = PREVIEW[tier];
  return {
    id: `preview-${tier}`,
    name: sample.name,
    category: sample.category,
    scene: sample.scene,
    rarity: tier,
    mode: 'hunt',
    worth: { low: range[0], high: range[1] },
    affixes: ['效果预览', '不写入展厅', '不消耗次数'],
    desc:
      '这是效果陈列室生成的预览卡片，用来展示该档位的卡面、揭幕动画与信息层级。它不会写入你的展厅，也不会影响鉴定次数、收藏币或保底进度。',
    visibleFeatures: ['预览数据', '非真实鉴定结果'],
    scoreTotal: Math.min(150, base + 20),
    scores: {
      rarity: Math.min(100, base + 10),
      surprise: Math.min(100, base + 4),
      value: Math.min(100, base - 4),
      aesthetic: Math.min(100, base + 6),
      craft: Math.min(100, base + 2),
      story: Math.min(100, base - 2),
      condition: Math.min(100, base - 8),
      bond: Math.min(100, base - 6),
    },
    createdAt: new Date().toISOString(),
    analysisSource: 'mock',
    status: 'pending_lock',
  };
}

export default function ShowroomPage() {
  const [previewTier, setPreviewTier] = useState<Rarity | null>(null);
  const [previewRun, setPreviewRun] = useState(0);

  useEffect(() => {
    if (!previewTier) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [previewTier]);

  const openPreview = (tier: Rarity) => {
    setPreviewTier(tier);
    setPreviewRun((n) => n + 1);
  };

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 pt-4 lg:px-10 lg:pb-12 lg:pt-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label">EFFECT GALLERY</p>
          <h1 className="mt-1 text-[25px] font-semibold tracking-[0.06em] text-[#f4f0e6] lg:text-[32px]">
            效果陈列室
          </h1>
        </div>
        <span className="chip border-violet/30 text-violet">预览</span>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="section-label">五档卡面</span>
          <span className="text-[8.5px] text-white/25">点击可全屏预览揭晓</span>
        </div>
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {RARITY_ORDER.map((tier) => {
            const meta = RARITY_META[tier];
            const range = TIER_RANGE[tier];
            return (
              <button
                key={tier}
                type="button"
                onClick={() => openPreview(tier)}
                className={cn(
                  'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.99]',
                  tier === 'legendary'
                    ? 'border-[#ff3b53]/35 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,59,83,0.2),rgba(255,59,83,0.05))]'
                    : 'border-white/[0.07] bg-[#0e1524]/70',
                )}
                style={
                  tier === 'legendary'
                    ? undefined
                    : { borderColor: `${meta.color}22` }
                }
              >
                <span
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border"
                  style={{
                    borderColor: `${meta.color}55`,
                    boxShadow: `0 0 24px -12px ${meta.color}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={PREVIEW[tier].image}
                    alt={PREVIEW[tier].name}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className="absolute inset-x-0 bottom-0 h-1/2"
                    style={{ background: `linear-gradient(180deg, transparent, ${meta.soft})` }}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className="rarity-ink text-[13px] font-semibold"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[7.5px] tracking-[0.24em] text-white/25">
                      {meta.en}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/60">
                    {PREVIEW[tier].name}
                  </span>
                  <span className="mt-0.5 block truncate text-[8.5px] text-white/30">
                    {EFFECTS[tier]}
                  </span>
                  <span className="mt-1 block text-[9px] text-gold/50">
                    ◎ {formatCoins(range[0])} ~ {formatCoins(range[1])}
                  </span>
                </span>

                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition group-hover:border-gold/40 group-hover:text-gold">
                  <Play className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative mt-5 overflow-hidden rounded-2xl border border-[#ff3b53]/30 p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_100%_0%,rgba(255,59,83,0.3),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-[#ff8a99]">
            <Sparkles className="h-3 w-3" />
            LEGENDARY SHOWCASE
          </div>
          <h2 className="mt-2 text-[20px] font-semibold text-[#ffe9e6] lg:text-[24px]">
            大红 · 红卡高光
          </h2>
          <p className="mt-1.5 max-w-[420px] text-[9.5px] leading-relaxed text-white/40 lg:text-[11px]">
            暗场、心跳、红色光晕与星尘，都围着「大红」这张实测照片演示。
            全部标注为预览，不伪装成真实抽卡结果。
          </p>
          <button
            type="button"
            onClick={() => openPreview('legendary')}
            className="btn-primary mt-3 px-4 py-2.5 text-[11px]"
          >
            <Play className="h-3.5 w-3.5" />
            全屏预览传说出货
          </button>
        </div>
      </section>

      <section id="sample-3d" className="mt-5 scroll-mt-20">
        <div className="mb-2 flex items-center justify-between">
          <span className="section-label">大红 · 3D 陈列</span>
          <span className="text-[8.5px] text-white/25">实时渲染 · 拖动旋转</span>
        </div>
        <ModelViewer
          src={LEGENDARY_3D}
          checkUrl="/api/model3d/asset"
          title="样例几何 · 大红 3D 未生成"
          modelLabel="Tripo 生成 · 大红 · 可旋转"
          localLabel="本地建模 · 大红 · 可旋转"
        />
      </section>

      <div className="mt-5 flex gap-2">
        <Link href="/appraise" className="btn-ghost flex-1 py-2.5 text-[10.5px]">
          <ScanLine className="h-3.5 w-3.5" />
          去鉴定
        </Link>
        <Link href="/gallery" className="btn-ghost flex-1 py-2.5 text-[10.5px]">
          我的展厅
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {previewTier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--stage-deep)]">
          <button
            type="button"
            onClick={() => setPreviewTier(null)}
            className="fixed right-4 top-16 z-[60] grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-black/50 text-white/60 backdrop-blur"
            aria-label="关闭预览"
          >
            <X className="h-4 w-4" />
          </button>
          <RevealSequence
            key={`${previewTier}-${previewRun}`}
            data={buildPreview(previewTier)}
            imageUrl={PREVIEW[previewTier].image}
            preview
            footer={
              <div className="space-y-2 pb-6">
                <button
                  type="button"
                  onClick={() => setPreviewRun((n) => n + 1)}
                  className="btn-primary w-full py-3 text-[12px]"
                >
                  <RotateCcw className="h-4 w-4" />
                  再看一次
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTier(null)}
                  className="btn-ghost w-full py-2.5 text-[10.5px]"
                >
                  返回陈列室
                </button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
