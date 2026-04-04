/**
 * Example E2E test for the home page
 * Uses Playwright for browser automation
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto('/');
  });

  test('should load the home page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/CyberEngineer Nexus/);
  });

  test('should display loading screen', async ({ page }) => {
    // The loading screen should be visible initially
    const loadingScreen = page.locator('text=Conectando con servidor');
    await expect(loadingScreen).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2500);

    // Check if top navigation is visible
    const navbar = page.locator('header');
    await expect(navbar).toBeVisible();
  });

  test('should navigate between routes', async ({ page }) => {
    // Wait for initial page load
    await page.waitForTimeout(2500);

    // Try to find and click a navigation link (adjust selector as needed)
    // This is just an example - update selector based on your UI
    const navLink = page.locator('a[href="/projects"]');
    
    if (await navLink.count() > 0) {
      await navLink.click();
      // Wait for navigation
      await page.waitForURL('/projects');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if page is still usable
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
