import { defineConfig } from 'tsdown'

export default defineConfig((inlineConfig) => ({
	entry: ['src/cli.ts'],
	format: ['esm'],
	clean: !inlineConfig.watch,
	dts: false,
	platform: 'node',
	outDir: 'dist',
	tsconfig: './tsconfig.json',
	shims: true,
	deps: {
		neverBundle: ['@clack/prompts', 'tar']
	}
}))
