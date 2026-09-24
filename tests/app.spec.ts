import { changeAppearance } from './appearance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { places } from '../src/data';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('elsewhere:seattle:stops')) {
      localStorage.setItem('elsewhere:seattle:stops', JSON.stringify([{ id: 'vita-kexp', start: 570, duration: 60 }, { id: 'sub-pop-kexp', start: 660, duration: 45 }, { id: 'olympic-sculpture-park', start: 750, duration: 75 }]));
      localStorage.setItem('elsewhere:seattle:date', JSON.stringify('2026-09-19'));
    }
  });
  await page.goto('/');
});

test('all six lenses preserve itinerary and control focus without overflow', async ({ page }) => {
  const original = await page.evaluate(() => localStorage.getItem('elsewhere:seattle:stops'));
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      expect(await page.evaluate(() => localStorage.getItem('elsewhere:seattle:stops'))).toEqual(original);
      for (const width of [320, 375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 960 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${lens} ${mode} at ${width}`).toBeLessThanOrEqual(1);
      }
    }
  }
});

test('filters, save, details, add, reorder, remove, undo, and persistence', async ({ page }) => {
  await page.getByRole('button', { name: 'Quiet', exact: true }).click();
  await expect(page.locator('[data-component="PlaceCard"]')).toHaveCount(places.filter(place => place.moods.includes('Quiet')).length);
  await page.getByLabel('Search places or atmosphere').fill('Elliott');
  await expect(page.locator('[data-component="PlaceCard"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save Elliott Bay Book Company', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Elliott Bay Book Company', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Elliott Bay Book Company' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Remove saved activity', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore Elliott Bay Book Company', exact: true })).toBeFocused();
  await expect(page.locator('[data-stop]')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Move Elliott Bay Book Company earlier', exact: true }).click();
  await expect(page.locator('[data-stop]').nth(2)).toHaveAttribute('data-stop', 'elliott-bay-books');
  await page.getByRole('button', { name: 'Remove Elliott Bay Book Company from day' }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('[data-stop]')).toHaveCount(4);
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-row')).toHaveCount(1);
});

test('modal traps focus and exposes filters, scheduling warnings and empty recovery', async ({ page }) => {
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close A few preferences' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.getByRole('checkbox', { name: 'Step-free access' }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeFocused();
  await expect(page.locator('[data-component="PlaceCard"]')).toHaveCount(3);
  await page.getByLabel('Search places or atmosphere').fill('not a place');
  await expect(page.getByRole('heading', { name: 'A little too far off the map.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to discoveries' }).click();
  await expect(page.locator('[data-component="PlaceCard"]')).toHaveCount(places.length);
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByLabel('Departure for Caffe Vita at KEXP').fill('');
  await page.getByLabel('Arrival for Caffe Vita at KEXP').fill('23:00');
  await expect(page.locator('[data-stop="vita-kexp"] .warning')).toContainText('Outside opening hours');
});

test('citywide museums remain discoverable, filterable and plannable', async ({ page }) => {
  await page.getByLabel('Search places or atmosphere').fill('Flight');
  await expect(page.locator('[data-component="PlaceCard"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const distance = page.getByRole('slider', { name: /Distance from Pike Place Market/ });
  await expect(distance).toHaveValue('20');
  await expect(distance).toHaveAttribute('max', '20');
  await distance.fill('5');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-component="PlaceCard"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to discoveries' }).click();
  await page.getByLabel('Search places or atmosphere').fill('Burke');
  await page.getByRole('button', { name: 'Explore Burke Museum', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Burke Museum' });
  await expect(details.getByRole('link', { name: /Official venue details/ })).toHaveAttribute('href', 'https://www.burkemuseum.org/visit');
  await expect(details).toContainText('closed Monday');
  await expect(details.locator('.unknown-details')).toContainText('Unknown: hours for your date, step-free access, quieter times.');
  await expect(details.locator('.unknown-details a')).toHaveAttribute('href', 'https://www.burkemuseum.org/visit');
  await expect(page.locator('[data-place="burke-museum"] .unknown-details')).toContainText('hours for your date, step-free access');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save Burke Museum', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Add to day: Burke Museum', exact: true }).click();
  await expect(page.locator('[data-stop="burke-museum"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-stop="burke-museum"]')).toBeVisible();
});

test('Seattle staples list is searchable and saves traditions without invented dates', async ({ page }) => {
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('staples');
  await expect(page.getByRole('heading', { name: 'Seattle staples & traditions' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search staples' }).fill('solstice cyclists');
  const row = page.locator('.event-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('June');
  await expect(row.locator('.unknown-details')).toContainText('Unknown: this year\'s date, location, cost, step-free access.');
  await expect(row.getByRole('link', { name: /Search for the official site/ })).toHaveAttribute('href', /^https:\/\/duckduckgo\.com\//);
  await row.getByRole('button', { name: 'Save activity' }).click();
  await page.getByRole('navigation').getByRole('link', { name: /^Saved items/ }).click();
  await expect(page.locator('.saved-item-row')).toContainText('Fremont Solstice Cyclists');
  expect(await new AxeBuilder({ page }).analyze().then(result => result.violations)).toEqual([]);
});

test('confirmed tradition dates are listed in order and saved as dated organizer events', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-22T12:00:00-07:00'));
  await page.reload();
  await page.getByRole('combobox', { name: /Discovery type/ }).selectOption('staples');
  await page.getByRole('checkbox', { name: 'Confirmed upcoming dates only' }).check();
  const first = page.locator('.event-row').first();
  await expect(first).toHaveAttribute('data-staple', 'staple:italian-festival');
  await expect(first).toContainText('Sep 26, 2026 - Sep 27, 2026');
  await expect(page.locator('[data-staple="staple:live-aloha"]')).toHaveCount(0);
  await expect(first.getByRole('link', { name: /Check the organizer page/ })).toHaveAttribute('href', /seattlecenter\.com/);
  await expect(first.locator('.unknown-details')).toContainText('Unknown: start time, cost, step-free access.');
  await first.getByRole('button', { name: 'Save activity' }).click();
  await expect(first.getByRole('button', { name: 'Saved activity' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:activities') ?? '[]'));
  expect(saved).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'staple:italian-festival:2026-09-26', date: '2026-09-26', endDate: '2026-09-27' })]));
});

test('inline discovery, share import, settings and keyboard sorting', async ({ page }) => {
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await expect(page.locator('[data-stop]')).toHaveCount(4);
  const first = page.locator('[data-stop]').first();
  const firstId = await first.getAttribute('data-stop');
  const secondId = await page.locator('[data-stop]').nth(1).getAttribute('data-stop');
  await first.getByRole('button', { name: /^Reorder/ }).focus();
  await page.keyboard.press('Space');
  await expect(first.getByRole('button', { name: /^Reorder/ })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(`over droppable area stop-${secondId}`);
  await page.keyboard.press('Space');
  await expect(page.locator('[data-stop]').nth(1)).toHaveAttribute('data-stop', firstId!);
  await page.getByRole('button', { name: 'Share your day' }).click();
  await expect(page.getByRole('textbox', { name: 'Your plan' })).toContainText('Elsewhere | Seattle');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toContainText('Appearance');
  await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-reduced', 'true');
  await page.keyboard.press('Escape');
  const payload = { stops: [{ id: 'kexp', start: 1320, duration: 90 }], date: '2026-10-01' };
  await page.goto(`/?day=${encodeURIComponent(JSON.stringify(payload))}#my-day`);
  await expect(page.locator('[data-stop]')).toHaveCount(1);
  await expect(page.locator('[data-stop]')).toHaveAttribute('data-stop', 'kexp');
});

test('automated accessibility on all six combinations and detail dialog', async ({ page }) => {
  test.setTimeout(90_000);
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) })), `${lens} ${mode}`).toEqual([]);
    }
  }
  await page.getByRole('button', { name: 'Explore Caffe Vita at KEXP', exact: true }).click();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) }))).toEqual([]);
});

test('collecting a discovery and mobile planning remain independent', async ({ page }) => {
  await page.getByRole('button', { name: 'Save Elliott Bay Book Company', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await expect(page.locator('[data-stop="elliott-bay-books"]')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Elliott Bay Book Company from day' }).click();
  await expect(page.locator('[data-stop="elliott-bay-books"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Share your day' }).click();
  await expect(page.getByRole('dialog', { name: 'A day worth sharing' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('preferences, text expansion, map failure, and offline fallback', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'A few preferences' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await changeAppearance(page, 'Dark mode');
  await expect(page.getByText('Map imagery unavailable. Places are still available.')).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText('You are offline. Your loaded places and day are still here.')).toBeVisible();
  await page.getByRole('button', { name: 'Organize', exact: true }).click();
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).click();
  await expect(page.locator('[data-stop="elliott-bay-books"]')).toHaveCount(1);
  await context.setOffline(false);
});

test('Seattle sources, dated events, and legacy storage isolation', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('elsewhere:stops', JSON.stringify([{ id: 'flora', start: 570, duration: 60 }])));
  await page.reload();
  await expect(page).toHaveTitle('Discover Seattle | Elsewhere');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elsewhere:seattle:stops')!)[0].id)).toBe('vita-kexp');
  await page.getByLabel('Search places or atmosphere').fill('Discover the Olympic');
  await page.getByRole('button', { name: 'Explore Discover the Olympic Sculpture Park', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Discover the Olympic Sculpture Park', exact: true });
  await expect(dialog.getByRole('link', { name: 'Official event details' })).toHaveAttribute('href', /seattleartmuseum.org/);
  await expect(dialog).toContainText('September 19, 2026, 13:00-14:00');
  await dialog.getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'Add to day: Discover the Olympic Sculpture Park', exact: true }).click();
  await page.getByText('Change date', { exact: true }).click();
  await page.getByLabel('Date of your day').fill('2026-09-20');
  await expect(page.locator('[data-stop="sam-tour-2026-09-19"]')).toContainText('Event only on 2026-09-19');
  await page.getByRole('button', { name: 'Share your day' }).click();
  await expect(page.getByRole('textbox', { name: 'Your plan' })).toContainText('Event only on 2026-09-19');
});

test('nearby Seattle map venues expand using the keyboard', async ({ page }) => {
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  const cluster = page.locator('.place-cluster').first();
  const venue = page.getByRole('button', { name: 'Explore Sub Pop at KEXP on map', exact: true });
  for (let attempt = 0; attempt < 5 && !(await venue.isVisible()); attempt++) {
    await (attempt === 0 ? cluster : page.locator('.place-cluster').first()).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
  }
  await expect(venue).toBeVisible();
  await venue.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Sub Pop at KEXP', exact: true })).toBeVisible();
});