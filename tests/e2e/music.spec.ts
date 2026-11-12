import { expect, test } from '@playwright/test';

type DebugWindow = Window & { __stickmanDebug?: { musicPlaying: boolean } };

test('battle music (owner, 12/11/2026): silent through READY, then "Steel Rain" loops from FIGHT!', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one audio check is enough');
  const problems: string[] = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Audio track unavailable')) problems.push(msg.text());
  });
  page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()}`));
  // Automated browsers skip the music unless asked for (`music=`), like the ambience.
  await page.goto('/?play&intro&music=steel-rain');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.mouse.click(640, 400); // audio starts on the first input
  const playing = () => page.evaluate(() => (window as DebugWindow).__stickmanDebug!.musicPlaying);
  await expect.poll(playing, { timeout: 20_000 }).toBe(true);
  await page.waitForTimeout(1500);
  expect(await playing()).toBe(true); // and keeps going
  expect(problems).toEqual([]);
});
