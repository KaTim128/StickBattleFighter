import { expect, type Page, test } from '@playwright/test';
import { tapAttack } from './combo';

type GameWindow = Window & { __stickmanDebug?: { player: { attack: string | null } } };

async function openEditor(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/admin.html');
  await expect(page.locator('#validation [data-valid]')).toBeVisible({ timeout: 30_000 });
}

test('admin editor: Inferno validates; switching a capability off stays valid; a bad stat shows a clear error', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop tool');
  const errors: string[] = [];
  await openEditor(page, errors);
  await expect(page.locator('#validation [data-valid]')).toHaveAttribute('data-valid', 'true');
  await expect(page.locator('#list button.active')).toContainText('Inferno');
  await page.screenshot({ path: testInfo.outputPath('editor-definition.png') });

  await page.getByRole('button', { name: 'Capabilities' }).click();
  await page.getByLabel('canUseAerialKicks').uncheck();
  await expect(page.locator('#validation [data-valid]')).toHaveAttribute('data-valid', 'true');
  await expect(page.locator('#validation')).toContainText('switched off');

  await page.getByRole('button', { name: 'Animation' }).click();
  await expect(page.locator('#editor .tier.character').first()).toBeVisible(); // Inferno's own clips
  await page.screenshot({ path: testInfo.outputPath('editor-animation.png') });

  await page.getByRole('button', { name: 'Stats' }).click();
  const hp = page.locator('label.row', { hasText: 'maxHp' }).locator('input');
  await hp.fill('-5');
  await hp.dispatchEvent('change');
  await expect(page.locator('#validation [data-valid]')).toHaveAttribute('data-valid', 'false');
  await expect(page.locator('#validation')).toContainText('maxHp = -5 is outside the allowed range');
  expect(errors).toEqual([]);
});

test('admin editor: "Try in game" plays the edited draft', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop tool');
  const errors: string[] = [];
  await openEditor(page, errors);
  await page.locator('label.row', { hasText: 'Display name' }).locator('input').fill('Inferno Test');
  await page.locator('label.row', { hasText: 'Display name' }).locator('input').dispatchEvent('change');
  const [game] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Try in game' }).click(),
  ]);
  await expect(game.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(game.locator('#status')).toContainText('Inferno Test');
  expect(errors).toEqual([]);
});

test('game: ?character= picks the fighter; an unknown one shows a clear message instead of crashing', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?scene=training-yard&character=base-stickman');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('#status')).toContainText('Base Stickman');
  await page.goto('/?scene=training-yard&character=no-such-fighter');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('#status')).toContainText('character "no-such-fighter" is invalid');
  await tapAttack(page);
  await expect.poll(async () => page.evaluate(() => (window as GameWindow).__stickmanDebug!.player.attack)).toBe('jab'); // still playable
  expect(errors).toEqual([]);
});
