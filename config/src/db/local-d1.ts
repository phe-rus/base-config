import fs from 'node:fs'
import path from 'node:path'

/**
 * Node-only (uses `node:fs`/`node:path`), meant for a consumer's own
 * `drizzle.config.ts`, which runs under Node/Bun via `drizzle-kit`, never
 * for the Workers runtime or the browser. Deliberately kept out of this
 * package's isomorphic barrel (`index.ts`) for that reason; reachable at
 * `@baseconfig/core/db/local-d1` via the package's existing wildcard
 * export map entry.
 *
 * Finds wrangler's local Miniflare D1 sqlite file under `.wrangler`,
 * previously duplicated near-verbatim in each consumer's own drizzle
 * config (one copy per database); now there's exactly one database, and
 * exactly one place this lookup needs to live.
 */
export function resolveLocalD1File(): string {
	try {
		const basePath = path.resolve('.wrangler')
		const dbFile = fs
			.readdirSync(basePath, { encoding: 'utf-8', recursive: true })
			.find((file) => file.endsWith('.sqlite') && !file.endsWith('metadata.sqlite'))
		if (!dbFile) throw new Error(`.sqlite file not found in ${basePath}`)
		return path.resolve(basePath, dbFile)
	} catch (err) {
		console.log(`Error getting local d1 ${err}`)
		process.exit(1)
	}
}
