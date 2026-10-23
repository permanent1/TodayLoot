import { simulate, pickNaturalRarity } from '../src/features/game/engine';
import { RARITY_ORDER, BASE_WEIGHTS } from '../src/features/game/rarity';
import { mulberry32 } from '../src/features/game/rng';
import type { Rarity } from '../src/types';

const TARGET: Record<Rarity, number> = {
  common: 13,
  fine: 30,
  rare: 34,
  epic: 17,
  legendary: 6,
};

const samples = Number(process.argv[2] ?? 200_000);
const seed = Number(process.argv[3] ?? 20261022);
const drawsPerDay = Number(process.argv[4] ?? 9);

function baseSampling(n: number, seedValue: number) {
  const rng = mulberry32(seedValue);
  const counts: Record<Rarity, number> = {
    common: 0,
    fine: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  for (let i = 0; i < n; i += 1) {
    counts[pickNaturalRarity(999, rng)] += 1;
  }
  const dist = {} as Record<Rarity, number>;
  RARITY_ORDER.forEach((r) => {
    dist[r] = (counts[r] / n) * 100;
  });
  return dist;
}

const baseDist = baseSampling(samples, seed);
const business = simulate(samples, mulberry32(seed), drawsPerDay);

function printRow(label: string, dist: Record<Rarity, number>) {
  const cells = RARITY_ORDER.map((r) => {
    const value = dist[r];
    const delta = value - TARGET[r];
    const flag = Math.abs(delta) <= 2 ? 'OK' : '!!';
    return `${r}: ${value.toFixed(2)}% (${delta >= 0 ? '+' : ''}${delta.toFixed(2)} ${flag})`;
  });
  console.log(`\n${label}`);
  cells.forEach((c) => console.log(`  ${c}`));
}

console.log('Today Loot · 稀有度校准');
console.log({
  samples,
  seed,
  drawsPerDay,
  weights: BASE_WEIGHTS,
});
printRow('基础抽样（无保底/新手/每日机制）', baseDist);
printRow(`业务场景（启用保底/新手/每日，日均 ${drawsPerDay} 次）`, business.distribution);
