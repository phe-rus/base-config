import { chromium } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'

/**
 * Warm up the dev server before the tests run. A cold `vite dev` boot
 * recompiles the whole app (SSR + client) on first request, and the first
 * browser to load the client modules also triggers dependency re-optimization,
 * which can take well over a minute and stall the first test. Loading both
 * surfaces here (real browser, real module requests) absorbs that cost once,
 * up front, instead of inside a test.
 */
export default async function globalSetup() {
	const browser = await chromium.launch()
	const page = await browser.newPage()

	await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })
	await page
		.getByRole('heading', { level: 1 })
		.first()
		.waitFor({ state: 'visible', timeout: 120_000 })

	await page.goto(`${baseURL}/admin`, { waitUntil: 'domcontentloaded' })
	await page
		.getByRole('heading', { name: 'Sign in' })
		.waitFor({ state: 'visible', timeout: 120_000 })

	await browser.close()
}
