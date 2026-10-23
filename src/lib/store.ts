'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { PlayerState } from '@/types';
import type { SettingsRow } from '@/lib/db/db';
import {
  ensurePlayer,
  getPlayer,
  getSettings,
  saveSettings,
} from '@/lib/db/repository';
import { applyTheme, readStoredTheme, type Theme } from '@/lib/theme';

interface AppState {
  ready: boolean;
  initializing: boolean;
  player: PlayerState | null;
  settings: SettingsRow | null;
  theme: Theme;
  init: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setSound: (sound: boolean) => Promise<void>;
  setReducedMotion: (value: boolean) => Promise<void>;
  setKeepOriginal: (value: boolean) => Promise<void>;
  setRemoveBg: (value: boolean) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  initializing: false,
  player: null,
  settings: null,
  theme: 'dark',
  init: async () => {
    if (get().initializing || get().ready) return;
    set({ initializing: true });
    const theme = readStoredTheme();
    applyTheme(theme);
    set({ theme });
    try {
      const [player, settings] = await Promise.all([ensurePlayer(), getSettings()]);
      set({ player, settings, ready: true, initializing: false });
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle(
          'reduce-motion',
          settings.reducedMotion,
        );
      }
    } catch {
      set({ initializing: false, ready: true });
    }
  },
  refreshPlayer: async () => {
    try {
      const player = await getPlayer();
      set({ player });
    } catch {
      // 本地库不可用时保持现有快照
    }
  },
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  setSound: async (sound) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, sound } });
    const saved = await saveSettings({ sound });
    set({ settings: saved });
  },
  setReducedMotion: async (reducedMotion) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, reducedMotion } });
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    const saved = await saveSettings({ reducedMotion });
    set({ settings: saved });
  },
  setKeepOriginal: async (keepOriginal) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, keepOriginal } });
    const saved = await saveSettings({ keepOriginal });
    set({ settings: saved });
  },
  setRemoveBg: async (removeBg) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, removeBg } });
    const saved = await saveSettings({ removeBg });
    set({ settings: saved });
  },
}));

export function useSoundEnabled(): boolean {
  return useAppStore((state) => state.settings?.sound ?? true);
}

export function useMotionEnabled(): boolean {
  const reduced = useAppStore((state) => state.settings?.reducedMotion ?? false);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setSystemReduced(event.matches);
    query.addEventListener?.('change', handler);
    return () => query.removeEventListener?.('change', handler);
  }, []);

  return !reduced && !systemReduced;
}
