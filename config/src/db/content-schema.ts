import { sql } from 'drizzle-orm'
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core'

// One shared table for every collection (parameterized by `collection`, not
// one table per slug) so adding a new collection to a consumer's own config
// never needs a migration. `data` holds every field beyond the fixed
// columns as JSON text — a single-field edit only touches the columns that
// actually changed (see `content-queries.ts`'s `updateDocument`), never a
// whole-row read-then-rewrite. A consumer's own `drizzle.config.ts`-style
// setup for its D1 binding points its migration `schema` straight at this
// file (see `www/drizzle.content.config.ts`) — the library owns the shape,
// the consumer only owns the binding.
export const documents = sqliteTable(
	'documents',
	{
		id: text('id').primaryKey(),
		collection: text('collection').notNull(),
		title: text('title'),
		slug: text('slug'),
		status: text('status', { enum: ['draft', 'published'] })
			.notNull()
			.default('draft'),
		data: text('data', { mode: 'json' })
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		index('idxDocumentsCollection').on(table.collection),
		uniqueIndex('idxDocumentsCollectionSlug').on(table.collection, table.slug)
	]
)

// Globals are singletons — one row per slug, no id/title/status columns
// since there's exactly one document per global.
export const globals = sqliteTable('globals', {
	slug: text('slug').primaryKey(),
	data: text('data', { mode: 'json' })
		.$type<Record<string, unknown>>()
		.notNull()
		.default({}),
	updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
})
