import { defineConfig } from 'tsdown'

export default defineConfig((inlineConfig) => ({
	entry: [
		'src/index.ts',
		'src/cli.ts',
		'src/**/*.tsx',
		'src/**/*.ts',
		'src/css-modules.d.ts'
	],
	tsconfig: './tsconfig.json',
	outDir: 'dist',
	// See base/ui/tsdown.config.ts's own comment — `clean: true` under
	// `--watch` briefly empties `dist/` on every rebuild, which a
	// consumer's own dev server can observe mid dependency-scan.
	clean: !inlineConfig.watch,
	dts: true,
	format: ['esm'],
	platform: 'node',
	deps: {
		neverBundle: [
			'react',
			'hono',
			'zod',
			'@baseconfig/ui',
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
}))
