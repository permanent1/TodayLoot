'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Camera,
  Coins,
  ImagePlus,
  Loader2,
  ScanLine,
  Scissors,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { BountyDay, DemoSampleId, Persona, Rarity } from '@/types';
import { RARITY_META, RARITY_ORDER, PERSONA_META } from '@/features/game/rarity';
import {
  formatCoins,
  logSliderToValue,
  valueToLogSlider,
} from '@/features/game/scoring';
import {
  DEMO_SAMPLES,
  processImageFile,
  processSampleImage,
  type ProcessedImage,
} from '@/lib/image/process';
import { preloadCutoutCode } from '@/lib/image/cutout';
import { getBountyDay } from '@/lib/db/repository';
import { setAppraiseSession } from '@/lib/appraise-session';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils/cn';

const PERSONAS: Persona[] = ['zhou', 'k', 'ali'];

const PERSONA_IMAGE: Record<Persona, string> = {
  zhou: '/pngs/老周-抠图.png',
  k: '/pngs/小K-抠图.png',
  ali: '/pngs/阿黎-抠图.png',
};

function StepTitle({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <div className="flex items-center gap-2">
        <span className="tabular text-[9px] tracking-[0.2em] text-gold/70">{index}</span>
        <h2 className="text-[12.5px] font-semibold tracking-[0.14em] text-[#e8ecf5] lg:text-[13.5px]">
          {title}
        </h2>
      </div>
      {hint && <span className="text-[9px] text-white/30">{hint}</span>}
    </div>
  );
}

export default function AppraisePage() {
  const router = useRouter();

  const settings = useAppStore((s) => s.settings);

  const [image, setImage] = useState<ProcessedImage | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<DemoSampleId | null>(null);
  const [note, setNote] = useState('');
  const [persona, setPersona] = useState<Persona>('ali');
  const [predictedTier, setPredictedTier] = useState<Rarity | undefined>();
  const [predictedCoins, setPredictedCoins] = useState(14000);
  const [guessCoins, setGuessCoins] = useState(true);
  const [bounty, setBounty] = useState<BountyDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const removeBg = settings?.removeBg !== false;

  useEffect(() => {
    getBountyDay()
      .then(setBounty)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (removeBg) preloadCutoutCode();
  }, [removeBg]);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setImageBusy(true);
    setError(null);
    setImageNotice(null);
    try {
      const processed = await processImageFile(file);
      setImage(processed);
      setSampleId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败');
    } finally {
      setImageBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const loadSample = async (url: string, label: string, id: DemoSampleId) => {
    setImageBusy(true);
    setError(null);
    try {
      const processed = await processSampleImage(url);
      setImage(processed);
      setSampleId(id);
      setImageNotice(`已载入样例「${label}」。样例仅用于体验流程，识别结果仍标注为演示数据。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '样例加载失败');
    } finally {
      setImageBusy(false);
    }
  };

  const start = () => {
    if (!image) return;
    setAppraiseSession({
      processed: image,
      sampleId,
      note,
      persona,
      predictedTier,
      predictedCoins: guessCoins ? predictedCoins : undefined,
      bountyIds: bounty?.tasks.map((task) => task.id) ?? [],
      bountyTitles: bounty?.tasks.map((task) => task.title) ?? [],
      removeBg,
    });
    router.push('/appraise/run');
  };

  const coinSlider = valueToLogSlider(predictedCoins);

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 pt-4 lg:px-10 lg:pb-12 lg:pt-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label">APPRAISAL DESK</p>
          <h1 className="mt-1 text-[25px] font-semibold tracking-[0.06em] text-[#f4f0e6] lg:text-[32px]">
            鉴定台
          </h1>
        </div>
        <span className="hidden text-[10px] tracking-[0.16em] text-white/30 lg:block">
          一次一件 · 结果直接入藏
        </span>
      </div>

      <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:gap-5">
        <div className="lg:sticky lg:top-24">
          <section className="panel p-4 lg:p-5">
            <StepTitle
              index="01"
              title="放入物件"
              hint={
                image
                  ? `${image.width}×${image.height} · ${Math.round(image.blob.size / 1024)}KB`
                  : '拍摄或从相册选择'
              }
            />

            {!image ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void handleFiles(e.dataTransfer.files);
                }}
                className={cn(
                  'relative flex min-h-[204px] flex-col items-center justify-center rounded-2xl border border-dashed p-5 transition lg:min-h-[286px]',
                  dragging
                    ? 'border-gold/70 bg-gold/[0.06]'
                    : 'border-white/12 bg-[#0a0f1a]/60',
                )}
              >
                <div className="relative grid h-14 w-14 place-items-center rounded-full border border-gold/25 bg-gold/[0.07] lg:h-16 lg:w-16">
                  {imageBusy ? (
                    <Loader2 className="h-6 w-6 animate-spin text-gold" />
                  ) : (
                    <Camera className="h-6 w-6 text-gold" />
                  )}
                  <span className="scan-ring" />
                </div>
                <p className="mt-3 text-[12px] text-[#e7e2d6]">
                  {imageBusy ? '正在压缩图片…' : '拍一件你身边的东西'}
                </p>
                <p className="mt-1 text-[9.5px] text-white/30">照片只在这台设备上处理</p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="btn-primary px-4 py-2 text-[11px]"
                    disabled={imageBusy}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    拍照
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="btn-ghost px-4 py-2 text-[11px]"
                    disabled={imageBusy}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    从相册选择
                  </button>
                </div>
                <p className="mt-3 text-[9px] text-white/25">桌面端可直接拖入图片</p>
              </div>
            ) : (
              <div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.dataUrl}
                    alt="待鉴定物件预览"
                    className="aspect-[4/3] w-full object-cover lg:aspect-[16/10]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080c16]/85 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
                    <span className="chip bg-black/40">
                      <Sparkles className="h-3 w-3 text-gold" />
                      已就绪
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => galleryRef.current?.click()}
                        className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1.5 text-[9.5px] text-white/70 backdrop-blur"
                      >
                        换一张
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImageNotice(null);
                          setSampleId(null);
                        }}
                        className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white/60 backdrop-blur"
                        aria-label="移除图片"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {imageNotice && (
                  <p className="mt-2 rounded-lg bg-violet/10 px-2.5 py-2 text-[9px] leading-relaxed text-violet/90">
                    {imageNotice}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                  <Scissors className="h-3 w-3 shrink-0 text-white/30" />
                  <p className="text-[9px] leading-relaxed text-white/30">
                    {removeBg
                      ? '本地抠图已开启：点击「开始鉴定」后，第一步会在你的浏览器里把主体切出来。'
                      : '本地抠图已关闭，将以原图相框出卡。'}
                  </p>
                  <Link href="/settings" className="ml-auto shrink-0 text-[9px] text-gold/60">
                    {removeBg ? '设置' : '去开启'}
                  </Link>
                </div>
              </div>
            )}

            {!image && (
              <div className="mt-3">
                <p className="mb-1.5 text-[9px] tracking-[0.16em] text-white/25">
                  没有合适照片？载入真实样例体验
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => void loadSample(sample.url, sample.label, sample.id)}
                      disabled={imageBusy}
                      className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] text-left transition hover:border-gold/40 hover:bg-gold/[0.04] disabled:opacity-50"
                    >
                      <span className="relative block aspect-[4/3] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sample.url}
                          alt={sample.label}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                      </span>
                      <span className="block px-2 py-1.5">
                        <span className="block truncate text-[10px] text-white/75">
                          {sample.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[8px] text-white/30">
                          {sample.hint}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={cameraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </section>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#ff3b53]/30 bg-[#ff3b53]/[0.07] p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff8a99]" />
              <p className="text-[11px] leading-relaxed text-[#ffc2ca]">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={start}
            disabled={!image || imageBusy}
            className="btn-primary mt-3 w-full py-3.5 text-[14px] lg:py-4 lg:text-[15px]"
          >
            <ScanLine className="h-4 w-4" />
            开始鉴定
          </button>
        </div>

        <div>
          <section className="panel mt-3 p-4 lg:mt-0 lg:p-5">
            <StepTitle index="02" title="留下一句附言" hint={`${note.length}/60`} />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 60))}
              maxLength={60}
              rows={3}
              placeholder="例如：它陪我加了很多班 / 这是我从旧货市场捡的"
              className="w-full resize-none rounded-xl border border-white/10 bg-[#080d17]/70 px-3 py-2.5 text-[12px] leading-relaxed text-[#e8ecf5] outline-none transition placeholder:text-white/20 focus:border-gold/40"
            />
            <p className="mt-2 text-[9px] leading-relaxed text-white/25">
              附言会作为待评估的用户陈述交给 AI，不会当作指令执行。
            </p>
          </section>

          <section className="panel mt-3 p-4 lg:p-5">
            <StepTitle index="03" title="选择鉴定师" hint="性格与文风不同" />
            <div className="grid grid-cols-3 gap-2">
              {PERSONAS.map((id) => {
                const meta = PERSONA_META[id];
                const selected = persona === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPersona(id)}
                    aria-pressed={selected}
                    className={cn(
                      'group relative h-[152px] overflow-hidden rounded-2xl border text-left transition active:scale-[0.99] lg:h-[188px]',
                      selected
                        ? 'border-gold/70'
                        : 'border-white/[0.08] hover:border-white/20',
                    )}
                    style={
                      selected ? { boxShadow: `0 0 30px -14px ${meta.accent}` } : undefined
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PERSONA_IMAGE[id]}
                      alt={meta.name}
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]',
                        selected ? 'opacity-90' : 'opacity-55',
                      )}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#05080f] via-[#05080f]/45 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 block p-2.5">
                      <span
                        className="block text-[12.5px] font-semibold"
                        style={{ color: selected ? meta.accent : '#f0e8d8' }}
                      >
                        {meta.name}
                      </span>
                      <span className="mt-0.5 block text-[8.5px] text-white/45">{meta.title}</span>
                      <span className="mt-1 block text-[8px] leading-snug text-white/30">
                        {meta.tagline}
                      </span>
                    </span>
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-gold text-[8px] font-bold text-[#22160a]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel mt-3 p-4 lg:p-5">
            <StepTitle index="04" title="猜一猜，今天出什么" hint="猜中加分" />
            <div className="flex flex-wrap gap-1.5">
              {RARITY_ORDER.map((rarity) => {
                const meta = RARITY_META[rarity];
                const selected = predictedTier === rarity;
                return (
                  <button
                    key={rarity}
                    type="button"
                    onClick={() => setPredictedTier(selected ? undefined : rarity)}
                    className={cn(
                      'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] transition',
                      selected
                        ? 'rarity-ink'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/25 hover:text-white/70',
                    )}
                    style={
                      selected
                        ? {
                            borderColor: `${meta.color}aa`,
                            background: meta.soft,
                            color: meta.color,
                            boxShadow: `0 0 18px -8px ${meta.color}`,
                          }
                        : undefined
                    }
                    aria-pressed={selected}
                  >
                    <span aria-hidden>{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
              {predictedTier && (
                <button
                  type="button"
                  onClick={() => setPredictedTier(undefined)}
                  className="rounded-lg px-2 py-1.5 text-[9px] text-white/30 underline-offset-2 hover:underline"
                >
                  不猜
                </button>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#080d17]/60 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] text-white/50">
                  <Coins className="h-3 w-3 text-gold" />
                  猜收藏币区间
                </span>
                <button
                  type="button"
                  onClick={() => setGuessCoins((v) => !v)}
                  className={cn(
                    'relative h-5 w-9 rounded-full border transition',
                    guessCoins ? 'border-gold/50 bg-gold/25' : 'border-white/15 bg-white/5',
                  )}
                  aria-pressed={guessCoins}
                  aria-label="是否参与币值竞猜"
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[#f7e6c6] transition-all',
                      guessCoins ? 'left-[18px]' : 'left-0.5 bg-white/40',
                    )}
                  />
                </button>
              </div>

              <div className={cn('mt-3 transition', !guessCoins && 'pointer-events-none opacity-35')}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] text-white/25">1,000</span>
                  <span className="tabular text-[16px] font-semibold text-gold">
                    ◎ {formatCoins(predictedCoins)}
                  </span>
                  <span className="text-[9px] text-white/25">3,000,000</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={1}
                  value={Math.round(coinSlider * 1000)}
                  onChange={(e) =>
                    setPredictedCoins(logSliderToValue(Number(e.target.value) / 1000))
                  }
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#3a2f1c] via-[#8a6a34] to-[#f7c66a] accent-[#f7c66a]"
                  aria-label="预测收藏币值"
                />
              </div>
            </div>
          </section>

          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
