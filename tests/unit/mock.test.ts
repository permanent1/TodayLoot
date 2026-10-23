import { describe, expect, it } from 'vitest';
import { mockIdentify } from '@/lib/ai/mock';

const base = {
  imageHash: 'a'.repeat(64),
  mode: 'hunt' as const,
  persona: 'ali' as const,
  userNote: '它陪我加了很多班',
  bountyIds: ['metal', 'desk', 'round'],
};

describe('Mock 识别', () => {
  it('相同输入产生完全一致的演示结果', () => {
    const first = mockIdentify(base);
    const second = mockIdentify(base);
    expect(second).toEqual(first);
  });

  it('输出结构完整且不包含真实价格或稀有度判定', () => {
    const vision = mockIdentify(base);
    expect(vision.name.length).toBeGreaterThan(0);
    expect(vision.visibleFeatures.length).toBeGreaterThanOrEqual(2);
    expect(vision.desc.length).toBeGreaterThan(20);
    expect(vision.bounty_match).toHaveLength(3);
    expect(vision.bounty_match.every((v) => typeof v === 'boolean')).toBe(true);
    expect(vision.desc).not.toMatch(/人民币|美元|爆率|稀有度/);
    expect(JSON.stringify(vision)).not.toMatch(/finalTier|coins|pity/);
  });

  it('模式与鉴定师会改变文风与证书字段', () => {
    const hunt = mockIdentify(base);
    const keep = mockIdentify({ ...base, mode: 'keep', persona: 'zhou' });
    expect(hunt.desc).not.toBe(keep.desc);
    expect(keep.origin).toBeTruthy();
    expect(keep.story).toBeTruthy();
    expect(keep.signature).toContain('零号鉴定局');
    expect(hunt.story).toBeUndefined();
  });

  it('内置样例提示会匹配对应物件，避免演示图文不符', () => {
    expect(mockIdentify({ ...base, sampleId: 'yogurt' }).name).toBe('希腊风味酸奶');
    expect(mockIdentify({ ...base, sampleId: 'keyboard' }).name).toBe('蓝白机械键盘');
    expect(mockIdentify({ ...base, sampleId: 'mouse' }).name).toBe('白色无线鼠标');
  });

  it('附言长度会影响 description_bonus，但被限制在合法区间', () => {
    const noNote = mockIdentify({ ...base, userNote: '' });
    const longNote = mockIdentify({ ...base, userNote: '这是一段比较长的附言描述' });
    expect(noNote.description_bonus).toBe(0);
    expect(longNote.description_bonus).toBeGreaterThan(0);
    expect(longNote.description_bonus).toBeLessThanOrEqual(12);
  });
});
