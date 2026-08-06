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
			tanstackStart({
				prerender: {
					enabled: true,
					crawlLinks: true // Discovers all linkable pages
				},
				sitemap: {
					enabled: true,
					host: process.env.VITE_ORIGIN
				}
			}),
			viteReact(),
			// The libraries are pre-built (esbuild, no React Compiler) and are
			// only pulled in as source here for dev HMR, so keep them out of
			// the compiler transform: compiling tiptap's `useEditor` and the
			// form hooks with React Compiler breaks them at runtime on the
			// client (empty rich text, admin stuck on its loading screen).
			babel({
				presets: [reactCompilerPreset()],
				exclude: /packages[\\/](config|ui)[\\/]src[\\/]/
			}),
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
	}
})
