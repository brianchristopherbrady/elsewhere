import { changeAppearance } from './appearance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { normalizeEvents } from '../server/live-events';

const event = {
  id: 'trumba-test', title: 'Seattle waterfront music', location: 'Pier 62, Seattle', category: 'Arts',
  start: '2026-09-19T20:00:00.000Z', end: '2026-09-19T21:00:00.000Z', startDate: '2026-09-19', endDate: '2026-09-19',
  schedule: 'Saturday, September 19, 1-2pm PDT', url: 'https://www.seattle.gov/event-calendar?trumbaEmbed=view%3Devent%26eventid%3D123',
  cost: 'Cost not listed', canceled: false, full: false,
};
const feed = { events: [event, { ...event, id: 'cancelled', title: 'Canceled park walk', canceled: true }], fetchedAt: '2026-09-17T12:00:00.000Z', stale: false, source: 'https://www.seattle.gov/event-calendar' };

const activityEntry = {
  eventID: 202998339, title: 'Chinatown-International District Walking Tour',
  startDateTime: '2026-09-20T14:00:00', endDateTime: '2026-09-20T16:00:00',
  startTimeZoneOffset: '-0700', endTimeZoneOffset: '-0700', location: 'Chinatown-International District',
  customFields: [{ label: 'Cost', value: 'Free' }, { label: 'Audience', value: 'Adults' }, { label: 'Sponsoring Organization', value: 'Seattle Office of Arts &amp; Culture' }],
};
const activityFeed = { ...feed, events: normalizeEvents([
  activityEntry,
  { ...activityEntry, eventID: 205756362, title: 'Games and Crafts', description: 'Our friendly social group welcomes seniors.', startDateTime: '2026-09-23T11:00:00', endDateTime: '2026-09-23T12:30:00' },
  { ...activityEntry, eventID: 205762263, title: 'Coffee Klatch', canceled: true },
  { ...activityEntry, eventID: 194808502, title: 'Council Briefing' },
]) };

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z')); });

test('live events are a Discover filter and saved dates guard itinerary additions', async ({ page }, testInfo) => {
  const single = { ...event, id: 'october-show', title: 'October show', start: '2026-10-10T20:00:00Z', end: '2026-10-10T22:00:00Z', startDate: '2026-10-10', endDate: '2026-10-10', schedule: 'October 10, 2026, 1-3pm Pacific' };
  const festival = { ...single, id: 'festival', title: 'October festival', end: '2026-10-12T22:00:00Z', endDate: '2026-10-12', schedule: 'October 10-12, 2026' };
  await page.route('**/api/events', route => route.fulfill({ json: { ...feed, events: [single, festival] } }));
  await page.goto('/#discover');
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Live events', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('events');
  await expect(page).toHaveURL(/#discover$/);
  await expect(page.getByRole('heading', { name: 'Live events', exact: true })).toBeVisible();
  await page.locator('.event-row').filter({ hasText: single.title }).getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.locator('.event-row').filter({ hasText: festival.title }).getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({ path: testInfo.outputPath('live-events-discover-desktop.png'), fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-list')).toContainText('2026-10-10 (Pacific)');
  await expect(page.locator('.saved-item-list')).toContainText('2026-10-10 to 2026-10-12 (Pacific)');
  await page.reload();
  await expect(page.locator('.saved-item-list')).toContainText('2026-10-10 to 2026-10-12');
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByLabel('Date of your day').fill('2026-10-20');
  await page.getByLabel('Available on this date', { exact: true }).check();
  await expect(page.locator('.compact-items li')).toHaveCount(0);
  await page.getByLabel('Available on this date', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Add to day: October show', exact: true }).click();
  await expect(page.locator('.toast-region')).toContainText('October show is not available on 2026-10-20. Event dates: 2026-10-10');
  await expect(page.locator('[data-stop]')).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('unavailable-event-mobile.png'), fullPage: true });
  await page.getByText('Change date', { exact: true }).click();
  await page.getByLabel('Date of your day').fill('2026-10-11');
  await page.getByLabel('Available on this date', { exact: true }).check();
  await expect(page.locator('.compact-items li')).toHaveCount(1);
  await expect(page.locator('.compact-items li')).toContainText('October festival');
  await page.getByLabel('Available on this date', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Add to day: October festival', exact: true }).click();
  await expect(page.locator('[data-stop="city:festival"]')).toBeVisible();
  await expect(page.locator('[data-stop="city:festival"]')).not.toContainText('Not available on this day');
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('events');
  await page.getByRole('button', { name: 'Add to day: October show', exact: true }).click();
  await expect(page.locator('.toast-region')).toContainText('October show is not available on 2026-10-11');
  await expect(page.locator('[data-stop]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Saved items', exact: true }).click();
  await page.getByLabel('Date of your day').fill('2026-10-10');
  await page.getByRole('button', { name: 'Add to day: October show', exact: true }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(2);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!)[0].activity.endDate)).toBe('2026-10-12');
});

test('discovery filters show sourced tours and meetups without changing the itinerary', async ({ page }) => {
  await page.route('**/api/events', route => route.fulfill({ json: activityFeed }));
  await page.goto('/#discover');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'A few preferences' });
  await dialog.getByLabel('Discovery type').selectOption('guided-tour');
  await expect(dialog.getByLabel(/Budget per stop/)).toBeHidden();
  await dialog.getByRole('button', { name: 'Show activities' }).click();
  await expect(page.getByRole('heading', { name: 'Guided Tours', exact: true })).toBeVisible();
  await expect(page.locator('.event-row')).toHaveCount(1);
  await expect(page.getByRole('link', { name: activityEntry.title })).toHaveAttribute('href', /seattle.gov\/event-calendar\?trumbaEmbed=/);
  await expect(page.getByText('Hosted by Seattle Office of Arts & Culture')).toBeVisible();
  await expect(page.getByLabel('Search places or atmosphere')).toBeHidden();
  await expect(page.locator('.cards')).toBeHidden();
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('meetup');
  await expect(page.locator('.event-row')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Council Briefing' })).toHaveCount(0);
  await expect(page.getByText('Canceled', { exact: true })).toBeVisible();
  await page.getByLabel('Search live events').fill('crafts');
  await expect(page.locator('.event-row')).toHaveCount(1);
  await page.getByLabel('Event date (Pacific)').fill('2026-09-20');
  await expect(page.getByText('No upcoming events match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear event filters' }).click();
  await expect(page.locator('.event-row')).toHaveCount(2);
  await page.locator('.event-row').first().getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-row')).toHaveCount(1);
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await expect(page.getByRole('heading', { name: 'Choose a date' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Up', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await dialog.getByRole('button', { name: 'Reset filters' }).click();
  await expect(dialog.getByLabel('Discovery type')).toHaveValue('places');
  await dialog.getByRole('button', { name: /Show \d+ places/ }).click();
  await expect(page.locator('.cards')).toBeVisible();
  await expect(page.locator('[data-stop]')).toHaveCount(0);
});

test('activity discovery reports failures and stale data, and recovers', async ({ page }) => {
  let fail = true;
  await page.route('**/api/events', route => route.fulfill({ status: fail ? 503 : 200, json: fail ? {} : activityFeed }));
  await page.goto('/#discover');
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('guided-tour');
  await expect(page.locator('.feed-status')).toContainText('unavailable');
  await expect(page.locator('.event-row')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Refresh events' }).click();
  await expect(page.locator('.event-row')).toHaveCount(1);
  fail = true;
  await page.getByRole('button', { name: 'Refresh events' }).click();
  await expect(page.locator('.feed-status')).toContainText('Stale calendar');
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('meetup');
  await expect(page.locator('.event-row')).toHaveCount(2);
  fail = false;
  await page.getByRole('button', { name: 'Refresh events' }).click();
  await expect(page.locator('.feed-status')).not.toContainText('Stale');
});

test('activity discovery reflows and remains accessible across themes', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.route('**/api/events', route => route.fulfill({ json: activityFeed }));
  await page.goto('/#discover');
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('guided-tour');
  await expect(page.locator('.event-row')).toHaveCount(1);
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
  await page.screenshot({ path: testInfo.outputPath('guided-tours-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('meetup');
  await expect(page.locator('.event-row')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('meetup-mobile.png'), fullPage: true });
});

test('live calendar filters, labels cancellations, and retains stale records during outages', async ({ page }) => {
  let fail = false;
  await page.route('**/api/events', route => route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { error: 'offline' } : feed) }));
  await page.goto('/#events');
  await expect(page).toHaveURL(/#discover$/);
  await expect(page.getByRole('combobox', { name: /Discovery type/ })).toHaveValue('events');
  await expect(page.getByRole('heading', { name: 'Live events' })).toBeVisible();
  await expect(page.locator('.event-row')).toHaveCount(2);
  await expect(page.locator('.event-row .unknown-details').first()).toContainText('Unknown: cost.');
  await expect(page.locator('.event-row .unknown-details a').first()).toHaveAttribute('href', /^https:\/\//);
  await expect(page.getByText('Canceled', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: event.title, exact: true })).toHaveAttribute('href', event.url);
  await page.getByLabel('Search live events').fill('waterfront');
  await expect(page.locator('.event-row')).toHaveCount(1);
  await page.getByLabel('Event date (Pacific)').fill('2026-09-20');
  await expect(page.getByText('No upcoming events match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear event filters' }).click();
  fail = true;
  await page.getByRole('button', { name: 'Refresh events' }).click();
  await expect(page.locator('.feed-status')).toContainText('Stale calendar');
  await expect(page.locator('.event-row')).toHaveCount(2);
  fail = false;
  await page.getByRole('button', { name: 'Refresh events' }).click();
  await expect(page.locator('.feed-status')).not.toContainText('Stale');
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(0);
});

test('empty initial failure recovers and expired events are removed', async ({ page }) => {
  let fail = true;
  await page.route('**/api/events', route => route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json', body: JSON.stringify(fail ? {} : { ...feed, events: [{ ...event, end: '2026-09-16T21:00:00Z' }] }) }));
  await page.goto('/#events');
  await expect(page.locator('.feed-status')).toContainText('unavailable');
  fail = false;
  await page.getByRole('button', { name: 'Refresh events' }).click();
  await expect(page.locator('.feed-status')).toContainText('Updated');
  await expect(page.locator('.event-row')).toHaveCount(0);
});

test('calendar polls automatically while open', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-17T12:00:00Z') });
  let requests = 0;
  await page.route('**/api/events', route => { requests += 1; return route.fulfill({ json: feed }); });
  await page.goto('/#events');
  await expect(page.locator('.event-row')).toHaveCount(2);
  const initial = requests;
  await page.clock.fastForward(15 * 60 * 1000);
  await expect.poll(() => requests).toBeGreaterThan(initial);
  await expect(page.getByRole('button', { name: 'Refresh events' })).toBeEnabled();
});

test('live events reflow and remain accessible in all six themes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/api/events', route => route.fulfill({ json: feed }));
  await page.goto('/#events');
  await expect(page.locator('.event-row')).toHaveCount(2);
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 960 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${lens}, ${mode}, ${width}`).toBeLessThanOrEqual(1);
      }
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations).toEqual([]);
    }
  }
});