import 'server-only';
import type { Mode, Persona, VisionResult } from '@/types';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { parseVision } from './schema';

export type IdentifyErrorCode =
  | 'config'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'bad_json'
  | 'bad_schema'
  | 'upstream';

export class IdentifyError extends Error {
  code: IdentifyErrorCode;
  status: number;

  constructor(message: string, code: IdentifyErrorCode, status = 502) {
    super(message);
    this.name = 'IdentifyError';
    this.code = code;
    this.status = status;
  }
}

export interface LiveIdentifyParams {
  imageDataUrl: string;
  mode: Mode;
  persona: Persona;
  userNote: string;
  bountyTitles: string[];
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

export interface LiveIdentifyResult {
  vision: VisionResult;
  model: string;
}

type ContentPart = { type?: string; text?: string };

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: ContentPart) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * 真实模型调用：单次请求，禁止自动重试（费用保护）。
 * 失败时由用户在界面上明确选择「重试」或「切换到演示模式」。
 */
export async function liveIdentify(
  params: LiveIdentifyParams,
): Promise<LiveIdentifyResult> {
  const {
    imageDataUrl,
    mode,
    persona,
    userNote,
    bountyTitles,
    apiKey,
    baseUrl,
    model,
  } = params;

  if (!apiKey) {
    throw new IdentifyError('服务器未配置视觉模型密钥', 'config', 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    params.timeoutMs ?? 60000,
  );

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageDataUrl } },
              {
                type: 'text',
                text: buildUserPrompt({ mode, persona, userNote, bountyTitles }),
              },
            ],
          },
        ],
        temperature: 0.85,
        // Qwen3.8 默认开启思考；鉴定是结构化抽取任务，关闭思考避免 reasoning 占满输出额度
        enable_thinking: false,
        max_completion_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new IdentifyError('视觉模型响应超时，请手动重试', 'timeout', 504);
    }
    throw new IdentifyError('无法连接视觉模型服务', 'network', 502);
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') ?? 'unknown';
  const rawText = await response.text();
  const redact = (text: string) => (apiKey ? text.split(apiKey).join('***') : text);

  if (!response.ok) {
    console.error(
      `[qwen] upstream status=${response.status} type=${contentType} body=${redact(rawText).slice(0, 400)}`,
    );
    if (response.status === 401 || response.status === 403) {
      throw new IdentifyError('视觉模型鉴权失败，请检查服务器密钥', 'auth', 502);
    }
    if (response.status === 429) {
      throw new IdentifyError('视觉模型额度或频率受限，请稍后再试', 'rate_limit', 429);
    }
    throw new IdentifyError(
      `视觉模型服务返回异常状态 ${response.status}`,
      'upstream',
      502,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    console.error(
      `[qwen] non-json status=${response.status} type=${contentType} body=${redact(rawText).slice(0, 400)}`,
    );
    throw new IdentifyError('视觉模型响应不是合法 JSON', 'bad_json', 502);
  }

  const choice = (
    payload as {
      choices?: {
        finish_reason?: string;
        message?: { content?: unknown; reasoning_content?: unknown };
      }[];
      usage?: unknown;
    }
  ).choices?.[0];
  const text = extractText(choice?.message?.content);
  if (!text) {
    const reasoning = choice?.message?.reasoning_content;
    console.error('[qwen] empty content', {
      finishReason: choice?.finish_reason,
      contentType,
      hasReasoning: Boolean(reasoning),
      reasoningLength: typeof reasoning === 'string' ? reasoning.length : 0,
      messageKeys: Object.keys(choice?.message ?? {}),
      usage: (payload as { usage?: unknown }).usage,
    });
    throw new IdentifyError('视觉模型返回了空内容', 'bad_json', 502);
  }

  const json = extractJson(text);
  if (!json) {
    console.error('[qwen] content is not json', {
      length: text.length,
      preview: text.slice(0, 300),
    });
    throw new IdentifyError('无法解析模型返回的 JSON', 'bad_json', 502);
  }

  const parsed = parseVision(json);
  if (!parsed.ok) {
    throw new IdentifyError(
      `模型返回结构不符合契约：${parsed.error}`,
      'bad_schema',
      502,
    );
  }

  return { vision: parsed.data, model };
}
