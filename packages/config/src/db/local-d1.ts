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
 *
 * Returns `''` (never exits) when `.wrangler` doesn't exist yet or has no
 * matching file — a genuinely fresh project has no local D1 state at all
 * until something (e.g. `wrangler d1 migrations apply --local`) creates it
 * for the first time, and `drizzle-kit generate` (the only drizzle-kit
 * command this package's own scripts ever invoke) never actually needs a
 * live connection, only `push`/`studio`/`migrate` would. Hard-exiting here
 * used to block that exact first-ever `db:gen` call on a fresh checkout.
 */
export function resolveLocalD1File(): string {
	try {
		const basePath = path.resolve('.wrangler')
		const dbFile = fs
			.readdirSync(basePath, { encoding: 'utf-8', recursive: true })
			.find(
				(file) => file.endsWith('.sqlite') && !file.endsWith('metadata.sqlite')
			)
		if (!dbFile) {
			console.log(`No local D1 sqlite file found yet under ${basePath}`)
			return ''
		}
		return path.resolve(basePath, dbFile)
	} catch {
		console.log("No local D1 state found yet (.wrangler doesn't exist)")
		return ''
	}
}
