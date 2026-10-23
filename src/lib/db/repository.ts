import type {
  BountyDay,
  CollectionItem,
  Mode,
  Persona,
  PlayerState,
  Rarity,
  VisionResult,
} from '@/types';
import {
  DEFAULT_SETTINGS,
  getDb,
  getDeviceId,
  type AssetRow,
  type PlayerRow,
  type SettingsRow,
} from './db';
import {
  appraise,
  buildCollectionItem,
  createInitialPlayer,
  normalizeDaily,
  PROMPT_VERSION,
  ENGINE_VERSION,
} from '@/features/game/engine';
import { detectNoteInjection, localDayKey, sanitizeNote } from '@/lib/utils/text';
import { generateBountyDay } from '@/features/bounties/generate';
import { secureRng } from '@/features/game/rng';
import { newId } from '@/lib/utils/id';

export interface CommitAppraisalParams {
  requestKey: string;
  vision: VisionResult;
  mode: Mode;
  persona: Persona;
  userNote?: string;
  predictedTier?: Rarity;
  predictedCoins?: number;
  analysisSource: 'qwen' | 'mock';
  imageBlob: Blob;
  imageMime: string;
  imageWidth?: number;
  imageHeight?: number;
  cutoutBlob?: Blob;
  cutoutWidth?: number;
  cutoutHeight?: number;
  bountyIds?: string[];
  now?: number;
}

export interface CommitAppraisalResult {
  item: CollectionItem;
  reused: boolean;
}

function toPlayer(row: PlayerRow): PlayerState {
  const { id: _id, ...rest } = row;
  return rest;
}

export async function ensurePlayer(): Promise<PlayerState> {
  const db = getDb();
  const deviceId = getDeviceId();
  return db.transaction('rw', db.player, async () => {
    const existing = await db.player.get('me');
    if (existing) return toPlayer(existing);
    const created = { ...createInitialPlayer(deviceId), id: 'me' as const };
    await db.player.put(created);
    return toPlayer(created);
  });
}

export async function getPlayer(): Promise<PlayerState> {
  const db = getDb();
  const row = await db.player.get('me');
  if (!row) return ensurePlayer();
  return toPlayer(row);
}

export async function getBountyDay(day = localDayKey()): Promise<BountyDay> {
  const db = getDb();
  const existing = await db.bounties.get(day);
  if (existing) return existing;
  const generated = generateBountyDay(day);
  await db.bounties.put(generated);
  return generated;
}

export async function commitAppraisal(
  params: CommitAppraisalParams,
): Promise<CommitAppraisalResult> {
  const db = getDb();
  const now = params.now ?? Date.now();
  const nowIso = new Date(now).toISOString();
  const dayKey = localDayKey(new Date(now));
  const deviceId = getDeviceId();
  const userNote = sanitizeNote(params.userNote ?? '');

  return db.transaction(
    'rw',
    [db.assets, db.items, db.appraisals, db.player, db.bounties, db.settings],
    async () => {
      const existing = await db.appraisals
        .where('requestKey')
        .equals(params.requestKey)
        .first();
      if (existing) {
        const item = await db.items.get(existing.itemId);
        if (item) return { item, reused: true };
      }
      // 导入备份后 appraisals 可能缺失，用 items.requestKey 兜底避免重复入账
      const itemByKey = await db.items
        .where('requestKey')
        .equals(params.requestKey)
        .first();
      if (itemByKey) return { item: itemByKey, reused: true };

      const playerRow = await db.player.get('me');
      const player = normalizeDaily(
        playerRow ? toPlayer(playerRow) : createInitialPlayer(deviceId),
        dayKey,
      );

      let bountyDay = await db.bounties.get(dayKey);
      if (!bountyDay) {
        bountyDay = generateBountyDay(dayKey);
        await db.bounties.put(bountyDay);
      }

      const bountyIds =
        params.bountyIds && params.bountyIds.length > 0
          ? params.bountyIds
          : bountyDay.tasks.map((t) => t.id);

      const newlyClaimed: string[] = [];
      bountyDay.tasks.forEach((task, index) => {
        const matchedByPosition =
          bountyIds[index] === task.id && Boolean(params.vision.bounty_match[index]);
        if (matchedByPosition && !task.claimed) newlyClaimed.push(task.id);
      });

      const tasksAfter = bountyDay.tasks.map((task) =>
        newlyClaimed.includes(task.id) ? { ...task, claimed: true } : task,
      );
      const allClaimed = tasksAfter.every((task) => task.claimed);
      const bonusEligible = allClaimed && !bountyDay.bonusClaimed;

      const noteInjection = detectNoteInjection(userNote);
      const outcome = appraise(player, params.vision, {
        mode: params.mode,
        persona: params.persona,
        predictedTier: params.predictedTier,
        predictedCoins: params.predictedCoins,
        bountyHits: newlyClaimed.length,
        bountyBonusEligible: bonusEligible,
        noteInjection,
        noteForItem: userNote,
        analysisSource: params.analysisSource,
        dayKey,
        now,
        rng: secureRng(),
      });

      const settingsRow = await db.settings.get('app');
      const keepImage = settingsRow?.keepOriginal ?? true;
      let assetId = '';
      if (keepImage) {
        assetId = newId();
        const asset: AssetRow = {
          id: assetId,
          blob: params.imageBlob,
          mime: params.imageMime,
          width: params.imageWidth,
          height: params.imageHeight,
          createdAt: nowIso,
        };
        await db.assets.add(asset);
      }

      let cutoutAssetId = '';
      if (keepImage && params.cutoutBlob) {
        cutoutAssetId = newId();
        const cutoutAsset: AssetRow = {
          id: cutoutAssetId,
          blob: params.cutoutBlob,
          mime: 'image/png',
          width: params.cutoutWidth,
          height: params.cutoutHeight,
          createdAt: nowIso,
        };
        await db.assets.add(cutoutAsset);
      }

      const item = buildCollectionItem({
        id: newId(),
        requestKey: params.requestKey,
        vision: params.vision,
        outcome,
        ctx: {
          mode: params.mode,
          persona: params.persona,
          predictedTier: params.predictedTier,
          predictedCoins: params.predictedCoins,
          noteInjection,
          noteForItem: userNote,
          analysisSource: params.analysisSource,
          rng: secureRng(),
        },
        originalImageId: assetId,
        cutoutImageId: cutoutAssetId || undefined,
        now,
      });

      await db.items.add(item);
      await db.appraisals.add({
        id: newId(),
        requestKey: params.requestKey,
        itemId: item.id,
        createdAt: nowIso,
        vision: params.vision,
        source: params.analysisSource,
        promptVersion: PROMPT_VERSION,
        engineVersion: ENGINE_VERSION,
      });
      await db.player.put({ ...outcome.nextPlayer, id: 'me' });
      await db.bounties.put({
        ...bountyDay,
        tasks: tasksAfter,
        bonusClaimed: bountyDay.bonusClaimed || bonusEligible,
      });

      return { item, reused: false };
    },
  );
}

export async function getItem(id: string): Promise<CollectionItem | undefined> {
  return getDb().items.get(id);
}

export async function getItemsByRequestKey(
  requestKey: string,
): Promise<CollectionItem | undefined> {
  return getDb().items.where('requestKey').equals(requestKey).first();
}

export async function listItems(): Promise<CollectionItem[]> {
  const db = getDb();
  const all = await db.items.toArray();
  return all
    .filter((item) => item.status !== 'destroyed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function lockItem(
  id: string,
  now = Date.now(),
): Promise<CollectionItem | undefined> {
  const db = getDb();
  return db.transaction('rw', [db.items, db.player], async () => {
    const item = await db.items.get(id);
    if (!item) return undefined;
    if (item.status !== 'pending_lock') return item;

    const dayKey = localDayKey(new Date(now));
    const row = await db.player.get('me');
    const player = normalizeDaily(
      row ? toPlayer(row) : createInitialPlayer(getDeviceId()),
      dayKey,
    );

    let modelPasses = player.modelPasses;
    const daily = { ...player.daily };
    if (item.rarity === 'legendary' && daily.passesGranted < 1 && modelPasses < 5) {
      modelPasses += 1;
      daily.passesGranted += 1;
    }

    const nowIso = new Date(now).toISOString();
    const updated: CollectionItem = {
      ...item,
      status: 'kept',
      acquiredAt: nowIso,
      updatedAt: nowIso,
      lastVisitAt: item.mode === 'keep' ? nowIso : item.lastVisitAt,
    };
    await db.items.put(updated);
    await db.player.put({
      ...player,
      id: 'me',
      modelPasses,
      daily,
      totalIdentify: player.totalIdentify,
    });
    return updated;
  });
}

export async function transferToKeep(id: string): Promise<CollectionItem | undefined> {
  const db = getDb();
  const item = await db.items.get(id);
  if (!item) return undefined;
  const updated: CollectionItem = {
    ...item,
    mode: 'keep',
    status: 'kept',
    updatedAt: new Date().toISOString(),
    lastVisitAt: item.lastVisitAt ?? new Date().toISOString(),
    visits: item.visits ?? 0,
  };
  await db.items.put(updated);
  return updated;
}

export async function visitItem(id: string): Promise<CollectionItem | undefined> {
  const db = getDb();
  const item = await db.items.get(id);
  if (!item) return undefined;
  const now = new Date().toISOString();
  const updated: CollectionItem = {
    ...item,
    visits: (item.visits ?? 0) + 1,
    lastVisitAt: now,
    updatedAt: now,
  };
  await db.items.put(updated);
  return updated;
}

export async function destroyItem(id: string): Promise<void> {
  const db = getDb();
  const item = await db.items.get(id);
  if (!item) return;
  await db.items.put({
    ...item,
    status: 'destroyed',
    updatedAt: new Date().toISOString(),
  });
}

export async function getSettings(): Promise<SettingsRow> {
  const db = getDb();
  const row = await db.settings.get('app');
  if (row) return { ...DEFAULT_SETTINGS, ...row };
  const created = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
  await db.settings.put(created);
  return created;
}

export async function saveSettings(
  patch: Partial<Omit<SettingsRow, 'id'>>,
): Promise<SettingsRow> {
  const db = getDb();
  const current = await getSettings();
  const updated: SettingsRow = {
    ...current,
    ...patch,
    id: 'app',
    updatedAt: new Date().toISOString(),
  };
  await db.settings.put(updated);
  return updated;
}

export async function getAsset(id: string): Promise<AssetRow | undefined> {
  return getDb().assets.get(id);
}

export interface GalleryStats {
  total: number;
  kept: number;
  pending: number;
  byRarity: Record<Rarity, number>;
}

export async function getGalleryStats(): Promise<GalleryStats> {
  const items = await listItems();
  const byRarity: Record<Rarity, number> = {
    common: 0,
    fine: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  items.forEach((item) => {
    byRarity[item.rarity] += 1;
  });
  return {
    total: items.length,
    kept: items.filter((i) => i.status === 'kept').length,
    pending: items.filter((i) => i.status === 'pending_lock').length,
    byRarity,
  };
}

export interface BackupFile {
  app: 'today-loot';
  version: 1;
  exportedAt: string;
  player: PlayerState;
  items: CollectionItem[];
  settings: SettingsRow;
  bounties: BountyDay[];
  assets: {
    id: string;
    mime: string;
    createdAt: string;
    width?: number;
    height?: number;
    data: string;
  }[];
  cutouts?: {
    id: string;
    mime: string;
    model: string;
    createdAt: string;
    width?: number;
    height?: number;
    data: string;
  }[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('图片读取失败'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportBackup(): Promise<BackupFile> {
  const db = getDb();
  const [player, items, settings, bounties, assets, cutouts] = await Promise.all([
    getPlayer(),
    listItems(),
    getSettings(),
    db.bounties.toArray(),
    db.assets.toArray(),
    db.cutouts.toArray(),
  ]);
  const encoded = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      mime: asset.mime,
      createdAt: asset.createdAt,
      width: asset.width,
      height: asset.height,
      data: await blobToBase64(asset.blob),
    })),
  );
  return {
    app: 'today-loot',
    version: 1,
    exportedAt: new Date().toISOString(),
    player,
    items,
    settings,
    bounties,
    assets: encoded,
    cutouts: await Promise.all(
      cutouts.map(async (cutout) => ({
        id: cutout.id,
        mime: cutout.mime,
        model: cutout.model,
        createdAt: cutout.createdAt,
        width: cutout.width,
        height: cutout.height,
        data: await blobToBase64(cutout.blob),
      })),
    ),
  };
}

export async function importBackup(input: unknown): Promise<{ items: number }> {
  if (!input || typeof input !== 'object') throw new Error('备份文件格式不正确');
  const data = input as Partial<BackupFile>;
  if (data.app !== 'today-loot' || data.version !== 1) {
    throw new Error('备份文件版本不受支持');
  }
  if (!Array.isArray(data.items) || !Array.isArray(data.assets)) {
    throw new Error('备份文件缺少藏品或图片数据');
  }

  const db = getDb();
  await db.transaction(
    'rw',
    [db.assets, db.items, db.appraisals, db.player, db.bounties, db.settings, db.cutouts],
    async () => {
      await Promise.all([
        db.assets.clear(),
        db.items.clear(),
        db.appraisals.clear(),
        db.player.clear(),
        db.bounties.clear(),
        db.cutouts.clear(),
      ]);
      const assetRows: AssetRow[] = data.assets!.map((asset) => ({
        id: asset.id,
        blob: base64ToBlob(asset.data, asset.mime),
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
        createdAt: asset.createdAt,
      }));
      await db.assets.bulkPut(assetRows);
      await db.items.bulkPut(data.items!);
      if (data.player) await db.player.put({ ...data.player, id: 'me' });
      if (Array.isArray(data.bounties)) await db.bounties.bulkPut(data.bounties);
      if (Array.isArray(data.cutouts)) {
        await db.cutouts.bulkPut(
          data.cutouts.map((cutout) => ({
            id: cutout.id,
            blob: base64ToBlob(cutout.data, cutout.mime),
            mime: cutout.mime,
            model: cutout.model,
            width: cutout.width,
            height: cutout.height,
            createdAt: cutout.createdAt,
          })),
        );
      }
      if (data.settings) await db.settings.put({ ...DEFAULT_SETTINGS, ...data.settings });
    },
  );
  return { items: data.items.length };
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    'rw',
    [db.assets, db.items, db.appraisals, db.player, db.bounties, db.modelTasks, db.cutouts],
    async () => {
      await Promise.all([
        db.assets.clear(),
        db.items.clear(),
        db.appraisals.clear(),
        db.player.clear(),
        db.bounties.clear(),
        db.modelTasks.clear(),
        db.cutouts.clear(),
      ]);
    },
  );
}
