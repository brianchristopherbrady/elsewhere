import process from 'node:process';
import { readFileSync } from 'node:fs';
import { reviewDiscovery, reviewUrls, type ReviewIssue } from '../src/discovery-review.ts';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const today = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg));
const labels: Record<ReviewIssue['kind'], string> = {
  invalid: 'Invalid data', 'ended-occurrence': 'Ended - roll forward', 'recheck-occurrence': 'Reconfirm upcoming dates',
  'needs-date': 'Needs this year\'s date', 'stale-place': 'Place review overdue',
};

const issues = reviewDiscovery(today);
console.log(`Discovery review for ${today ?? 'today (Pacific)'}: ${issues.length} item(s)`);
for (const kind of Object.keys(labels) as ReviewIssue['kind'][]) {
  const group = issues.filter(issue => issue.kind === kind);
  if (!group.length) continue;
  console.log(`\n${labels[kind]} (${group.length})`);
  for (const issue of group) console.log(`  - ${issue.name}: ${issue.detail}${issue.url ? `\n    ${issue.url}` : ''}`);
}

const verification = JSON.parse(readFileSync(new URL('../src/staple-verifications.json', import.meta.url), 'utf8')) as { generatedAt: string; entries: Record<string, { status: string; checkedAt: string }> };
const statusCounts: Record<string, number> = {};
for (const entry of Object.values(verification.entries)) statusCounts[entry.status] = (statusCounts[entry.status] ?? 0) + 1;
const ageDays = Math.round((Date.now() - Date.parse(verification.generatedAt)) / 86_400_000);
console.log(`\nList verification (${verification.generatedAt}, ${ageDays} day${ageDays === 1 ? '' : 's'} ago): ${Object.entries(statusCounts).map(([status, count]) => `${count} ${status}`).join(', ')}`);
if (ageDays > 30) console.log('  Run `npm run verify:staples` to refresh locations older than 30 days.');

if (args.includes('--links')) {
  const targets = reviewUrls();
  const failures: string[] = [];
  const manual: string[] = [];
  const check = async (target: (typeof targets)[number]) => {
    const request = (method: string) => fetch(target.url, { method, redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Elsewhere-Seattle/0.1 (source review)' } });
    try {
      let response = await request('HEAD');
      if (response.status === 405 || response.status === 403) response = await request('GET');
      if ([401, 403, 429].includes(response.status)) manual.push(`${target.name}: HTTP ${response.status} (automated checks blocked) ${target.url}`);
      else if (response.status >= 400) failures.push(`${target.name}: HTTP ${response.status} ${target.url}`);
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause?.code ?? (error as Error).name;
      manual.push(`${target.name}: ${cause} (network; retry or open manually) ${target.url}`);
    }
  };
  for (let index = 0; index < targets.length; index += 6) await Promise.all(targets.slice(index, index + 6).map(check));
  console.log(`\nLink check: ${targets.length - failures.length - manual.length}/${targets.length} confirmed reachable`);
  if (failures.length) console.log(`Broken (${failures.length})\n${failures.map(line => `  - ${line}`).join('\n')}`);
  if (manual.length) console.log(`Check manually (${manual.length})\n${manual.map(line => `  - ${line}`).join('\n')}`);
  if (failures.length && strict) process.exitCode = 1;
}

if (strict && issues.some(issue => issue.kind !== 'needs-date')) process.exitCode = 1;
