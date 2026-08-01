/**
 * Not a fixed schema anymore, a *generator*. This file used to export two
 * static tables (`documents`/`globals`) that every collection/global
 * shared, discriminated by a `collection` column, one shared table meant
 * adding a new collection never needed a migration, at the cost of every
 * field beyond `title`/`slug`/`status` living in one opaque `data` JSON
 * blob with no real per-collection structure.
 *
 * Every collection and global now gets its own real table instead,
 * generated from whatever the consumer actually has registered (see
 * `cli.ts`), the same "generate, then migrate" shape `AUTH` already has.
 * This module only emits the TypeScript *source* for a consumer's
 * `db/schemas/content.ts`; nothing in the library builds a live Drizzle
 * table from it directly, `content-queries.ts` takes a `tablesBySlug`
 * registry (the consumer's own generated file) as a parameter instead of
 * importing a fixed table.
 *
 * Each table still keeps a single `data` JSON column for everything beyond
 * the fixed columns, deliberately: giving every individual *field* its
 * own real SQL column would need a field-type → SQL-column mapper (and
 * real normalization for composite types like `blocks`/`array`/`relations`,
 * which don't flatten into a scalar column at all) and would reintroduce
 * migration friction on every field edit, not just when a collection is
 * added or removed. What changes here is real separation per collection,
 * not full per-field typing.
 */

import { contentTableName } from './table-name'

export type ContentTableEntry = {
	/**
	 * The collection/global's own slug, becomes the SQL table name via
	 * `contentTableName()` (`cn-`-prefixed, see that module's own doc
	 * comment for why), not verbatim.
	 */
	slug: string
	isGlobal: boolean
}

// A plain (non-template) string so it can be interpolated into the
// generated source below without fighting nested-backtick escaping,
// this literal `sql\`...\`` text is exactly what should appear in the
// output file, verbatim.
const TIMESTAMP_DEFAULT =
	"sql`(cast(unixepoch('subsecond') * 1000 as integer))`"

/**
 * Every collection/global slug becomes a real SQL table name (and a JS
 * variable name in the generated file), kept to a safe, boring identifier
 * shape on purpose, since there's no escaping/quoting story for a table
 * name here (Drizzle takes it as a plain string, SQLite takes it as a bare
 * identifier).
 */
function assertSafeIdentifier(slug: string): void {
	if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(
			`"${slug}" isn't a safe SQL table name (lowercase letters/digits/hyphens only, starting with a letter): every collection/global slug becomes a real table now.`
		)
	}
}

function toVarName(slug: string): string {
	return slug.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

function collectionTableSource(slug: string): string {
	const varName = toVarName(slug)
	return [
		`export const ${varName} = sqliteTable(`,
		`\t'${contentTableName(slug)}',`,
		'\t{',
		"\t\tid: text('id').primaryKey(),",
		"\t\ttitle: text('title'),",
		"\t\tslug: text('slug'),",
		"\t\tstatus: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),",
		"\t\tdata: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),",
		`\t\tcreatedAt: integer('createdAt', { mode: 'timestamp_ms' }).default(${TIMESTAMP_DEFAULT}).notNull(),`,
		`\t\tupdatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).default(${TIMESTAMP_DEFAULT}).$onUpdate(() => /* @__PURE__ */ new Date()).notNull()`,
		'\t},',
		`\t(table) => [uniqueIndex('idx_${varName}_slug').on(table.slug)]`,
		')'
	].join('\n')
}

function globalTableSource(slug: string): string {
	const varName = toVarName(slug)
	return [
		`export const ${varName} = sqliteTable('${contentTableName(slug)}', {`,
		"\tdata: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),",
		`\tupdatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).default(${TIMESTAMP_DEFAULT}).$onUpdate(() => /* @__PURE__ */ new Date()).notNull()`,
		'})'
	].join('\n')
}

/**
 * Builds the full generated schema file's source: one `sqliteTable` per
 * entry, `collectionTablesBySlug`/`globalTablesBySlug` lookups keyed by the
 * *real* slug (not the camelCased variable name, `content-route.ts`
 * resolves a collection/global at runtime by the string it's actually
 * called with, and needs to know which of the two a slug belongs to), and
 * `contentRelations` (`defineRelationsPart` is still required even with
 * zero real relations, this rc of drizzle-orm's own requirement,
 * unchanged from before).
 */
export function buildContentSchemaSource(entries: ContentTableEntry[]): string {
	for (const entry of entries) assertSafeIdentifier(entry.slug)

	const tableBlocks = entries.map((entry) =>
		entry.isGlobal
			? globalTableSource(entry.slug)
			: collectionTableSource(entry.slug)
	)
	const varNames = entries.map((entry) => toVarName(entry.slug))

	const collectionEntries = entries.filter((entry) => !entry.isGlobal)
	const globalEntries = entries.filter((entry) => entry.isGlobal)
	const collectionTablesBySlug = collectionEntries
		.map((entry) => `\t'${entry.slug}': ${toVarName(entry.slug)}`)
		.join(',\n')
	const globalTablesBySlug = globalEntries
		.map((entry) => `\t'${entry.slug}': ${toVarName(entry.slug)}`)
		.join(',\n')

	return [
		"import { defineRelationsPart, sql } from 'drizzle-orm'",
		"import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'",
		tableBlocks.join('\n\n'),
		`export const collectionTablesBySlug = {\n${collectionTablesBySlug}\n}`,
		`export const globalTablesBySlug = {\n${globalTablesBySlug}\n}`,
		`export const contentRelations = defineRelationsPart({ ${varNames.join(', ')} }, () => ({}))`
	].join('\n\n')
}
