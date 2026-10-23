'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Download,
  HardDrive,
  KeyRound,
  Loader2,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useHealth } from '@/lib/hooks/useHealth';
import { formatCoins } from '@/features/game/scoring';
import {
  clearAllData,
  exportBackup,
  importBackup,
} from '@/lib/db/repository';
import { downloadBlob } from '@/lib/image/process';
import { localDayKey } from '@/lib/utils/text';
import { cn } from '@/lib/utils/cn';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[11.5px] text-white/75">{label}</p>
        <p className="mt-1 text-[9px] leading-relaxed text-white/30">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition',
          checked
            ? 'border-gold/60 bg-[linear-gradient(100deg,#f7c66a,#e0a94c)] shadow-[0_0_16px_-6px_rgba(247,198,106,0.9)]'
            : 'border-white/15 bg-white/5',
        )}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={cn(
            'absolute top-[3px] h-4 w-4 rounded-full transition-all',
            checked ? 'left-[20px] bg-[#241705]' : 'left-[3px] bg-white/45',
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const player = useAppStore((s) => s.player);
  const settings = useAppStore((s) => s.settings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setSound = useAppStore((s) => s.setSound);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const setKeepOriginal = useAppStore((s) => s.setKeepOriginal);
  const setRemoveBg = useAppStore((s) => s.setRemoveBg);
  const refreshPlayer = useAppStore((s) => s.refreshPlayer);
  const health = useHealth();

  const [busy, setBusy] = useState<'export' | 'import' | 'clear' | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setBusy('export');
    setMessage(null);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      downloadBlob(blob, `today-loot-backup-${localDayKey()}.json`);
      setMessage({ text: '备份已导出。文件包含藏品图片，体积可能较大，请妥善保存。', tone: 'ok' });
    } catch {
      setMessage({ text: '备份导出失败，请稍后重试。', tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setBusy('import');
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const result = await importBackup(parsed);
      await refreshPlayer();
      setMessage({ text: `导入完成，共恢复 ${result.items} 件藏品。页面即将刷新。`, tone: 'ok' });
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : '备份导入失败，请检查文件。',
        tone: 'error',
      });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (
      !window.confirm(
        '确定清空本机的所有藏品、图片、鉴定记录与收藏币吗？此操作不可撤销，建议先导出备份。',
      )
    ) {
      return;
    }
    setBusy('clear');
    try {
      await clearAllData();
      await refreshPlayer();
      setMessage({ text: '本机数据已清空。', tone: 'ok' });
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setMessage({ text: '清空失败，请刷新后重试。', tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const live = health ? health.aiMode === 'live' && health.liveReady : null;
  const modeLabel =
    live === null
      ? '检测中'
      : live
        ? '真实识别已就绪'
        : health?.aiMode === 'live'
          ? 'LIVE 配置不完整'
          : '演示识别模式';

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 pt-4 lg:px-10 lg:pb-12 lg:pt-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label">SETTINGS & BACKUP</p>
          <h1 className="mt-1 text-[25px] font-semibold tracking-[0.06em] text-[#f4f0e6] lg:text-[32px]">
            设置与备份
          </h1>
        </div>
        <span className="chip">
          <Sparkles className="h-3 w-3 text-gold" />
          v1.0
        </span>
      </div>

      <div className="lg:mt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      <section className="panel mt-4 p-4 lg:mt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/25 bg-gold/[0.08]">
              <KeyRound className="h-4 w-4 text-gold" />
            </span>
            <div>
              <p className="text-[11.5px] text-white/80">识别服务</p>
              <p className="mt-0.5 text-[8.5px] text-white/30">密钥仅存在于服务端环境变量</p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[8px] tracking-[0.12em]',
              live
                ? 'bg-emerald-400/15 text-emerald-300'
                : 'bg-violet/15 text-violet',
            )}
          >
            {modeLabel}
          </span>
        </div>

      </section>

      <section className="panel mt-3 p-4 lg:mt-0">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-mist" />
          <h2 className="text-[11.5px] font-semibold tracking-[0.1em] text-white/75">外观主题</h2>
          <span className="ml-auto text-[8px] text-white/25">仅保存在本机</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(
            [
              { id: 'dark', label: '深色 · 鉴定所', icon: Moon },
              { id: 'light', label: '浅色 · 展厅', icon: Sun },
            ] as const
          ).map((option) => {
            const active = theme === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                aria-pressed={active}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-2 text-left transition',
                  active
                    ? 'border-gold/60 bg-gold/[0.06]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                )}
              >
                <span
                  className="flex h-14 items-end justify-center gap-1.5 rounded-lg border border-white/[0.06] p-1.5"
                  style={{
                    background:
                      option.id === 'dark'
                        ? 'linear-gradient(150deg,#131b2c,#070b15)'
                        : 'linear-gradient(150deg,#fffdf8,#efe7d9)',
                  }}
                >
                  <span
                    className="h-8 w-5 rounded-[3px]"
                    style={{
                      background:
                        option.id === 'dark'
                          ? 'linear-gradient(160deg,#2b2418,#0d0f16)'
                          : 'linear-gradient(160deg,#f7c66a,#e0d1b4)',
                    }}
                  />
                  <span
                    className="h-5 w-12 rounded-[3px]"
                    style={{
                      background: option.id === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(36,31,24,0.16)',
                    }}
                  />
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-[10.5px] text-white/70">
                  <Icon className="h-3 w-3" />
                  {option.label}
                </span>
                {active && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_#f7c66a]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel mt-3 px-4 py-1 lg:mt-0">
        <Toggle
          checked={settings?.sound ?? true}
          onChange={(value) => void setSound(value)}
          label="音效"
          description="开箱、扫描与落卡的合成音效"
        />
        <div className="h-px bg-white/[0.05]" />
        <Toggle
          checked={settings?.reducedMotion ?? false}
          onChange={(value) => void setReducedMotion(value)}
          label="减少动画"
          description="关闭震屏与粒子，只保留结果"
        />
        <div className="h-px bg-white/[0.05]" />
        <Toggle
          checked={settings?.keepOriginal ?? true}
          onChange={(value) => void setKeepOriginal(value)}
          label="在本机保留藏品图片"
          description="关闭后新藏品只存卡面纹理"
        />
        <div className="h-px bg-white/[0.05]" />
        <Toggle
          checked={settings?.removeBg ?? true}
          onChange={(value) => void setRemoveBg(value)}
          label="本地抠图"
          description="浏览器内去背景，首次需下载模型"
        />
      </section>

      <section className="panel mt-3 p-4 lg:mt-0">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-mist" />
          <h2 className="text-[11.5px] font-semibold tracking-[0.1em] text-white/75">
            本机档案
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
            <div className="tabular text-[14px] text-[#f0e6d2]">{player?.totalIdentify ?? 0}</div>
            <div className="mt-0.5 text-[8px] text-white/25">鉴定次数</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
            <div className="tabular text-[14px] text-gold">
              ◎{player ? formatCoins(player.coins) : 0}
            </div>
            <div className="mt-0.5 text-[8px] text-white/25">收藏币余额</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
            <div className="tabular text-[14px] text-violet">{player?.modelPasses ?? 0}</div>
            <div className="mt-0.5 text-[8px] text-white/25">建模券</div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={busy !== null}
            className="btn-ghost w-full py-2.5 text-[10.5px]"
          >
            {busy === 'export' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            导出 JSON 备份（含图片）
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="btn-ghost w-full py-2.5 text-[10.5px]"
          >
            {busy === 'import' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            导入备份（覆盖本机数据）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void handleImport(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={busy !== null}
            className="btn-ghost w-full py-2.5 text-[10.5px] text-[#ff8a99]/80 hover:text-[#ff8a99]"
          >
            {busy === 'clear' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            清空本机数据
          </button>
        </div>

        {message && (
          <p
            className={cn(
              'mt-2.5 rounded-lg px-2.5 py-2 text-[9px] leading-relaxed',
              message.tone === 'ok'
                ? 'bg-emerald-400/10 text-emerald-200/70'
                : 'bg-[#ff3b53]/10 text-[#ffc2ca]',
            )}
          >
            {message.text}
          </p>
        )}
      </section>
      </div>

      <div className="mt-5 flex gap-2 lg:mt-8">
        <Link href="/showroom" className="btn-ghost flex-1 py-2.5 text-[10px]">
          效果陈列室
        </Link>
        <Link href="/appraise" className="btn-ghost flex-1 py-2.5 text-[10px]">
          去鉴定
        </Link>
      </div>

      <p className="mt-5 text-center text-[8px] text-white/20">
        零号鉴定局为虚构机构 · 卡面数值仅为游戏内演绎
      </p>
    </div>
  );
}
