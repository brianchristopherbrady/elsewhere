import { changeAppearance } from './appearance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { normalizeMusic } from '../server/music';

const show = {
  id: 'sample', name: 'Seattle Sound', url: 'https://www.ticketmaster.com/event/sample',
  dates: { start: { dateTime: '2026-09-22T02:00:00Z' }, status: { code: 'onsale' } },
  classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }],
  _embedded: { venues: [{ name: 'The Showbox', city: { name: 'Seattle' }, state: { stateCode: 'WA' }, address: { line1: '1426 1st Avenue' } }] },
};
const feed = {
  configured: true, stale: false, truncated: false, fetchedAt: '2026-09-20T12:00:00Z',
  shows: normalizeMusic({ page: { totalPages: 1 }, _embedded: { events: [show, { ...show, id: 'cancelled', name: 'Canceled jazz night', classifications: [{ segment: { name: 'Music' }, genre: { name: 'Jazz' } }], dates: { ...show.dates, status: { code: 'cancelled' } } }] } }).shows,
};

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-09-20T12:00:00Z')); });

test('music filters preserve the planner and show official venue links', async ({ page }) => {
  await page.route('**/api/music', route => route.fulfill({ json: feed }));
  await page.goto('/#discover');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'A few preferences' });
  await dialog.getByLabel('Discovery type').selectOption('music');
  await dialog.getByRole('button', { name: 'Show activities' }).click();
  await expect(page.getByRole('heading', { name: 'Music & Venues' })).toBeVisible();
  await expect(page.locator('.music-shows .event-row')).toHaveCount(2);
  await expect(page.getByText('Canceled', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Seattle Sound', exact: true })).toHaveAttribute('href', show.url);
  await page.getByLabel('Genre', { exact: true }).selectOption('Rock');
  await expect(page.locator('.music-shows .event-row')).toHaveCount(1);
  await page.getByLabel('Show date (Pacific)').fill('2026-09-22');
  await expect(page.getByText('No upcoming shows match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear music filters' }).click();
  await page.getByLabel('Search music', { exact: true }).fill('Seattle Sound');
  await expect(page.locator('.music-shows .event-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Venues', exact: true }).click();
  await expect(page.locator('.music-venues .event-row')).toHaveCount(2);
  await page.getByLabel('Search music venues').fill('Belltown');
  await expect(page.locator('.music-venues .event-row')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Official calendar' })).toHaveAttribute('href', 'https://calendar.thecrocodile.com/');
  await expect(page.getByRole('link', { name: 'Map & directions' })).toHaveAttribute('href', /query=The%20Crocodile/);
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-list')).toContainText('The Crocodile');
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByLabel('Date of your day').fill('2026-09-22');
  await page.getByRole('button', { name: 'Add to day: The Crocodile', exact: true }).click();
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(page.locator('.travel-legs')).toContainText('coordinates unavailable');
  await expect(page.locator('.day-totals')).toContainText('Open-ended');
  await page.getByRole('navigation').getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Music & Venues' })).toBeVisible();
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('places');
  await expect(page.locator('.cards')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!).length)).toBe(1);
});

test('missing provider key still offers venues without a false empty result', async ({ page }) => {
  await page.route('**/api/music', route => route.fulfill({ json: { ...feed, configured: false, shows: [] } }));
  await page.goto('/#discover');
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('music');
  await expect(page.locator('.feed-status')).toContainText('Live concerts are not connected');
  await expect(page.getByText('No upcoming shows match these filters.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Browse venues' }).click();
  await expect(page.getByRole('link', { name: 'Neumos', exact: true })).toBeVisible();
});

test('music recovers from outages and never presents expired cache as current', async ({ page }) => {
  let fail = true;
  await page.route('**/api/music', route => route.fulfill({ status: fail ? 503 : 200, json: fail ? {} : feed }));
  await page.goto('/#discover');
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('music');
  await expect(page.locator('.feed-status')).toContainText('temporarily unavailable');
  fail = false;
  await page.getByRole('button', { name: 'Refresh music' }).click();
  await expect(page.locator('.music-shows .event-row')).toHaveCount(2);
  fail = true;
  await page.getByRole('button', { name: 'Refresh music' }).click();
  await expect(page.locator('.feed-status')).toContainText('Stale music listings');
  await expect(page.locator('.music-shows .event-row')).toHaveCount(2);
  await page.clock.setFixedTime(new Date('2026-09-21T13:00:00Z'));
  fail = false;
  await page.getByRole('button', { name: 'Refresh music' }).click();
  await expect(page.locator('.feed-status')).toContainText('expired');
  await expect(page.locator('.music-shows .event-row')).toHaveCount(0);
});

test('music reflows and remains accessible in each theme', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/music', route => route.fulfill({ json: feed }));
  await page.goto('/#discover');
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('music');
  await expect(page.locator('.music-shows .event-row')).toHaveCount(2);
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      for (const width of [320, 375, 1440]) {
        await page.setViewportSize({ width, height: 960 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
  await changeAppearance(page, 'Field Journal');
  await changeAppearance(page, 'Light mode');
  await page.screenshot({ path: testInfo.outputPath('music-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('music-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Venues', exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('venues-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});