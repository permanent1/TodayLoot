'use client';

import type { DemoSampleId, Persona, Rarity } from '@/types';
import type { ProcessedImage } from '@/lib/image/process';

/**
 * 鉴定台 → 鉴定流程页之间的一次性会话。
 * 图片 Blob 无法放进 URL，用模块级单例在客户端路由跳转间传递；
 * 硬刷新丢失时由流程页退回鉴定台，不会产生半截记录。
 */
export interface AppraiseSession {
  processed: ProcessedImage;
  sampleId: DemoSampleId | null;
  note: string;
  persona: Persona;
  predictedTier?: Rarity;
  predictedCoins?: number;
  bountyIds: string[];
  bountyTitles: string[];
  removeBg: boolean;
}

let current: AppraiseSession | null = null;

export function setAppraiseSession(session: AppraiseSession): void {
  current = session;
}

export function getAppraiseSession(): AppraiseSession | null {
  return current;
}

export function clearAppraiseSession(): void {
  current = null;
}
