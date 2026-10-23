import { beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST as identify } from '@/app/api/identify/route';
import { GET as health } from '@/app/api/health/route';

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_URL = `data:image/png;base64,${PNG}`;

function request(body: unknown): NextRequest {
  return new Request('http://localhost/api/identify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  delete process.env.AI_MODE;
  delete process.env.ALLOW_LIVE_APPRAISE;
  delete process.env.DASHSCOPE_API_KEY;
});

describe('POST /api/identify（Mock 模式）', () => {
  it('无 Key 时返回演示结果并明确标注', async () => {
    const response = await identify(
      request({
        image: PNG_URL,
        mimeType: 'image/png',
        mode: 'hunt',
        persona: 'ali',
        userNote: '测试',
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.meta.source).toBe('mock');
    expect(json.meta.demo).toBe(true);
    expect(json.vision.name).toBeTruthy();
    expect(json.vision.bounty_match).toHaveLength(3);
  });

  it('forceMock 明确记录为用户选择', async () => {
    const response = await identify(
      request({
        image: PNG_URL,
        mimeType: 'image/png',
        mode: 'keep',
        persona: 'zhou',
        userNote: '',
        forceMock: true,
      }),
    );
    const json = await response.json();
    expect(json.meta.source).toBe('mock');
    expect(json.meta.note).toContain('用户选择');
  });

  it('内置样例提示使演示数据与照片匹配', async () => {
    const response = await identify(
      request({
        image: PNG_URL,
        mimeType: 'image/png',
        mode: 'hunt',
        persona: 'ali',
        userNote: '',
        demoSample: 'yogurt',
      }),
    );
    const json = await response.json();
    expect(json.vision.name).toBe('希腊风味酸奶');
  });

  it('图片内容与 MIME 不符时返回 400', async () => {
    const fake = `data:image/png;base64,${Buffer.from(
      'not-a-real-png-image-content-'.repeat(5),
    ).toString('base64')}`;
    const response = await identify(
      request({
        image: fake,
        mimeType: 'image/png',
        mode: 'hunt',
        persona: 'ali',
        userNote: '',
      }),
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe('bad_schema');
  });

  it('拒绝非法请求体', async () => {
    const response = await identify(
      request({ image: 'abc', mimeType: 'image/gif', mode: 'x' }),
    );
    expect(response.status).toBe(400);
  });

  it('AI_MODE=live 但缺少密钥时降级为演示结果而非伪造真实结果', async () => {
    process.env.AI_MODE = 'live';
    process.env.ALLOW_LIVE_APPRAISE = 'true';
    const response = await identify(
      request({
        image: PNG_URL,
        mimeType: 'image/png',
        mode: 'hunt',
        persona: 'k',
        userNote: '',
      }),
    );
    const json = await response.json();
    expect(json.meta.source).toBe('mock');
    expect(json.meta.demo).toBe(true);
    expect(json.meta.note).toContain('缺少密钥');
  });
});

describe('GET /api/health', () => {
  it('返回模式状态且不泄露任何密钥', async () => {
    const response = await health();
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.aiMode).toBe('mock');
    expect(json.liveReady).toBe(false);
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain(process.env.DASHSCOPE_API_KEY ?? '__none__');
    expect(serialized).not.toMatch(/api[_-]?key/i);
  });
});
