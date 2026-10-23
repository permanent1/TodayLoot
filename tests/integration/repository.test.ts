import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  commitAppraisal,
  destroyItem,
  ensurePlayer,
  getItemsByRequestKey,
  getBountyDay,
  getPlayer,
  listItems,
  lockItem,
  saveSettings,
} from '@/lib/db/repository';
import { getDb, resetDbForTests } from '@/lib/db/db';
import { getCachedCutout, saveCachedCutout } from '@/lib/db/cutouts';
import { makeVision } from '../helpers/vision';
import type { CommitAppraisalParams } from '@/lib/db/repository';
import { localDayKey } from '@/lib/utils/text';

const NOW = new Date('2026-10-22T10:00:00Z').getTime();

function params(overrides: Partial<CommitAppraisalParams> = {}): CommitAppraisalParams {
  return {
    requestKey: `req-${Math.random().toString(16).slice(2)}`,
    vision: makeVision(),
    mode: 'hunt',
    persona: 'ali',
    userNote: '它陪我加了很多班',
    analysisSource: 'mock',
    imageBlob: new Blob(['fake-image-bytes'], { type: 'image/jpeg' }),
    imageMime: 'image/jpeg',
    imageWidth: 800,
    imageHeight: 600,
    bountyIds: ['not-a-task', 'not-a-task', 'not-a-task'],
    now: NOW,
    ...overrides,
  };
}

beforeEach(async () => {
  try {
    const db = getDb();
    await db.delete();
  } catch {
    // 数据库可能尚未创建
  }
  resetDbForTests();
});

describe('玩家与提交事务', () => {
  it('首次调用创建初始玩家，余额为 0', async () => {
    const player = await ensurePlayer();
    expect(player.coins).toBe(0);
    expect(player.totalIdentify).toBe(0);
    expect(player.modelPasses).toBe(0);
    expect(player.pity).toEqual({ epic: 0, gold: 0, red: 0 });
  });

  it('一次提交原子写入藏品、审计记录、图片与玩家状态', async () => {
    const requestKey = 'req-atomic';
    const { item, reused } = await commitAppraisal(params({ requestKey }));
    expect(reused).toBe(false);
    expect(item.status).toBe('pending_lock');
    expect(item.analysisSource).toBe('mock');
    expect(item.name).toBeTruthy();
    expect(item.worth.low).toBeLessThanOrEqual(item.worth.high);

    const player = await getPlayer();
    expect(player.totalIdentify).toBe(1);
    expect(player.daily.completed).toBe(1);

    const db = getDb();
    expect(await db.appraisals.where('requestKey').equals(requestKey).count()).toBe(1);
    expect(await db.assets.count()).toBe(1);

    const found = await getItemsByRequestKey(requestKey);
    expect(found?.id).toBe(item.id);
  });

  it('相同 requestKey 重复提交不增加次数、不重复发奖励', async () => {
    const requestKey = 'req-idempotent';
    const first = await commitAppraisal(params({ requestKey }));
    const coinsAfterFirst = (await getPlayer()).coins;

    const second = await commitAppraisal(params({ requestKey }));
    expect(second.reused).toBe(true);
    expect(second.item.id).toBe(first.item.id);

    const player = await getPlayer();
    expect(player.totalIdentify).toBe(1);
    expect(player.coins).toBe(coinsAfterFirst);
    expect(await getDb().appraisals.count()).toBe(1);
    expect(await getDb().assets.count()).toBe(1);
  });

  it('并发提交两个不同请求时计数串行累加', async () => {
    await Promise.all([
      commitAppraisal(params({ requestKey: 'req-concurrent-a' })),
      commitAppraisal(params({ requestKey: 'req-concurrent-b' })),
    ]);
    const player = await getPlayer();
    expect(player.totalIdentify).toBe(2);
    expect(await getDb().items.count()).toBe(2);
  });

  it('关闭图片保留后不写入 Blob，藏品仍可创建', async () => {
    await saveSettings({ keepOriginal: false });
    const { item } = await commitAppraisal(
      params({
        requestKey: 'req-no-image',
        cutoutBlob: new Blob(['cutout-bytes'], { type: 'image/png' }),
      }),
    );
    expect(item.originalImageId).toBe('');
    expect(item.cutoutImageId).toBeUndefined();
    expect(await getDb().assets.count()).toBe(0);
  });

  it('提交时保存抠图资产并关联到藏品', async () => {
    const { item } = await commitAppraisal(
      params({
        requestKey: 'req-cutout',
        cutoutBlob: new Blob(['cutout-png-bytes'], { type: 'image/png' }),
        cutoutWidth: 800,
        cutoutHeight: 600,
      }),
    );
    expect(item.cutoutImageId).toBeTruthy();
    const assets = await getDb().assets.toArray();
    expect(assets).toHaveLength(2);
    expect(assets.some((asset) => asset.mime === 'image/png')).toBe(true);
  });
});

describe('抠图缓存', () => {
  it('按 hash 读取与写入抠图缓存', async () => {
    const blob = new Blob(['cached-cutout'], { type: 'image/png' });
    await saveCachedCutout({
      id: '1:hash-abc',
      blob,
      mime: 'image/png',
      width: 640,
      height: 480,
      model: 'isnet_quint8',
      createdAt: new Date().toISOString(),
    });
    const cached = await getCachedCutout('1:hash-abc');
    expect(cached?.width).toBe(640);
    expect(cached?.height).toBe(480);
    expect(cached?.blob.size).toBe(blob.size);
    expect(await getCachedCutout('1:missing')).toBeUndefined();
  });
});

describe('入藏与生命周期', () => {
  it('收入展厅后状态为 kept，重复调用幂等', async () => {
    const { item } = await commitAppraisal(params({ requestKey: 'req-lock' }));
    const locked = await lockItem(item.id, NOW + 1000);
    expect(locked?.status).toBe('kept');
    const again = await lockItem(item.id, NOW + 2000);
    expect(again?.status).toBe('kept');
  });

  it('传说藏品入藏发放建模券，当日最多 1 张', async () => {
    const db = getDb();
    const first = await commitAppraisal(
      params({ requestKey: 'req-legend-a', vision: makeVision() }),
    );
    await db.items.put({ ...first.item, rarity: 'legendary' });
    await lockItem(first.item.id, NOW + 1000);

    const second = await commitAppraisal(
      params({ requestKey: 'req-legend-b', vision: makeVision() }),
    );
    await db.items.put({ ...second.item, rarity: 'legendary' });
    await lockItem(second.item.id, NOW + 2000);

    const player = await getPlayer();
    expect(player.modelPasses).toBe(1);
    expect(player.daily.passesGranted).toBe(1);
  });

  it('每日悬赏三条命中奖励 20,000，且同日不重复发放', async () => {
    const dayKey = localDayKey(new Date(NOW));
    const bounty = await getBountyDay(dayKey);
    const ids = bounty.tasks.map((task) => task.id);
    const vision = makeVision({ bounty_match: [true, true, true] });

    await commitAppraisal(
      params({ requestKey: 'req-bounty-a', vision, bountyIds: ids }),
    );
    let player = await getPlayer();
    expect(player.coins).toBe(3 * 8000 + 20000);

    await commitAppraisal(
      params({
        requestKey: 'req-bounty-b',
        vision,
        bountyIds: ids,
        now: NOW + 60_000,
      }),
    );
    player = await getPlayer();
    expect(player.coins).toBe(44000);
  });

  it('碎卡后从展厅列表移除', async () => {
    const { item } = await commitAppraisal(params({ requestKey: 'req-destroy' }));
    await destroyItem(item.id);
    const list = await listItems();
    expect(list.find((entry) => entry.id === item.id)).toBeUndefined();
  });
});
