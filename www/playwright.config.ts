import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
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
