import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR ?? '/tmp/today-loot-shots';
fs.mkdirSync(SHOTS, { recursive: true });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

/** 拦截识别接口，避免 E2E 触发真实模型费用；返回结构标注为演示数据 */
async function stubIdentify(page: Page) {
  await page.route('**/api/identify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        vision: {
          name: '不锈钢保温杯',
          category: '饮水器具',
          scene: '办公室桌面',
          visibleFeatures: ['拉丝不锈钢杯身'],
          desc: '一只被会议、加班和深夜热水反复征用的保温杯。',
          dimensions: {
            rarity: 62,
            surprise: 58,
            value: 66,
            aesthetic: 54,
            craft: 72,
            story: 61,
            condition: 44,
            bond: 70,
          },
          valueScore: 46,
          affixes: ['金属疲劳'],
          broadcast: '它不保温一整天，但总能保温到你想起喝水的那一刻。',
          bounty_match: [false, false, false],
          description_bonus: 2,
          description_credibility: 'honest',
        },
        meta: { source: 'mock', demo: true, model: 'e2e-fixture' },
      }),
    }),
  );
}

test('全页面在 390px 宽度无横向溢出且无控制台异常', async ({ page }) => {
  const errors = collectErrors(page);
  for (const route of ['/', '/appraise', '/gallery', '/showroom', '/settings']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /今天\s*出货/ })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'home-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('完整鉴定闭环：样例照片 → 流程页 → 揭晓 → 战利品 → 珍藏柜 → 档案', async ({ page }) => {
  const errors = collectErrors(page);
  await stubIdentify(page);

  // 关闭本地抠图，避免 E2E 依赖 65MB 模型下载；抠图路径另行验证
  await page.goto('/settings');
  const cutoutSwitch = page.getByRole('switch', { name: '本地抠图' });
  if ((await cutoutSwitch.getAttribute('aria-checked')) === 'true') {
    await cutoutSwitch.click();
  }
  await page.goto('/appraise');
  await expect(page.getByRole('heading', { name: '鉴定台' })).toBeVisible();
  // 单一模式：不再有摸金 / 珍藏切换
  await expect(page.getByText('摸金')).toHaveCount(0);

  await page.getByRole('button', { name: /希腊风味酸奶/ }).click();
  await expect(page.getByAltText('待鉴定物件预览')).toBeVisible({ timeout: 20_000 });

  await page.locator('textarea').fill('它陪我加了很多班');
  await page.getByRole('button', { name: /阿黎/ }).click();
  await page.getByRole('button', { name: '史诗' }).click();

  await page.screenshot({ path: path.join(SHOTS, 'appraise-mobile.png'), fullPage: true });

  await page.getByRole('button', { name: /开始鉴定/ }).click();
  await page.waitForURL('**/appraise/run', { timeout: 20_000 });
  await page.screenshot({ path: path.join(SHOTS, 'appraise-run-mobile.png'), fullPage: false });

  await page.waitForURL(/\/reveal\//, { timeout: 60_000 });
  await page.getByRole('button', { name: /跳过/ }).click();
  await expect(page.getByText('已保存在战利品')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: path.join(SHOTS, 'reveal-mobile.png'), fullPage: false });

  await page.getByRole('button', { name: /查看背面/ }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(SHOTS, 'card-back-mobile.png'), fullPage: false });

  // 刷新后仍在战利品，不重复计次
  await page.reload();
  await expect(page.getByText('已保存在战利品')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /加入珍藏柜/ })).toBeVisible();

  await page.getByRole('button', { name: /加入珍藏柜/ }).click();
  await expect(page.getByText('已在珍藏柜')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: path.join(SHOTS, 'reveal-kept-mobile.png'), fullPage: true });

  await page.getByRole('link', { name: /查看藏品档案/ }).click();
  await page.waitForURL(/\/item\//);
  await expect(page.getByText('鉴定记录')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'item-mobile.png'), fullPage: true });

  // 已加入珍藏柜：默认「战利品」为空，切到「珍藏柜」应能看到卡
  await page.goto('/gallery');
  await page.getByRole('button', { name: /珍藏柜/ }).first().click();
  await expect(page.locator('a[href^="/item/"], a[href^="/reveal/"]').first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'gallery-mobile.png'), fullPage: true });

  await page.reload();
  await page.getByRole('button', { name: /珍藏柜/ }).first().click();
  await expect(page.locator('a[href^="/item/"], a[href^="/reveal/"]').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('效果陈列室可预览传说红卡且明确标注预览', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/showroom');
  await expect(page.getByRole('heading', { name: '效果陈列室' })).toBeVisible();
  await page.locator('#sample-3d').scrollIntoViewIfNeeded();
  await expect(page.locator('#sample-3d canvas')).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(1500);
  await page.locator('#sample-3d').screenshot({
    path: path.join(SHOTS, 'showroom-3d.png'),
  });
  await page.screenshot({ path: path.join(SHOTS, 'showroom-mobile.png'), fullPage: true });

  await page.getByRole('button', { name: /全屏预览传说出货/ }).click();
  await expect(page.getByText('效果预览 · 非真实结果')).toBeVisible();
  await page.getByRole('button', { name: /跳过/ }).click();
  await expect(page.getByRole('button', { name: /再看一次/ })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'legendary-preview-mobile.png'), fullPage: false });

  await page.getByRole('button', { name: /返回陈列室/ }).click();
  await expect(page.getByRole('heading', { name: '效果陈列室' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('桌面 1440px 使用双栏布局并提供桌面导航', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /今天\s*出货/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(SHOTS, 'home-desktop.png'), fullPage: false });

  for (const route of ['/appraise', '/gallery', '/showroom', '/settings']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  }
  await page.goto('/showroom');
  await page.screenshot({ path: path.join(SHOTS, 'showroom-desktop.png'), fullPage: false });
});

test('浅色主题可手动切换并在刷新后保持', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/settings');
  await page.getByRole('button', { name: '浅色 · 展厅' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /今天\s*出货/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(SHOTS, 'home-light-desktop.png'), fullPage: false });

  await page.getByRole('button', { name: '切换到深色主题' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/gallery');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(SHOTS, 'gallery-mobile-light.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('抠图失败在流程页如实回退原图相框且不阻断鉴定', async ({ page }) => {
  await stubIdentify(page);
  await page.route('https://staticimgly.com/**', (route) => route.abort());

  await page.goto('/settings');
  const cutoutSwitch = page.getByRole('switch', { name: '本地抠图' });
  if ((await cutoutSwitch.getAttribute('aria-checked')) === 'false') {
    await cutoutSwitch.click();
  }

  await page.goto('/appraise');
  await page.getByRole('button', { name: /蓝白机械键盘/ }).click();
  await expect(page.getByAltText('待鉴定物件预览')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /开始鉴定/ }).click();

  await page.waitForURL('**/appraise/run', { timeout: 20_000 });
  await expect(page.getByText(/抠图没成功，改用原图相框/)).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: path.join(SHOTS, 'cutout-fallback-mobile.png'), fullPage: true });

  await page.waitForURL(/\/reveal\//, { timeout: 60_000 });
  await page.getByRole('button', { name: /跳过/ }).click();
  await expect(page.getByText('已保存在战利品')).toBeVisible({ timeout: 20_000 });
});

test('设置页展示服务端模式且不出现任何密钥值', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '设置与备份' })).toBeVisible();
  await expect(page.getByText('密钥仅存在于服务端环境变量')).toBeVisible();
  const content = await page.content();
  expect(content).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
  await page.screenshot({ path: path.join(SHOTS, 'settings-mobile.png'), fullPage: true });
});
