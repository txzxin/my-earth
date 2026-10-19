import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#earth-stage')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
});

test('renders a real WebGL earth with no runtime errors or horizontal overflow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.reload();
  await expect(page.locator('#earth-stage')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.locator('canvas').evaluate(canvas => !!canvas.getContext('webgl2'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('Chinese aliases and English search fly to the correct hemispheres', async ({ page }) => {
  const input = page.locator('#search-input');
  await input.fill('珠峰');
  await expect(page.getByRole('option').first()).toContainText('珠穆朗玛峰');
  await input.press('Enter');
  await expect(page.locator('.place-name')).toHaveText('珠穆朗玛峰');
  await expect.poll(async () => Number(await page.locator('#earth-stage').getAttribute('data-lat'))).toBeCloseTo(27.9881, 0);
  await input.fill('Buenos Aires');
  await input.press('Enter');
  await expect(page.locator('.place-name')).toHaveText('布宜诺斯艾利斯');
  await expect.poll(async () => Number(await page.locator('#earth-stage').getAttribute('data-lat'))).toBeLessThan(-30);
  await input.fill('不存在的地名xyz');
  await expect(page.locator('.no-results')).toContainText('还没找到');
  await page.locator('#search-clear').click();
  await input.fill('北京');
  await page.getByRole('button', { name: '城市', exact: true }).click();
  await expect(page.getByRole('option').first()).toContainText('北京');
});

test('all five layers and all four overlays are interactive', async ({ page }) => {
  for (const layer of ['countries', 'terrain', 'cities', 'nature', 'natural']) {
    await page.locator(`[data-layer="${layer}"]`).click();
    await expect(page.locator(`[data-layer="${layer}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  for (const overlay of ['borders', 'grid', 'labels', 'terminator']) {
    const input = page.locator(`[data-overlay="${overlay}"]`);
    const checked = await input.isChecked();
    await input.locator('..').click();
    expect(await input.isChecked()).toBe(!checked);
  }
});

test('daylight, city lights and the time slider change the earth', async ({ page }) => {
  const canvas = page.locator('canvas');
  const initial = await canvas.screenshot();
  await page.locator('#daylight-toggle').locator('..').click();
  await expect(page.locator('#lights-toggle')).toBeDisabled();
  const fullDay = await canvas.screenshot();
  expect(initial.equals(fullDay)).toBe(false);
  await page.locator('#daylight-toggle').locator('..').click();
  await page.locator('#lights-toggle').locator('..').click();
  await page.locator('#lights-toggle').locator('..').click();
  const before = await page.locator('#solar-coords').innerText();
  await page.locator('#time-slider').press('End');
  await expect(page.locator('#time-badge')).toHaveText('模拟');
  expect(await page.locator('#solar-coords').innerText()).not.toBe(before);
  await expect(page.locator('#timeline-title')).toHaveText('未来 12 小时');
  await page.locator('#time-reset').click();
  await expect(page.locator('#time-badge')).toHaveText('实时');
  await expect(page.locator('#time-slider')).toHaveValue('0');
});

test('zoom, drag, automatic rotation and country picking work', async ({ page, isMobile }) => {
  const stage = page.locator('#earth-stage');
  const initial = Number(await stage.getAttribute('data-distance'));
  await page.locator('#zoom-in').click();
  await expect.poll(async () => Number(await stage.getAttribute('data-distance'))).toBeLessThan(initial - 0.1);
  await page.locator('#zoom-out').click();
  await expect.poll(async () => Number(await stage.getAttribute('data-distance'))).toBeGreaterThan(initial - 0.1);
  if (!isMobile) {
    const bounds = await page.locator('canvas').boundingBox();
    const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
    const before = Number(await stage.getAttribute('data-lon'));
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 120, y + 30, { steps: 12 }); await page.mouse.up();
    await expect.poll(async () => Math.abs(Number(await stage.getAttribute('data-lon')) - before)).toBeGreaterThan(10);
    const dist = Number(await stage.getAttribute('data-distance'));
    await page.mouse.wheel(0, -220);
    await expect.poll(async () => Number(await stage.getAttribute('data-distance'))).toBeLessThan(dist);
  }
  await page.locator('#rotate-toggle').click();
  await expect(page.locator('#rotate-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#rotate-toggle').click();
  await page.locator('#reset-view').click();
  await expect.poll(async () => Number(await stage.getAttribute('data-lon'))).toBeCloseTo(106, 0);
  await page.locator('#search-input').fill('中国');
  await page.locator('#search-input').press('Enter');
  await expect(page.locator('.place-name')).toHaveText('中国');
  await expect.poll(async () => Number(await stage.getAttribute('data-lat'))).toBeCloseTo(32.4982, 2);
  await page.locator('[data-overlay="labels"]').locator('..').click();
  await expect(page.locator('[data-overlay="labels"]')).not.toBeChecked();
  const bounds = await page.locator('canvas').boundingBox();
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.locator('.place-name')).toHaveText('中国');
});

test('geography quiz gives feedback, scores answers and restarts', async ({ page }) => {
  await page.locator('#quiz-open').click();
  await expect(page.locator('#modal')).toBeVisible();
  for (const correct of [1, 2, 3, 0, 1]) {
    await page.locator(`[data-answer="${correct}"]`).click();
    await expect(page.locator('#quiz-feedback')).toContainText('答对了');
    await page.locator('#quiz-next').click();
  }
  await expect(page.locator('.quiz-score')).toContainText('5');
  await page.locator('#quiz-restart').click();
  await expect(page.locator('.quiz-options')).toBeVisible();
  await page.locator('#modal-close').click();
  await expect(page.locator('#modal')).not.toBeVisible();
});

test('discovery routes, information and help open useful content', async ({ page }) => {
  await page.locator('[data-destination="亚马孙河"]').click();
  await expect(page.locator('.place-name')).toHaveText('亚马孙河');
  await page.locator('#sources-open').click();
  await expect(page.locator('#modal-content')).toContainText('并非实时拍摄');
  await page.locator('#modal-close').click();
  await page.locator('#help-open').click();
  await expect(page.locator('#modal-content')).toContainText('滚轮 / 双指');
});
