import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept()) // confirm() for delete
  await page.goto('/')
})

function summary(page: import('@playwright/test').Page, label: string) {
  return page.getByRole('group', { name: label })
}

test('type → send → sort → edit → delete; totals follow; data survives a reload', async ({ page }) => {
  const field = page.getByLabel('הזנה חדשה')
  const recent = page.getByRole('list', { name: 'הזנות אחרונות' })
  const nav = page.getByRole('navigation')

  // Type and send with Enter: no category yet
  await field.fill('שכ״ד4000')
  await field.press('Enter')
  await expect(page.getByRole('status')).toContainText('ללא קטגוריה')
  await expect(recent).toContainText('שכ״ד')
  await expect(field).toHaveValue('')
  await expect(field).toBeFocused()

  // "משכורת" is income
  await field.fill('משכורת 10000')
  await page.getByRole('button', { name: 'שליחה' }).click()
  await expect(page.getByRole('status')).toContainText('· משכורת')

  // Sort it with one tap
  await page.getByRole('button', { name: 'מיון 1 ללא קטגוריה' }).click()
  await page.getByRole('button', { name: 'חשבונות' }).click()
  await expect(page.getByText('הכול ממוין')).toBeVisible()
  await page.getByRole('button', { name: 'חזרה להזנה' }).click()
  await expect(recent).toContainText('חשבונות')

  // Persisted
  await page.reload()
  await expect(recent).toContainText('שכ״ד')
  await nav.getByRole('button', { name: 'חודש' }).click()
  await expect(summary(page, 'הוצאות')).toContainText('₪4,000.00')
  await expect(summary(page, 'נשאר')).toContainText('₪6,000.00')

  // Fix the latest entry from the entry screen
  await nav.getByRole('button', { name: 'הזנה' }).click()
  await page.getByRole('button', { name: /^עריכת שכ״ד/ }).click()
  await page.getByLabel('סכום (₪)').fill('4100')
  await page.getByRole('button', { name: 'שמירה' }).click()
  await expect(recent).toContainText('₪4,100.00')

  // Delete it
  await page.getByRole('button', { name: 'מחיקת שכ״ד' }).click()
  await expect(recent).not.toContainText('שכ״ד')
  await nav.getByRole('button', { name: 'חודש' }).click()
  await expect(summary(page, 'הוצאות')).toContainText('₪0.00')
  await expect(summary(page, 'נשאר')).toContainText('₪10,000.00')
})

test('an entry without an amount shows an error and saves nothing', async ({ page }) => {
  await page.getByLabel('הזנה חדשה').fill('קפה')
  await page.getByRole('button', { name: 'שליחה' }).click()
  await expect(page.getByRole('alert')).toContainText('חסר סכום')
  await expect(page.getByText(/עוד לא הזנת כלום/)).toBeVisible()
})

test('the detailed form still adds with a date and category', async ({ page }) => {
  await page.getByRole('button', { name: /הוספה מפורטת/ }).click()
  await page.getByLabel('סכום (₪)').fill('12.50')
  await page.getByLabel('קטגוריה').selectOption({ label: 'תחבורה' })
  await page.getByLabel('הערה (לא חובה)').fill('רב-קו')
  await page.getByRole('button', { name: 'שמירה' }).click()
  await expect(page.getByRole('list', { name: 'הזנות אחרונות' })).toContainText('רב-קו')
})

test('navigates between tabs and switches to English (LTR) and dark mode', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'חודש' }).click()
  await expect(page.getByRole('heading', { name: 'הוצאות לפי קטגוריה' })).toBeVisible()

  await page.getByRole('navigation').getByRole('button', { name: 'הגדרות' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveClass(/dark/)

  // Settings are applied before React loads on the next visit
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { name: 'Latest entries' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Add' })).toHaveAttribute('aria-current', 'page')
})

test('the page does not scroll sideways on a phone', async ({ page }) => {
  for (const tab of ['הזנה', 'חודש', 'חיפוש', 'הגדרות']) {
    await page.getByRole('navigation').getByRole('button', { name: tab }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `horizontal overflow on ${tab}`).toBeLessThanOrEqual(0)
  }
})
