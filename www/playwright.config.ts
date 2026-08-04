import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	// Serial, single worker: the first page load after a cold `vite dev` boot
	// recompiles the whole app (SSR + client) and the Cloudflare module
	// runner is fragile under concurrent cold loads, so hitting it with
	// parallel workers makes the first run flaky.
	workers: 1,
	retries: 1,
	globalSetup: './e2e/global-setup',
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:3000',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'bun run dev',
		url: 'http://127.0.0.1:3000',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
})
