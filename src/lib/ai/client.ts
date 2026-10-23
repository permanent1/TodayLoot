'use client';

import type { DemoSampleId, IdentifyResponse } from '@/types';

export class IdentifyClientError extends Error {
  code: string;
  status: number;
  hint?: string;

  constructor(message: string, code: string, status: number, hint?: string) {
    super(message);
    this.name = 'IdentifyClientError';
    this.code = code;
    this.status = status;
    this.hint = hint;
  }
}

export interface IdentifyParams {
  image: string;
  mimeType: string;
  mode: 'hunt' | 'keep';
  persona: 'zhou' | 'k' | 'ali';
  userNote: string;
  bountyTitles: string[];
  bountyIds: string[];
  forceMock?: boolean;
  demoSample?: DemoSampleId;
}

/** 单次请求，明确不自动重试（真实模型费用保护） */
export async function requestIdentify(
  params: IdentifyParams,
): Promise<IdentifyResponse> {
  const response = await fetch('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    cache: 'no-store',
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new IdentifyClientError('服务器返回了无法解析的内容', 'bad_response', response.status);
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; hint?: string } })
      .error;
    throw new IdentifyClientError(
      error?.message ?? '识别失败，请稍后重试',
      error?.code ?? 'unknown',
      response.status,
      error?.hint,
    );
  }

  return payload as IdentifyResponse;
}
