import type { Dimensions, Mode, Persona, Rarity, Worth } from '@/types';
import { PERSONA_META, TIER_RANGE } from './rarity';

export const HUNT_WEIGHTS: Record<keyof Dimensions, number> = {
  rarity: 0.26,
  surprise: 0.2,
  value: 0.16,
  aesthetic: 0.12,
  craft: 0.1,
  story: 0.1,
  condition: 0.06,
  bond: 0,
};

export const KEEP_WEIGHTS: Record<keyof Dimensions, number> = {
  story: 0.24,
  bond: 0.2,
  rarity: 0.18,
  aesthetic: 0.12,
  craft: 0.1,
  surprise: 0.1,
  condition: 0.06,
  value: 0,
};

export const SCORE_SHIFT_ENABLED = false;

export function weightsFor(mode: Mode): Record<keyof Dimensions, number> {
  return mode === 'hunt' ? HUNT_WEIGHTS : KEEP_WEIGHTS;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function weightedBaseScore(
  dimensions: Dimensions,
  mode: Mode,
): number {
  const weights = weightsFor(mode);
  return (Object.keys(weights) as (keyof Dimensions)[]).reduce((sum, key) => {
    const dim = clamp(Math.round(dimensions[key] ?? 0), 0, 100);
    return sum + dim * weights[key];
  }, 0);
}

export function personaJitter(
  persona: Persona,
  rng: () => number,
): number {
  const coef = PERSONA_META[persona].jitter;
  return (rng() * 2 - 1) * 10 * coef;
}

export interface ScoreInput {
  dimensions: Dimensions;
  mode: Mode;
  persona: Persona;
  noteBonus: number;
  credibility: 'honest' | 'vague' | 'contradicted' | null;
  guessHit: boolean;
  bountyHits: number;
  firstIdentify: boolean;
  fortune: number;
  jitter: number;
  luckyStrike: boolean;
}

export interface ScoreResult {
  total: number;
  scores: Record<string, number>;
  breakdown: Record<string, number>;
}

export function computeScore(input: ScoreInput): ScoreResult {
  const {
    dimensions,
    mode,
    noteBonus,
    credibility,
    guessHit,
    bountyHits,
    firstIdentify,
    fortune,
    jitter,
    luckyStrike,
  } = input;

  const weights = weightsFor(mode);
  const scores: Record<string, number> = {};
  let base = 0;
  (Object.keys(weights) as (keyof Dimensions)[]).forEach((key) => {
    const dim = clamp(Math.round(dimensions[key] ?? 0), 0, 100);
    scores[key] = dim;
    base += dim * weights[key];
  });

  const noteCap = mode === 'hunt' ? 8 : 12;
  let note = clamp(Math.round(noteBonus), 0, noteCap);
  if (credibility === 'contradicted') note = Math.max(0, note - 8);

  const breakdown: Record<string, number> = {
    base: Math.round(base * 10) / 10,
    note,
    guess: guessHit ? 6 : 0,
    bounty: bountyHits > 0 ? 10 + (bountyHits - 1) * 5 : 0,
    first: firstIdentify ? 15 : 0,
    fortune: clamp(Math.round(fortune), -10, 10),
    jitter: Math.round(jitter * 10) / 10,
    lucky: luckyStrike ? 25 : 0,
    credibility: credibility === 'contradicted' ? -8 : 0,
  };

  const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  return {
    total: Math.round(clamp(total, 0, 200)),
    scores,
    breakdown,
  };
}

export function computeWorth(rarity: Rarity, valueScore: number): Worth {
  const range = TIER_RANGE[rarity];
  const tierMin = range[0];
  const tierMax = range[1];
  const vs = clamp(valueScore, 0, 100) / 100;
  const center = tierMin + (tierMax - tierMin) * vs;
  const low = clamp(Math.round(center * 0.75), tierMin, tierMax);
  const high = clamp(Math.round(center * 1.3), low, tierMax);
  return { low: Math.max(1000, low), high };
}

const AFFIX_BANNED = /[<>&"'`\r\n]/g;

export function sanitizeAffixes(input: unknown, limit = 3): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const cleaned = raw.replace(AFFIX_BANNED, '').trim().slice(0, 10);
    if (!cleaned || cleaned.length < 1) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= limit) break;
  }
  return out;
}

export function formatCoins(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function logSliderToValue(position: number): number {
  const min = 1000;
  const max = 3000000;
  const t = clamp(position, 0, 1);
  const value = min * Math.pow(max / min, t);
  return Math.round(value / 1000) * 1000;
}

export function valueToLogSlider(value: number): number {
  const min = 1000;
  const max = 3000000;
  const v = clamp(value, min, max);
  return Math.log(v / min) / Math.log(max / min);
}
