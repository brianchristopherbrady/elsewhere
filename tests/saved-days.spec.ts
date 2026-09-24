import { changeAppearance } from './appearance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('elsewhere:seattle:stops') === null) {
      localStorage.setItem('elsewhere:seattle:stops', JSON.stringify([{ id: 'vita-kexp', start: 570, duration: 60 }, { id: 'sub-pop-kexp', start: 660, duration: 45 }, { id: 'olympic-sculpture-park', start: 750, duration: 75 }]));
      localStorage.setItem('elsewhere:seattle:date', JSON.stringify('2026-09-19'));
    }
  });
  const body = { name: 'Day Planner', email: `saved-${crypto.randomUUID()}@example.com`, password: 'Test account password 9123!' };
  expect((await page.request.post('/api/auth/sign-up/email', { data: body, headers: { origin: baseURL! } })).ok()).toBe(true);
  expect((await page.request.post('/api/auth/sign-in/email', { data: body, headers: { origin: baseURL! } })).ok()).toBe(true);
});

test('saved days survive a new session independently of My day and can be reopened and deleted', async ({ page, browser, baseURL }) => {
  test.setTimeout(60_000);
  await page.goto('/#my-day');
  await page.getByText('Change date', { exact: true }).click();
  await page.getByLabel('Date of your day').fill('2026-09-22');
  await page.getByLabel('Departure for Caffe Vita at KEXP').fill('11:45');
  await page.getByLabel('Arrival for Caffe Vita at KEXP').fill('10:15');
  await page.getByRole('button', { name: 'Move Caffe Vita at KEXP later', exact: true }).click();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!));
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByLabel('Day name').fill('Waterfront Tuesday');
  await page.getByRole('dialog', { name: 'Save your day' }).getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Caffe Vita at KEXP from day' }).click();
  await page.getByLabel('Date of your day').fill('2026-09-23');
  const storageState = await page.context().storageState();
  await page.close();
  const nextSession = await browser.newContext({ storageState });
  try {
    const reopened = await nextSession.newPage();
    await reopened.goto(`${baseURL}/#saved`);
    const card = reopened.getByRole('article', { name: 'Waterfront Tuesday' });
    await expect(reopened.locator('[data-date="2026-09-22"]').getByRole('article')).toBeVisible();
    await expect(card).toContainText('3 activities');
    await card.getByRole('button', { name: 'Edit Waterfront Tuesday', exact: true }).click();
    await reopened.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await reopened.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!).length)).toBe(2);
    await card.getByRole('button', { name: 'Edit Waterfront Tuesday', exact: true }).click();
    await reopened.getByRole('button', { name: 'Edit day', exact: true }).click();
    await expect(reopened.getByLabel('Arrival for Caffe Vita at KEXP')).toHaveValue('10:15');
    await expect(reopened.getByLabel('Departure for Caffe Vita at KEXP')).toHaveValue('11:45');
    await expect(reopened.locator('[data-stop]')).toHaveCount(3);
    await expect.poll(() => reopened.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!))).toEqual(original);
    await reopened.reload();
    await expect(reopened.locator('[data-stop]')).toHaveCount(3);
    await reopened.getByRole('link', { name: /^My Calendar/ }).click();
    await reopened.getByRole('button', { name: 'Remove Waterfront Tuesday', exact: true }).click();
    await reopened.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(card).toBeVisible();
    await reopened.getByRole('button', { name: 'Remove Waterfront Tuesday', exact: true }).click();
    await reopened.getByRole('button', { name: 'Remove day', exact: true }).click();
    await reopened.reload();
    await expect(reopened.getByRole('heading', { name: 'No saved days yet.' })).toBeVisible();
    expect(await reopened.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!))).toEqual(original);
  } finally { await nextSession.close(); }
});

test('save failures are visible and empty or invalid days cannot be saved', async ({ page }) => {
  await page.goto('/#my-day');
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByLabel('Day name').fill('   ');
  const save = page.getByRole('dialog').getByRole('button', { name: 'Save day', exact: true });
  await expect(save).toBeEnabled();
  await page.getByLabel('Day name').fill('Storage failure');
  await page.route('**/api/days', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Could not save this day. Please try again.' }) }) : route.continue());
  await save.click();
  await expect(page.getByRole('alert')).toContainText('Could not save this day');
  await expect(page.getByRole('dialog', { name: 'Save your day' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await (await page.request.get('/api/days')).json()).days).toEqual([]);
  await page.evaluate(() => localStorage.setItem('elsewhere:seattle:stops', '[]'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save day', exact: true })).toBeDisabled();
});

test('saved page keeps bookmarks separate and supports mobile saving in all themes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Save Elliott Bay Book Company', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByLabel('Day name').fill('A Seattle day with coffee, records and the waterfront');
  await page.getByRole('dialog', { name: 'Save your day' }).getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('link', { name: /^My Calendar/ }).click();
  await expect(page.locator('.calendar-card')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:activities')!).length)).toBe(1);
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await expect(page.getByRole('button', { name: /^Edit saved day / })).toBeVisible();
      }
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
  await changeAppearance(page, 'Field Journal');
  await changeAppearance(page, 'Light mode');
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({ path: 'test-results/saved-days-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/saved-days-mobile.png', fullPage: true });
});