import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function buildGuestDay(page: Page) {
  await page.getByLabel('Date of your day', { exact: true }).fill('2026-09-26');
  await page.getByRole('button', { name: 'Discover more', exact: true }).click();
  await page.getByRole('button', { name: 'Add to day: Caffe Vita at KEXP', exact: true }).click();
}

test('guests can plan and decline account saving without losing their day', async ({ page }) => {
  const privateRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/days') privateRequests.push(request.method()); });
  await page.goto('/#my-day');
  await buildGuestDay(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const draft = await page.evaluate(() => localStorage.getItem('elsewhere:seattle:stops'));
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('elsewhere:seattle:stops'))).toBe(draft);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save day', exact: true })).toBeEnabled();
  expect(privateRequests).toEqual([]);
});

async function signIn(page: Page, email: string, password: string) {
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
}

test('recovery is explicit when email is unavailable and guests can leave', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset password', exact: true });
  await expect(dialog.getByRole('status')).toContainText('currently unavailable');
  await expect(dialog.getByRole('button', { name: 'Send email' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Continue as guest' }).click();
  await expect(dialog).toBeHidden();
});

test('recovery and verification requests show neutral results and rate-limit errors', async ({ page }) => {
  await page.route('**/api/auth/capabilities', route => route.fulfill({ json: { emailDelivery: true } }));
  await page.route('**/api/auth/request-password-reset', route => route.fulfill({ json: { status: true } }));
  await page.route('**/api/auth/send-verification-email', route => route.fulfill({ status: 429, json: { message: 'Too many requests' } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill('traveler@example.com');
  await dialog.getByRole('button', { name: 'Send email' }).click();
  await expect(dialog.getByRole('status')).toContainText('If this address has an eligible account');
  await dialog.getByRole('group', { name: 'Account access' }).getByRole('button', { name: 'Sign in', exact: true }).click();
  await dialog.getByRole('button', { name: 'Resend verification email' }).click();
  await dialog.getByRole('button', { name: 'Send email' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Too many attempts');
});

test('reset links support matching passwords, success, expired links and mobile access', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let resets = 0;
  await page.route('**/api/auth/reset-password', async route => {
    resets += 1;
    expect(route.request().postDataJSON()).toEqual({ token: 'test-reset-token', newPassword: 'abcdefghi!' });
    await route.fulfill({ json: { status: true } });
  });
  await page.goto('/?account=reset&token=test-reset-token');
  const reset = page.getByRole('dialog', { name: 'Choose a new password' });
  await expect(reset).toBeVisible();
  await expect(page).not.toHaveURL(/token=/);
  await reset.getByLabel('Password', { exact: true }).fill('abcdefghij');
  await reset.getByLabel('Confirm password', { exact: true }).fill('abcdefghij');
  await reset.getByRole('button', { name: 'Update password' }).click();
  await expect(reset.getByRole('alert')).toContainText('at least one special character');
  expect(resets).toBe(0);
  await reset.getByLabel('Password', { exact: true }).fill('abcdefghi!');
  await reset.getByLabel('Confirm password', { exact: true }).fill('Mismatched password 12345!');
  await reset.getByRole('button', { name: 'Update password' }).click();
  await expect(reset.getByRole('alert')).toContainText('Passwords do not match');
  expect(resets).toBe(0);
  await reset.getByLabel('Confirm password', { exact: true }).fill('abcdefghi!');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/reset-password-mobile.png', fullPage: true });
  await reset.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Password updated');
  expect(resets).toBe(1);
  await page.goto('/?account=reset&error=INVALID_TOKEN');
  await expect(page.getByRole('alert')).toContainText('invalid or expired');
  await page.getByRole('button', { name: 'Request a new reset link' }).click();
  await expect(page.getByRole('dialog', { name: 'Reset password', exact: true })).toBeVisible();
  await page.goto('/?account=verified');
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Email verified');
});

test('register from saving, import local days, and sign in on another browser without local storage', async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  const email = `traveler-${crypto.randomUUID()}@example.com`;
  const password = 'abcdefghi<';
  await page.goto('/#my-day');
  await page.evaluate(() => localStorage.setItem('elsewhere:seattle:savedDays', JSON.stringify([{ id: 'local-day', name: 'Before accounts', date: '2026-09-19', stops: [{ id: 'vita-kexp', start: 570, duration: 60 }] }])));
  await page.reload();
  await buildGuestDay(page);
  await page.getByRole('button', { name: 'Save day', exact: true }).click();
  await page.getByRole('group', { name: 'Account access' }).getByRole('button', { name: 'Create account' }).click();
  const registration = page.getByRole('dialog', { name: 'Create account', exact: true });
  await registration.getByLabel('Name', { exact: true }).fill('Seattle Traveler');
  await registration.getByLabel('Email', { exact: true }).fill(email);
  await registration.getByLabel('Password', { exact: true }).fill('abcdefghij');
  await registration.locator('button[type="submit"]').click();
  await expect(registration.getByRole('alert')).toContainText('at least one special character');
  await registration.getByLabel('Password', { exact: true }).fill(password);
  await registration.getByRole('button', { name: 'Show password' }).click();
  await expect(registration.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await registration.getByRole('button', { name: 'Hide password' }).click();
  await page.screenshot({ path: 'test-results/register-desktop.png' });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await registration.locator('button[type="submit"]').click();
  const login = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await expect(login.getByRole('status')).toContainText('Registration received');
  await login.getByLabel('Password', { exact: true }).fill(password);
  await login.locator('button[type="submit"]').click();
  const save = page.getByRole('dialog', { name: 'Save your day' });
  await expect(save).toBeVisible();
  await save.getByLabel('Day name').fill('Account waterfront day');
  await save.getByRole('button', { name: 'Save day', exact: true }).click();
  await expect(save).toBeHidden();
  await page.getByRole('link', { name: /^My Calendar/ }).click();
  await expect(page.getByRole('article', { name: 'Account waterfront day' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Before accounts' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Import to this account' }).click();
  await expect(page.getByRole('article', { name: 'Before accounts' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('elsewhere:seattle:savedDays'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('article', { name: 'Account waterfront day' })).toBeVisible();
  const cleanBrowser = await browser.newContext({ baseURL });
  try {
    const other = await cleanBrowser.newPage();
    await other.goto('/');
    expect(await other.evaluate(() => localStorage.getItem('elsewhere:seattle:savedDays'))).toBeNull();
    await signIn(other, email, password);
    await other.getByRole('link', { name: /^My Calendar/ }).click();
    await expect(other.getByRole('article')).toHaveCount(2);
    await other.getByRole('button', { name: 'Settings', exact: true }).click();
    await other.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(other.getByRole('article')).toHaveCount(0);
    expect((await other.request.get('/api/days')).status()).toBe(401);
    const second = { name: 'Another Traveler', email: `other-${crypto.randomUUID()}@example.com`, password };
    expect((await other.request.post('/api/auth/sign-up/email', { data: second, headers: { origin: baseURL! } })).ok()).toBe(true);
    await signIn(other, second.email, password);
    await expect(other.getByRole('heading', { name: 'No saved days yet.' })).toBeVisible();
    await expect(other.getByRole('article')).toHaveCount(0);
  } finally { await cleanBrowser.close(); }
});

test('account failures distinguish service, origin and rate limits without discarding entered details', async ({ page }) => {
  let status = 503;
  let code = 'SERVICE_UNAVAILABLE';
  await page.route('**/api/auth/sign-in/email', route => route.fulfill({ status, json: { code, message: 'Request failed' } }));
  await page.route('**/api/auth/sign-up/email', route => route.fulfill({ status, json: { code, message: 'Request failed' } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill('diagnostic@example.com');
  await dialog.getByLabel('Password', { exact: true }).fill('Example password!');
  const submit = dialog.locator('button[type="submit"]');
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText('account service is temporarily unavailable');
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveValue('Example password!');
  status = 403; code = 'INVALID_ORIGIN';
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText('site address is not allowed');
  status = 429;
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText('Too many attempts');
  await dialog.getByRole('group', { name: 'Account access' }).getByRole('button', { name: 'Create account' }).click();
  await dialog.getByLabel('Name', { exact: true }).fill('Diagnostic');
  await dialog.getByLabel('Password', { exact: true }).fill('Example password!');
  status = 503;
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText('account service is temporarily unavailable');
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Diagnostic');
  await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue('diagnostic@example.com');
  status = 429;
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText('Too many attempts');
});

test('mobile sign-in supports errors, keyboard dismissal and responsive account controls', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await dialog.getByLabel('Email', { exact: true }).fill('unknown@example.com');
  await dialog.getByLabel('Password', { exact: true }).fill('Wrong password 9123!');
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole('alert')).toContainText('Unable to sign in');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/signin-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
  for (const width of [320, 375, 850, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});