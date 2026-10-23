import { getDb, type CutoutRow } from './db';

const MAX_CACHE_ENTRIES = 30;

export async function getCachedCutout(id: string): Promise<CutoutRow | undefined> {
  return getDb().cutouts.get(id);
}

export async function saveCachedCutout(row: CutoutRow): Promise<void> {
  const db = getDb();
  await db.cutouts.put(row);
  const count = await db.cutouts.count();
  if (count > MAX_CACHE_ENTRIES) {
    const oldest = await db.cutouts
      .orderBy('createdAt')
      .limit(count - MAX_CACHE_ENTRIES)
      .toArray();
    await db.cutouts.bulkDelete(oldest.map((entry) => entry.id));
  }
}
