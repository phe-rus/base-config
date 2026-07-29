import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/cli.ts',
		'src/**/*.tsx',
		'src/**/*.ts',
		'src/css-modules.d.ts'
	],
	tsconfig: './tsconfig.json',
	outDir: 'dist',
	clean: true,
	dts: true,
	format: ['esm'],
	platform: 'node',
	deps: {
		neverBundle: [
			'react',
			'hono',
			'zod',
			'@base/ui',
			'react-dom',
			'typescript',
			'drizzle-orm',
			'@tabler/icons-react',
			'date-fns',
			'@tanstack/react-db',
			'@tanstack/react-router',
			'@tanstack/react-query',
			'@tanstack/react-store',
			'@tanstack/query-db-collection'
		]
	}
})
