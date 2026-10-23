'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Gem,
  Home,
  LayoutGrid,
  Loader2,
  ScanLine,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { CollectionItem } from '@/types';
import { RevealSequence } from '@/components/reveal/RevealSequence';
import { LootCard } from '@/components/cards/LootCard';
import { getItem, lockItem, transferToKeep } from '@/lib/db/repository';
import { useAssetUrl } from '@/lib/hooks/useAssetUrl';
import { useAppStore, useSoundEnabled } from '@/lib/store';
import { playSfx } from '@/lib/sfx';
import { RARITY_META } from '@/features/game/rarity';

export default function RevealPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  // 硬刷新时 useParams 可能短暂为空，用 pathname 兜底，避免页面永久停在读取态
  const id = params?.id || pathname?.split('/').filter(Boolean)[1];
  const router = useRouter();
  const refreshPlayer = useAppStore((s) => s.refreshPlayer);
  const setSound = useAppStore((s) => s.setSound);
  const soundEnabled = useSoundEnabled();

  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  const imageUrl = useAssetUrl(item?.originalImageId);
  const cutoutUrl = useAssetUrl(item?.cutoutImageId);

  useEffect(() => {
    setFresh(new URLSearchParams(window.location.search).get('fresh') === '1');
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    getItem(id)
      .then((found) => {
        if (!alive) return;
        setItem(found ?? null);
      })
      .catch(() => {
        if (alive) setError('本地藏品数据读取失败');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const handleReveal = useCallback(() => setRevealed(true), []);

  const handleLock = async () => {
    if (!item || locking) return;
    setLocking(true);
    setError(null);
    try {
      const updated = await lockItem(item.id);
      if (updated) setItem(updated);
      await refreshPlayer();
      playSfx('reveal', soundEnabled);
    } catch {
      setError('保存到战利品失败，请重试');
    } finally {
      setLocking(false);
    }
  };

  const handleKeep = async () => {
    if (!item || locking) return;
    setLocking(true);
    setError(null);
    try {
      const updated = await transferToKeep(item.id);
      if (updated) setItem(updated);
      await refreshPlayer();
      playSfx('reveal', soundEnabled);
    } catch {
      setError('移入珍藏柜失败，请重试');
    } finally {
      setLocking(false);
    }
  };

  const close = () => router.push('/');
  const pending = item?.status === 'pending_lock';
  const inVault = item?.mode === 'keep';

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
          <span className="text-[10px] tracking-[0.2em]">正在读取鉴定档案</span>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <span className="text-4xl opacity-40">◇</span>
        <h1 className="mt-4 text-[16px] text-white/80">找不到这份鉴定档案</h1>
        <p className="mt-2 text-[10px] leading-relaxed text-white/35">
          可能是本机数据被清理，或链接来自其他设备。藏品与鉴定结果只保存在当前浏览器。
        </p>
        <Link href="/appraise" className="btn-primary mt-6 px-5 py-2.5 text-[12px]">
          去鉴定台
        </Link>
      </div>
    );
  }

  const meta = RARITY_META[item.rarity];

  const topBar = (
    <div className="flex w-full items-center justify-between px-4 pt-4">
      <button
        type="button"
        onClick={close}
        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 backdrop-blur lg:h-10 lg:w-10"
        aria-label="关闭并返回首页"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="text-center">
        <div className="text-[8px] tracking-[0.3em] text-white/30">ZERO APPRAISAL BUREAU</div>
        <div className="mt-0.5 text-[10px] tracking-[0.2em] text-white/50">
          {pending || fresh ? '出货时刻' : '档案已封存'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void setSound(!soundEnabled)}
        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 backdrop-blur lg:h-10 lg:w-10"
        aria-label={soundEnabled ? '关闭音效' : '开启音效'}
      >
        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  );

  if (!pending && !fresh) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center overflow-hidden pb-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(110% 60% at 50% 20%, ${meta.soft}, transparent 60%)`,
          }}
        />
        {topBar}
        <div className="mt-6 w-full max-w-[354px] px-4 lg:mt-10 lg:max-w-[392px]">
          <div className="mb-3 text-center">
            <span className="chip">
              <Check className="h-3 w-3 text-emerald-300" />
              {inVault ? '已在珍藏柜' : '已保存在战利品'}
            </span>
          </div>
          <LootCard data={item} imageUrl={imageUrl} cutoutUrl={cutoutUrl} />
        </div>
        <div className="mt-2 w-full max-w-[354px] px-4 lg:max-w-[392px]">{renderActions()}</div>
      </div>
    );
  }

  function renderActions() {
    return (
      <div className="mt-3 space-y-2">
        {pending ? (
          <button
            type="button"
            onClick={() => void handleLock()}
            disabled={locking}
            className="btn-primary w-full py-3.5 text-[13.5px]"
          >
            {locking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在封存…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                收进战利品
              </>
            )}
          </button>
        ) : inVault ? (
          <>
            <Link href={`/item/${item!.id}`} className="btn-primary w-full py-3 text-[12.5px]">
              查看藏品档案
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-center text-[9px] text-white/25">已在珍藏柜</p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleKeep()}
              disabled={locking}
              className="btn-primary w-full py-3.5 text-[13.5px]"
            >
              {locking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在移入…
                </>
              ) : (
                <>
                  <Gem className="h-4 w-4" />
                  加入珍藏柜
                </>
              )}
            </button>
            <p className="text-center text-[9px] text-white/25">已保存在战利品</p>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          {!inVault && (
            <Link
              href={`/item/${item!.id}`}
              className="btn-ghost py-2.5 text-[11px]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              查看档案
            </Link>
          )}
          <Link href="/gallery" className="btn-ghost py-2.5 text-[11px]">
            <LayoutGrid className="h-3.5 w-3.5" />
            我的展厅
          </Link>
          <Link href="/appraise" className="btn-ghost py-2.5 text-[11px]">
            <ScanLine className="h-3.5 w-3.5" />
            再鉴定一件
          </Link>
          <button
            type="button"
            onClick={close}
            className="btn-ghost py-2.5 text-[11px]"
          >
            <Home className="h-3.5 w-3.5" />
            返回首页
          </button>
        </div>
        {error && (
          <p className="rounded-lg bg-[#ff3b53]/10 px-2 py-1.5 text-center text-[9.5px] text-[#ffb3bd]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      {topBar}
      <RevealSequence
        data={item}
        imageUrl={imageUrl}
        cutoutUrl={cutoutUrl}
        onReveal={handleReveal}
        footer={revealed ? <div className="pb-6">{renderActions()}</div> : null}
      />
    </div>
  );
}
