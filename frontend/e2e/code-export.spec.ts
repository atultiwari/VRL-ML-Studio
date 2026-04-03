import { test, expect } from '@playwright/test'

test.describe('Code export', () => {
  test('export button visible in canvas view', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=VRL ML Studio').first()).toBeVisible({ timeout: 10_000 })

    // Create project to enter canvas view
    await page.getByText('New Project').click()
    await page.getByPlaceholder(/project name/i).fill('Export Test')
    await page.getByRole('button', { name: /create/i }).click()
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 })

    // Export button should be in toolbar
    await expect(page.getByRole('button', { name: /export/i }).or(page.locator('[aria-label="Export"]'))).toBeVisible()
  })
})
