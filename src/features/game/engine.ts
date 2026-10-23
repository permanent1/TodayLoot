import type {
  CollectionItem,
  GameOutcome,
  Mode,
  Persona,
  PlayerState,
  Rarity,
  RaritySource,
  VisionResult,
} from '@/types';
import {
  BASE_WEIGHTS,
  NEWBIE_WEIGHT_BOOST,
  NEWBIE_WINDOW,
  RARITY_ORDER,
  RARITY_RANK,
} from './rarity';
import {
  clamp,
  computeScore,
  computeWorth,
  personaJitter,
  sanitizeAffixes,
} from './scoring';
import { localDayKey, sanitizeText } from '@/lib/utils/text';

export const ENGINE_VERSION = '1.0.0';
export const PROMPT_VERSION = 'v1';
export const CONFIG_VERSION = 1;

export const PITY_THRESHOLDS = { epic: 8, gold: 20, red: 40 } as const;
export const GOLD_UPGRADE_CHANCE = 0.26;
export const LUCKY_STRIKE_CHANCE = 0.05;

export function createInitialPlayer(deviceId: string): PlayerState {
  return {
    deviceId,
    coins: 0,
    modelPasses: 0,
    totalIdentify: 0,
    pity: { epic: 0, gold: 0, red: 0 },
    daily: {
      day: localDayKey(),
      completed: 0,
      epicOrAboveSeen: false,
      dailyGuaranteeUsed: false,
      passesGranted: 0,
      modelTasksCreated: 0,
    },
    configVersion: CONFIG_VERSION,
  };
}

export function normalizeDaily(
  player: PlayerState,
  dayKey: string,
): PlayerState {
  if (player.daily.day === dayKey) return player;
  return {
    ...player,
    daily: {
      day: dayKey,
      completed: 0,
      epicOrAboveSeen: false,
      dailyGuaranteeUsed: false,
      passesGranted: 0,
      modelTasksCreated: 0,
    },
  };
}

export interface RollState {
  pity: PlayerState['pity'];
  newTotal: number;
  daily: PlayerState['daily'];
  rng: () => number;
}

export interface RollOutcome {
  rarity: Rarity;
  source: RaritySource;
  pity: PlayerState['pity'];
  dailyGuaranteeUsed: boolean;
}

export function pickNaturalRarity(
  newTotal: number,
  rng: () => number,
): Rarity {
  const boost = newTotal <= NEWBIE_WINDOW ? NEWBIE_WEIGHT_BOOST : 1;
  const weights = RARITY_ORDER.map((rarity) => {
    const base = BASE_WEIGHTS[rarity];
    const boosted = RARITY_RANK[rarity] >= RARITY_RANK.rare ? base * boost : base;
    return { rarity, weight: boosted };
  });
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return 'common';
}

/**
 * 唯一可信抽样顺序：
 * 周期硬保底（红 40 > 金 20 > 紫 8）→ 新手第 3 次 → 每日第 9 次 → 正常权重。
 * 只有被消费的那一个周期计数器归零；自然高档不重置计数器。
 */
export function rollRarity(state: RollState): RollOutcome {
  const counters = {
    epic: state.pity.epic + 1,
    gold: state.pity.gold + 1,
    red: state.pity.red + 1,
  };
  let dailyGuaranteeUsed = state.daily.dailyGuaranteeUsed;

  if (counters.red >= PITY_THRESHOLDS.red) {
    counters.red = 0;
    return {
      rarity: 'legendary',
      source: 'cycle_pity',
      pity: counters,
      dailyGuaranteeUsed,
    };
  }
  if (counters.gold >= PITY_THRESHOLDS.gold) {
    counters.gold = 0;
    return {
      rarity: state.rng() < GOLD_UPGRADE_CHANCE ? 'legendary' : 'epic',
      source: 'cycle_pity',
      pity: counters,
      dailyGuaranteeUsed,
    };
  }
  if (counters.epic >= PITY_THRESHOLDS.epic) {
    counters.epic = 0;
    return {
      rarity: 'rare',
      source: 'cycle_pity',
      pity: counters,
      dailyGuaranteeUsed,
    };
  }
  if (state.newTotal === 3) {
    return {
      rarity: 'rare',
      source: 'newbie',
      pity: counters,
      dailyGuaranteeUsed,
    };
  }
  if (
    state.daily.completed >= 8 &&
    !state.daily.epicOrAboveSeen &&
    !state.daily.dailyGuaranteeUsed
  ) {
    dailyGuaranteeUsed = true;
    return {
      rarity: 'epic',
      source: 'daily_pity',
      pity: counters,
      dailyGuaranteeUsed,
    };
  }
  return {
    rarity: pickNaturalRarity(state.newTotal, state.rng),
    source: 'natural',
    pity: counters,
    dailyGuaranteeUsed,
  };
}

export interface AppraiseContext {
  mode: Mode;
  persona: Persona;
  predictedTier?: Rarity;
  predictedCoins?: number;
  bountyHits?: number;
  bountyBonusEligible?: boolean;
  noteInjection?: boolean;
  dayKey?: string;
  now?: number;
  rng: () => number;
  analysisSource: 'qwen' | 'mock';
  noteForItem?: string;
}

export function appraise(
  playerInput: PlayerState,
  vision: VisionResult,
  ctx: AppraiseContext,
): GameOutcome {
  const dayKey = ctx.dayKey ?? localDayKey();
  const player = normalizeDaily(playerInput, dayKey);
  const newTotal = player.totalIdentify + 1;

  const roll = rollRarity({
    pity: player.pity,
    newTotal,
    daily: player.daily,
    rng: ctx.rng,
  });

  const rarity = roll.rarity;
  const bountyHits = clamp(Math.round(ctx.bountyHits ?? 0), 0, 3);
  const guessHit = Boolean(
    ctx.predictedTier && ctx.predictedTier === rarity,
  );

  const worth = computeWorth(rarity, vision.valueScore);
  const coinGuessHit = Boolean(
    ctx.predictedCoins &&
      ctx.predictedCoins >= worth.low &&
      ctx.predictedCoins <= worth.high,
  );
  const midpoint = (worth.low + worth.high) / 2;
  const coinGuessClose = Boolean(
    ctx.predictedCoins &&
      Math.abs((ctx.predictedCoins - midpoint) / midpoint) <= 0.2,
  );

  const fortune = Math.round((ctx.rng() * 2 - 1) * 10);
  const jitter = personaJitter(ctx.persona, ctx.rng);
  const luckyStrike = ctx.rng() < LUCKY_STRIKE_CHANCE;

  const credibility = vision.description_credibility;
  let noteBonus = vision.description_bonus;
  if (ctx.noteInjection) {
    noteBonus = Math.min(noteBonus, 0);
  }

  const scored = computeScore({
    dimensions: vision.dimensions,
    mode: ctx.mode,
    persona: ctx.persona,
    noteBonus,
    credibility,
    guessHit,
    bountyHits,
    firstIdentify: player.totalIdentify === 0,
    fortune,
    jitter,
    luckyStrike,
  });

  let coinReward = 0;
  if (coinGuessHit) coinReward += 5000;
  if (coinGuessClose) coinReward += 2000;
  if (bountyHits > 0) {
    coinReward += bountyHits * 8000;
    if (bountyHits === 3 && ctx.bountyBonusEligible) coinReward += 20000;
  }

  const affixes = sanitizeAffixes(vision.affixes);
  if (ctx.noteInjection) affixes.push('此地无银');
  if (luckyStrike) affixes.push('幸运一击');
  if (guessHit) affixes.push('预言家');

  const epicOrAboveSeen =
    player.daily.epicOrAboveSeen || RARITY_RANK[rarity] >= RARITY_RANK.epic;

  const nextPlayer: PlayerState = {
    ...player,
    coins: player.coins + coinReward,
    totalIdentify: newTotal,
    pity: roll.pity,
    daily: {
      ...player.daily,
      completed: player.daily.completed + 1,
      epicOrAboveSeen,
      dailyGuaranteeUsed: roll.dailyGuaranteeUsed,
      day: dayKey,
    },
    configVersion: CONFIG_VERSION,
  };

  return {
    rarity,
    source: roll.source,
    scores: scored.scores,
    scoreTotal: scored.total,
    worth,
    coinReward,
    luckyStrike,
    guessHit,
    coinGuessHit,
    coinGuessClose,
    bountyHits,
    affixes: dedupe(affixes).slice(0, 4),
    scoreBreakdown: scored.breakdown,
    nextPlayer,
  };
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function buildCollectionItem(params: {
  id: string;
  requestKey: string;
  vision: VisionResult;
  outcome: GameOutcome;
  ctx: AppraiseContext;
  originalImageId: string;
  cutoutImageId?: string;
  now?: number;
}): CollectionItem {
  const { id, requestKey, vision, outcome, ctx, originalImageId, cutoutImageId } = params;
  const nowIso = new Date(params.now ?? Date.now()).toISOString();
  const origin =
    ctx.mode === 'keep' && vision.origin
      ? `（本店杜撰）${sanitizeText(vision.origin, 200).replace(/^（本店杜撰）/, '')}`
      : undefined;

  return {
    id,
    requestKey,
    mode: ctx.mode,
    persona: ctx.persona,
    createdAt: nowIso,
    updatedAt: nowIso,
    name: sanitizeText(vision.name, 28),
    category: sanitizeText(vision.category, 20),
    scene: sanitizeText(vision.scene, 40),
    originalImageId,
    cutoutImageId,
    userNote: sanitizeText(ctx.noteForItem, 60) || undefined,
    desc: sanitizeText(vision.desc, 300),
    affixes: outcome.affixes,
    origin,
    story: ctx.mode === 'keep' ? sanitizeText(vision.story, 400) : undefined,
    monologue: ctx.mode === 'keep' ? sanitizeText(vision.monologue, 200) : undefined,
    signature: ctx.mode === 'keep' ? sanitizeText(vision.signature, 40) : undefined,
    rarity: outcome.rarity,
    source: outcome.source,
    scores: outcome.scores,
    scoreTotal: outcome.scoreTotal,
    valueScore: clamp(Math.round(vision.valueScore), 0, 100),
    worth: outcome.worth,
    coinReward: outcome.coinReward,
    predictedTier: ctx.predictedTier,
    predictedCoins: ctx.predictedCoins,
    acquiredAt: nowIso,
    status: 'pending_lock',
    analysisSource: ctx.analysisSource,
    broadcast: sanitizeText(vision.broadcast, 80),
    visibleFeatures: vision.visibleFeatures
      .map((f) => sanitizeText(f, 30))
      .filter(Boolean)
      .slice(0, 5),
    bountyHits: outcome.bountyHits,
  };
}

export interface SimulationResult {
  distribution: Record<Rarity, number>;
  samples: number;
}

/**
 * 校准用模拟：默认每天 9 次，让每日保底在长周期内生效。
 * 与正式业务流程共享同一 rollRarity / 计数器语义。
 */
export function simulate(
  samples: number,
  rng: () => number,
  drawsPerDay = 9,
): SimulationResult {
  let player = createInitialPlayer('sim');
  const counts: Record<Rarity, number> = {
    common: 0,
    fine: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  for (let i = 0; i < samples; i += 1) {
    const dayKey = `day-${Math.floor(i / drawsPerDay)}`;
    player = normalizeDaily(player, dayKey);
    const newTotal = player.totalIdentify + 1;
    const roll = rollRarity({
      pity: player.pity,
      newTotal,
      daily: player.daily,
      rng,
    });
    counts[roll.rarity] += 1;
    player = {
      ...player,
      totalIdentify: newTotal,
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

  const distribution = {} as Record<Rarity, number>;
  RARITY_ORDER.forEach((r) => {
    distribution[r] = (counts[r] / samples) * 100;
  });
  return { distribution, samples };
}


