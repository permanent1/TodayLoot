import 'server-only';

import { getServerConfig } from './config';

/**
 * Tripo v3 适配层。
 * - 只在服务端读取 TRIPO_API_KEY
 * - 单次提交、单次轮询由调用方控制，本模块内不自动重试
 * - 未开启 ENABLE_TRIPO 或缺少 Key 时直接拒绝，不产生费用
 */

const REQUEST_TIMEOUT_MS = 30_000;

export type TripoStatus = 'queued' | 'running' | 'success' | 'failed' | 'unknown';

export interface TripoTaskState {
  taskId: string;
  status: TripoStatus;
  progress: number;
  modelUrl?: string;
  message?: string;
}

export class TripoError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 502) {
    super(message);
    this.name = 'TripoError';
    this.code = code;
    this.status = status;
  }
}

function credentials(): { base: string; key: string } {
  const config = getServerConfig();
  if (!config.enableTripo) {
    throw new TripoError('3D 建模服务未开启（ENABLE_TRIPO 不为 true）', 'tripo_disabled', 503);
  }
  if (!config.tripoKey) {
    throw new TripoError('缺少 TRIPO_API_KEY', 'tripo_missing_key', 503);
  }
  return { base: config.tripoBaseUrl, key: config.tripoKey };
}

async function call(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const { base, key } = credentials();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await response.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new TripoError(
        `Tripo 返回了无法解析的内容（HTTP ${response.status}）`,
        'bad_response',
        502,
      );
    }

    const code = payload.code;
    const failedCode = typeof code === 'number' && code !== 0;
    if (!response.ok || failedCode) {
      const message =
        typeof payload.message === 'string'
          ? payload.message
          : typeof payload.hint === 'string'
            ? payload.hint
            : `Tripo 请求失败（HTTP ${response.status}）`;
      throw new TripoError(message, String(code ?? response.status), response.status || 502);
    }

    const data = payload.data;
    return (data && typeof data === 'object' ? data : payload) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof TripoError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TripoError('Tripo 请求超时', 'timeout', 504);
    }
    throw new TripoError(
      error instanceof Error ? error.message : 'Tripo 请求失败',
      'network_error',
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

/** 上传原图，拿到 file token。字段名按官方 v3 命名为 file_token，同时兼容 file_id。 */
export async function uploadImage(
  bytes: Uint8Array,
  mime: string,
): Promise<string> {
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const form = new FormData();
  form.append('file', new Blob([copy], { type: mime }), `upload.${ext}`);

  const data = await call('/files', { method: 'POST', body: form });
  const token = pickString(data, ['file_token', 'file_id', 'token', 'image_token']);
  if (!token) {
    throw new TripoError('Tripo 未返回文件标识，请核对 v3 上传字段', 'bad_response', 502);
  }
  return token;
}

/** 提交 image_to_model 任务；一次调用创建一个任务。 */
export async function createImageTask(
  fileToken: string,
  mime: string,
): Promise<string> {
  const fileType = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const data = await call('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: fileType, file_token: fileToken },
    }),
  });

  const taskId = pickString(data, ['task_id', 'id', 'taskId']);
  if (!taskId) {
    throw new TripoError('Tripo 未返回 task_id', 'bad_response', 502);
  }
  return taskId;
}

const STATUS_SET: TripoStatus[] = ['queued', 'running', 'success', 'failed'];

export async function getTask(taskId: string): Promise<TripoTaskState> {
  const data = await call(`/tasks/${encodeURIComponent(taskId)}`);
  const rawStatus = typeof data.status === 'string' ? data.status : 'unknown';
  const status = (STATUS_SET as string[]).includes(rawStatus)
    ? (rawStatus as TripoStatus)
    : 'unknown';
  const output =
    data.output && typeof data.output === 'object'
      ? (data.output as Record<string, unknown>)
      : {};
  const modelUrl = pickString(output, ['pbr_model', 'model', 'base_model']);
  const progress = Number(data.progress);

  return {
    taskId,
    status,
    progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0,
    modelUrl,
    message: typeof data.error === 'string' ? data.error : undefined,
  };
}
