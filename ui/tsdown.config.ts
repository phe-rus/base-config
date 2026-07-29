import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/**/*.tsx', 'src/**/*.ts', 'src/css-modules.d.ts'],
	format: ['esm'],
	clean: true,
	dts: true,
	platform: 'neutral',
	outDir: 'dist',
	tsconfig: './tsconfig.json',
	deps: {
		neverBundle: ['react', 'react-dom', 'typescript']
	}
})
