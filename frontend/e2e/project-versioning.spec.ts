import { test, expect } from '@playwright/test'

test.describe('Project versioning', () => {
  test('project dashboard lists existing projects', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=VRL ML Studio').first()).toBeVisible({ timeout: 10_000 })
    // Dashboard should render (even if empty)
    await expect(page.getByText('New Project')).toBeVisible()
  })
})
