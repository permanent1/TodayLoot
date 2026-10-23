import type { BountyDay, BountyTask } from '@/types';
import { seededRngFromString } from '@/features/game/rng';

export interface BountyTemplate {
  id: string;
  title: string;
  detail: string;
}

export const BOUNTY_POOL: BountyTemplate[] = [
  {
    id: 'red',
    title: '拍一件红色的东西',
    detail: '画面里出现明确的红色主体或大面积红色',
  },
  {
    id: 'round',
    title: '拍一个圆形物体',
    detail: '杯口、镜头、球体或明显圆形轮廓',
  },
  {
    id: 'desk',
    title: '拍一件桌面用品',
    detail: '键盘、杯子、台灯、文具等办公/学习物品',
  },
  {
    id: 'fabric',
    title: '拍一件织物',
    detail: '衣服、包袋、鞋面、布艺等可见纤维材质',
  },
  {
    id: 'metal',
    title: '拍一件金属制品',
    detail: '金属杯身、器械、五金或明显金属反光',
  },
  {
    id: 'plant',
    title: '拍一株植物',
    detail: '绿植、花卉、叶片或盆栽',
  },
];

/** 按设备日期种子稳定生成，同一天多次打开保持一致 */
export function generateBountyDay(day: string): BountyDay {
  const rng = seededRngFromString(`bounty:${day}:v1`);
  const pool = [...BOUNTY_POOL];
  const picked: BountyTemplate[] = [];
  for (let i = 0; i < 3; i += 1) {
    const index = Math.floor(rng() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  const tasks: BountyTask[] = picked.map((template, index) => ({
    id: template.id,
    title: template.title,
    detail: template.detail,
    matchIndex: index,
    reward: 8000,
    claimed: false,
  }));
  return { day, tasks, bonusClaimed: false };
}
