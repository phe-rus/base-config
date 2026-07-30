import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { baseConfigAuto } from '@baseconfig/core/vite'

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, './src'),
			'@db': path.resolve(import.meta.dirname, './db')
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
		babel({ presets: [reactCompilerPreset()] }),
		// Edit a collection/global under src/config while `bun run dev` is
		// running and this regenerates the schema + migrates the local D1 +
		// reloads automatically, no manual `bun run local` needed mid-session.
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
})
