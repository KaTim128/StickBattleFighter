import { expect, test } from '@playwright/test';

/** Admin fighter settings (owner, 13/11/2026): edit a fighter from its page, then fight with it. */
test("fighter settings: change Titan's stats and an ability from his page, then fight with them", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'one run is enough');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/?mute');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('stickman-arena.test-hooks', '1');
  });
  const menu = page.locator('.main-menu');
  await menu.locator('[data-fighter="rampage"]').click();
  const details = page.locator('.mm-details');
  await expect(details.locator('.mm-d-config')).toBeVisible();
  await expect(details.locator('.mm-d-moveconfig')).toBeVisible(); // clearly visible beside the abilities
  const hpBefore = Number(await details.locator('[data-stat="hp"] b').textContent());

  // Stats: more health.
  await details.locator('.mm-d-config').click();
  await details.locator('.fc-tabs [data-tab="stats"]').click();
  await details.locator('[data-key="stats:maxHp"]').fill('2500');
  await details.locator('.fc-save').click();
  await expect(details.locator('.fc-panel')).toHaveCount(0); // back on his page
  await expect(details.locator('[data-stat="hp"] b')).not.toHaveText(String(hpBefore));

  // Move Config: Ground Smash gets a burn effect and a shorter cooldown.
  await details.locator('.mm-d-moveconfig').click();
  await expect(details.locator('.fc-tabs [data-tab="moves"]')).toHaveClass(/active/);
  await details.locator('[data-key="ab:a1:cooldownS"]').fill('2');
  await details.locator('[data-key="ab:a1:payload.burn.dps"]').fill('15');
  await details.locator('[data-key="ab:a1:payload.burn.durationS"]').fill('3');
  await details.locator('.fc-save').click();
  await expect(details.locator('.fc-panel')).toHaveCount(0);

  // A nonsense value is refused with a message, nothing saved.
  await details.locator('.mm-d-config').click();
  await details.locator('.fc-tabs [data-tab="stats"]').click();
  await details.locator('[data-key="stats:maxHp"]').fill('-10');
  await details.locator('.fc-save').click();
  await expect(details.locator('.fc-message')).toHaveText(/Not saved/);
  await details.locator('.fc-close').click();

  // Select him and fight: the edited fighter is the one in the arena.
  await details.locator('.mm-d-select').click();
  await Promise.all([page.waitForURL(/character=rampage/), menu.locator('.mm-play').click()]);
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __stickmanDebug?: { sceneRef?: unknown } }).__stickmanDebug?.sceneRef),
  );
  const maxHp = await page.evaluate(
    () =>
      (
        window as unknown as {
          __stickmanDebug: { sceneRef: { playerFighter: { combatant: { stats: { maxHp: number } } } } };
        }
      ).__stickmanDebug.sceneRef.playerFighter.combatant.stats.maxHp,
  );
  expect(maxHp).toBe(2500);
  const smash = await page.evaluate(() => {
    const d = (
      window as unknown as {
        __stickmanDebug: {
          sceneRef: {
            playerFighter: { caster: { def(s: string): { cooldownS: number; payload: { burn?: unknown } } } };
          };
        };
      }
    ).__stickmanDebug.sceneRef.playerFighter.caster.def('a1');
    return { cooldownS: d.cooldownS, burn: d.payload.burn };
  });
  expect(smash).toEqual({ cooldownS: 2, burn: { dps: 15, durationS: 3 } });
  expect(errors).toEqual([]);
});
