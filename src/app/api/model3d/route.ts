import { NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/server/config';
import { createImageTask, uploadImage, TripoError } from '@/lib/server/tripo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * 提交一次 3D 建模任务（单次，不重试）。
 * 仅当 ENABLE_TRIPO=true 且配置了 TRIPO_API_KEY 时才会真正产生费用。
 */
export async function POST(request: Request) {
  const config = getServerConfig();
  if (!config.enableTripo || !config.tripoKey) {
    return NextResponse.json(
      {
        error: {
          code: 'tripo_disabled',
          message: '3D 建模服务未开通，可在效果陈列室查看标注为样例的 3D 模型',
        },
      },
      { status: 503 },
    );
  }

  let body: { image?: unknown; mimeType?: unknown } | null = null;
  try {
    body = (await request.json()) as { image?: unknown; mimeType?: unknown };
  } catch {
    body = null;
  }

  const image = typeof body?.image === 'string' ? body.image : '';
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) {
    return NextResponse.json(
      {
        error: {
          code: 'bad_request',
          message: '图片必须是 data:image/(jpeg|png|webp);base64 格式',
        },
      },
      { status: 400 },
    );
  }

  const mime = match[1];
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: { code: 'bad_mime', message: '仅支持 JPG / PNG / WebP' } },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.byteLength === 0 || bytes.byteLength > config.maxImageMb * 1024 * 1024) {
    return NextResponse.json(
      { error: { code: 'bad_size', message: `图片不能超过 ${config.maxImageMb}MB` } },
      { status: 400 },
    );
  }

  try {
    const fileToken = await uploadImage(bytes, mime);
    const taskId = await createImageTask(fileToken, mime);
    return NextResponse.json(
      { taskId, status: 'queued', note: '单次提交，不会自动重试' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof TripoError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: { code: 'unknown', message: '3D 任务提交失败' } },
      { status: 500 },
    );
  }
}
