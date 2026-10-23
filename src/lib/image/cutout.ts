'use client';

import type { Config } from '@imgly/background-removal';
import { getCachedCutout, saveCachedCutout } from '@/lib/db/cutouts';

/**
 * 浏览器本地抠图：动态加载，模型与 WASM 由 IMG.LY CDN 按需下载。
 * 依赖 @imgly/background-removal（AGPL-3.0），失败时由调用方回退相框。
 */
export const CUTOUT_MODEL = 'isnet_quint8';
export const CUTOUT_VERSION = 1;
/** 首次需下载约 65MB 模型与 WASM，慢网可能要几分钟；因此只对「长时间无进展」判失败 */
const IDLE_TIMEOUT_MS = 90_000;
/** 硬上限，避免异常情况下无限等待 */
const HARD_LIMIT_MS = 10 * 60_000;

type BgRemovalModule = typeof import('@imgly/background-removal');

let modulePromise: Promise<BgRemovalModule> | null = null;

export interface CutoutProgress {
  key: string;
  current: number;
  total: number;
}

export interface CutoutResult {
  blob: Blob;
  width: number;
  height: number;
  cached: boolean;
  model: string;
}

export function cutoutCacheKey(imageHash: string): string {
  return `${CUTOUT_VERSION}:${imageHash}`;
}

function loadModule(): Promise<BgRemovalModule> {
  if (!modulePromise) {
    modulePromise = import('@imgly/background-removal').catch((error) => {
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}

/** 只预取 JS 代码块，不下载模型，不占用带宽 */
export function preloadCutoutCode(): void {
  void loadModule().catch(() => undefined);
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function createCutout(
  blob: Blob,
  imageHash: string,
  options: {
    onProgress?: (progress: CutoutProgress) => void;
    force?: boolean;
  } = {},
): Promise<CutoutResult> {
  const cacheId = cutoutCacheKey(imageHash);
  if (!options.force) {
    const cached = await getCachedCutout(cacheId);
    if (cached) {
      return {
        blob: cached.blob,
        width: cached.width ?? 0,
        height: cached.height ?? 0,
        cached: true,
        model: cached.model,
      };
    }
  }

  const { removeBackground } = await loadModule();

  const startedAt = Date.now();
  let lastProgressAt = Date.now();

  const config: Config = {
    model: CUTOUT_MODEL,
    device: 'cpu',
    output: { format: 'image/png', quality: 1 },
    progress: (key, current, total) => {
      lastProgressAt = Date.now();
      options.onProgress?.({ key, current, total });
    },
  };

  let stopWatchdog = () => {};
  const watchdog = new Promise<never>((_, reject) => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - startedAt > HARD_LIMIT_MS) {
        clearInterval(timer);
        reject(new Error('本地抠图耗时过长，已放弃'));
      } else if (now - lastProgressAt > IDLE_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error('本地抠图长时间没有进展，可能无法访问模型 CDN'));
      }
    }, 2000);
    stopWatchdog = () => clearInterval(timer);
  });

  let result: Blob;
  try {
    result = await Promise.race([removeBackground(blob, config), watchdog]);
  } finally {
    stopWatchdog();
  }

  if (!(result instanceof Blob) || result.size < 512) {
    throw new Error('本地抠图没有产生有效图片');
  }

  const size = await imageSize(result);
  await saveCachedCutout({
    id: cacheId,
    blob: result,
    mime: 'image/png',
    width: size.width,
    height: size.height,
    model: CUTOUT_MODEL,
    createdAt: new Date().toISOString(),
  });

  return { blob: result, ...size, cached: false, model: CUTOUT_MODEL };
}
