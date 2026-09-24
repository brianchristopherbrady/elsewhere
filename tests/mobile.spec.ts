import { devices, expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const { defaultBrowserType: _browser, ...phone } = devices['iPhone 13'];
test.use(phone);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('elsewhere:seattle:stops')) {
      localStorage.setItem('elsewhere:seattle:stops', JSON.stringify([{ id: 'vita-kexp', start: 570, duration: 60 }, { id: 'sub-pop-kexp', start: 660, duration: 45 }]));
      localStorage.setItem('elsewhere:seattle:date', JSON.stringify('2026-09-26'));
    }
  });
});

const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Primary navigation' });
const smallTargets = (page: Page, selector: string) => page.locator(selector).evaluateAll(elements => elements
  .filter(element => element.getClientRects().length && !element.closest('[hidden]'))
  .map(element => ({ name: element.textContent?.trim().slice(0, 40), box: element.getBoundingClientRect() }))
  .filter(({ box }) => Math.round(box.width) < 44 || Math.round(box.height) < 44).map(({ name, box }) => `${name} ${Math.round(box.width)}x${Math.round(box.height)}`));

test('bottom tab bar stays in thumb reach, switches sections and returns to the top', async ({ page }) => {
  await page.goto('/#discover');
  const bar = tabBar(page);
  const viewport = page.viewportSize()!;
  const box = (await bar.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  expect(await smallTargets(page, 'nav[aria-label="Primary navigation"] a')).toEqual([]);
  await expect(bar.getByRole('link', { name: /^Create a Day\W+2$/ })).toBeVisible();
  await page.evaluate(() => scrollTo(0, 3000));
  await expect(bar).toBeInViewport();
  await bar.getByRole('link', { name: /^Saved items/ }).tap();
  await expect(page).toHaveURL(/#items$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(bar.getByRole('link', { name: /^Saved items/ })).toHaveAttribute('aria-current', 'page');
  await bar.getByRole('link', { name: 'Discover' }).tap();
  await page.evaluate(() => scrollTo(0, 2000));
  await bar.getByRole('link', { name: 'Discover' }).tap();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('form fields avoid iOS focus zoom and the tab bar steps aside while typing', async ({ page }) => {
  for (const hash of ['#discover', '#items', '#my-day']) {
    await page.goto(`/${hash}`);
    const small = await page.locator('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea').evaluateAll(elements => elements
      .filter(element => element.getClientRects().length).filter(element => parseFloat(getComputedStyle(element).fontSize) < 16).map(element => element.outerHTML.slice(0, 80)));
    expect(small, hash).toEqual([]);
  }
  await page.goto('/#discover');
  await expect(page.getByLabel('Search places or atmosphere')).toHaveAttribute('enterkeyhint', 'search');
  expect((await page.locator('.site-header').boundingBox())!.height).toBeLessThanOrEqual(72);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.getByLabel('Search places or atmosphere').tap();
  await expect(tabBar(page)).toBeHidden();
  await page.getByLabel('Search places or atmosphere').blur();
  await expect(tabBar(page)).toBeVisible();
});

test('dialogs open as bottom sheets with pinned close and actions', async ({ page }) => {
  await page.goto('/#discover');
  await page.getByRole('button', { name: 'Filters', exact: true }).tap();
  const dialog = page.getByRole('dialog', { name: 'A few preferences' });
  const viewport = page.viewportSize()!;
  await expect.poll(async () => { const box = (await dialog.boundingBox())!; return [Math.round(box.width), Math.round(box.y + box.height)]; }).toEqual([viewport.width, viewport.height]);
  await dialog.evaluate(element => element.scrollTo(0, element.scrollHeight));
  await expect(dialog.getByRole('button', { name: 'Close A few preferences' })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: /^Show \d+ places/ })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Close A few preferences' }).tap();
  await expect(dialog).toBeHidden();
  await page.locator('.place-card .photo-button').first().tap();
  const detail = page.locator('dialog.place-dialog');
  await detail.evaluate(element => element.scrollTo(0, element.scrollHeight / 2));
  await expect(detail.locator('.dialog-heading button')).toBeInViewport();
  await expect(detail.locator('.dialog-actions')).toBeInViewport();
  expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);
});

test('touch targets and reflow hold across every section', async ({ page }) => {
  await page.goto('/#discover');
  expect(await smallTargets(page, '.place-card h3 button, .place-card .icon-button, .unknown-details a, .moods button, .filter-button')).toEqual([]);
  await page.getByRole('combobox', { name: /Discovery type/ }).first().selectOption('staples');
  expect(await smallTargets(page, '.event-content a, .event-content button')).toEqual([]);
  await page.goto('/#my-day');
  await page.getByText('Change date').tap();
  expect(await smallTargets(page, '.rdp-day_button, .rdp-button_previous, .rdp-button_next, .builder-stop button, .builder-stop a')).toEqual([]);
  for (const hash of ['#discover', '#items', '#my-day', '#saved']) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('.route-loading')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), hash).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).analyze()).violations, hash).toEqual([]);
  }
});

test('planning works by touch without drag', async ({ page }) => {
  await page.goto('/#my-day');
  const first = page.locator('[data-stop]').first();
  const firstId = await first.getAttribute('data-stop');
  await page.getByRole('button', { name: /later$/ }).first().tap();
  await expect(page.locator('[data-stop]').nth(1)).toHaveAttribute('data-stop', firstId!);
  await page.getByRole('button', { name: 'Discover more', exact: true }).tap();
  await page.getByRole('button', { name: 'Add to day: Elliott Bay Book Company', exact: true }).tap();
  await expect(page.locator('[data-stop]')).toHaveCount(3);
});
