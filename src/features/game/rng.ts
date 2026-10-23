export type Rng = () => number;

/** 可复现的测试/校准随机源 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

/** 真实模式随机源：一次取 32 位加密随机数 */
export function secureRng(): Rng {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    // 极少见的非安全上下文；仍保证可玩，但不用于任何真实奖励结算
    return Math.random;
  }
  return () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}

export function seededRngFromString(input: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return mulberry32(h >>> 0);
}
