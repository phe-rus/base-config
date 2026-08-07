import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { baseConfigAuto } from '@baseconfig/core/vite'

export default defineConfig(({ command }) => {
	const dev = command === 'serve'
	return {
		resolve: {
			alias: {
				'@': path.resolve(import.meta.dirname, './src'),
				'@db': path.resolve(import.meta.dirname, './db'),
				// In dev, resolve the workspace libraries straight to their
				// source so edits apply live via HMR, with no rebuild step in
				// the loop (which previously churned dist and reset the dev
				// server's connections on every edit).
				...(dev
					? {
						'@baseconfig/core': path.resolve(
							import.meta.dirname,
							'../packages/config/src'
						),
						'@baseconfig/ui': path.resolve(
							import.meta.dirname,
							'../packages/ui/src'
						)
					}
					: {})
			},
			tsconfigPaths: true
		},
		plugins: [
			cloudflare({
				viteEnvironment: {
					name: 'ssr'
				},
				persistState: true
			}),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
			babel({
				presets: [reactCompilerPreset()],
				exclude: /packages[\\/](config|ui)[\\/]src[\\/]/
			}),
			baseConfigAuto({
				watchDir: path.resolve(import.meta.dirname, './src/config'),
				regenerate: () =>
					new Promise((resolve) => {
						const proc = spawn('bun', ['run', 'local', '--skip-auth'], {
							cwd: import.meta.dirname,
							stdio: 'inherit'
						})
						proc.on('exit', (code) => resolve(code === 0))
					})
			})
		]
	}
})
