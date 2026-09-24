export type AccountMail = { to: string; subject: string; text: string };
export type SendAccountMail = (message: AccountMail) => Promise<void>;

export function createAccountMailer(): SendAccountMail | undefined {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ACCOUNT_EMAIL_FROM;
  if (!key || !from) return undefined;
  return async message => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error('Account email delivery failed.');
  };
}