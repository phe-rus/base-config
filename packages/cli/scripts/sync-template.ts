import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'

/**
 * Run as this package's own `prebuild` step (`package.json`'s `build`
 * script). Copies the repo's real `templates/basics` (the one live,
 * dev-tested reference app under `bun run dev`) into this package's own
 * `templates/basics/`, stripped of anything that's dev-time-only or gets
 * regenerated fresh by a scaffolded project's own first `bun run local`.
 * Keeps `templates/basics` the single source of truth: every publish of
 * this package just snapshots whatever's currently there.
 */

const EXCLUDE = new Set([
	'node_modules',
	'.wrangler',
	'.migrations',
	'.turbo',
	'.tanstack',
	'.env.local',
	'bun.lock',
	'dist',
	'worker-configuration.d.ts'
])

const sourceDir = path.resolve(import.meta.dir, '../../../templates/basics')
const targetDir = path.resolve(import.meta.dir, '../templates/basics')

if (!existsSync(sourceDir)) {
	console.error(`Source template not found: ${sourceDir}`)
	process.exit(1)
}

rmSync(targetDir, { recursive: true, force: true })
cpSync(sourceDir, targetDir, {
	recursive: true,
	filter: (src) => !EXCLUDE.has(path.basename(src))
})

console.log(`Synced template: ${sourceDir} -> ${targetDir}`)
