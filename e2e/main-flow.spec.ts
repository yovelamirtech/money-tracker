import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept()) // confirm() for delete
  await page.goto('/')
})

function summary(page: import('@playwright/test').Page, label: string) {
  return page.getByRole('group', { name: label })
}

test('add → edit → delete a transaction, totals follow, data survives a reload', async ({ page }) => {
  await expect(summary(page, 'יתרה')).toContainText('₪0.00')

  // Add an expense with the full form
  await page.getByRole('button', { name: '+ הוספת תנועה' }).click()
  await page.getByLabel('סכום (₪)').fill('12.50')
  await page.getByLabel('קטגוריה').selectOption({ label: 'תחבורה' })
  await page.getByLabel('הערה (לא חובה)').fill('רב-קו')
  await page.getByRole('button', { name: 'שמירה' }).click()

  const list = page.getByRole('list', { name: 'תנועות' })
  await expect(list).toContainText('תחבורה')
  await expect(list).toContainText('רב-קו')
  await expect(summary(page, 'הוצאות')).toContainText('₪12.50')
  await expect(summary(page, 'יתרה')).toContainText('-₪12.50')

  // Quick add an income
  await page.getByLabel('סוג להוספה מהירה').getByRole('button', { name: 'הכנסה' }).click()
  await page.getByLabel('סכום להוספה מהירה').fill('1000')
  await page.getByRole('button', { name: 'הוספה', exact: true }).click()
  await expect(summary(page, 'הכנסות')).toContainText('₪1,000.00')
  await expect(summary(page, 'יתרה')).toContainText('₪987.50')

  // Persisted
  await page.reload()
  await expect(summary(page, 'יתרה')).toContainText('₪987.50')

  // Edit the expense
  await page.getByRole('button', { name: /^עריכת תחבורה/ }).click()
  await page.getByLabel('סכום (₪)').fill('20')
  await page.getByRole('button', { name: 'שמירה' }).click()
  await expect(summary(page, 'הוצאות')).toContainText('₪20.00')

  // Delete it
  await page.getByRole('button', { name: 'מחיקת תחבורה' }).click()
  await expect(list).not.toContainText('תחבורה')
  await expect(summary(page, 'הוצאות')).toContainText('₪0.00')
  await expect(summary(page, 'יתרה')).toContainText('₪1,000.00')
})

test('invalid amount shows an error and saves nothing', async ({ page }) => {
  await page.getByRole('button', { name: '+ הוספת תנועה' }).click()
  await page.getByLabel('סכום (₪)').fill('0.1.2')
  await page.getByRole('button', { name: 'שמירה' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'ביטול' }).click()
  await expect(page.getByText('אין תנועות בחודש הזה')).toBeVisible()
})

test('navigates between tabs and switches to English (LTR) and dark mode', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'תובנות' }).click()
  await expect(page.getByRole('heading', { name: 'הוצאות לפי קטגוריה' })).toBeVisible()

  await page.getByRole('navigation').getByRole('button', { name: 'הגדרות' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveClass(/dark/)

  // Settings are applied before React loads on the next visit
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { name: /\d{4}/ })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Month' })).toHaveAttribute('aria-current', 'page')
})

test('the page does not scroll sideways on a phone', async ({ page }) => {
  for (const tab of ['חודש', 'תובנות', 'חיפוש', 'הגדרות']) {
    await page.getByRole('navigation').getByRole('button', { name: tab }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `horizontal overflow on ${tab}`).toBeLessThanOrEqual(0)
  }
})
