import type { Rarity } from '@/types';

export const RARITY_ORDER: Rarity[] = [
  'common',
  'fine',
  'rare',
  'epic',
  'legendary',
];

export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  fine: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/**
 * 初始候选权重。13/30/34/17/6 是启用保底机制后的长周期目标，
 * 不是这里的原始抽样权重。修改本表必须同步跑 `npm run calibrate` 与单测。
 */
export const BASE_WEIGHTS: Record<Rarity, number> = {
  common: 16.0,
  fine: 38.5,
  rare: 27.0,
  epic: 15.0,
  legendary: 3.5,
};

/** 新手前 20 次对高档候选的放大系数（仅用于正常抽样分支） */
export const NEWBIE_WEIGHT_BOOST = 1.3;
export const NEWBIE_WINDOW = 20;

export const TIER_RANGE: Record<Rarity, [number, number]> = {
  common: [1000, 3200],
  fine: [3200, 14000],
  rare: [14000, 68000],
  epic: [68000, 340000],
  legendary: [340000, 2600000],
};

/** 玩法/展示文案，禁止在页面展示爆率相关文字 */
export const RARITY_META: Record<
  Rarity,
  {
    label: string;
    en: string;
    color: string;
    soft: string;
    glow: string;
    tagline: string;
    icon: string;
  }
> = {
  common: {
    label: '普通',
    en: 'COMMON',
    color: '#DDE3EF',
    soft: 'rgba(221,227,239,0.14)',
    glow: 'rgba(221,227,239,0.35)',
    tagline: '日常之物，也值得被认真看一眼',
    icon: '◇',
  },
  fine: {
    label: '精良',
    en: 'FINE',
    color: '#54A9FF',
    soft: 'rgba(84,169,255,0.16)',
    glow: 'rgba(84,169,255,0.55)',
    tagline: '工艺留下了清晰的签名',
    icon: '◈',
  },
  rare: {
    label: '稀有',
    en: 'RARE',
    color: '#A67CFF',
    soft: 'rgba(166,124,255,0.18)',
    glow: 'rgba(166,124,255,0.6)',
    tagline: '它在同类里，明显不太一样',
    icon: '✦',
  },
  epic: {
    label: '史诗',
    en: 'EPIC',
    color: '#F7C66A',
    soft: 'rgba(247,198,106,0.18)',
    glow: 'rgba(247,198,106,0.65)',
    tagline: '时间与手艺共同完成的作品',
    icon: '✧',
  },
  legendary: {
    label: '传说',
    en: 'LEGENDARY',
    color: '#FF3B53',
    soft: 'rgba(255,59,83,0.2)',
    glow: 'rgba(255,59,83,0.75)',
    tagline: '零号鉴定局为它单独开了一页',
    icon: '★',
  },
};

export const PERSONA_META: Record<
  'zhou' | 'k' | 'ali',
  {
    name: string;
    title: string;
    tagline: string;
    jitter: number;
    specialty: string;
    accent: string;
  }
> = {
  zhou: {
    name: '老周',
    title: '资深掌眼',
    tagline: '见得多了，话就少了。',
    jitter: 0.6,
    specialty: '故事 / 羁绊',
    accent: '#F7C66A',
  },
  k: {
    name: '小 K',
    title: '数据考据员',
    tagline: '先量，再说。',
    jitter: 1.4,
    specialty: '工艺 / 稀缺',
    accent: '#54A9FF',
  },
  ali: {
    name: '阿黎',
    title: '万物吹捧官',
    tagline: '这不叫旧，这叫有故事。',
    jitter: 1.8,
    specialty: '故事 / 惊喜',
    accent: '#A67CFF',
  },
};

export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && RARITY_ORDER.includes(value as Rarity);
}

export function rarityAtLeast(a: Rarity, b: Rarity): boolean {
  return RARITY_RANK[a] >= RARITY_RANK[b];
}
