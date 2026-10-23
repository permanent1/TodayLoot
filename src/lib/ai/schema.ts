import { z } from 'zod';
import type { VisionResult } from '@/types';
import { clamp } from '@/features/game/scoring';
import { sanitizeText } from '@/lib/utils/text';

const boundedScore = z
  .coerce
  .number()
  .catch(50)
  .transform((n) => clamp(Math.round(n), 0, 100));

const optionalText = (max: number) =>
  z
    .string()
    .max(max * 4)
    .optional()
    .nullable()
    .transform((value) => {
      const clean = sanitizeText(value, max);
      return clean || undefined;
    });

const dimensionsSchema = z.object({
  rarity: boundedScore,
  surprise: boundedScore,
  value: boundedScore,
  aesthetic: boundedScore,
  craft: boundedScore,
  story: boundedScore,
  condition: boundedScore,
  bond: boundedScore,
});

const bountyTuple = z
  .array(z.boolean())
  .catch([])
  .transform((arr) => {
    const padded = [false, false, false];
    for (let i = 0; i < 3; i += 1) padded[i] = Boolean(arr[i]);
    return padded as [boolean, boolean, boolean];
  });

export const rawVisionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().max(200).catch('未分类'),
  scene: z.string().max(200).catch('未知场景'),
  visibleFeatures: z
    .array(z.string())
    .catch([])
    .transform((arr) =>
      arr
        .map((f) => sanitizeText(f, 30))
        .filter(Boolean)
        .slice(0, 5),
    ),
  desc: z.string().trim().min(1).max(2000),
  dimensions: dimensionsSchema.catch({
    rarity: 50,
    surprise: 50,
    value: 50,
    aesthetic: 50,
    craft: 50,
    story: 50,
    condition: 50,
    bond: 50,
  }),
  valueScore: boundedScore,
  affixes: z
    .array(z.string())
    .catch([])
    .transform((arr) => arr.slice(0, 5)),
  broadcast: z.string().max(400).catch(''),
  bounty_match: bountyTuple,
  description_bonus: z
    .coerce
    .number()
    .catch(0)
    .transform((n) => clamp(Math.round(n), 0, 12)),
  description_credibility: z
    .enum(['honest', 'vague', 'contradicted'])
    .nullable()
    .catch(null),
  image3d_prompt: optionalText(300),
  origin: optionalText(200),
  story: optionalText(400),
  monologue: optionalText(200),
  signature: optionalText(40),
});

export type RawVision = z.infer<typeof rawVisionSchema>;

export const visionResultSchema = rawVisionSchema.transform((raw) => {
  const result: VisionResult = {
    ...raw,
    name: sanitizeText(raw.name, 28),
    category: sanitizeText(raw.category, 20) || '未分类',
    scene: sanitizeText(raw.scene, 40) || '未知场景',
    desc: sanitizeText(raw.desc, 300),
    broadcast: sanitizeText(raw.broadcast, 80),
    affixes: raw.affixes
      .map((a) => sanitizeText(a, 10))
      .filter(Boolean)
      .slice(0, 5),
    visibleFeatures:
      raw.visibleFeatures.length >= 2
        ? raw.visibleFeatures
        : [...raw.visibleFeatures, '可见轮廓', '细节待确认'].slice(0, 2),
  };
  return result;
});

export const modeSchema = z.enum(['hunt', 'keep']);
export const personaSchema = z.enum(['zhou', 'k', 'ali']);

export const identifyRequestSchema = z.object({
  image: z
    .string()
    .min(64)
    .max(12 * 1024 * 1024)
    .startsWith('data:image/'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  mode: modeSchema,
  persona: personaSchema,
  userNote: z.string().max(60).optional().default(''),
  bountyTitles: z.array(z.string().max(40)).max(3).optional().default([]),
  bountyIds: z.array(z.string().max(20)).max(3).optional().default([]),
  /** 用户显式选择演示识别；绝不在真实失败后自动降级 */
  forceMock: z.boolean().optional().default(false),
  /** 内置样例的提示，仅用于让演示数据与样例照片匹配，不冒充真实识别 */
  demoSample: z.enum(['yogurt', 'keyboard', 'mouse']).optional(),
});

export type IdentifyRequest = z.infer<typeof identifyRequestSchema>;

export function parseVision(input: unknown): {
  ok: true;
  data: VisionResult;
} | {
  ok: false;
  error: string;
} {
  const parsed = visionResultSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '模型返回结构不合法' };
  }
  return { ok: true, data: parsed.data };
}
