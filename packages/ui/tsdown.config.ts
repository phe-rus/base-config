import { defineConfig } from 'tsdown'

export default defineConfig((inlineConfig) => ({
	entry: ['src/**/*.tsx', 'src/**/*.ts', 'src/css-modules.d.ts'],
	format: ['esm'],
	// `clean: true` during `--watch` means every incremental rebuild wipes
	// the whole `dist/` directory before repopulating it — for a one-shot
	// `build` that's fine, but under `dev`/`--watch` it opens a real window
	// where a *consumer's* dev server (Vite, mid dependency-scan) can hit
	// `dist/` while it's empty/partial and report "could not be resolved."
	// Confirmed this was happening in practice, not theoretical.
	clean: !inlineConfig.watch,
	dts: true,
	platform: 'neutral',
	outDir: 'dist',
	tsconfig: './tsconfig.json',
	deps: {
		neverBundle: ['react', 'react-dom', 'typescript']
	}
}))
