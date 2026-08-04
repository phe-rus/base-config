import { expect, test, type Page } from '@playwright/test'

/**
 * Smoke tests for `www` against the dev server. `www` is the only
 * `workspace:*` consumer, so these run the library source as vite compiles it
 * (dev source aliases) plus the React Compiler babel preset, which is exactly
 * where regressions surface: a compile-order/transform change that breaks the
 * client at runtime (e.g. React Compiler auto-memoizing tiptap's `Preview`,
 * leaving the hero empty, or the admin stuck on its loading screen) is
 * invisible to SSR-only checks, every `/api/*` returns 200, the dehydrated
 * query payload is present in the HTML, and only a real browser sees the
 * blank page.
 */
function trackErrors(page: Page): string[] {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`))
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
	})
	page.on('requestfailed', (request) => {
		errors.push(
			`requestfailed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`
		)
	})
	page.on('response', (response) => {
		if (response.status() >= 500) {
			errors.push(`HTTP ${response.status()}: ${response.url()}`)
		}
	})
	return errors
}

test('frontend "/" renders the hero rich text client-side', async ({
	page
}) => {
	const errors = trackErrors(page)

	await page.goto('/', { waitUntil: 'domcontentloaded' })

	const hero = page.locator('h1').first()
	await expect(hero).toHaveText(/\S/, { timeout: 30_000 })

	expect(errors).toEqual([])
})

test('frontend "/docs" renders a second page', async ({ page }) => {
	const errors = trackErrors(page)

	await page.goto('/docs', { waitUntil: 'domcontentloaded' })

	const heading = page.locator('h1').first()
	await expect(heading).toHaveText(/\S/, { timeout: 30_000 })

	expect(errors).toEqual([])
})

test('admin "/admin" shows the sign-in view, not a stuck loading screen', async ({
	page
}) => {
	const errors = trackErrors(page)

	await page.goto('/admin', { waitUntil: 'domcontentloaded' })

	await expect(
		page.getByRole('heading', { name: 'Sign in' }),
		'should render the sign-in view, not a stuck loading screen'
	).toBeVisible({ timeout: 30_000 })
	await expect(page.locator('form')).toBeVisible()

	expect(errors).toEqual([])
})
