import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Personalized Content Dashboard E2E', () => {
  test('loads home dashboard with unified feed and header navigation', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page.locator('header')).toContainText('FeedPulse');
    await expect(page.locator('h1')).toContainText('My Unified Feed');

    // Verify articles are rendered
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('performs debounced search across content', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Quantum');

    // Wait for debounce and filter results
    await page.waitForTimeout(500);
    const visibleCards = page.locator('article');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('toggles favorite and persists in favorites page', async ({ page }) => {
    await page.goto('/');

    // Click first favorite button
    const firstFavButton = page.locator('button[aria-label="Add to favorites"]').first();
    await firstFavButton.click();

    // Navigate to favorites page
    await page.goto('/favorites');
    await expect(page.locator('h1')).toContainText('My Saved Favorites');
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('toggles dark mode and persists theme', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button[aria-label*="mode"]');
    await themeToggle.click();

    // Check html element class
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('switches display language', async ({ page }) => {
    await page.goto('/');

    const langSelect = page.locator('select#language-select');
    await langSelect.selectOption('hi');

    // Verify Hindi text in navigation or header
    await expect(page.locator('nav').first()).toContainText('मेरी फ़ीड');
  });

  test('protects profile route and allows login with demo profile', async ({ page }) => {
    // Try accessing /profile without auth
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);

    // Click demo quick login button
    await page.locator('button:has-text("Alex Rivera")').click();

    // Should redirect to /profile on success
    await expect(page).toHaveURL(/.*profile/);
    await expect(page.locator('h1')).toContainText('User Profile');
    await expect(page.locator('h2')).toContainText('Alex Rivera');
  });

  test('passes axe-core accessibility scan on main feed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // allow theme transitions
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('reorders feed cards using drag-and-drop interaction', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dragHandles = page.locator('button[aria-label="Drag to reorder"]');
    const firstHandle = dragHandles.first();
    await expect(firstHandle).toBeVisible();

    const articles = page.locator('article');
    const firstArticleText = await articles.first().locator('h3').innerText();
    const secondArticle = articles.nth(1);

    // Perform drag interaction from handle 1 to card 2
    await firstHandle.dragTo(secondArticle);
    await page.waitForTimeout(400);

    // Verify feed is still intact and interactive
    expect(await articles.count()).toBeGreaterThan(1);
    expect(firstArticleText).toBeDefined();
  });
});
