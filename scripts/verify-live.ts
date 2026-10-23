/**
 * 单次真实模型验证脚本（费用保护）
 *
 * 运行前置条件：
 *   1. .env.local 已填写 DASHSCOPE_API_KEY，并设置 AI_MODE=live、ALLOW_LIVE_APPRAISE=true
 *   2. 已重启 `npm run dev` 或 `npm start`
 *   3. 用户明确同意发起一次付费调用
 *
 * 用法：
 *   npm run verify:live -- --image /absolute/path/photo.jpg --yes
 *
 * 本脚本只发起一次请求，不重试、不批量、不循环。
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseVision } from '../src/lib/ai/schema';

function loadEnvLocal(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function mimeOf(file: string): string | null {
  const ext = path.extname(file).toLowerCase();
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return null;
}

async function main() {
  loadEnvLocal();

  if (!process.argv.includes('--yes')) {
    console.error(
      '已阻止调用：真实模型会产生费用。确认已获得授权后，请追加 --yes 重新运行。',
    );
    process.exit(1);
  }

  const imagePath = arg('image');
  if (!imagePath) {
    console.error('缺少 --image 参数（单张测试照片的绝对路径）。');
    process.exit(1);
  }
  if (!fs.existsSync(imagePath)) {
    console.error(`找不到图片：${imagePath}`);
    process.exit(1);
  }

  const mime = mimeOf(imagePath);
  if (!mime) {
    console.error('仅支持 jpg / png / webp。');
    process.exit(1);
  }

  const buffer = fs.readFileSync(imagePath);
  const maxMb = Number(process.env.MAX_IMAGE_MB ?? 8);
  if (buffer.byteLength > maxMb * 1024 * 1024) {
    console.error(`图片超过 ${maxMb}MB，请先压缩。`);
    process.exit(1);
  }

  const baseUrl = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
  const healthResponse = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' });
  const health = (await healthResponse.json()) as {
    aiMode: string;
    liveReady: boolean;
    model: string;
  };
  if (!health.liveReady) {
    console.error('服务端尚未就绪为真实模式：', {
      aiMode: health.aiMode,
      liveReady: health.liveReady,
      model: health.model,
    });
    console.error('请确认 .env.local 已配置 AI_MODE=live、ALLOW_LIVE_APPRAISE=true、DASHSCOPE_API_KEY，并重启服务。');
    process.exit(1);
  }

  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  console.log(`将发起 1 次真实识别请求：${path.basename(imagePath)} (${Math.round(buffer.byteLength / 1024)}KB)，模型 ${health.model}`);
  const started = Date.now();

  // 单次请求：无重试、无循环
  const response = await fetch(`${baseUrl}/api/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: dataUrl,
      mimeType: mime,
      mode: 'hunt',
      persona: 'ali',
      userNote: '这是单次真实 API 验证，用于检查图片识别与 JSON 输出。',
      bountyTitles: [],
      bountyIds: [],
    }),
    cache: 'no-store',
  });

  const elapsed = Date.now() - started;
  const raw = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error(`响应不是 JSON（HTTP ${response.status}）：`, raw.slice(0, 500));
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`调用失败（HTTP ${response.status}，${elapsed}ms）：`, payload);
    process.exit(1);
  }

  const data = payload as { vision?: unknown; meta?: { source?: string; model?: string } };
  const parsed = parseVision(data.vision);
  console.log(`HTTP ${response.status} · ${elapsed}ms · 来源 ${data.meta?.source}`);
  if (!parsed.ok) {
    console.error('返回结构未通过 Zod 校验：', parsed.error);
    process.exit(1);
  }

  console.log('Zod 校验通过。识别摘要：');
  console.log(
    JSON.stringify(
      {
        name: parsed.data.name,
        category: parsed.data.category,
        scene: parsed.data.scene,
        visibleFeatures: parsed.data.visibleFeatures,
        valueScore: parsed.data.valueScore,
        dimensions: parsed.data.dimensions,
        bounty_match: parsed.data.bounty_match,
        desc: parsed.data.desc,
        meta: data.meta,
      },
      null,
      2,
    ),
  );
  console.log('本次只调用一次，未重试。');
}

void main().catch((error) => {
  console.error('验证脚本异常：', error instanceof Error ? error.message : error);
  process.exit(1);
});
