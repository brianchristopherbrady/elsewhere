import { changeAppearance } from './appearance';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function chooseDate(page: Page) {
  await page.goto('/#my-day');
  await page.getByLabel('Date of your day', { exact: true }).fill('2026-09-26');
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Caffe Vita at KEXP', exact: true }).click();
}

test('Discover collects ideas independently, builder supports optional times and map review', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('[data-stop]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Caffe Vita at KEXP', exact: true }).click();
  await page.getByRole('button', { name: 'Save Sub Pop at KEXP', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-row')).toHaveCount(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!))).toEqual([]);
  await page.reload();
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await expect(page.getByRole('heading', { name: 'Choose a date' })).toBeVisible();
  await page.getByLabel('Date of your day', { exact: true }).fill('2026-09-26');
  await page.getByLabel('Day title', { exact: true }).fill('Coffee and records');
  await page.getByLabel('Custom tags').fill('Friends, music');
  await page.getByLabel('Day notes', { exact: true }).fill('Meet near Seattle Center');
  await page.getByRole('button', { name: 'Add to day: Caffe Vita at KEXP', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Sub Pop at KEXP', exact: true }).click();
  await expect(page.getByLabel('Arrival for Caffe Vita at KEXP', { exact: true })).toHaveValue('');
  await page.getByLabel('Arrival for Caffe Vita at KEXP', { exact: true }).fill('10:00');
  await page.getByLabel('Notes for Caffe Vita at KEXP', { exact: true }).fill('Window seat');
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('.day-totals')).toContainText('Open-ended');
  await expect(page.locator('.travel-legs')).toContainText('km /');
  await expect(page.locator('.leaflet-marker-icon')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await page.getByLabel('Departure for Caffe Vita at KEXP', { exact: true }).fill('11:00');
  await page.getByLabel('Arrival for Sub Pop at KEXP', { exact: true }).fill('11:15');
  await page.getByLabel('Departure for Sub Pop at KEXP', { exact: true }).fill('12:00');
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('.day-totals')).toContainText('120 min');
  await expect(page.locator('.day-totals')).toContainText('12.0 hours');
  await page.screenshot({ path: 'test-results/day-review-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await expect(page).toHaveURL(/#my-day$/);
  await page.getByRole('button', { name: 'Move Elliott Bay Book Company earlier', exact: true }).click();
  await expect(page.locator('[data-stop]').nth(1)).toHaveAttribute('data-stop', 'elliott-bay-books');
  const reorder = page.getByRole('button', { name: 'Reorder Elliott Bay Book Company', exact: true });
  await reorder.focus();
  await page.keyboard.press('Space');
  await expect(reorder).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText('over droppable area stop-vita-kexp');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-stop]').first()).toHaveAttribute('data-stop', 'elliott-bay-books');
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel('Day title')).toHaveValue('Coffee and records');
  await expect(page.getByLabel('Notes for Caffe Vita at KEXP')).toHaveValue('Window seat');
  expect(errors).toEqual([]);
});

test('saved calendar moves and edits the same day without deleting ideas', async ({ page, baseURL }) => {
  const credentials = { name: 'Planner', email: `calendar-${crypto.randomUUID()}@example.com`, password: 'abcdefghi!' };
  expect((await page.request.post('/api/auth/sign-up/email', { data: credentials, headers: { origin: baseURL! } })).ok()).toBe(true);
  expect((await page.request.post('/api/auth/sign-in/email', { data: credentials, headers: { origin: baseURL! } })).ok()).toBe(true);
  await chooseDate(page);
  await page.getByLabel('Day title').fill('Saturday coffee');
  await page.getByLabel('Custom tags').fill('Friends, relaxed');
  await page.getByLabel('Day notes', { exact: true }).fill('No rush');
  await page.getByLabel('Arrival for Caffe Vita at KEXP').fill('10:00');
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save day', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const initial = (await (await page.request.get('/api/days')).json()).days[0];
  await page.getByRole('navigation').getByRole('link', { name: /^My Calendar/ }).click();
  await page.getByLabel('Go to month').fill('2026-09');
  const card = page.getByRole('article', { name: 'Saturday coffee' });
  await expect(card).toContainText('Friends');
  await card.getByRole('button', { name: 'Reschedule Saturday coffee' }).click();
  await expect(page.getByRole('button', { name: 'Move day', exact: true })).toBeDisabled();
  await page.getByLabel('New date').fill('2026-09-27');
  await page.route('**/api/days/*', route => route.fulfill({ status: 503, json: { message: 'Could not move this day.' } }));
  await page.getByRole('button', { name: 'Move day', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not move this day.');
  expect((await (await page.request.get('/api/days')).json()).days[0].date).toBe('2026-09-26');
  await page.unroute('**/api/days/*');
  await page.getByRole('button', { name: 'Move day', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-date="2026-09-27"]').getByRole('article')).toBeVisible();
  const handle = card.getByRole('button', { name: 'Drag Saturday coffee to another date' });
  await handle.focus();
  await handle.scrollIntoViewIfNeeded();
  await expect(handle).toBeEnabled();
  const source = await handle.boundingBox(); const target = await page.locator('[data-date="2026-09-28"]').boundingBox();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2); await page.mouse.down();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 30, { steps: 20 }); await page.mouse.up();
  await expect(page.locator('[data-date="2026-09-28"]').getByRole('article')).toBeVisible();
  await card.getByRole('button', { name: 'Edit Saturday coffee', exact: true }).click();
  await page.getByRole('button', { name: 'Edit day', exact: true }).click();
  await expect(page.getByLabel('Day notes', { exact: true })).toHaveValue('No rush');
  await page.reload();
  await page.getByLabel('Day title').fill('Monday coffee');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const days = (await (await page.request.get('/api/days')).json()).days;
  expect(days).toHaveLength(1); expect(days[0]).toMatchObject({ id: initial.id, date: '2026-09-28', name: 'Monday coffee', tags: ['Friends', 'relaxed'], notes: 'No rush' });
  expect(days[0].stops[0]).toMatchObject({ start: 600, duration: null });
  await page.getByLabel('Day title').fill('Sunday brunch');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Save your day' });
  await expect(saveDialog).toContainText('Monday coffee');
  await saveDialog.getByRole('button', { name: 'Save as new day', exact: true }).click();
  await expect(saveDialog).toHaveCount(0);
  const both = (await (await page.request.get('/api/days')).json()).days as { id: string; name: string }[];
  expect(both.map(day => day.name).sort()).toEqual(['Monday coffee', 'Sunday brunch']);
  expect(both.find(day => day.name === 'Monday coffee')?.id).toBe(initial.id);
  await page.getByRole('navigation').getByRole('link', { name: /^My Calendar/ }).click();
  await page.getByLabel('Go to month').fill('2026-09');
  await page.screenshot({ path: 'test-results/planned-calendar-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Remove Monday coffee', exact: true }).click();
  await page.getByRole('button', { name: 'Remove day', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove Sunday brunch', exact: true }).click();
  await page.getByRole('button', { name: 'Remove day', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
  expect((await (await page.request.get('/api/days')).json()).days).toEqual([]);
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Save day', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
});

test('date picker supports keyboard selection and narrow screens', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#my-day');
  const today = page.locator('.rdp-today button');
  await today.focus();
  await page.screenshot({ path: 'test-results/date-picker-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Friday, September 18, 2026' })).toBeVisible();
  await expect(page.getByLabel('Day title')).toBeVisible();
});

test('builder and calendar reflow across themes and mobile widths', async ({ page }) => {
  test.setTimeout(120_000);
  await chooseDate(page);
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      for (const width of [320, 375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
  await changeAppearance(page, 'Field Journal');
  await changeAppearance(page, 'Light mode');
  await page.screenshot({ path: 'test-results/day-builder-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/day-builder-mobile.png', fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: /^My Calendar/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/planned-calendar-mobile.png', fullPage: true });
});