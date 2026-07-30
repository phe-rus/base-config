/**
 * The one shared place a content collection/global slug is translated into
 * its real SQL table name and back, used by both the schema *generator*
 * (`content-schema.ts`, at schema-gen time) and the raw-SQL query layer
 * (`content-queries.ts`, at request time). Keeping the forward/reverse
 * transforms colocated in one module is what guarantees they can never
 * drift apart: a mismatch here means a real `UnknownTableError` against a
 * table that actually exists.
 *
 * Every content table gets a `cn`-prefixed, camelCase name (`cnPages`,
 * `cnFormSubmissions`, ...) rather than the bare slug, since this repo's D1
 * database also holds better-auth's own tables (`user`, `session`,
 * `account`, ...) now that both live in one merged database (see the root
 * `CLAUDE.md`'s "Database" section), and the prefix guarantees no future
 * collision with whatever tables a better-auth plugin adds later. Fixed,
 * not configurable: a configurable prefix would need to stay perfectly in
 * sync between schema-gen time and runtime, a real footgun (a mismatch
 * silently 404s a table that actually exists) for flexibility nobody's
 * asked for.
 */

const CONTENT_TABLE_PREFIX = 'cn'

function toCamel(slug: string): string {
	return slug.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

/** `pages` -> `cnPages`, `form-submissions` -> `cnFormSubmissions`. */
export function contentTableName(slug: string): string {
	return CONTENT_TABLE_PREFIX + capitalize(toCamel(slug))
}

/**
 * The exact inverse of `contentTableName`, only ever needed by
 * `listGlobalSlugs` (`content-queries.ts`), which discovers globals by
 * querying `sqlite_master` directly and has to turn a real table name back
 * into the bare slug callers expect.
 */
export function slugFromContentTableName(tableName: string): string {
	const withoutPrefix = tableName.slice(CONTENT_TABLE_PREFIX.length)
	const uncapitalized =
		withoutPrefix.charAt(0).toLowerCase() + withoutPrefix.slice(1)
	return uncapitalized.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
}

/**
 * True for any real table name this module's own prefix scheme produced,
 * used by `listGlobalSlugs` to filter `sqlite_master` results down to
 * content tables (as opposed to better-auth's own tables, or SQLite/D1's
 * own internal ones, which `listGlobalSlugs` already excludes separately).
 */
export function isContentTableName(tableName: string): boolean {
	if (!tableName.startsWith(CONTENT_TABLE_PREFIX)) return false
	const rest = tableName.slice(CONTENT_TABLE_PREFIX.length)
	return rest.length > 0 && /^[A-Z]/.test(rest)
}
