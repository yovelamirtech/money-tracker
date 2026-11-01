import { expect, test } from '@playwright/test'

// PWA: once the service worker has cached the app, it opens without a network.
test.use({ serviceWorkers: 'allow' })

test('loads and works offline after the first visit', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The worker controls the page from the next load on.
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: '+ הוספת תנועה' })).toBeVisible()

  await page.getByLabel('סכום להוספה מהירה').fill('5')
  await page.getByRole('button', { name: 'הוספה', exact: true }).click()
  await expect(page.getByRole('group', { name: 'הוצאות' })).toContainText('₪5.00')
})

test('has an installable web app manifest', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await request.get(href ?? '')).json()
  expect(manifest).toMatchObject({ display: 'standalone', lang: 'he', dir: 'rtl' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512', '512x512'])
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
})
