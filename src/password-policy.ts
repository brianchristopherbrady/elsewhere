export const minimumPasswordLength = 10;
export const maximumPasswordLength = 128;
export const passwordRequirements = 'Use 10-128 characters, including at least one special character (punctuation or symbol).';

export function validNewPassword(password: unknown): password is string {
  return typeof password === 'string'
    && password.length >= minimumPasswordLength
    && password.length <= maximumPasswordLength
    && /[\p{P}\p{S}]/u.test(password);
}