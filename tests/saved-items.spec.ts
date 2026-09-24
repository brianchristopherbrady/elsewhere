import { test, expect, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { changeAppearance } from './appearance';

const credentials = { name: 'Collector', email: `items-${crypto.randomUUID()}@example.com`, password: 'abcdefghi!' };
let accountCookies: Awaited<ReturnType<BrowserContext['cookies']>>;
test.beforeAll(async ({ request, baseURL }) => {
  expect((await request.post('/api/auth/sign-up/email', { data: credentials, headers: { origin: baseURL! } })).ok()).toBe(true);
  expect((await request.post('/api/auth/sign-in/email', { data: credentials, headers: { origin: baseURL! } })).ok()).toBe(true);
  accountCookies = (await request.storageState()).cookies;
});

test('saved items are an independent library feeding a filterable day builder', async ({ page }, testInfo) => {
  await page.context().addCookies(accountCookies);
  await page.goto('/');
  await expect(page.locator('.lens-bar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open System Inspector' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Caffe Vita at KEXP', exact: true }).click();
  await page.getByRole('button', { name: 'Save Sub Pop at KEXP', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!))).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:date')!))).toBe('');
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^Add to day/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit saved item Caffe Vita at KEXP' }).click();
  await page.getByLabel('Item tags').fill('Friends, Coffee');
  await page.getByLabel('Item notes').fill('Try the window seat someday');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await page.reload();
  await page.getByLabel('Search saved items').fill('friends window');
  await expect(page.locator('.saved-item-row')).toHaveCount(1);
  await expect(page.locator('.saved-item-row')).toContainText('Coffee');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('saved-items-desktop.png'), fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await expect(page.locator('.compact-items li')).toHaveCount(2);
  await page.getByLabel('Date of your day').fill('2026-10-20');
  await page.getByLabel('Saved item tag').selectOption('Friends');
  await expect(page.locator('.compact-items li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add to day: Caffe Vita at KEXP', exact: true }).click();
  await expect(page.getByLabel('Notes for Caffe Vita at KEXP')).toHaveValue('Try the window seat someday');
  await page.getByLabel('Notes for Caffe Vita at KEXP').fill('Day-specific note');
  await page.getByLabel('Day notes').fill('Meet at Seattle Center');
  await page.getByLabel('Custom tags').fill('Tuesday, relaxed');
  await page.getByLabel('Day title').fill('Coffee and records');
  await page.getByLabel('Arrival for Caffe Vita at KEXP').fill('10:00');
  await page.getByLabel('Departure for Caffe Vita at KEXP').fill('11:00');
  await page.getByRole('button', { name: 'Clear saved item filters' }).click();
  await page.getByLabel('Saved item category').selectOption('Record store');
  await expect(page.locator('.compact-items li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add to day: Sub Pop at KEXP', exact: true }).click();
  await page.getByRole('button', { name: 'Move Sub Pop at KEXP earlier', exact: true }).click();
  await expect(page.locator('[data-stop]').first()).toHaveAttribute('data-stop', 'sub-pop-kexp');
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('.map-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save day', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('link', { name: /^My Calendar/ }).click();
  await expect(page.getByRole('heading', { name: 'My Calendar', exact: true })).toBeVisible();
  await page.getByLabel('Go to month').fill('2026-10');
  await expect(page.getByRole('article', { name: 'Coffee and records' })).toContainText('Tuesday');
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-row').filter({ hasText: 'Caffe Vita' })).toContainText('Try the window seat someday');
  await page.getByRole('button', { name: 'Remove saved item Caffe Vita at KEXP' }).click();
  await page.getByRole('button', { name: 'Remove item', exact: true }).click();
  await expect(page.locator('.saved-item-row')).toHaveCount(1);
  const days = (await (await page.request.get('/api/days')).json()).days;
  expect(days[0].stops).toHaveLength(2);
  expect(days[0].stops[1].notes).toBe('Day-specific note');
  expect(days[0].notes).toBe('Meet at Seattle Center');
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(2);
});

test('settings hold themes, accessibility, profile and password recovery', async ({ page }, testInfo) => {
  await page.context().addCookies(accountCookies);
  await page.goto('/#items');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nocturne', exact: true }).click();
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await page.getByLabel('Reduce motion', { exact: true }).check();
  await page.getByLabel('Display name').fill('Seattle Collector');
  await page.route('**/api/auth/update-user', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not update your profile');
  await expect(page.getByLabel('Display name')).toHaveValue('Seattle Collector');
  await page.unroute('**/api/auth/update-user');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('status')).toContainText('Profile updated.');
  await page.getByRole('button', { name: 'Field Journal', exact: true }).click();
  await page.getByRole('button', { name: 'Light mode', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 800 });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
  await expect(page.locator('.account-name')).toContainText('Seattle Collector');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Reset password', exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(credentials.email);
  await expect(page.getByRole('dialog', { name: 'Reset password', exact: true }).getByRole('status')).toContainText('Account email is currently unavailable');
});

test('saved library and compact picker reflow with long metadata', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Save Caffe Vita at KEXP', exact: true }).click();
  await page.goto('/#items');
  await page.getByRole('button', { name: 'Edit saved item Caffe Vita at KEXP' }).click();
  await page.getByLabel('Item tags').fill('LongUnbrokenTagForWeekendPlans, Friends');
  await page.getByLabel('Item notes').fill('A long note about meeting friends and trying something new on a future weekend.');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`library-${lens}-${mode}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCSS('opacity', '1');
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`settings-${lens}-${mode}.png`), fullPage: true });
      await page.keyboard.press('Escape');
    }
  }
  await changeAppearance(page, 'Field Journal');
  await changeAppearance(page, 'Light mode');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({ path: testInfo.outputPath('saved-items-mobile.png'), fullPage: true });
  await page.goto('/#my-day');
  await page.getByLabel('Date of your day').fill('2026-10-20');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('compact-picker-mobile.png'), fullPage: true });
});