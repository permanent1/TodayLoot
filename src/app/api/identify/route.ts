import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { identifyRequestSchema } from '@/lib/ai/schema';
import { mockIdentify } from '@/lib/ai/mock';
import { IdentifyError, liveIdentify } from '@/lib/ai/qwen';
import { getServerConfig, liveReady } from '@/lib/server/config';
import { PROMPT_VERSION } from '@/features/game/engine';
import { sanitizeNote } from '@/lib/utils/text';
import type { VisionResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CachedVision {
  vision: VisionResult;
  model: string;
  expires: number;
}

const liveCache = new Map<string, CachedVision>();
const CACHE_TTL = 60 * 60 * 1000;
const CACHE_MAX = 40;

interface Counter {
  day: string;
  count: number;
}
const counters = new Map<string, Counter>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'local';
}

function consumeQuota(ip: string, max: number): boolean {
  const day = todayKey();
  const current = counters.get(ip);
  if (!current || current.day !== day) {
    counters.set(ip, { day, count: 1 });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

function decodeImage(
  image: string,
  mimeType: string,
  maxMb: number,
): { buffer: Buffer; mime: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(
    image,
  );
  if (!match) {
    throw new IdentifyError('图片数据格式不正确', 'bad_schema', 400);
  }
  const mime = match[1];
  if (mime !== mimeType) {
    throw new IdentifyError('图片 MIME 与数据不一致', 'bad_schema', 400);
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength === 0) {
    throw new IdentifyError('图片为空', 'bad_schema', 400);
  }
  if (buffer.byteLength > maxMb * 1024 * 1024) {
    throw new IdentifyError(`图片不能超过 ${maxMb}MB`, 'bad_schema', 413);
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
  const magicOk =
    (mime === 'image/jpeg' && isJpeg) ||
    (mime === 'image/png' && isPng) ||
    (mime === 'image/webp' && isWebp);
  if (!magicOk) {
    throw new IdentifyError('图片内容与扩展名不符', 'bad_schema', 400);
  }
  return { buffer, mime };
}

function pruneCache(now: number): void {
  for (const [key, value] of liveCache) {
    if (value.expires <= now) liveCache.delete(key);
  }
  while (liveCache.size > CACHE_MAX) {
    const first = liveCache.keys().next().value;
    if (!first) break;
    liveCache.delete(first);
  }
}

export async function POST(request: NextRequest) {
  const config = getServerConfig();

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > config.maxImageMb * 1024 * 1024 * 1.45) {
    return NextResponse.json(
      { error: { code: 'too_large', message: `图片不能超过 ${config.maxImageMb}MB` } },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'bad_request', message: '请求体不是合法 JSON' } },
      { status: 400 },
    );
  }

  const parsed = identifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'bad_request',
          message: parsed.error.issues[0]?.message ?? '请求参数不合法',
        },
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const userNote = sanitizeNote(input.userNote, 60);
  const imageHash = createHash('sha256')
    .update(input.image)
    .digest('hex');

  let decoded: { buffer: Buffer; mime: string };
  try {
    decoded = decodeImage(input.image, input.mimeType, config.maxImageMb);
  } catch (error) {
    const err = error as IdentifyError;
    return NextResponse.json(
      { error: { code: err.code ?? 'bad_request', message: err.message } },
      { status: err.status ?? 400 },
    );
  }
  void decoded;

  if (input.forceMock || !liveReady(config)) {
    const vision = mockIdentify({
      imageHash,
      mode: input.mode,
      persona: input.persona,
      userNote,
      bountyIds: input.bountyIds,
      sampleId: input.demoSample,
    });
    return NextResponse.json(
      {
        vision,
        meta: {
          source: 'mock',
          demo: true,
          note: input.forceMock
            ? '按用户选择使用演示识别数据，未调用真实模型'
            : config.aiMode === 'live'
              ? '真实识别未启用或缺少密钥，本次结果为演示识别数据'
              : '当前为演示模式，本次结果为演示识别数据，未调用真实模型',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const ip = clientIp(request);
  if (!consumeQuota(ip, config.maxDailyLiveRequests)) {
    return NextResponse.json(
      {
        error: {
          code: 'quota_exceeded',
          message: '今日真实识别次数已用完，可切换到演示模式继续体验',
        },
      },
      { status: 429 },
    );
  }

  const cacheKey = createHash('sha256')
    .update(
      [
        imageHash,
        input.mode,
        input.persona,
        userNote,
        input.bountyIds.join(','),
        config.dashscopeModel,
        PROMPT_VERSION,
      ].join('|'),
    )
    .digest('hex');

  const now = Date.now();
  pruneCache(now);
  const cached = liveCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return NextResponse.json(
      {
        vision: cached.vision,
        meta: {
          source: 'qwen',
          demo: false,
          model: cached.model,
          note: '相同请求命中服务器缓存，未重复计费',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const result = await liveIdentify({
      imageDataUrl: input.image,
      mode: input.mode,
      persona: input.persona,
      userNote,
      bountyTitles: input.bountyTitles,
      apiKey: config.dashscopeKey,
      baseUrl: config.dashscopeBaseUrl,
      model: config.dashscopeModel,
    });
    liveCache.set(cacheKey, {
      vision: result.vision,
      model: result.model,
      expires: now + CACHE_TTL,
    });
    return NextResponse.json(
      {
        vision: result.vision,
        meta: { source: 'qwen', demo: false, model: result.model },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof IdentifyError) {
      console.error(`[identify] live failed code=${error.code} status=${error.status}`);
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            hint: '真实模型调用不会自动重试；可手动重试或切换到演示模式',
          },
        },
        { status: error.status },
      );
    }
    console.error('[identify] unexpected error');
    return NextResponse.json(
      {
        error: {
          code: 'internal',
          message: '识别服务出现异常，请手动重试或切换到演示模式',
        },
      },
      { status: 500 },
    );
  }
}
