import type { VisionResult } from '@/types';

export function makeVision(overrides: Partial<VisionResult> = {}): VisionResult {
  return {
    name: '测试保温杯',
    category: '饮水器具',
    scene: '办公室',
    visibleFeatures: ['不锈钢杯身', '杯口有磕痕'],
    desc: '一只被反复使用的保温杯，杯身有细小划痕。',
    dimensions: {
      rarity: 60,
      surprise: 55,
      value: 50,
      aesthetic: 58,
      craft: 65,
      story: 60,
      condition: 45,
      bond: 70,
    },
    valueScore: 50,
    affixes: ['日常孤品', '磨损美学'],
    broadcast: '档案已录入。',
    bounty_match: [false, false, false],
    description_bonus: 4,
    description_credibility: 'honest',
    ...overrides,
  };
}
