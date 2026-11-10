import { expect, test, type ConsoleMessage } from '@playwright/test';

/** Mirror of the read-only debug hook in src/app/bootstrap.ts. */
interface EngineDebugInfo {
  ready: boolean;
  physicsSteps: number;
  framesRendered: number;
  crate: { x: number; y: number; speed: number };
  readPixel(xFrac: number, yFrac: number): [number, number, number, number];
}
type DebugWindow = Window & { __stickmanDebug?: EngineDebugInfo };

test('Phase 0: the 2D top-down engine-check scene renders with working physics and no errors', async ({ page }, testInfo) => {
  const problems: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()}`));

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });

  // The crate slides across the floor (top-down: no gravity), bounces off walls and comes to rest.
  const start = await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.crate);
  await expect
    .poll(() => page.evaluate(() => (window as DebugWindow).__stickmanDebug!.crate.speed), { timeout: 20_000 })
    .toBeLessThan(0.05);
  const end = await page.evaluate(() => (window as DebugWindow).__stickmanDebug!.crate);
  expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(1);

  const counters = await page.evaluate(() => {
    const d = (window as DebugWindow).__stickmanDebug!;
    return { steps: d.physicsSteps, frames: d.framesRendered };
  });
  expect(counters.steps).toBeGreaterThan(60);
  expect(counters.frames).toBeGreaterThan(10);

  // The WebGL canvas is not blank: the corner (backdrop) and centre (arena floor) render different colours.
  const [top, bottom] = await page.evaluate(() => {
    const d = (window as DebugWindow).__stickmanDebug!;
    return [d.readPixel(0.005, 0.005), d.readPixel(0.5, 0.5)];
  });
  expect(top[3]).toBe(255);
  expect(bottom[3]).toBe(255);
  const colourDistance = Math.abs(top[0] - bottom[0]) + Math.abs(top[1] - bottom[1]) + Math.abs(top[2] - bottom[2]);
  expect(colourDistance).toBeGreaterThan(30);

  await page.screenshot({ path: testInfo.outputPath(`engine-check-${testInfo.project.name}.png`) });
  expect(problems).toEqual([]);
});
