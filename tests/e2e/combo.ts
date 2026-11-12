import type { Page } from '@playwright/test';

/**
 * Where tests click in the game area: below and left of centre, clear of the HUD and the
 * settings button.
 */
export async function gamePoint(page: Page): Promise<{ x: number; y: number }> {
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  return { x: Math.round(size.width * 0.42), y: Math.round(size.height * 0.62) };
}

/** One tap attack: J (owner, 12/11/2026: the default attack key; it was left click). */
export async function tapAttack(page: Page): Promise<void> {
  await page.keyboard.press('KeyJ');
}

/**
 * Press Button 1 once per strike, like a player watching the fighter, until the heavy finisher
 * starts. The combo buffers one press per strike, so reacting to each strike stays in rhythm
 * even when a loaded browser makes fixed real-time gaps drift.
 */
export async function comboToHeavy(page: Page, attack: () => Promise<string | null>, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let pressedFor: string | null = null; // the strike (or 'start') the last press was for
  while (Date.now() < deadline) {
    const a = await attack();
    if (a === 'heavy') return;
    const now = a ?? 'start'; // idle: start (or restart) the combo with a jab
    if (now !== pressedFor) {
      pressedFor = now;
      await tapAttack(page); // during a strike, buffered into the next one
    }
    await page.waitForTimeout(15);
  }
  throw new Error('the four-hit combo did not reach the heavy finisher');
}
