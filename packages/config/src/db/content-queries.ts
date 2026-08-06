import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { pruneDataToKnownPaths } from './prune'
import {
	contentTableName,
	isContentTableName,
	slugFromContentTableName
} from './table-name'

/**
 * Structural, not `typeof someConcreteClient`: a consumer only ever hands
 * this package `drizzle(env.DB, {logger: false})`
 * (see `www/db/db.ts`), nothing more. Bindings are the one thing
 * this package can never resolve itself (same `env`-isolation reason
 * `ignite()` never reads `env` on its own either), everything downstream
 * of that one client lives here instead of being re-implemented per
 * consumer.
 */
export type ContentDatabase = DrizzleD1Database

export type DocumentStatus = 'draft' | 'published'

export type DocumentRow = {
	id: string
	title: string | null
	slug: string | null
	status: DocumentStatus
	data: Record<string, unknown>
	createdAt: Date
	updatedAt: Date
}

export type GlobalRow = {
	data: Record<string, unknown>
	updatedAt: Date
}

export type CreateDocumentInput = {
	id: string
	title?: string
	slug?: string
	status?: DocumentStatus
	data: Record<string, unknown>
}

export type UpdateDocumentInput = {
	title?: string
	slug?: string
	status?: DocumentStatus
	/** Only the fields that actually changed, merged into `data`, never a whole-document overwrite. Same diff-before-send shape as the real `users` collection's own `onUpdate`. */
	fields?: Record<string, unknown>
}

/**
 * Deliberately narrow: only the columns every collection table always has
 * (`status`, `slug`) can be filtered on. Payload's own `where` language
 * reaches into arbitrary document fields because Postgres/Mongo can
 * index/query into those; every collection field beyond the fixed columns
 * still lives in one opaque `data` JSON blob (see `content-schema.ts`'s own
 * doc comment for why), and querying *into* that would mean per-field JSON
 * path expressions with no index backing them. Not implemented, a real
 * gap, not a hidden one. `equals` is the only operator for the same
 * reason: no need to build a `contains`/`greater_than`/etc. dispatcher for
 * a two-field allowlist.
 */
export type WhereCondition = {
	status?: { equals: DocumentStatus }
	slug?: { equals: string }
}

export type ReadOptions = {
	/** Restricts to `status: 'published'`, set for an unauthenticated/non-admin request, since a draft is never meant to be publicly readable. Omit (or `false`) for an admin request, which needs to see drafts too, e.g. to edit them before publishing. */
	publishedOnly?: boolean
	/** Top-level column filters only, see `WhereCondition`'s own doc comment. */
	where?: WhereCondition
	/**
	 * A `read` access function's own returned scoping (`base.types.ts`'s
	 * `ReadAccess`, e.g. `authenticatedOrPublished`'s `{status: {equals:
	 * 'published'}}` for an anonymous caller), kept as a separate field from
	 * `where` rather than merged into it: both get AND'd into the same
	 * conditions list below, so an access-required `status: 'published'`
	 * alongside a caller-requested `status: 'draft'` correctly yields zero
	 * rows instead of one silently overwriting the other.
	 */
	accessWhere?: WhereCondition
	/** Omit to fetch every matching row unpaginated (what every internal caller, e.g. `createContentCollection`'s local mirror, wants), only set this from a real paginated caller like `base.find()`. */
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

/**
 * Thrown when a query targets a collection/global slug with no matching
 * table: `content-route.ts` catches this specifically and turns it into a
 * 404, never a 500. Deliberately *not* resolved by checking a JS-side
 * registry (`collectionsBySlug`/`globalsBySlug`) first: that registry only
 * populates as a side effect of a consumer's `base.config.ts` actually
 * being imported, and dev-mode SSR (Vite lazily loads server modules per
 * route) can genuinely serve the very first API request before anything
 * has imported it, confirmed empirically, not a theoretical gap. The
 * database itself always knows which tables exist, regardless of import
 * order, so that's the actual source of truth here.
 */
export class UnknownTableError extends Error {
	constructor(public readonly table: string) {
		super(`No table named "${table}".`)
		this.name = 'UnknownTableError'
	}
}

/**
 * **Every collection/global is its own real table now (see
 * `content-schema.ts`), and this package still can't import a consumer's
 * generated table objects**, they don't exist at library-compile-time,
 * and there is no library→consumer file path that isn't "a library
 * reaching into one specific app," which this package refuses to do
 * anywhere else either. Rather than ask a consumer to pass generated table
 * objects in (real, but avoidable, extra wiring), every function here
 * takes the collection/global's own `slug` as a plain string and builds
 * raw, safely-identifier-quoted SQL against it directly: `quoteIdent`
 * only checks the string is a *safe SQL identifier shape*; `dbGet`/`dbAll`/
 * `dbRun` below are what actually confirm the table exists, by letting
 * SQLite's own "no such table" error surface as `UnknownTableError`.
 *
 * One real, disclosed cost of raw SQL over Drizzle's typed table API:
 * `$onUpdate()`/column defaults that are *Drizzle-side* JS behavior (not
 * real SQL, e.g. `updatedAt`'s auto-bump on update) don't fire for free,
 * every write below sets `updatedAt` explicitly. Real SQL-level defaults
 * (`createdAt`'s own `DEFAULT (...)` clause) still apply automatically,
 * since those live in the table's actual schema, not in Drizzle's JS layer.
 */
function quoteIdent(name: string): string {
	if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
		throw new Error(`"${name}" isn't a safe SQL table identifier.`)
	}
	return `"${name}"`
}

/**
 * Drizzle wraps D1's real error in its own `DrizzleQueryError`, whose own
 * top-level `.message` is just "Failed query: ...", the actual "no such
 * table" text lives on `.cause` (sometimes nested two levels: D1's driver
 * wraps its own error a second time), confirmed empirically against a
 * real `DrizzleQueryError` before trusting a single-level message check.
 * Walks the whole `cause` chain rather than assuming a fixed depth.
 */
function isNoSuchTableError(error: unknown): boolean {
	let current: unknown = error
	while (current) {
		const message = current instanceof Error ? current.message : String(current)
		if (/no such table/i.test(message)) return true
		current = current instanceof Error ? current.cause : undefined
	}
	return false
}

async function dbGet<T>(
	db: ContentDatabase,
	query: SQL,
	table: string
): Promise<T | undefined> {
	try {
		return await db.get<T>(query)
	} catch (error) {
		if (isNoSuchTableError(error)) throw new UnknownTableError(table)
		throw error
	}
}

async function dbAll<T>(
	db: ContentDatabase,
	query: SQL,
	table: string
): Promise<T[]> {
	try {
		return await db.all<T>(query)
	} catch (error) {
		if (isNoSuchTableError(error)) throw new UnknownTableError(table)
		throw error
	}
}

async function dbRun(
	db: ContentDatabase,
	query: SQL,
	table: string
): Promise<void> {
	try {
		await db.run(query)
	} catch (error) {
		if (isNoSuchTableError(error)) throw new UnknownTableError(table)
		throw error
	}
}

type RawDocumentRow = {
	id: string
	title: string | null
	slug: string | null
	status: string
	data: string
	createdAt: number
	updatedAt: number
}

function toDocumentRow(raw: RawDocumentRow): DocumentRow {
	return {
		id: raw.id,
		title: raw.title,
		slug: raw.slug,
		status: raw.status as DocumentStatus,
		data: JSON.parse(raw.data),
		createdAt: new Date(raw.createdAt),
		updatedAt: new Date(raw.updatedAt)
	}
}

type RawGlobalRow = { data: string; updatedAt: number }

function toGlobalRow(raw: RawGlobalRow): GlobalRow {
	return { data: JSON.parse(raw.data), updatedAt: new Date(raw.updatedAt) }
}

export async function listDocuments(
	db: ContentDatabase,
	collection: string,
	options?: ReadOptions
): Promise<PaginatedResult<DocumentRow>> {
	const table = sql.raw(quoteIdent(contentTableName(collection)))
	const conditions: SQL[] = []
	if (options?.publishedOnly) conditions.push(sql`status = 'published'`)
	if (options?.where?.status) {
		conditions.push(sql`status = ${options.where.status.equals}`)
	}
	if (options?.where?.slug) {
		conditions.push(sql`slug = ${options.where.slug.equals}`)
	}
	if (options?.accessWhere?.status) {
		conditions.push(sql`status = ${options.accessWhere.status.equals}`)
	}
	if (options?.accessWhere?.slug) {
		conditions.push(sql`slug = ${options.accessWhere.slug.equals}`)
	}
	const whereSql =
		conditions.length > 0
			? sql` WHERE ${sql.join(conditions, sql` AND `)}`
			: sql``

	const page = options?.limit ? (options.page ?? 1) : 1
	const limitSql = options?.limit
		? sql` LIMIT ${options.limit} OFFSET ${(page - 1) * options.limit}`
		: sql``
	// `COUNT(*) OVER()` rides along on the same query as the real rows,
	// the total-before-LIMIT match count on every returned row, one D1
	// round trip instead of a separate `SELECT count(*)` query first. A
	// genuinely empty result has no row to carry it on, so `totalDocs`
	// falls back to `0` below rather than reading `rows[0]` unconditionally.
	const rows = await dbAll<RawDocumentRow & { totalDocs: number }>(
		db,
		sql`SELECT *, COUNT(*) OVER() as totalDocs FROM ${table}${whereSql} ORDER BY updatedAt DESC${limitSql}`,
		collection
	)
	const totalDocs = rows[0]?.totalDocs ?? 0

	const limit = options?.limit ?? totalDocs
	const totalPages = limit > 0 ? Math.ceil(totalDocs / limit) : 1
	return {
		docs: rows.map(toDocumentRow),
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
	const table = sql.raw(quoteIdent(contentTableName(collection)))
	const conditions: SQL[] = [sql`id = ${id}`]
	if (options?.publishedOnly) conditions.push(sql`status = 'published'`)
	if (options?.where?.status) {
		conditions.push(sql`status = ${options.where.status.equals}`)
	}
	if (options?.where?.slug) {
		conditions.push(sql`slug = ${options.where.slug.equals}`)
	}
	if (options?.accessWhere?.status) {
		conditions.push(sql`status = ${options.accessWhere.status.equals}`)
	}
	if (options?.accessWhere?.slug) {
		conditions.push(sql`slug = ${options.accessWhere.slug.equals}`)
	}

	const row = await dbGet<RawDocumentRow>(
		db,
		sql`SELECT * FROM ${table} WHERE ${sql.join(conditions, sql` AND `)}`,
		collection
	)
	return row ? toDocumentRow(row) : undefined
}

export async function createDocument(
	db: ContentDatabase,
	collection: string,
	input: CreateDocumentInput
): Promise<DocumentRow> {
	const table = sql.raw(quoteIdent(contentTableName(collection)))
	const row = await dbGet<RawDocumentRow>(
		db,
		sql`
			INSERT INTO ${table} (id, title, slug, status, data)
			VALUES (${input.id}, ${input.title ?? null}, ${input.slug ?? null}, ${input.status ?? 'draft'}, ${JSON.stringify(input.data)})
			RETURNING *
		`,
		collection
	)
	return toDocumentRow(row as RawDocumentRow)
}

/**
 * Only writes what changed: fixed columns (`title`/`slug`/`status`) are
 * included in `SET` only when provided, and `fields` gets merged into the
 * existing `data` blob rather than replacing it outright.
 */
export async function updateDocument(
	db: ContentDatabase,
	collection: string,
	id: string,
	input: UpdateDocumentInput
): Promise<DocumentRow | undefined> {
	const existing = await getDocument(db, collection, id)
	if (!existing) return undefined

	const table = sql.raw(quoteIdent(contentTableName(collection)))
	const setClauses: SQL[] = [sql`updatedAt = ${Date.now()}`]
	if (input.title !== undefined) setClauses.push(sql`title = ${input.title}`)
	if (input.slug !== undefined) setClauses.push(sql`slug = ${input.slug}`)
	if (input.status !== undefined) setClauses.push(sql`status = ${input.status}`)
	if (input.fields) {
		setClauses.push(
			sql`data = ${JSON.stringify({ ...existing.data, ...input.fields })}`
		)
	}

	const row = await dbGet<RawDocumentRow>(
		db,
		sql`UPDATE ${table} SET ${sql.join(setClauses, sql`, `)} WHERE id = ${id} RETURNING *`,
		collection
	)
	return row ? toDocumentRow(row) : undefined
}

/**
 * The one deliberate exception to "every write merges rather than replaces"
 * (see `updateDocument`'s own doc comment): reconciles a document's stored
 * `data` down to only `knownPaths` (`fields/schema.ts`'s `knownFieldPaths`,
 * computed by the caller from the collection's *current* `tabs`) and writes
 * that back as a full replace, not a merge, an explicit, admin-triggered
 * "Prune" action (`content-route.ts`), never something a normal
 * create/update/publish flow does on its own. See `db/prune.ts`'s own doc
 * comment for why this needs to exist at all.
 */
export async function pruneDocument(
	db: ContentDatabase,
	collection: string,
	id: string,
	knownPaths: string[]
): Promise<DocumentRow | undefined> {
	const existing = await getDocument(db, collection, id)
	if (!existing) return undefined

	const pruned = pruneDataToKnownPaths(existing.data, knownPaths)
	const table = sql.raw(quoteIdent(contentTableName(collection)))
	const row = await dbGet<RawDocumentRow>(
		db,
		sql`UPDATE ${table} SET data = ${JSON.stringify(pruned)}, updatedAt = ${Date.now()} WHERE id = ${id} RETURNING *`,
		collection
	)
	return row ? toDocumentRow(row) : undefined
}

export async function deleteDocument(
	db: ContentDatabase,
	collection: string,
	id: string
): Promise<void> {
	await dbRun(
		db,
		sql`DELETE FROM ${sql.raw(quoteIdent(contentTableName(collection)))} WHERE id = ${id}`,
		collection
	)
}

export async function getGlobal(
	db: ContentDatabase,
	slug: string
): Promise<GlobalRow | undefined> {
	const row = await dbGet<RawGlobalRow>(
		db,
		sql`SELECT * FROM ${sql.raw(quoteIdent(contentTableName(slug)))}`,
		slug
	)
	return row ? toGlobalRow(row) : undefined
}

/**
 * Insert-or-merge: a global's first write creates its one row outright
 * (no prior `data` to merge into); every write after that merges `fields`
 * into the existing row, same pattern as `updateDocument`. A global's own
 * table only ever has one row (see `content-schema.ts`'s `globalTableSource`,
 * no `id`/primary key at all), so there's no `WHERE` needed to target it.
 */
export async function upsertGlobal(
	db: ContentDatabase,
	slug: string,
	fields: Record<string, unknown>
): Promise<GlobalRow> {
	const table = sql.raw(quoteIdent(contentTableName(slug)))
	const existing = await getGlobal(db, slug)

	if (!existing) {
		const row = await dbGet<RawGlobalRow>(
			db,
			sql`INSERT INTO ${table} (data) VALUES (${JSON.stringify(fields)}) RETURNING *`,
			slug
		)
		return toGlobalRow(row as RawGlobalRow)
	}

	const merged = { ...existing.data, ...fields }
	const row = await dbGet<RawGlobalRow>(
		db,
		sql`UPDATE ${table} SET data = ${JSON.stringify(merged)}, updatedAt = ${Date.now()} RETURNING *`,
		slug
	)
	return toGlobalRow(row as RawGlobalRow)
}

/** Same idea as `pruneDocument` above, for a global. */
export async function pruneGlobal(
	db: ContentDatabase,
	slug: string,
	knownPaths: string[]
): Promise<GlobalRow | undefined> {
	const existing = await getGlobal(db, slug)
	if (!existing) return undefined

	const pruned = pruneDataToKnownPaths(existing.data, knownPaths)
	const table = sql.raw(quoteIdent(contentTableName(slug)))
	const row = await dbGet<RawGlobalRow>(
		db,
		sql`UPDATE ${table} SET data = ${JSON.stringify(pruned)}, updatedAt = ${Date.now()} RETURNING *`,
		slug
	)
	return row ? toGlobalRow(row) : undefined
}

/** Whether `createTableSql` (a `sqlite_master.sql` DDL string) declares a column named `columnName`, matched against `drizzle-kit`'s own consistent backtick-quoted-identifier output (see `content-schema.ts`), e.g. `` `data` text DEFAULT '{}' NOT NULL ``. A plain substring check on the quoted name: cheap, and safe here specifically because every column this ever checks (`data`/`status`) is a fixed, code-controlled name, never user input that could contain the same substring some other way. */
function ddlHasColumn(createTableSql: string, columnName: string): boolean {
	return createTableSql.includes(`\`${columnName}\``)
}

/**
 * Every real global's own table, discovered directly from the live
 * database rather than a JS-side registry (see `UnknownTableError`'s own
 * doc comment for why): a table counts as a global if it has a `data`
 * column but no `status` column (every collection table always has one,
 * every global table never does; see `content-schema.ts`). System tables
 * (`sqlite_%`, `d1_%`, `_cf_%`) are excluded, and now that this D1
 * database also holds better-auth's own tables (`user`, `session`, ...),
 * so is anything that isn't a `cn-`-prefixed content table (`isContentTableName`,
 * see `table-name.ts`), before the real table name is translated back into
 * the bare slug callers expect (`slugFromContentTableName`).
 *
 * **One query, not `1 + N`.** `sqlite_master` already carries each table's
 * own `CREATE TABLE` text in its `sql` column, so the `data`/`status`
 * column check below reads straight out of that (`ddlHasColumn()`) instead
 * of a separate `pragma_table_info(name)` round-trip per table, the
 * previous shape, a real, measured cost: this is called on every admin
 * global fetch (`globalsCollection`'s `listGlobals()`, `db/collections.ts`)
 * with no caching (unlike a single global's own `content-cache.ts` entry,
 * "which globals exist at all" has no natural per-resource cache key), so
 * `1 + N` queries here means `1 + N` D1 round trips on every single call.
 */
export async function listGlobalSlugs(db: ContentDatabase): Promise<string[]> {
	const tables = await db.all<{ name: string; sql: string }>(sql`
		SELECT name, sql FROM sqlite_master
		WHERE type = 'table'
			AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'
			AND name NOT LIKE 'd1\\_%' ESCAPE '\\'
			AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\'
	`)

	const slugs: string[] = []
	for (const { name, sql: createTableSql } of tables) {
		if (!isContentTableName(name)) continue
		if (
			ddlHasColumn(createTableSql, 'data') &&
			!ddlHasColumn(createTableSql, 'status')
		) {
			slugs.push(slugFromContentTableName(name))
		}
	}
	return slugs
}
