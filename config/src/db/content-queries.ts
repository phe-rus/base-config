import { and, desc, eq, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { documents, globals } from './content-schema'

/**
 * Structural, not `typeof someConcreteClient` — a consumer only ever hands
 * this package `drizzle(env.BASECONFIG, {logger: false})` (see
 * `www/db/content-db.ts`), nothing more. Bindings are the one thing this
 * package can never resolve itself (same `env`-isolation reason `ignite()`
 * never reads `env` on its own either) — everything downstream of that one
 * client lives here instead of being re-implemented per consumer.
 */
export type ContentDatabase = DrizzleD1Database

export type DocumentStatus = 'draft' | 'published'
export type DocumentRow = typeof documents.$inferSelect
export type GlobalRow = typeof globals.$inferSelect

export type CreateDocumentInput = {
	id: string
	collection: string
	title?: string
	slug?: string
	status?: DocumentStatus
	data: Record<string, unknown>
}

export type UpdateDocumentInput = {
	title?: string
	slug?: string
	status?: DocumentStatus
	/** Only the fields that actually changed — merged into `data`, never a whole-document overwrite. Same diff-before-send shape as the real `users` collection's own `onUpdate`. */
	fields?: Record<string, unknown>
}

/**
 * Deliberately narrow — only the columns that are real, indexed table
 * columns (`status`, `slug`) can be filtered on. Payload's own `where`
 * language reaches into arbitrary document fields because Postgres/Mongo
 * can index/query into those; this table's per-collection fields all live
 * in one opaque `data` JSON blob (see `content-schema.ts`), and querying
 * *into* that would mean per-field JSON path expressions with no index
 * backing them. Not implemented — a real gap, not a hidden one. `equals`
 * is the only operator for the same reason: no need to build a
 * `contains`/`greater_than`/etc. dispatcher for a two-field allowlist.
 */
export type WhereCondition = {
	status?: { equals: DocumentStatus }
	slug?: { equals: string }
}

export type ReadOptions = {
	/** Restricts to `status: 'published'` — set for an unauthenticated/non-admin request, since a draft is never meant to be publicly readable. Omit (or `false`) for an admin request, which needs to see drafts too, e.g. to edit them before publishing. */
	publishedOnly?: boolean
	/** Top-level column filters only — see `WhereCondition`'s own doc comment. */
	where?: WhereCondition
	/** Omit to fetch every matching row unpaginated (what every internal caller, e.g. `createContentCollection`'s local mirror, wants) — only set this from a real paginated caller like `base.find()`. */
	limit?: number
	/** 1-indexed, same convention as Payload's own `find()`. Ignored unless `limit` is also set. */
	page?: number
}

export type PaginatedResult<T> = {
	docs: T[]
	totalDocs: number
	limit: number
	page: number
	totalPages: number
	hasNextPage: boolean
	hasPrevPage: boolean
}

export async function listDocuments(
	db: ContentDatabase,
	collection: string,
	options?: ReadOptions
): Promise<PaginatedResult<DocumentRow>> {
	const conditions = [eq(documents.collection, collection)]
	if (options?.publishedOnly) conditions.push(eq(documents.status, 'published'))
	if (options?.where?.status) {
		conditions.push(eq(documents.status, options.where.status.equals))
	}
	if (options?.where?.slug) {
		conditions.push(eq(documents.slug, options.where.slug.equals))
	}
	const whereClause = and(...conditions)

	const [{ totalDocs }] = await db
		.select({ totalDocs: sql<number>`count(*)` })
		.from(documents)
		.where(whereClause)

	const page = options?.limit ? (options.page ?? 1) : 1
	const baseQuery = db
		.select()
		.from(documents)
		.where(whereClause)
		.orderBy(desc(documents.updatedAt))
	const docs = options?.limit
		? await baseQuery.limit(options.limit).offset((page - 1) * options.limit)
		: await baseQuery

	const limit = options?.limit ?? totalDocs
	const totalPages = limit > 0 ? Math.ceil(totalDocs / limit) : 1
	return {
		docs,
		totalDocs,
		limit,
		page,
		totalPages,
		hasNextPage: page < totalPages,
		hasPrevPage: page > 1
	}
}

export async function getDocument(
	db: ContentDatabase,
	collection: string,
	id: string,
	options?: ReadOptions
): Promise<DocumentRow | undefined> {
	const conditions = [
		eq(documents.collection, collection),
		eq(documents.id, id)
	]
	if (options?.publishedOnly) conditions.push(eq(documents.status, 'published'))

	const [row] = await db
		.select()
		.from(documents)
		.where(and(...conditions))
	return row
}

export async function createDocument(
	db: ContentDatabase,
	input: CreateDocumentInput
): Promise<DocumentRow> {
	const [row] = await db
		.insert(documents)
		.values({
			id: input.id,
			collection: input.collection,
			title: input.title,
			slug: input.slug,
			status: input.status ?? 'draft',
			data: input.data
		})
		.returning()
	return row
}

/**
 * Only writes what changed — fixed columns (`title`/`slug`/`status`) are
 * included in `.set()` only when provided, and `fields` gets merged into
 * the existing `data` blob rather than replacing it outright.
 */
export async function updateDocument(
	db: ContentDatabase,
	collection: string,
	id: string,
	input: UpdateDocumentInput
): Promise<DocumentRow | undefined> {
	const existing = await getDocument(db, collection, id)
	if (!existing) return undefined

	const [row] = await db
		.update(documents)
		.set({
			...(input.title !== undefined && { title: input.title }),
			...(input.slug !== undefined && { slug: input.slug }),
			...(input.status !== undefined && { status: input.status }),
			...(input.fields && { data: { ...existing.data, ...input.fields } })
		})
		.where(and(eq(documents.collection, collection), eq(documents.id, id)))
		.returning()
	return row
}

export async function deleteDocument(
	db: ContentDatabase,
	collection: string,
	id: string
): Promise<void> {
	await db
		.delete(documents)
		.where(and(eq(documents.collection, collection), eq(documents.id, id)))
}

export async function listGlobals(db: ContentDatabase): Promise<GlobalRow[]> {
	return db.select().from(globals)
}

export async function getGlobal(
	db: ContentDatabase,
	slug: string
): Promise<GlobalRow | undefined> {
	const [row] = await db.select().from(globals).where(eq(globals.slug, slug))
	return row
}

/**
 * Insert-or-merge — a global's first write creates its one row outright
 * (no prior `data` to merge into); every write after that merges `fields`
 * into the existing row, same pattern as `updateDocument`.
 */
export async function upsertGlobal(
	db: ContentDatabase,
	slug: string,
	fields: Record<string, unknown>
): Promise<GlobalRow> {
	const existing = await getGlobal(db, slug)

	if (!existing) {
		const [row] = await db
			.insert(globals)
			.values({ slug, data: fields })
			.returning()
		return row
	}

	const [row] = await db
		.update(globals)
		.set({ data: { ...existing.data, ...fields } })
		.where(eq(globals.slug, slug))
		.returning()
	return row
}
