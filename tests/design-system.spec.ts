import { changeAppearance } from './appearance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('skip link focuses main without changing the active route', async ({ page }) => {
  await page.route('**/api/events', route => route.fulfill({ status: 503, body: '{}' }));
  for (const route of ['#saved', '#my-day', '#events']) {
    await page.goto(`/?navigation=${encodeURIComponent(route)}${route}`);
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    expect(new URL(page.url()).hash).toBe(route === '#events' ? '#discover' : route);
  }
});

test('shared controls and narrow cards retain usable dimensions in every lens', async ({ page }) => {
  await page.goto('/');
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    for (const width of [320, 375, 640, 768, 850, 851, 1024, 1280, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      const sizes = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        smallTargets: [...document.querySelectorAll('.icon-button, .drag-handle, .lenses button, .moods button')]
          .filter(element => element.getClientRects().length > 0)
          .filter(element => { const bounds = element.getBoundingClientRect(); return bounds.width < 36 || bounds.height < 36; })
          .map(element => element.getAttribute('aria-label') || element.textContent),
        cardContent: [...document.querySelectorAll('.card-body')].map(element => element.getBoundingClientRect().width),
      }));
      expect(sizes.overflow, `${lens} at ${width}`).toBeLessThanOrEqual(1);
      expect(sizes.smallTargets, `${lens} at ${width}`).toEqual([]);
      expect(Math.min(...sizes.cardContent), `${lens} at ${width}`).toBeGreaterThanOrEqual(220);
    }
  }
});

test('theme controls reflow with enlarged default text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const measurements = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('.settings-dialog button')].map(element => element.getBoundingClientRect());
    return {
      bodySize: parseFloat(getComputedStyle(document.body).fontSize),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overlap: controls.some((first, index) => controls.slice(index + 1).some(second =>
        first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top)),
    };
  });
  expect(measurements.bodySize).toBeGreaterThanOrEqual(28);
  expect(measurements.overflow).toBeLessThanOrEqual(1);
  expect(measurements.overlap).toBe(false);
});

test('expanded text and long content reflow across discovery, planner and dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { font-size: 200%; } * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    await expect(page.locator('.card-location').first()).toContainText('km');
    expect(await page.locator('.card-body').first().evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  await page.getByRole('button', { name: 'Explore Elliott Bay Book Company', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Elliott Bay Book Company', exact: true });
  expect(await detail.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  await page.getByRole('navigation').getByRole('link', { name: /^Create a Day/ }).click();
  await page.getByLabel('Date of your day').fill('2026-09-19');
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Caffe Vita at KEXP', exact: true }).click();
  await page.getByLabel('Arrival for Caffe Vita at KEXP').fill('23:00');
  await expect(page.locator('[data-stop="vita-kexp"] .warning')).toContainText('Outside opening hours');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Share your day' }).click();
  const share = page.getByRole('dialog', { name: 'A day worth sharing' });
  expect(await share.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
});

test('calendar supports expanded long content and RTL structure', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));
  await page.route('**/api/events', route => route.fulfill({ json: {
    fetchedAt: '2026-09-17T12:00:00Z', stale: false, events: [{
      id: 'long-title', title: 'Seattle waterfront community gathering with performances, workshops and neighborhood conversations',
      location: 'WaterfrontParkCommunityMeetingPointWithoutSpaces', category: 'Community events',
      start: '2026-09-19T20:00:00Z', end: '2026-09-19T22:00:00Z', startDate: '2026-09-19', endDate: '2026-09-19',
      schedule: 'Saturday, September 19, 1-3pm Pacific', url: 'https://www.seattle.gov/event-calendar',
      cost: 'Cost not listed', canceled: false, full: false,
    }],
  } }));
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/#events');
  await expect(page.locator('.event-row')).toHaveCount(1);
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  for (const direction of ['ltr', 'rtl']) {
    await page.locator('html').evaluate((element, value) => element.setAttribute('dir', value), direction);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.locator('.event-row').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.getByLabel('Search live events').fill('No matching event');
    await expect(page.getByText('No upcoming events match these filters.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear event filters' }).click();
  }
});

test('touch targets, reduced height and preference overrides remain usable', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 667, height: 375 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await changeAppearance(page, 'Dark mode');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await page.locator('.mode-controls .icon-button').first().evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  expect(await page.locator('.place-card').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('checkbox', { name: 'High contrast', exact: true }).check();
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe('light');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--text').trim())).toBe('#000000');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'A few preferences' });
  await dialog.getByRole('button', { name: /^Show/ }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close A few preferences' })).toBeFocused();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
  expect(await dialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await context.close();
});

test('toolbar and dialog visual contracts', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await changeAppearance(page, 'Field Journal');
  await changeAppearance(page, 'Light mode');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveScreenshot('settings-320.png', { animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'A few preferences' })).toHaveScreenshot('filters-320.png', { animations: 'disabled' });
  await page.keyboard.press('Escape');
  for (const lens of ['Field Journal', 'Nocturne', 'Civic Modern']) {
    await changeAppearance(page, lens);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    for (const mode of ['Light mode', 'Dark mode']) {
      await changeAppearance(page, mode);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`${lens}-${mode}-desktop.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await changeAppearance(page, 'Light mode');
    await page.locator('.place-card').first().scrollIntoViewIfNeeded();
    await page.locator('.place-card').first().screenshot({ path: testInfo.outputPath(`${lens}-mobile-card.png`), animations: 'disabled' });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`${lens}-mobile-shell.png`), animations: 'disabled' });
  }
});