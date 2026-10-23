import Dexie, { type EntityTable } from 'dexie';
import { newId } from '@/lib/utils/id';
import type {
  BountyDay,
  CollectionItem,
  PlayerState,
  VisionResult,
} from '@/types';

export interface AssetRow {
  id: string;
  blob: Blob;
  mime: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface AppraisalRow {
  id: string;
  requestKey: string;
  itemId: string;
  createdAt: string;
  vision: VisionResult;
  source: 'qwen' | 'mock';
  promptVersion: string;
  engineVersion: string;
}

export interface SettingsRow {
  id: 'app';
  sound: boolean;
  reducedMotion: boolean;
  keepOriginal: boolean;
  removeBg: boolean;
  updatedAt: string;
}

export interface CutoutRow {
  id: string;
  blob: Blob;
  mime: string;
  width?: number;
  height?: number;
  model: string;
  createdAt: string;
}

export interface ModelTaskRow {
  id: string;
  itemId: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  progress?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlayerRow = PlayerState & { id: 'me' };

class TodayLootDB extends Dexie {
  assets!: EntityTable<AssetRow, 'id'>;
  items!: EntityTable<CollectionItem, 'id'>;
  appraisals!: EntityTable<AppraisalRow, 'id'>;
  player!: EntityTable<PlayerRow, 'id'>;
  bounties!: EntityTable<BountyDay, 'day'>;
  settings!: EntityTable<SettingsRow, 'id'>;
  modelTasks!: EntityTable<ModelTaskRow, 'id'>;
  cutouts!: EntityTable<CutoutRow, 'id'>;

  constructor() {
    super('today-loot');
    this.version(1).stores({
      assets: 'id, createdAt',
      items: 'id, requestKey, status, mode, rarity, createdAt, acquiredAt',
      appraisals: 'id, &requestKey, itemId, createdAt',
      player: 'id',
      bounties: 'day',
      settings: 'id',
      modelTasks: 'id, status, createdAt',
    });
    this.version(2).stores({
      assets: 'id, createdAt',
      items: 'id, requestKey, status, mode, rarity, createdAt, acquiredAt',
      appraisals: 'id, &requestKey, itemId, createdAt',
      player: 'id',
      bounties: 'day',
      settings: 'id',
      modelTasks: 'id, status, createdAt',
      cutouts: 'id, createdAt',
    });
  }
}

let singleton: TodayLootDB | null = null;

export function getDb(): TodayLootDB {
  if (!singleton) singleton = new TodayLootDB();
  return singleton;
}

export function resetDbForTests(): void {
  if (singleton) {
    singleton.close();
    singleton = null;
  }
}

const DEVICE_KEY = 'today-loot:device-id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = newId();
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'restricted-storage';
  }
}

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 'app',
  sound: true,
  reducedMotion: false,
  keepOriginal: true,
  removeBg: true,
  updatedAt: new Date(0).toISOString(),
};
