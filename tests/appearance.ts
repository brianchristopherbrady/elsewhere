import { expect, type Page } from '@playwright/test';

export async function changeAppearance(page: Page, name: string) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const control = page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('button', { name, exact: true });
  await control.click();
  await expect(control).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
}