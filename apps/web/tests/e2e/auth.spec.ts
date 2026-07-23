// apps/web/tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/DevDocs/i);
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');

    // Should redirect to login or show login prompt
    await expect(page.url()).toMatch(/login|auth/);
  });
});

test.describe('Project Creation Flow', () => {
  test.skip('creates a new project after login', async ({ page }) => {
    // This test would require authentication setup
    // Skipping for now until auth is implemented

    await page.goto('/dashboard');

    // Click new project button
    await page.click('text=New Project');

    // Fill in project details
    await page.fill('[name="name"]', 'Test SaaS Project');
    await page.selectOption('[name="type"]', 'saas');

    // Submit
    await page.click('text=Create');

    // Wait for redirect to interview page
    await page.waitForURL(/\/project\/.*\/interview/);

    // Verify we're on the interview page
    await expect(page.locator('h1')).toContainText('Interview');
  });
});
