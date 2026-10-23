import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto('http://localhost:3200/appraise');
await page.locator('input[type=file]').first().setInputFiles('/workspace/images/image2.jpg');
await page.getByAltText('待鉴定物件预览').waitFor({ timeout: 20_000 });
console.log('image ready');

let ready = false;
let failed = false;
for (let i = 0; i < 36; i += 1) {
  ready = await page.getByText('已抠图 · 透明主体').isVisible().catch(() => false);
  failed = await page.getByText('本地抠图失败，已切换相框模式').isVisible().catch(() => false);
  if (ready || failed) break;
  console.log(`cutout waiting... ${(i + 1) * 5}s`);
  await page.waitForTimeout(5000);
}

if (!ready) {
  console.log('cutout did not succeed; failed=', failed);
  console.log('errors:', errors.slice(0, 5));
  await page.screenshot({ path: '/tmp/cutout-failed.png', fullPage: true });
  await browser.close();
  process.exit(failed ? 2 : 3);
}

console.log('cutout ready');
await page.screenshot({ path: '/tmp/cutout-appraise.png', fullPage: true });

await page.locator('textarea').fill('它陪我改过很多版方案');
await page.getByRole('button', { name: /开始鉴定/ }).click();
await page.waitForURL(/\/reveal\//, { timeout: 45_000 });
await page.getByRole('button', { name: /收入展厅/ }).waitFor({ timeout: 25_000 });
await page.screenshot({ path: '/tmp/cutout-card.png' });

await page.getByRole('button', { name: /收入展厅/ }).click();
await page.getByText('已收入展厅').waitFor({ timeout: 10_000 });
await page.screenshot({ path: '/tmp/cutout-card-locked.png', fullPage: true });

await page.goto('http://localhost:3200/gallery');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/cutout-gallery.png', fullPage: true });

console.log('errors:', errors.slice(0, 8));
await browser.close();
