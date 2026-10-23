import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 只读探测：public/models/dahong.glb 是否已经由 Tripo 生成。
 * 用接口而不是直接 HEAD 静态文件，避免控制台出现 404 噪声，
 * 同时把「有没有真实模型」这件事明确交给服务端回答。
 */
export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'models');
  const file = path.join(dir, 'dahong.glb');

  try {
    const stat = await fs.stat(file);
    let meta: unknown = null;
    try {
      meta = JSON.parse(await fs.readFile(path.join(dir, 'dahong.meta.json'), 'utf8'));
    } catch {
      meta = null;
    }
    return NextResponse.json(
      { exists: stat.isFile(), bytes: stat.size, meta },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ exists: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
