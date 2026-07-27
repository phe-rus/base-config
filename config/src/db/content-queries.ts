import { and, desc, eq } from 'drizzle-orm'
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

export async function listDocuments(
	db: ContentDatabase,
	collection: string
): Promise<DocumentRow[]> {
	return db
		.select()
		.from(documents)
		.where(eq(documents.collection, collection))
		.orderBy(desc(documents.updatedAt))
}

export async function getDocument(
	db: ContentDatabase,
	collection: string,
	id: string
): Promise<DocumentRow | undefined> {
	const [row] = await db
		.select()
		.from(documents)
		.where(and(eq(documents.collection, collection), eq(documents.id, id)))
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
