import { describe, expect, it } from 'vitest';
import {
  appraise,
  createInitialPlayer,
  normalizeDaily,
  rollRarity,
  simulate,
} from '@/features/game/engine';
import { BASE_WEIGHTS, RARITY_ORDER, RARITY_RANK } from '@/features/game/rarity';
import { mulberry32 } from '@/features/game/rng';
import { HUNT_WEIGHTS, KEEP_WEIGHTS } from '@/features/game/scoring';
import type { PlayerState, Rarity } from '@/types';
import { makeVision } from '../helpers/vision';

const DAY = '2026-10-22';

function fresh(): PlayerState {
  const player = createInitialPlayer('test-device');
  return normalizeDaily(player, DAY);
}

function rollSequence(count: number, seed = 7) {
  let player = fresh();
  const rng = mulberry32(seed);
  const results = [];
  for (let i = 0; i < count; i += 1) {
    const nextTotal = player.totalIdentify + 1;
    const roll = rollRarity({
      pity: player.pity,
      newTotal: nextTotal,
      daily: player.daily,
      rng,
    });
    results.push(roll);
    player = {
      ...player,
      totalIdentify: nextTotal,
      pity: roll.pity,
      daily: {
        ...player.daily,
        completed: player.daily.completed + 1,
        epicOrAboveSeen:
          player.daily.epicOrAboveSeen ||
          RARITY_RANK[roll.rarity] >= RARITY_RANK.epic,
        dailyGuaranteeUsed: roll.dailyGuaranteeUsed,
      },
    };
  }
  return results;
}

describe('稀有度权重', () => {
  it('七维权重系数和严格为 1', () => {
    const hunt = Object.values(HUNT_WEIGHTS).reduce((a, b) => a + b, 0);
    const keep = Object.values(KEEP_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(hunt).toBeCloseTo(1, 10);
    expect(keep).toBeCloseTo(1, 10);
  });

  it('五档候选权重均为正数', () => {
    for (const rarity of RARITY_ORDER) {
      expect(BASE_WEIGHTS[rarity]).toBeGreaterThan(0);
    }
  });
});

describe('周期硬保底', () => {
  it('全新状态下第 8 次触发紫保底（固定稀有）', () => {
    const results = rollSequence(8);
    expect(results[7].rarity).toBe('rare');
    expect(results[7].source).toBe('cycle_pity');
  });

  it('第 20 次触发金保底（至少史诗）', () => {
    const results = rollSequence(20);
    expect(['epic', 'legendary']).toContain(results[19].rarity);
    expect(results[19].source).toBe('cycle_pity');
  });

  it('第 40 次一定为传说', () => {
    const results = rollSequence(40);
    expect(results[39].rarity).toBe('legendary');
    expect(results[39].source).toBe('cycle_pity');
  });

  it('40 次内至少出现一次传说，红计数到期不会被自然结果重置', () => {
    const results = rollSequence(80);
    const legendaryIndexes = results
      .map((r, i) => (r.rarity === 'legendary' ? i : -1))
      .filter((i) => i >= 0);
    expect(legendaryIndexes.length).toBeGreaterThanOrEqual(2);
    // 任意相邻传说间距不超过 40（自然传说不重置红计数）
    for (let i = 1; i < legendaryIndexes.length; i += 1) {
      expect(legendaryIndexes[i] - legendaryIndexes[i - 1]).toBeLessThanOrEqual(40);
    }
  });

  it('红 / 金 / 紫同时到期时红优先，且只消费红计数', () => {
    const roll = rollRarity({
      pity: { red: 39, gold: 19, epic: 7 },
      newTotal: 100,
      daily: {
        day: DAY,
        completed: 0,
        epicOrAboveSeen: false,
        dailyGuaranteeUsed: false,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
      rng: () => 0.5,
    });
    expect(roll.rarity).toBe('legendary');
    expect(roll.source).toBe('cycle_pity');
    expect(roll.pity.red).toBe(0);
    expect(roll.pity.gold).toBe(20);
    expect(roll.pity.epic).toBe(8);
  });

  it('金保底保留 26% 升级传说概率', () => {
    const base = {
      pity: { red: 5, gold: 19, epic: 1 },
      newTotal: 100,
      daily: {
        day: DAY,
        completed: 0,
        epicOrAboveSeen: false,
        dailyGuaranteeUsed: false,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
    };
    const upgraded = rollRarity({ ...base, rng: () => 0.1 });
    const plain = rollRarity({ ...base, rng: () => 0.9 });
    expect(upgraded.rarity).toBe('legendary');
    expect(plain.rarity).toBe('epic');
  });
});

describe('自然抽样与新手 / 每日保护', () => {
  it('自然出传说不重置红保底计数', () => {
    const roll = rollRarity({
      pity: { red: 2, gold: 2, epic: 2 },
      newTotal: 999,
      daily: {
        day: DAY,
        completed: 0,
        epicOrAboveSeen: true,
        dailyGuaranteeUsed: true,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
      rng: () => 0.999,
    });
    expect(roll.rarity).toBe('legendary');
    expect(roll.source).toBe('natural');
    expect(roll.pity.red).toBe(3);
  });

  it('第 3 次固定稀有（新手保护）', () => {
    const roll = rollRarity({
      pity: { red: 0, gold: 0, epic: 0 },
      newTotal: 3,
      daily: {
        day: DAY,
        completed: 2,
        epicOrAboveSeen: false,
        dailyGuaranteeUsed: false,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
      rng: () => 0.5,
    });
    expect(roll.rarity).toBe('rare');
    expect(roll.source).toBe('newbie');
  });

  it('当日第 9 次且前 8 次无史诗以上时固定史诗', () => {
    const roll = rollRarity({
      pity: { red: 0, gold: 0, epic: 0 },
      newTotal: 20,
      daily: {
        day: DAY,
        completed: 8,
        epicOrAboveSeen: false,
        dailyGuaranteeUsed: false,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
      rng: () => 0.5,
    });
    expect(roll.rarity).toBe('epic');
    expect(roll.source).toBe('daily_pity');
    expect(roll.dailyGuaranteeUsed).toBe(true);
  });

  it('当日已出现史诗以上时不触发每日保底', () => {
    const roll = rollRarity({
      pity: { red: 0, gold: 0, epic: 0 },
      newTotal: 20,
      daily: {
        day: DAY,
        completed: 8,
        epicOrAboveSeen: true,
        dailyGuaranteeUsed: false,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
      rng: () => 0.99,
    });
    expect(roll.source).toBe('natural');
  });

  it('每日保底同日只触发一次', () => {
    const roll = rollRarity({
      pity: { red: 1, gold: 1, epic: 1 },
      newTotal: 30,
      daily: {
        day: DAY,
        completed: 9,
        epicOrAboveSeen: false,
        dailyGuaranteeUsed: true,
        passesGranted: 0,
        modelTasksCreated: 0,
      },
      rng: () => 0.99,
    });
    expect(roll.source).toBe('natural');
  });
});

describe('计分与竞猜', () => {
  it('猜中档位 +6 分，未猜中不惩罚', () => {
    const baseCtx = {
      mode: 'hunt' as const,
      persona: 'ali' as const,
      analysisSource: 'mock' as const,
      dayKey: DAY,
      rng: mulberry32(99),
    };
    const player = { ...fresh(), totalIdentify: 5 };
    const baseline = appraise(player, makeVision(), {
      ...baseCtx,
      rng: mulberry32(11),
    });
    const missTier = RARITY_ORDER.find((r) => r !== baseline.rarity)!;
    const forceHit = appraise(player, makeVision(), {
      ...baseCtx,
      predictedTier: baseline.rarity,
      rng: mulberry32(11),
    });
    const miss = appraise(player, makeVision(), {
      ...baseCtx,
      predictedTier: missTier,
      rng: mulberry32(11),
    });
    expect(forceHit.guessHit).toBe(true);
    expect(forceHit.scoreBreakdown.guess).toBe(6);
    expect(miss.scoreBreakdown.guess).toBe(0);
    expect(miss.scoreTotal).toBeLessThan(forceHit.scoreTotal);
  });

  it('币值猜中区间加 5,000，接近中点再加 2,000', () => {
    const player = { ...fresh(), totalIdentify: 5 };
    const ctx = {
      mode: 'hunt' as const,
      persona: 'k' as const,
      analysisSource: 'mock' as const,
      dayKey: DAY,
      rng: mulberry32(3),
    };
    const result = appraise(player, makeVision({ valueScore: 50 }), {
      ...ctx,
      predictedCoins: 0,
    });
    // 使用引擎产生的区间中点作为必中值重新结算
    const midpoint = Math.round((result.worth.low + result.worth.high) / 2);
    const again = appraise(player, makeVision({ valueScore: 50 }), {
      ...ctx,
      predictedCoins: midpoint,
    });
    expect(again.coinGuessHit).toBe(true);
    expect(again.coinGuessClose).toBe(true);
    expect(again.coinReward).toBeGreaterThanOrEqual(7000);
  });

  it('附言注入不改变抽样，只影响文案标记', () => {
    const player = { ...fresh(), totalIdentify: 10 };
    const ctx = {
      mode: 'hunt' as const,
      persona: 'zhou' as const,
      analysisSource: 'mock' as const,
      dayKey: DAY,
      rng: mulberry32(42),
    };
    const normal = appraise(player, makeVision(), ctx);
    const injected = appraise(player, makeVision(), {
      ...ctx,
      noteInjection: true,
      rng: mulberry32(42),
    });
    expect(injected.rarity).toBe(normal.rarity);
    expect(injected.affixes).toContain('此地无银');
  });

  it('模式、鉴定师不同但共用同一 pity 状态', () => {
    const player = { ...fresh(), pity: { red: 5, gold: 5, epic: 5 } };
    const hunt = appraise(player, makeVision(), {
      mode: 'hunt',
      persona: 'ali',
      analysisSource: 'mock',
      dayKey: DAY,
      rng: mulberry32(8),
    });
    const keep = appraise(player, makeVision(), {
      mode: 'keep',
      persona: 'zhou',
      analysisSource: 'mock',
      dayKey: DAY,
      rng: mulberry32(8),
    });
    expect(hunt.nextPlayer.pity).toEqual(keep.nextPlayer.pity);
  });
});

describe('Monte Carlo 校准', () => {
  it('业务场景 10 万次分布与 13/30/34/17/6 偏差不超过 2 个百分点', () => {
    const target: Record<Rarity, number> = {
      common: 13,
      fine: 30,
      rare: 34,
      epic: 17,
      legendary: 6,
    };
    const { distribution, samples } = simulate(100_000, mulberry32(20261022), 9);
    expect(samples).toBe(100_000);
    for (const rarity of RARITY_ORDER) {
      expect(Math.abs(distribution[rarity] - target[rarity])).toBeLessThanOrEqual(2);
    }
  });
});
