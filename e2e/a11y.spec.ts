import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Some data so lists, charts and budget meters are on screen.
async function seed(page: Page, theme: 'light' | 'dark') {
  await page.goto('/')
  await page.evaluate((theme) => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const tx = (id: string, type: string, amountAgorot: number, categoryId: string, day: string) => ({
      id, type, amountAgorot, categoryId, date: `${month}-${day}`, createdAt: `${month}-${day}T10:00:00Z`, note: 'הערה',
    })
    localStorage.setItem(
      'money-tracker:v2',
      JSON.stringify({
        transactions: [
          tx('1', 'income', 1200000, 'salary', '01'),
          tx('2', 'expense', 450000, 'bills', '02'),
          tx('3', 'expense', 190000, 'groceries', '05'),
          tx('4', 'expense', 40000, 'entertainment', '06'),
          tx('5', 'expense', 1800, 'uncategorized', '07'),
        ],
        budgets: [
          { categoryId: 'groceries', limitAgorot: 200000 },
          { categoryId: 'entertainment', limitAgorot: 30000 },
          { categoryId: 'bills', limitAgorot: 30000 },
        ],
        settings: { theme, language: 'he', lastCategoryId: {} },
      }),
    )
  }, theme)
  await page.reload()
}

async function expectNoViolations(page: Page, screen: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(summary, `accessibility violations on ${screen}`).toEqual([])
}

for (const theme of ['light', 'dark'] as const) {
  test(`no WCAG AA violations on any screen (${theme})`, async ({ page }) => {
    await seed(page, theme)
    await expectNoViolations(page, 'entry')

    await page.getByLabel('הזנה חדשה').fill('קפה')
    await page.getByLabel('הזנה חדשה').press('Enter')
    await expectNoViolations(page, 'entry error')

    await page.getByRole('button', { name: /^מיון/ }).click()
    await expectNoViolations(page, 'sort')
    await page.getByRole('button', { name: 'סופר' }).click()
    await expectNoViolations(page, 'sort done')
    await page.getByRole('button', { name: 'חזרה להזנה' }).click()

    await page.getByRole('button', { name: /הוספה מפורטת/ }).click()
    await expectNoViolations(page, 'add form')
    await page.getByRole('button', { name: 'ביטול' }).click()

    await page.getByRole('navigation').getByRole('button', { name: 'חודש' }).click()
    await expectNoViolations(page, 'month')

    await page.getByRole('navigation').getByRole('button', { name: 'חיפוש' }).click()
    await expectNoViolations(page, 'search')

    await page.getByRole('navigation').getByRole('button', { name: 'הגדרות' }).click()
    await expectNoViolations(page, 'settings')

    for (const sub of ['קטגוריות', 'תנועות קבועות', 'תקציבים']) {
      await page.getByRole('button', { name: sub, exact: true }).click()
      await expectNoViolations(page, sub)
      await page.getByRole('button', { name: 'חזרה' }).click()
    }
  })
}

test('the entry works with the keyboard only', async ({ page }) => {
  await page.goto('/')
  // The field is focused on open: type and press Enter
  await expect(page.getByLabel('הזנה חדשה')).toBeFocused()
  await page.keyboard.type('קפה 18')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('list', { name: 'הזנות אחרונות' })).toContainText('קפה')
})

test('the detailed form works with the keyboard only', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /הוספה מפורטת/ }).focus()
  await page.keyboard.press('Enter')
  // Focus moves to the new screen's heading
  await expect(page.getByRole('heading', { name: 'תנועה חדשה' })).toBeFocused()

  await page.keyboard.press('Tab') // expense
  await page.keyboard.press('Tab') // income
  await page.keyboard.press('Tab') // amount
  await expect(page.getByLabel('סכום (₪)')).toBeFocused()
  await page.keyboard.type('42')
  await page.keyboard.press('Enter') // submits the form

  await expect(page.getByRole('list', { name: 'הזנות אחרונות' })).toContainText('₪42.00')
})
