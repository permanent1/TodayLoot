import { describe, expect, it } from 'vitest';
import {
  clamp,
  computeScore,
  computeWorth,
  logSliderToValue,
  sanitizeAffixes,
  valueToLogSlider,
  weightedBaseScore,
} from '@/features/game/scoring';
import { RARITY_ORDER, TIER_RANGE } from '@/features/game/rarity';
import type { Dimensions } from '@/types';

const dims: Dimensions = {
  rarity: 80,
  surprise: 70,
  value: 60,
  aesthetic: 75,
  craft: 65,
  story: 85,
  condition: 40,
  bond: 90,
};

describe('评分', () => {
  it('加权基础分限制在 0-100', () => {
    const score = weightedBaseScore(dims, 'hunt');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('非法维度被 clamp，不会产生 NaN 或越界总分', () => {
    const result = computeScore({
      dimensions: {
        ...dims,
        rarity: 999,
        surprise: -100,
        craft: Number.NaN,
      },
      mode: 'hunt',
      persona: 'ali',
      noteBonus: 999,
      credibility: 'contradicted',
      guessHit: false,
      bountyHits: 3,
      firstIdentify: true,
      fortune: -30,
      jitter: 12,
      luckyStrike: true,
    });
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(200);
    expect(result.scores.rarity).toBe(100);
    expect(result.scores.surprise).toBe(0);
    expect(result.scores.craft).toBe(0);
    expect(result.breakdown.note).toBe(0);
    expect(result.breakdown.fortune).toBe(-10);
    expect(result.breakdown.bounty).toBe(20);
  });
});

describe('收藏币区间', () => {
  it('五档区间均满足 low <= high 且不越界', () => {
    for (const rarity of RARITY_ORDER) {
      const [min, max] = TIER_RANGE[rarity];
      for (const value of [0, 1, 25, 50, 99, 100, 999, -50]) {
        const worth = computeWorth(rarity, value);
        expect(worth.low).toBeGreaterThanOrEqual(min);
        expect(worth.low).toBeLessThanOrEqual(max);
        expect(worth.high).toBeGreaterThanOrEqual(worth.low);
        expect(worth.high).toBeLessThanOrEqual(max);
        expect(worth.low).toBeGreaterThanOrEqual(1000);
      }
    }
  });
});

describe('工具函数', () => {
  it('词条会去重、截断并移除 HTML / 换行', () => {
    const affixes = sanitizeAffixes(
      ['<script>alert(1)</script>', '包浆候选', '包浆候选', 'a\nb', 123, '正常词条'],
      4,
    );
    expect(affixes).toContain('包浆候选');
    expect(affixes.some((a) => a.includes('<'))).toBe(false);
    expect(affixes.some((a) => a.includes('\n'))).toBe(false);
    expect(affixes.length).toBeLessThanOrEqual(4);
  });

  it('对数滑块与币值可往返', () => {
    for (const value of [1000, 14000, 68000, 340000, 3000000]) {
      const slider = valueToLogSlider(value);
      expect(logSliderToValue(slider)).toBeCloseTo(value, -2);
    }
  });

  it('clamp 处理 NaN', () => {
    expect(clamp(Number.NaN, 1, 5)).toBe(1);
    expect(clamp(10, 1, 5)).toBe(5);
    expect(clamp(3, 1, 5)).toBe(3);
  });
});
