'use client';

import { useEffect, useState } from 'react';

export interface HealthInfo {
  ok: boolean;
  aiMode: 'mock' | 'live';
  liveReady: boolean;
  tripoEnabled: boolean;
  model: string;
  maxImageMb?: number;
  maxDailyLiveRequests?: number;
}

let cached: HealthInfo | null = null;
let inflight: Promise<HealthInfo | null> | null = null;

async function fetchHealth(): Promise<HealthInfo | null> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/api/health', { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as HealthInfo;
      cached = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useHealth() {
  const [health, setHealth] = useState<HealthInfo | null>(cached);

  useEffect(() => {
    let alive = true;
    fetchHealth().then((data) => {
      if (alive) setHealth(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return health;
}

export function clearHealthCache(): void {
  cached = null;
}
