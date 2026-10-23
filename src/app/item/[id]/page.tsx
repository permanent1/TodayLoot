'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Box,
  Eye,
  Gem,
  ImageDown,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { CollectionItem } from '@/types';
import { LootCard } from '@/components/cards/LootCard';
import { RARITY_META } from '@/features/game/rarity';
import { formatCoins } from '@/features/game/scoring';
import { destroyItem, getItem, transferToKeep, visitItem } from '@/lib/db/repository';
import { useAssetUrl } from '@/lib/hooks/useAssetUrl';
import { createCardPoster } from '@/lib/image/poster';
import { downloadBlob } from '@/lib/image/process';
import { formatDate } from '@/lib/utils/text';
import { cn } from '@/lib/utils/cn';

const SCORE_LABELS: Record<string, string> = {
  rarity: '稀缺',
  surprise: '惊喜',
  value: '观感',
  aesthetic: '美学',
  craft: '工艺',
  story: '故事',
  condition: '状态',
  bond: '羁绊',
};

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'poster' | 'transfer' | 'destroy' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [visiting, setVisiting] = useState(false);

  const imageUrl = useAssetUrl(item?.originalImageId);
  const cutoutUrl = useAssetUrl(item?.cutoutImageId);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getItem(id)
      .then((found) => {
        if (alive) setItem(found ?? null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
        <span className="text-4xl opacity-40">◇</span>
        <h1 className="mt-4 text-[16px] text-white/80">藏品档案不存在</h1>
        <p className="mt-2 text-[10px] text-white/35">本机没有找到这件藏品。</p>
        <Link href="/gallery" className="btn-primary mt-6 px-5 py-2.5 text-[12px]">
          返回展厅
        </Link>
      </div>
    );
  }

  const meta = RARITY_META[item.rarity];
  const pending = item.status === 'pending_lock';

  const handlePoster = async () => {
    setBusy('poster');
    setMessage(null);
    try {
      const blob = await createCardPoster(item, imageUrl, cutoutUrl);
      downloadBlob(blob, `today-loot-${item.name}-${item.id.slice(0, 6)}.png`);
      setMessage('卡片海报已生成，可在下载目录查看。');
    } catch {
      setMessage('海报生成失败，请确认浏览器允许下载。');
    } finally {
      setBusy(null);
    }
  };

  const handleTransfer = async () => {
    setBusy('transfer');
    try {
      const updated = await transferToKeep(item.id);
      if (updated) setItem(updated);
      setMessage('已转为珍藏，保留原评级与鉴定记录。');
    } finally {
      setBusy(null);
    }
  };

  const handleDestroy = async () => {
    if (
      !window.confirm(
        '确定碎掉这张卡吗？图片与档案会从展厅移除（历史审计记录仍保留在本地）。',
      )
    ) {
      return;
    }
    setBusy('destroy');
    try {
      await destroyItem(item.id);
      router.push('/gallery');
    } finally {
      setBusy(null);
    }
  };

  const handleVisit = async () => {
    if (visiting) return;
    setVisiting(true);
    try {
      const updated = await visitItem(item.id);
      if (updated) setItem(updated);
    } finally {
      setVisiting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[10px] text-white/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <span className="section-label">ITEM ARCHIVE</span>
        <button
          type="button"
          onClick={() => void handlePoster()}
          disabled={busy === 'poster'}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/50"
          aria-label="保存卡片海报"
        >
          {busy === 'poster' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {pending && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2">
          <span className="text-[9.5px] text-gold/80">这件藏品还没有保存到战利品</span>
          <Link href={`/reveal/${item.id}`} className="text-[9.5px] font-medium text-gold">
            去揭晓
          </Link>
        </div>
      )}

      <div className="lg:mt-6 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-24">
          <div className="mx-auto mt-4 w-full max-w-[360px] lg:mt-0 lg:max-w-none">
            <LootCard data={item} imageUrl={imageUrl} cutoutUrl={cutoutUrl} />
          </div>

      <div className="mt-5 flex items-center justify-between lg:mt-4">
        <div className="flex items-center gap-2">
          <span
            className="rarity-ink rounded-full border px-2 py-0.5 text-[9px] tracking-[0.16em]"
            style={{ color: meta.color, borderColor: `${meta.color}55`, background: meta.soft }}
          >
            {meta.icon} {meta.label}
          </span>
          <span className="text-[9px] text-white/30">
            {item.mode === 'keep' ? '珍藏柜' : '战利品'} · {formatDate(item.createdAt)}
          </span>
        </div>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[8px]',
            item.analysisSource === 'mock'
              ? 'bg-violet/15 text-violet/80'
              : 'bg-emerald-400/15 text-emerald-200/80',
          )}
        >
          {item.analysisSource === 'mock' ? '演示数据' : '真实模型'}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-white/45">{meta.tagline}</p>
        </div>

        <div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:mt-0">
        <div className="panel-flat px-3 py-2.5">
          <div className="text-[8px] tracking-[0.18em] text-white/25">收藏币区间</div>
          <div className="mt-1 flex items-baseline gap-1 text-gold">
            <span className="text-[10px]">◎</span>
            <span className="tabular text-[13px] font-semibold">
              {formatCoins(item.worth.low)}
            </span>
            <span className="text-[9px] text-white/25">~</span>
            <span className="tabular text-[13px] font-semibold">
              {formatCoins(item.worth.high)}
            </span>
          </div>
        </div>
        <div className="panel-flat px-3 py-2.5">
          <div className="text-[8px] tracking-[0.18em] text-white/25">综合鉴定分</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="tabular text-[16px] font-semibold text-[#f0e6d2]">
              {item.scoreTotal}
            </span>
            {item.coinReward > 0 && (
              <span className="text-[8.5px] text-gold/60">
                +◎{formatCoins(item.coinReward)}
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="panel mt-3 p-4">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-white/70">鉴定记录</h2>
        <p className="mt-2 text-[10.5px] leading-relaxed text-white/45">{item.desc}</p>

        {item.visibleFeatures.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.visibleFeatures.map((feature) => (
              <span key={feature} className="chip">
                {feature}
              </span>
            ))}
          </div>
        )}

        {item.userNote && (
          <div className="mt-3 rounded-lg border-l-2 border-gold/40 bg-white/[0.02] px-2.5 py-2">
            <div className="text-[8px] tracking-[0.16em] text-white/25">你的附言</div>
            <p className="mt-1 text-[10px] leading-relaxed text-white/50">「{item.userNote}」</p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {Object.keys(SCORE_LABELS).map((key) => {
            const value = item.scores[key];
            if (typeof value !== 'number') return null;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="text-white/35">{SCORE_LABELS[key]}</span>
                  <span className="tabular text-white/45">{value}</span>
                </div>
                <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, value)}%`,
                      background: `linear-gradient(90deg, ${meta.color}66, ${meta.color})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {item.mode === 'keep' && (item.origin || item.story || item.monologue) && (
        <section className="panel mt-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.14em] text-[#e5d6b8]">
              藏品证书
            </h2>
            <span className="text-[8px] text-[#a58f6c]">本店杜撰</span>
          </div>
          {item.origin && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-[#cdbd9f]">{item.origin}</p>
          )}
          {item.story && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-[#b8a789]">{item.story}</p>
          )}
          {item.monologue && (
            <p className="mt-2 border-l border-[#c9a97a]/30 pl-2 text-[10px] italic leading-relaxed text-[#a58f6c]">
              {item.monologue}
            </p>
          )}
          {item.signature && (
            <p className="mt-2 text-right text-[9px] text-[#a58f6c]">{item.signature}</p>
          )}
        </section>
      )}

      {item.mode === 'keep' && item.status === 'kept' && (
        <section className="panel mt-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-semibold tracking-[0.14em] text-white/70">
                探访
              </h2>
              <p className="mt-1 text-[8.5px] text-white/25">
                已探访 {item.visits ?? 0} 次
                {item.lastVisitAt ? ` · 上次 ${formatDate(item.lastVisitAt)}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleVisit()}
              disabled={visiting}
              className="btn-ghost px-3 py-1.5 text-[9.5px]"
            >
              {visiting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              看一看它
            </button>
          </div>
        </section>
      )}

      <section className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void handlePoster()}
          disabled={busy === 'poster' || pending}
          className="btn-ghost px-3 py-2.5 text-[10px]"
        >
          <ImageDown className="h-3.5 w-3.5" />
          保存卡片海报
        </button>
        <Link href="/showroom#sample-3d" className="btn-ghost px-3 py-2.5 text-[10px]">
          <Box className="h-3.5 w-3.5" />
          查看 3D 陈列
        </Link>
        {item.mode === 'hunt' ? (
          <button
            type="button"
            onClick={() => void handleTransfer()}
            disabled={busy === 'transfer' || pending}
            className="btn-ghost px-3 py-2.5 text-[10px]"
          >
            {busy === 'transfer' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Gem className="h-3.5 w-3.5 text-violet" />
            )}
            加入珍藏柜
          </button>
        ) : (
          <Link href="/gallery" className="btn-ghost px-3 py-2.5 text-[10px]">
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            返回珍藏柜
          </Link>
        )}
        <button
          type="button"
          onClick={() => void handleDestroy()}
          disabled={busy === 'destroy'}
          className="btn-ghost px-3 py-2.5 text-[10px] text-[#ff8a99]/70 hover:text-[#ff8a99]"
        >
          {busy === 'destroy' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          碎卡
        </button>
      </section>

      {message && (
        <p className="mt-3 rounded-lg bg-white/[0.04] px-3 py-2 text-center text-[9px] text-white/50">
          {message}
        </p>
      )}
        </div>
      </div>
    </div>
  );
}
