import { test, expect, type Page } from '@playwright/test';

/** Collect console errors + uncaught page errors so tests can assert none leaked. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return errors;
}

test('boots to the menu with a rendered canvas', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');

  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 20_000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // The stage caps the canvas — it must not fill the whole 1280px-wide viewport.
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThan(700);

  expect(errors).toEqual([]);
});

test('starts a game and shows the HUD without errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.hud-stat').first()).toBeVisible();

  await page.keyboard.press('Space'); // launch the ball
  await page.waitForTimeout(1500);

  expect(errors).toEqual([]);
});

test('dev power-up spawn activates and surfaces in the HUD', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');

  await page.getByRole('button', { name: 'Play' }).click();
  await page.keyboard.press('Space');
  // Dev-only key: spawns a power-up at centre; the centred paddle collects it.
  await page.keyboard.press('p');

  await expect(page.locator('.pu-label')).toBeVisible({ timeout: 9_000 });
  expect(errors).toEqual([]);
});

test('levels menu entry is locked', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./');

  await expect(page.getByRole('button', { name: 'Levels' })).toBeDisabled({ timeout: 20_000 });

  expect(errors).toEqual([]);
});
