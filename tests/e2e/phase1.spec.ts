import { type ConsoleMessage, expect, test } from '@playwright/test';

interface DebugHook {
  ready: boolean;
  scene: string | null;
  physicsSteps: number;
  assetFailures: { url: string; message: string }[];
  debugOverlay: { enabled: boolean; segments: number; fps: number };
}
type DebugWindow = Window & { __stickmanDebug?: DebugHook };
const hook = (page: import('@playwright/test').Page) => page.evaluate(() => (window as DebugWindow).__stickmanDebug!);

test('debug overlay toggles with the backquote key and shows FPS and collider outlines', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m: ConsoleMessage) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  expect((await hook(page)).scene).toBe('engine-check');
  await expect(page.locator('#debug')).toBeHidden();

  await page.keyboard.press('Backquote');
  await expect(page.locator('#debug')).toBeVisible();
  await expect(page.locator('#debug')).toContainText('FPS');
  await expect.poll(async () => (await hook(page)).debugOverlay.segments).toBeGreaterThan(8);
  expect((await hook(page)).debugOverlay.fps).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath(`debug-overlay-${testInfo.project.name}.png`) });

  await page.keyboard.press('Backquote');
  await expect(page.locator('#debug')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a missing asset is reported but does not crash the game', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/?missingAssetTest');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('#status')).toContainText('1 asset(s) failed to load');

  const state = await hook(page);
  expect(state.assetFailures.map((f) => f.url)).toEqual(['assets/does-not-exist.png']);
  // The game keeps simulating after the failure.
  const steps = state.physicsSteps;
  await expect.poll(async () => (await hook(page)).physicsSteps).toBeGreaterThan(steps + 30);
  expect(pageErrors).toEqual([]);
});
