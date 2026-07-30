import { defineConfig } from 'tsdown'

export default defineConfig((inlineConfig) => ({
	entry: ['src/**/*.tsx', 'src/**/*.ts', 'src/css-modules.d.ts'],
	format: ['esm'],
	// See base/ui/tsdown.config.ts's own comment.
	clean: !inlineConfig.watch,
	dts: true,
	platform: 'neutral',
	outDir: 'dist',
	tsconfig: './tsconfig.json',
	deps: {
		neverBundle: [
			'react',
			'react-dom',
			'hono',
			'zod',
			'@baseconfig/ui',
			'typescript',
			'@baseconfig/core',
			'@tanstack/react-query',
			'@tabler/icons-react'
		]
	}
}))
