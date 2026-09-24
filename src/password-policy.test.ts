import { expect, it } from 'vitest';
import { validNewPassword } from './password-policy';

it('accepts punctuation and Unicode symbols without a symbol whitelist', () => {
  for (const symbol of ['!', '"', "'", '<', '>', '&', '\\', '`', '_', '\u20ac', '\u{1f512}']) {
    expect(validNewPassword(`abcdefghi${symbol}`)).toBe(true);
  }
});

it('requires 10-128 characters and a punctuation or symbol character', () => {
  for (const password of [null, '', 'abcdefgh!', 'abcdefghij', '1234567890', 'abcdefghij ', 'abcdefghi\n', '\u00e9'.repeat(10), `${'a'.repeat(128)}!`]) {
    expect(validNewPassword(password)).toBe(false);
  }
  expect(validNewPassword(`${'a'.repeat(127)}!`)).toBe(true);
});