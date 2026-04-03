import { test, expect } from '@playwright/test'

test.describe('Node import/export', () => {
  test('sidebar shows import button in canvas view', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=VRL ML Studio').first()).toBeVisible({ timeout: 10_000 })

    // Create project to enter canvas view
    await page.getByText('New Project').click()
    await page.getByPlaceholder(/project name/i).fill('Import Test')
    await page.getByRole('button', { name: /create/i }).click()
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 })

    // Sidebar should have import functionality
    await expect(page.getByText('Data Input')).toBeVisible()
  })
})
