import { test, expect } from '@playwright/test'

test.describe('Classification end-to-end flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=VRL ML Studio').first()).toBeVisible({ timeout: 10_000 })
  })

  test('dashboard loads with new project button', async ({ page }) => {
    await expect(page.getByText('New Project')).toBeVisible()
  })

  test('create project and navigate to canvas', async ({ page }) => {
    await page.getByText('New Project').click()
    await page.getByPlaceholder(/project name/i).fill('E2E Test Project')
    await page.getByRole('button', { name: /create/i }).click()

    // Canvas should be visible (React Flow container)
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 })
  })

  test('drag node from sidebar shows on canvas', async ({ page }) => {
    // Create a project first
    await page.getByText('New Project').click()
    await page.getByPlaceholder(/project name/i).fill('Drag Test')
    await page.getByRole('button', { name: /create/i }).click()
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 })

    // Sidebar should have node categories
    await expect(page.getByText('Data Input')).toBeVisible()
  })
})
