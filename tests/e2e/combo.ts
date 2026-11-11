import type { Page } from '@playwright/test';

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
      await page.keyboard.press('KeyJ'); // during a strike, buffered into the next one
    }
    await page.waitForTimeout(15);
  }
  throw new Error('the 1-2-3 combo did not reach the heavy finisher');
}
