import { changeAppearance } from './appearance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('elsewhere:seattle:stops') === null) {
      localStorage.setItem('elsewhere:seattle:stops', JSON.stringify([{ id: 'vita-kexp', start: 570, duration: 60 }, { id: 'sub-pop-kexp', start: 660, duration: 45 }, { id: 'olympic-sculpture-park', start: 750, duration: 75 }]));
      localStorage.setItem('elsewhere:seattle:date', JSON.stringify('2026-09-19'));
    }
  });
});

test('explore keeps a single itinerary and map follows reordered stops', async ({ page }) => {
  await page.goto('/#my-day');
  await expect(page.getByRole('button', { name: 'Split view', exact: true })).toHaveCount(0);
  await expect(page.locator('.map-canvas')).toHaveCount(0);
  await expect(page.locator('.day-builder')).toBeVisible();
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByLabel('Search activity options').fill('Elliott');
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('[data-leg]')).toHaveCount(3);
  const pin = page.getByRole('button', { name: 'Explore Elliott Bay Book Company on map', exact: true });
  await expect(pin).toHaveText('4');
  await pin.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Elliott Bay Book Company', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close Elliott Bay Book Company' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pin).toBeFocused();
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  const handle = page.getByRole('button', { name: 'Reorder Elliott Bay Book Company', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText('over droppable area stop-olympic-sculpture-park');
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(pin).toHaveText('3');
  await expect(page.locator('[data-leg]').last()).toHaveAttribute('data-leg', 'elliott-bay-books-olympic-sculpture-park');
  await expect(page.locator('.travel-label')).toHaveCount(3);
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await expect(page.getByLabel('Search activity options')).toHaveValue('Elliott');
  await expect(page.locator('.day-builder')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-stop]').nth(2)).toHaveAttribute('data-stop', 'elliott-bay-books');
});

test('mobile switches between exploration, itinerary, and planned map without losing state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('.saved-activities')).toHaveCount(0);
  await expect(page.getByRole('navigation').getByRole('link', { name: /^Saved items/ })).toBeVisible();
  await page.getByRole('button', { name: 'Save Elliott Bay Book Company', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await expect(page.locator('.day-builder')).toBeVisible();
  await expect(page.locator('.discovery')).toHaveCount(0);
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('.builder-stops')).toHaveCount(0);
  await expect(page.locator('.map-canvas')).toBeVisible();
  await expect(page.locator('[data-leg]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await expect(page.getByLabel('Search activity options')).toBeVisible();
  await expect(page.locator('[data-stop]')).toHaveCount(4);
});

test('day map survives six themes and responsive widths with accessible controls', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/#my-day');
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      for (const width of [320, 375, 768, 850, 851, 1024, 1280, 1536]) {
        await page.setViewportSize({ width, height: 960 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${lens} ${mode} ${width}`).toBeLessThanOrEqual(1);
        const map = await page.locator('.map-canvas').boundingBox();
        expect(map!.height).toBeGreaterThanOrEqual(360);
        expect(map!.width).toBeGreaterThan(250);
      }
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) }))).toEqual([]);
    }
  }
});

test('empty and single-stop maps have no invented travel legs', async ({ page }) => {
  await page.goto('/#my-day');
  await page.evaluate(() => localStorage.setItem('elsewhere:seattle:stops', '[]'));
  await page.reload();
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.getByText('Your day is empty.', { exact: true })).toBeVisible();
  await expect(page.locator('.place-pin')).toHaveCount(0);
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('.place-pin')).toHaveCount(1);
  await expect(page.locator('[data-leg]')).toHaveCount(0);
});

test('pointer reorder updates map labels and preserves scheduled times', async ({ page }) => {
  await page.goto('/#my-day');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!));
  const handle = page.getByRole('button', { name: 'Reorder Caffe Vita at KEXP', exact: true });
  const target = page.getByRole('button', { name: 'Reorder Sub Pop at KEXP', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const start = (await handle.boundingBox())!;
  const end = (await target.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + 20, start.y + 20, { steps: 5 });
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2 + 30, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator('[data-stop]').first()).toHaveAttribute('data-stop', 'sub-pop-kexp');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!));
  expect(after.map((stop: { id: string }) => stop.id)).not.toEqual(before.map((stop: { id: string }) => stop.id));
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('[data-leg]').first()).toHaveAttribute('data-leg', `${after[0].id}-${after[1].id}`);
  expect(after.find((stop: { id: string }) => stop.id === 'vita-kexp')).toEqual(before[0]);
});