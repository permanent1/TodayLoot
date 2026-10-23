'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  ScanLine,
  Scissors,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { ENGINE_VERSION, PROMPT_VERSION } from '@/features/game/engine';
import { buildRequestKey } from '@/lib/image/process';
import { createCutout, type CutoutResult } from '@/lib/image/cutout';
import { requestIdentify, IdentifyClientError } from '@/lib/ai/client';
import { commitAppraisal, getItemsByRequestKey, lockItem } from '@/lib/db/repository';
import {
  clearAppraiseSession,
  getAppraiseSession,
} from '@/lib/appraise-session';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils/cn';

type Phase = 'cutout' | 'identify' | 'settle' | 'done';

const CUTOUT_CHATTER = [
  '正在把主体从背景里切出来',
  '描一遍它的轮廓',
  '擦掉桌面与墙面的杂色',
  '把主体单独放上展台',
];

const IDENTIFY_CHATTER = [
  '读取画面里的可见特征',
  '比对材质与工艺痕迹',
  '翻阅零号档案库',
  '给这件东西定价',
];

const SETTLE_CHATTER = ['抽取今日稀有度', '计算收藏币区间', '写入本地档案'];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AppraiseRunPage() {
  const router = useRouter();
  const refreshPlayer = useAppStore((s) => s.refreshPlayer);

  const [phase, setPhase] = useState<Phase>('cutout');
  const [cutoutProgress, setCutoutProgress] = useState(0);
  const [cutoutFailed, setCutoutFailed] = useState(false);
  const [chatterIndex, setChatterIndex] = useState(0);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [retrying, setRetrying] = useState(false);

  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const removeBgRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => setChatterIndex((n) => n + 1), 1400);
    return () => clearInterval(timer);
  }, [error]);

  async function run(forceMock = false) {
    const session = getAppraiseSession();
    if (!session) {
      router.replace('/appraise');
      return;
    }
    removeBgRef.current = session.removeBg;
    setError(null);
    setCutoutFailed(false);
    setCutoutProgress(0);
    setPhase(session.removeBg ? 'cutout' : 'identify');

    try {
      const requestKey = await buildRequestKey({
        imageHash: session.processed.hash,
        mode: 'hunt',
        persona: session.persona,
        note: session.note,
        promptVersion: PROMPT_VERSION,
        engineVersion: ENGINE_VERSION,
      });

      const existing = await getItemsByRequestKey(requestKey);
      if (existing) {
        clearAppraiseSession();
        router.replace(`/reveal/${existing.id}`);
        return;
      }

      let cutout: CutoutResult | null = null;
      if (session.removeBg) {
        setPhase('cutout');
        cutout = await createCutout(session.processed.blob, session.processed.hash, {
          onProgress: ({ current, total }) => {
            if (!aliveRef.current) return;
            setCutoutProgress(total > 0 ? Math.min(99, Math.round((current / total) * 100)) : 0);
          },
        }).catch(() => null);
        if (!aliveRef.current) return;
        if (!cutout) {
          // 抠图失败不阻断鉴定，但如实告知：卡面会退回原图相框
          setCutoutFailed(true);
        }
        await wait(320);
      }

      setPhase('identify');
      const response = await requestIdentify({
        image: session.processed.dataUrl,
        mimeType: session.processed.mime,
        mode: 'hunt',
        persona: session.persona,
        userNote: session.note,
        bountyTitles: session.bountyTitles,
        bountyIds: session.bountyIds,
        forceMock,
        demoSample: session.sampleId ?? undefined,
      });
      if (!aliveRef.current) return;
      await wait(420);

      setPhase('settle');
      const { item } = await commitAppraisal({
        requestKey,
        vision: response.vision,
        mode: 'hunt',
        persona: session.persona,
        userNote: session.note,
        predictedTier: session.predictedTier,
        predictedCoins: session.predictedCoins,
        analysisSource: response.meta.source,
        imageBlob: session.processed.blob,
        imageMime: session.processed.mime,
        imageWidth: session.processed.width,
        imageHeight: session.processed.height,
        cutoutBlob: cutout?.blob,
        cutoutWidth: cutout?.width,
        cutoutHeight: cutout?.height,
        bountyIds: session.bountyIds,
      });

      // 鉴定结果立即保存进战利品，是否进珍藏柜由用户在揭晓页决定
      await lockItem(item.id);
      await refreshPlayer();
      if (!aliveRef.current) return;

      setPhase('done');
      await wait(460);
      clearAppraiseSession();
      router.replace(`/reveal/${item.id}?fresh=1`);
    } catch (err) {
      if (!aliveRef.current) return;
      if (err instanceof IdentifyClientError) {
        setError({ message: err.message, hint: err.hint });
      } else {
        setError({
          message: err instanceof Error ? err.message : '鉴定失败，请稍后重试',
        });
      }
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = getAppraiseSession();
  const steps = [
    ...(removeBgRef.current
      ? [{ id: 'cutout' as const, title: '本地抠图', note: '在你的浏览器里切出主体' }]
      : []),
    { id: 'identify' as const, title: '视觉鉴定', note: '比对可见特征与工艺线索' },
    { id: 'settle' as const, title: '封存档案', note: '稀有度、币值与编号落库' },
  ];
  const activeIndex = steps.findIndex((step) => step.id === phase);
  const chatter =
    phase === 'cutout'
      ? CUTOUT_CHATTER[chatterIndex % CUTOUT_CHATTER.length]
      : phase === 'identify'
        ? IDENTIFY_CHATTER[chatterIndex % IDENTIFY_CHATTER.length]
        : phase === 'settle'
          ? SETTLE_CHATTER[chatterIndex % SETTLE_CHATTER.length]
          : '档案已封存';

  if (!session) {
    return (
      <div className="grid min-h-dvh place-items-center px-8 text-center">
        <div>
          <p className="text-[12px] text-white/50">这次鉴定的图片已经失效</p>
          <p className="mt-2 text-[9.5px] leading-relaxed text-white/25">
            图片只保存在当前页面的内存里，刷新或重新打开会丢失。
          </p>
          <Link href="/appraise" className="btn-primary mt-5 px-5 py-2.5 text-[12px]">
            回到鉴定台
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-[380px] rounded-2xl border border-[#ff3b53]/30 bg-[#ff3b53]/[0.07] p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a99]" />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#ffc2ca]">{error.message}</p>
              {error.hint && (
                <p className="mt-1 text-[9.5px] leading-relaxed text-[#ffc2ca]/60">
                  {error.hint}
                </p>
              )}
              <p className="mt-2 text-[9px] leading-relaxed text-white/30">
                为避免重复计费，这里不会自动重试；需要你手动再点一次。
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setRetrying(true);
                void run(false).finally(() => setRetrying(false));
              }}
              disabled={retrying}
              className="btn-primary w-full py-2.5 text-[12px]"
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              手动重试
            </button>
            <button
              type="button"
              onClick={() => {
                setRetrying(true);
                void run(true).finally(() => setRetrying(false));
              }}
              disabled={retrying}
              className="btn-ghost w-full py-2.5 text-[11px]"
            >
              <Wand2 className="h-3.5 w-3.5" />
              改用演示识别（不调用真实模型）
            </button>
            <Link
              href="/appraise"
              className="block py-1 text-center text-[9.5px] text-white/30 underline-offset-4 hover:underline"
            >
              返回鉴定台换一张
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-10 pt-6 lg:justify-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_70%_at_50%_18%,rgba(247,198,106,0.16),transparent_60%)]" />

      <div className="flex w-full max-w-[420px] items-center justify-between lg:max-w-[560px]">
        <Link href="/appraise" className="flex items-center gap-1 text-[10px] text-white/35">
          <ArrowLeft className="h-3.5 w-3.5" />
          放弃
        </Link>
        <span className="chip">
          <ScanLine className="h-3 w-3 text-gold" />
          零号鉴定中
        </span>
      </div>

      <div className="mt-8 flex w-full max-w-[380px] flex-col items-center lg:max-w-[560px]">
        <div className="relative grid h-[220px] w-[220px] place-items-center lg:h-[280px] lg:w-[280px]">
          <span className="scan-ring" />
          <span className="scan-ring [animation-delay:0.9s]" />
          <div className="absolute inset-6 rounded-full border border-gold/20" />
          <div className="relative h-[148px] w-[148px] overflow-hidden rounded-full border border-white/10 bg-[#0b111d] lg:h-[196px] lg:w-[196px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.processed.dataUrl}
              alt=""
              className="h-full w-full object-cover opacity-70 blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080c16]/85" />
            <div className="animate-[floaty_1.4s_ease-in-out_infinite] absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_18px_#f7c66a]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_10px]" />
          </div>
        </div>

        <p className="mt-6 text-[12.5px] tracking-[0.16em] text-[#f2e8d4] lg:mt-8 lg:text-[14px]">
          {phase === 'cutout'
            ? cutoutFailed
              ? '抠图没成功，改用原图相框'
              : '正在抠图…'
            : phase === 'identify'
              ? '正在鉴定…'
              : phase === 'settle'
                ? '正在封存档案…'
                : '鉴定完成'}
        </p>
        <p className="mt-2 h-4 text-[9.5px] tracking-[0.12em] text-white/30">{chatter}</p>

        {phase === 'cutout' && (
          <div className="mt-4 w-full max-w-[260px]">
            <div className="flex items-center justify-between text-[9px] text-white/35">
              <span className="flex items-center gap-1">
                <Scissors className="h-3 w-3" />
                本地抠图
              </span>
              <span className="tabular">{cutoutProgress}%</span>
            </div>
            <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/70 to-[#fff2cf] transition-[width] duration-200"
                style={{ width: `${Math.max(4, cutoutProgress)}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[8.5px] leading-relaxed text-white/22">
              首次使用需下载约 40MB 本地模型，之后会命中缓存
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-[380px] space-y-2 lg:max-w-[460px]">
        {steps.map((step, index) => {
          const state =
            activeIndex < 0
              ? 'done'
              : index < activeIndex
                ? 'done'
                : index === activeIndex
                  ? 'active'
                  : 'pending';
          const note =
            step.id === 'cutout' && cutoutFailed
              ? '未成功，已退回原图相框'
              : step.note;
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                state === 'done'
                  ? 'border-emerald-400/25 bg-emerald-400/[0.05]'
                  : state === 'active'
                    ? 'border-gold/45 bg-gold/[0.07]'
                    : 'border-white/[0.06] bg-white/[0.015]',
              )}
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full border',
                  state === 'done'
                    ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                    : state === 'active'
                      ? 'border-gold/60 bg-gold/15 text-gold'
                      : 'border-white/10 text-white/25',
                )}
              >
                {state === 'done' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : state === 'active' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="text-[8px]">{index + 1}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'text-[11px]',
                    state === 'pending' ? 'text-white/35' : 'text-[#eee6d6]',
                  )}
                >
                  {step.title}
                </div>
                <div className="mt-0.5 truncate text-[8.5px] text-white/28">{note}</div>
              </div>
              {state === 'active' && (
                <Sparkles className="h-3 w-3 shrink-0 animate-pulse text-gold/70" />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
