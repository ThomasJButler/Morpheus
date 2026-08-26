// Capture the README screenshot from a running local stack. Upload a
// document first (docs/DEPLOYMENT.md shows how), then:
//
//   node scripts/screenshot.mjs ../docs/images/morpheus-local.png
//
// Asks a question, waits for the answer's grounded chip, opens the citation
// panel and saves a 1280x800 PNG. On failure it still saves a screenshot so
// the state can be inspected, and prints console errors and failed requests.
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:3000';
const question = process.env.QUESTION || 'Who is the CTO?';
const out = process.argv[2] || '../docs/images/morpheus-local.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => {
  // Chromium reports a fully consumed SSE response as ERR_ABORTED once the
  // server closes it; that is completion, not a failure.
  if (r.url().endsWith('/api/chat') && r.failure()?.errorText === 'net::ERR_ABORTED') return;
  problems.push(`failed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`);
});
page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });

try {
  await page.goto(base);
  const input = page.getByRole('textbox', { name: /chat input/i });
  await input.waitFor({ timeout: 60_000 });
  // Wait for the health probe to flip the app to ready before sending, or
  // the message gets queued.
  await page.waitForFunction(() => !document.body.textContent?.includes('Message queued'), null, { timeout: 5_000 }).catch(() => {});
  await input.fill(question);
  await page.getByRole('button', { name: /send message/i }).click();
  await page.locator('text=/^(not )?grounded$/').first().waitFor({ timeout: 180_000 });
  const sources = page.getByRole('button', { name: /source/i }).first();
  if (await sources.isVisible()) await sources.click();
  await page.waitForTimeout(800);
} catch (error) {
  problems.push(`error: ${error.message.split('\n')[0]}`);
} finally {
  await page.screenshot({ path: out });
  await browser.close();
  console.log(`saved ${out}`);
  if (problems.length) {
    console.log('problems:');
    for (const p of problems) console.log('  ' + p);
    process.exitCode = 1;
  }
}
