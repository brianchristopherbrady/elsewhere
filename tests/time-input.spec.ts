import { test, expect, type Locator, type Page } from '@playwright/test';

async function selectPmInPicker(page: Page, input: Locator) {
  await input.scrollIntoViewIfNeeded();
  const bounds = await input.boundingBox();
  await input.click({ position: { x: bounds!.width - 16, y: bounds!.height / 2 } });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('elsewhere:seattle:stops')) {
      localStorage.setItem('elsewhere:seattle:stops', JSON.stringify([{ id: 'vita-kexp', start: 600, duration: null, end: 660 }]));
      localStorage.setItem('elsewhere:seattle:date', JSON.stringify('2026-09-26'));
    }
  });
  await page.goto('/#my-day');
});

test('editing a time range keeps intermediate input instead of reverting it', async ({ page }) => {
  const arrival = page.getByLabel('Arrival for Caffe Vita at KEXP', { exact: true });
  const departure = page.getByLabel('Departure for Caffe Vita at KEXP', { exact: true });
  await arrival.fill('13:30');
  await expect(arrival).toHaveValue('13:30');
  await expect(departure).toHaveValue('11:00');
  await expect(page.locator('[data-stop="vita-kexp"]')).toContainText('Departure must be later than arrival');
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Share your day', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'See my day', exact: true }).click();
  await expect(arrival).toBeVisible();
  await expect(arrival).toHaveValue('13:30');
  await departure.fill('14:30');
  await page.getByLabel('Day title').click();
  await expect(arrival).toHaveValue('13:30');
  await expect(departure).toHaveValue('14:30');
  await page.reload();
  await expect(arrival).toHaveValue('13:30');
  await expect(departure).toHaveValue('14:30');
});

test('native segmented keyboard entry preserves hours and minutes while changing AM and PM', async ({ page }) => {
  const arrival = page.getByLabel('Arrival for Caffe Vita at KEXP', { exact: true });
  const departure = page.getByLabel('Departure for Caffe Vita at KEXP', { exact: true });
  await departure.fill('');
  await arrival.fill('');
  await arrival.focus();
  await arrival.press('ArrowLeft');
  await arrival.press('ArrowLeft');
  await arrival.pressSequentially('1030p', { delay: 50 });
  await expect(arrival).toHaveValue('22:30');
  await arrival.press('a');
  await expect(arrival).toHaveValue('10:30');
  await page.reload();
  await expect(arrival).toHaveValue('10:30');
});

test('clearing a segment does not erase other segments and empty times persist', async ({ page }) => {
  const arrival = page.getByLabel('Arrival for Caffe Vita at KEXP', { exact: true });
  const departure = page.getByLabel('Departure for Caffe Vita at KEXP', { exact: true });
  await arrival.focus();
  await arrival.press('ArrowLeft');
  await arrival.press('ArrowLeft');
  await arrival.press('ArrowRight');
  await arrival.press('Backspace');
  await page.getByLabel('Day title').fill('Keep partial input');
  await expect(arrival).toHaveAttribute('aria-invalid', 'true');
  await arrival.focus();
  await arrival.press('ArrowRight');
  await arrival.pressSequentially('45', { delay: 50 });
  await expect(arrival).toHaveValue('10:45');
  await expect(arrival).toHaveAttribute('aria-invalid', 'false');
  await arrival.fill('');
  await departure.fill('');
  await page.reload();
  await expect(arrival).toHaveValue('');
  await expect(departure).toHaveValue('');
});

test('clock popup AM/PM selection keeps both time fields editable', async ({ page }) => {
  const arrival = page.getByLabel('Arrival for Caffe Vita at KEXP', { exact: true });
  const departure = page.getByLabel('Departure for Caffe Vita at KEXP', { exact: true });
  await selectPmInPicker(page, arrival);
  await expect(arrival).toHaveValue('22:00');
  await expect(departure).toHaveValue('11:00');
  await selectPmInPicker(page, departure);
  await expect(arrival).toHaveValue('22:00');
  await expect(departure).toHaveValue('23:00');
  await expect(arrival).toHaveAttribute('aria-invalid', 'false');
  await page.reload();
  await expect(arrival).toHaveValue('22:00');
  await expect(departure).toHaveValue('23:00');
});