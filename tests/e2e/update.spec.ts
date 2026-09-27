import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

// Serve the real production build with a changed SW revision to exercise the PWA lifecycle.
test('a waiting app update protects drafts and saved records', async ({ browser }) => {
  let revision = 1
  const root = resolve('dist')
  const server: Server = createServer(async (request, response) => {
    const pathname = new URL(request.url!, 'http://localhost').pathname
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return }
    try {
      let content = await readFile(file)
      if (pathname === '/sw.js') content = Buffer.concat([content, Buffer.from(`\n// QA update revision ${revision}\n`)])
      const types: Record<string, string> = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2' }
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content)
    } catch { response.writeHead(404).end() }
  })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const address = server.address() as { port: number }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
  const page = await context.newPage()
  try {
    await page.goto(`http://127.0.0.1:${address.port}`)
    await page.getByRole('button', { name: 'Explore a sample farm', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Every season, a clearer plan.' })).toBeVisible()
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.reload()
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    // Workbox identifies workers installed immediately after registration as external.
    await page.waitForTimeout(1200)
    revision = 2
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update() })
    await expect(page.locator('.update-bar')).toBeVisible()
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Scenarios', exact: true }).click()
    await page.getByLabel('Scenario name').fill('Keep through update')
    await page.locator('.update-bar').getByRole('button', { name: 'Update', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Save and close')
    await expect(page.getByLabel('Scenario name')).toHaveValue('Keep through update')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Save this scenario', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Keep through update Saved baseline/ })).toBeVisible()
    await page.locator('.update-bar').getByRole('button', { name: 'Update', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Update PaSiBudget?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.locator('.update-bar')).toBeVisible()
    await page.locator('.update-bar').getByRole('button', { name: 'Update', exact: true }).click()
    await dialog.getByRole('button', { name: 'Update now', exact: true }).click()
    await expect(page.locator('.update-bar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Keep through update Saved baseline/ })).toBeVisible()
    await expect(page.getByLabel('Active season')).toContainText('sample')
  } finally {
    await context.close()
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))
  }
})
