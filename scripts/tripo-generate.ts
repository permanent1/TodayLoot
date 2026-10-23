/**
 * Tripo 单次建模脚本（费用保护）
 *
 * 前置条件：
 *   1. .env.local 中设置 ENABLE_TRIPO=true、TRIPO_API_KEY=...
 *   2. 明确同意发起一次付费建模
 *
 * 用法：
 *   npm run tripo:generate -- --image images/image4.jpg --yes
 *
 * 行为：
 *   - 只创建 1 个任务，失败不重建、不重试
 *   - 创建后仅轮询查询状态的进度（不产生新任务、不计费）
 *   - 成功后把 .glb 下载到 public/models/dahong.glb，并写入 meta.json
 */
import fs from 'node:fs';
import path from 'node:path';

const POLL_INTERVAL_MS = 6000;
const MAX_WAIT_MS = 8 * 60 * 1000;

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

function bearer(): { base: string; key: string } {
  const base = (process.env.TRIPO_BASE_URL ?? 'https://openapi.tripo3d.ai/v3').replace(/\/+$/, '');
  const key = (process.env.TRIPO_API_KEY ?? '').trim();
  if (!key) {
    console.error('缺少 TRIPO_API_KEY，已阻止调用。');
    process.exit(1);
  }
  return { base, key };
}

function pick(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

async function tripo(
  pathname: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  const { base, key } = bearer();
  const response = await fetch(`${base}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  const text = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`响应不是 JSON（HTTP ${response.status}）：${text.slice(0, 200)}`);
  }
  if (!response.ok || (typeof payload.code === 'number' && payload.code !== 0)) {
    throw new Error(
      `Tripo 请求失败（HTTP ${response.status}）：${String(payload.message ?? text.slice(0, 200))}`,
    );
  }
  const data = payload.data;
  return (data && typeof data === 'object' ? data : payload) as Record<string, unknown>;
}

async function main() {
  loadEnvLocal();
  console.log('Tripo 建模样例生成器');

  const imagePath = arg('image');
  if (!imagePath) {
    console.error('缺少 --image 参数，例如 --image images/image4.jpg');
    process.exit(1);
  }
  if (!process.argv.includes('--yes')) {
    console.error('已阻止调用：建模会产生费用。确认授权后请追加 --yes 重新运行。');
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

  const outPath = path.join(process.cwd(), 'public', 'models', 'dahong.glb');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const buffer = fs.readFileSync(imagePath);
  console.log(`图片：${imagePath} (${Math.round(buffer.byteLength / 1024)}KB, ${mime})`);

  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), `upload.${ext}`);
  const uploaded = await tripo('/files', { method: 'POST', body: form });
  const fileToken = pick(uploaded, ['file_token', 'file_id', 'token', 'image_token']);
  if (!fileToken) {
    console.error('上传成功但未拿到 file_token，请核对 Tripo v3 文档字段。返回：', uploaded);
    process.exit(1);
  }

  const created = await tripo('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: ext === 'webp' ? 'webp' : ext, file_token: fileToken },
    }),
  });
  const taskId = pick(created, ['task_id', 'id', 'taskId']);
  if (!taskId) {
    console.error('未拿到 task_id，返回：', created);
    process.exit(1);
  }
  console.log(`任务已提交：${taskId}（本次只提交 1 次，失败不会自动重建）`);

  const started = Date.now();
  let modelUrl: string | undefined;
  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const state = await tripo(`/tasks/${encodeURIComponent(taskId)}`, { method: 'GET' });
    const status = String(state.status ?? 'unknown');
    const progress = Number(state.progress ?? 0);
    console.log(`[${Math.round((Date.now() - started) / 1000)}s] ${status} ${progress}%`);
    if (status === 'success') {
      const output = (state.output ?? {}) as Record<string, unknown>;
      modelUrl = pick(output, ['pbr_model', 'model', 'base_model']);
      break;
    }
    if (status === 'failed') {
      console.error('任务失败：', state);
      process.exit(1);
    }
  }

  if (!modelUrl) {
    console.error('等待超时或未返回模型地址。任务已创建，请稍后用任务号查询，避免重复提交。');
    process.exit(1);
  }

  const download = await fetch(modelUrl, { cache: 'no-store' });
  if (!download.ok) {
    console.error(`下载模型失败：HTTP ${download.status}`);
    process.exit(1);
  }
  const arrayBuffer = await download.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
  fs.writeFileSync(
    path.join(path.dirname(outPath), 'dahong.meta.json'),
    JSON.stringify(
      {
        source: imagePath,
        taskId,
        modelUrl,
        bytes: arrayBuffer.byteLength,
        generatedAt: new Date().toISOString(),
        provider: 'tripo',
      },
      null,
      2,
    ),
  );
  console.log(`已保存：${outPath} (${Math.round(arrayBuffer.byteLength / 1024)}KB)`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('建模脚本异常：', message);
  if (/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN/i.test(message)) {
    console.error(
      '无法连接 Tripo（openapi.tripo3d.ai）。请检查网络、代理或防火墙；' +
        '本脚本不会重试，也不会产生重复任务。',
    );
  }
  process.exit(1);
});
