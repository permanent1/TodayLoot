import { describe, expect, it } from 'vitest';
import { identifyRequestSchema, parseVision } from '@/lib/ai/schema';

function baseRaw() {
  return {
    name: '  测试物件  ',
    category: '桌面用品',
    scene: '书桌',
    visibleFeatures: ['方形轮廓', '表面磨砂'],
    desc: '一件普通的测试物件。<script>alert(1)</script>',
    dimensions: {
      rarity: 50,
      surprise: 50,
      value: 50,
      aesthetic: 50,
      craft: 50,
      story: 50,
      condition: 50,
      bond: 50,
    },
    valueScore: 50,
    affixes: ['测试词条'],
    broadcast: '播报',
    bounty_match: [true, false, false],
    description_bonus: 4,
    description_credibility: 'honest',
  };
}

describe('VisionResult Schema', () => {
  it('合法响应可解析并清洗 HTML', () => {
    const parsed = parseVision(baseRaw());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.desc).not.toContain('<script>');
    expect(parsed.data.name).toBe('测试物件');
  });

  it('越界评分被 clamp，非法 credibility 降级为 null', () => {
    const parsed = parseVision({
      ...baseRaw(),
      valueScore: 999,
      dimensions: { ...baseRaw().dimensions, rarity: -20, story: 300 },
      description_bonus: 999,
      description_credibility: 'hacked',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.valueScore).toBe(100);
    expect(parsed.data.dimensions.rarity).toBe(0);
    expect(parsed.data.dimensions.story).toBe(100);
    expect(parsed.data.description_bonus).toBe(12);
    expect(parsed.data.description_credibility).toBeNull();
  });

  it('缺失 dimensions 时使用安全默认值', () => {
    const raw = baseRaw();
    delete (raw as Record<string, unknown>).dimensions;
    const parsed = parseVision(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.dimensions.rarity).toBe(50);
  });

  it('空 visibleFeatures 会补齐到至少两条', () => {
    const parsed = parseVision({ ...baseRaw(), visibleFeatures: [] });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.visibleFeatures.length).toBeGreaterThanOrEqual(2);
  });

  it('超长 name 被截断到 28 字', () => {
    const parsed = parseVision({ ...baseRaw(), name: '很'.repeat(80) });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.name.length).toBe(28);
  });

  it('bounty_match 长度不足时补齐，多余时截断', () => {
    const short = parseVision({ ...baseRaw(), bounty_match: [true] });
    const long = parseVision({ ...baseRaw(), bounty_match: [true, true, true, true] });
    expect(short.ok && short.data.bounty_match).toEqual([true, false, false]);
    expect(long.ok && long.data.bounty_match).toEqual([true, true, true]);
  });

  it('缺少核心 name / desc 时拒绝', () => {
    const raw = baseRaw() as Record<string, unknown>;
    delete raw.name;
    expect(parseVision(raw).ok).toBe(false);
    const raw2 = baseRaw() as Record<string, unknown>;
    delete raw2.desc;
    expect(parseVision(raw2).ok).toBe(false);
  });
});

describe('Identify 请求 Schema', () => {
  const valid = {
    image: `data:image/png;base64,${'A'.repeat(120)}`,
    mimeType: 'image/png',
    mode: 'hunt',
    persona: 'ali',
    userNote: '测试附言',
  };

  it('接受合法请求并补齐默认值', () => {
    const parsed = identifyRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.bountyIds).toEqual([]);
    expect(parsed.data.forceMock).toBe(false);
  });

  it('拒绝过长附言与非法模式', () => {
    expect(
      identifyRequestSchema.safeParse({ ...valid, userNote: '字'.repeat(61) }).success,
    ).toBe(false);
    expect(
      identifyRequestSchema.safeParse({ ...valid, mode: 'demo' }).success,
    ).toBe(false);
  });

  it('拒绝非 data URL 图片', () => {
    expect(
      identifyRequestSchema.safeParse({ ...valid, image: 'https://example.com/a.png' })
        .success,
    ).toBe(false);
  });
});
