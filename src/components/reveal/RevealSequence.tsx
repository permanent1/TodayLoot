'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { LootCard, RarityBadge, type LootCardData } from '@/components/cards/LootCard';
import { RARITY_META } from '@/features/game/rarity';
import { useMotionEnabled, useSoundEnabled } from '@/lib/store';
import { playSfx } from '@/lib/sfx';
import { cn } from '@/lib/utils/cn';

type Stage = 'scan' | 'burst' | 'reveal';

const SCAN_STEPS = [
  { at: 0, text: '接入零号鉴定局' },
  { at: 24, text: '比对器物可见特征' },
  { at: 52, text: '生成藏品档案' },
  { at: 78, text: '封存鉴定结果' },
];

export function RevealSequence({
  data,
  imageUrl,
  cutoutUrl,
  preview = false,
  onReveal,
  footer,
}: {
  data: LootCardData;
  imageUrl?: string | null;
  cutoutUrl?: string | null;
  preview?: boolean;
  onReveal?: () => void;
  footer?: React.ReactNode;
}) {
  const motionEnabled = useMotionEnabled();
  const soundEnabled = useSoundEnabled();
  const [stage, setStage] = useState<Stage>('scan');
  const [progress, setProgress] = useState(0);
  const meta = RARITY_META[data.rarity];
  const isLegend = data.rarity === 'legendary';
  const particleCount = isLegend ? 40 : data.rarity === 'epic' ? 20 : data.rarity === 'rare' ? 12 : 0;
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, index) => ({
        id: index,
        left: `${6 + ((index * 37) % 88)}%`,
        delay: (index % 7) * 0.06,
        duration: 1.1 + (index % 5) * 0.18,
        size: 2 + (index % 3),
      })),
    [particleCount],
  );

  useEffect(() => {
    if (!motionEnabled) {
      setStage('reveal');
      setProgress(100);
      playSfx(data.rarity, soundEnabled);
      onReveal?.();
      return;
    }
    setStage('scan');
    setProgress(0);
    playSfx('scan', soundEnabled);
    const started = Date.now();
    const duration = isLegend ? 2600 : 2000;
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / duration);
      setProgress(Math.round(ratio * 100));
      if (ratio >= 1) {
        clearInterval(timer);
        setStage('burst');
      }
    }, 50);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id, data.rarity]);

  useEffect(() => {
    if (stage !== 'burst') return;
    playSfx(data.rarity, soundEnabled);
    const timer = setTimeout(
      () => {
        setStage('reveal');
        onReveal?.();
      },
      isLegend ? 1100 : 520,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const skip = () => {
    if (stage === 'reveal') return;
    setStage('reveal');
    setProgress(100);
    playSfx(data.rarity, soundEnabled);
    onReveal?.();
  };

  const scanText =
    [...SCAN_STEPS].reverse().find((step) => progress >= step.at)?.text ?? SCAN_STEPS[0].text;

  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 pb-8 pt-4 lg:justify-center lg:px-8 lg:pt-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-700"
        style={{
          opacity: stage === 'reveal' ? 1 : 0.45,
          background: `radial-gradient(120% 70% at 50% 30%, ${meta.soft}, transparent 62%)`,
        }}
      />

      {/* 大红：只用层层柔光扩散，不画硬线条 */}
      {stage === 'burst' && isLegend && (
        <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
          <div className="animate-glow-bloom absolute left-1/2 top-[45%] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,59,83,0.55),transparent_68%)] blur-2xl lg:h-[520px] lg:w-[520px]" />
          <div className="animate-glow-bloom absolute left-1/2 top-[45%] h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,66,0.26),transparent_70%)] blur-3xl [animation-delay:120ms]" />
          <div className="animate-[breathe_1.8s_ease-in-out_infinite] absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,59,83,0.3),transparent_64%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,59,83,0.26),transparent_72%)]" />
        </div>
      )}

      <div className="flex w-full max-w-[420px] items-center justify-between lg:max-w-[560px]">
        <span className="chip">
          <Sparkles className="h-3 w-3 text-gold" />
          {preview
            ? '效果预览 · 非真实结果'
            : data.analysisSource === 'mock'
              ? '演示识别 · 结果已生成'
              : '真实识别 · 结果已生成'}
        </span>
        {stage !== 'reveal' && (
          <button
            type="button"
            onClick={skip}
            className="flex items-center gap-0.5 text-[10px] tracking-[0.14em] text-white/45"
          >
            跳过 <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="relative mt-6 w-full max-w-[420px] flex-1 lg:max-w-[560px] lg:flex lg:items-center lg:justify-center">
        {stage !== 'reveal' ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center lg:min-h-[560px] lg:w-full">
            <div className="relative grid h-52 w-52 place-items-center lg:h-64 lg:w-64">
              {isLegend ? (
                <>
                  <span className="animate-glow-breathe absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(255,59,83,0.42),transparent_68%)] blur-2xl" />
                  <span className="animate-glow-breathe absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(255,122,66,0.22),transparent_70%)] blur-3xl [animation-delay:0.9s]" />
                </>
              ) : (
                <>
                  <span className="scan-ring" />
                  <span className="scan-ring [animation-delay:0.8s]" />
                  <span className="scan-ring [animation-delay:1.6s]" />
                </>
              )}
              <div
                className={cn(
                  'relative h-36 w-36 overflow-hidden rounded-full',
                  isLegend
                    ? 'shadow-[0_0_60px_-12px_rgba(255,59,83,0.7)]'
                    : 'border',
                )}
                style={{
                  borderColor: isLegend ? undefined : `${meta.color}44`,
                  background: '#0b111d',
                }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-80" />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center text-4xl"
                    style={{ color: meta.color }}
                  >
                    {meta.icon}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080c16]/80" />
                {isLegend ? (
                  <div className="animate-soft-sweep absolute inset-x-0 h-12 bg-[radial-gradient(ellipse_at_center,rgba(255,59,83,0.55),transparent_72%)] blur-md" />
                ) : (
                  <>
                    <div
                      className="absolute inset-x-0 h-[2px] animate-[floaty_1.3s_ease-in-out_infinite] opacity-80"
                      style={{
                        top: `${20 + (progress % 60)}%`,
                        background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                        boxShadow: `0 0 18px ${meta.color}`,
                      }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_10px]" />
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 w-full max-w-[280px] lg:max-w-[320px]">
              <div className="flex items-center justify-between text-[9px] tracking-[0.16em] text-white/40">
                <span>{scanText}</span>
                <span className="tabular">{progress}%</span>
              </div>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-100"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${meta.color}, #fff2cf)`,
                    boxShadow: `0 0 12px ${meta.color}`,
                  }}
                />
              </div>
              <p className="mt-3 text-center text-[9px] tracking-[0.12em] text-white/25">
                展示节奏 · 非服务端进度
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center lg:w-full">
            {isLegend && (
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="animate-glow-breathe absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,59,83,0.34),transparent_66%)] blur-3xl lg:h-[620px] lg:w-[620px]" />
                <div className="animate-glow-drift absolute left-1/2 -top-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,138,107,0.2),transparent_70%)] blur-3xl lg:h-[760px] lg:w-[760px]" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              {data.rarity === 'fine' && (
                <div className="absolute left-6 right-6 top-16 h-[420px] overflow-hidden rounded-3xl">
                  <div className="animate-fine-scan h-16 w-full bg-gradient-to-b from-transparent via-[#54a9ff]/30 to-transparent" />
                </div>
              )}
              {data.rarity === 'rare' && (
                <div className="absolute inset-x-4 top-10 h-[460px] rounded-[40px] bg-[radial-gradient(circle_at_50%_40%,rgba(166,124,255,0.35),transparent_65%)] blur-2xl" />
              )}
              {data.rarity === 'epic' && (
                <>
                  <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_50%_30%,rgba(247,198,106,0.28),transparent_60%)]" />
                  {[-70, 0, 70].map((offset) => (
                    <div
                      key={offset}
                      className="animate-epic-beam absolute top-6 h-[480px] w-16 bg-gradient-to-b from-transparent via-[#f7c66a]/22 to-transparent blur-2xl"
                      style={{ left: `calc(50% + ${offset}px)` }}
                    />
                  ))}
                </>
              )}
              {isLegend && (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(255,59,83,0.16),transparent_62%)]" />
              )}
            </div>

            {particles.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[600px] overflow-hidden lg:h-[720px]">
                {particles.map((particle) => (
                  <motion.span
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                      left: particle.left,
                      top: isLegend ? `${34 + (particle.id % 5) * 9}%` : '42%',
                      width: particle.size,
                      height: particle.size,
                      background: meta.color,
                      boxShadow: `0 0 ${isLegend ? 16 : 10}px ${meta.color}`,
                    }}
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: -140 - particle.id * 4, opacity: [0, 1, 0] }}
                    transition={{
                      duration: particle.duration,
                      delay: particle.delay,
                      repeat: isLegend ? 2 : 1,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}

            <motion.div
              initial={motionEnabled ? { opacity: 0, y: 24, scale: 0.92 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-[354px] lg:max-w-[392px]"
            >
              <div className="mb-3 flex flex-col items-center gap-1.5">
                <RarityBadge rarity={data.rarity} />
                <div
                  className={cn(
                    'text-center text-[11px] tracking-[0.24em]',
                    isLegend ? 'text-[#ff8a99]' : 'text-white/45',
                  )}
                >
                  {meta.tagline}
                </div>
              </div>

              <div className="relative">
                {isLegend && (
                  <span className="animate-glow-breathe pointer-events-none absolute -inset-7 rounded-[36px] bg-[radial-gradient(circle,rgba(255,59,83,0.5),transparent_72%)] blur-2xl" />
                )}
                <div className="relative">
                  <LootCard data={data} imageUrl={imageUrl} cutoutUrl={cutoutUrl} />
                </div>
              </div>
            </motion.div>

            <div className="relative z-10 mt-2 w-full max-w-[354px] lg:max-w-[392px]">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
