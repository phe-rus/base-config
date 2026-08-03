import { collectAccess, collectHooks } from '../collections/registry'
import type {
	AccessUser,
	CollectionAccess,
	CollectionHooks,
	GeneratedCollectionDoc,
	GeneratedCollectionSlug,
	GeneratedGlobalDoc,
	GeneratedGlobalSlug,
	GlobalAccess
} from '../base.types'
import {
	performCreate,
	performDelete,
	performPrune,
	performPruneGlobal,
	performUpdate,
	performUpsertGlobal,
	resolveAccess
} from '../db/content-operations'
import {
	getDocument,
	getGlobal,
	listDocuments,
	listGlobalSlugs
} from '../db/content-queries'
import type {
	ContentDatabase,
	CreateDocumentInput,
	DocumentRow,
	GlobalRow,
	PaginatedResult,
	UpdateDocumentInput,
	WhereCondition
} from '../db/content-queries'

/** Same idea as `content-client.ts`'s `TypedDocumentRow`, built from the *server-side* `DocumentRow` (a real `Date`, not a wire-serialized ISO string, see that file's own `ContentDocumentRow` doc comment for the distinction) since a Local API call never crosses an HTTP boundary. */
export type TypedLocalDocumentRow<TSlug extends string> = Omit<
	DocumentRow,
	'data'
> & { data: GeneratedCollectionDoc<TSlug> }

/** Same idea as `TypedLocalDocumentRow`, for a global. */
export type TypedLocalGlobalRow<TSlug extends string> = Omit<
	GlobalRow,
	'data'
> & { data: GeneratedGlobalDoc<TSlug> }

export type LocalAPIOptions<TUser = AccessUser> = {
	/** Whoever this call runs "as," for a real (`overrideAccess: false`) access check, see `overrideAccess`'s own doc comment. Ignored entirely when access is overridden. */
	user?: TUser | null
	/**
	 * Skips every `access` check entirely, matching Payload's own Local API
	 * default (https://payloadcms.com/docs/local-api/overview#accessing-local-api):
	 * this call runs as fully trusted server-side code, not a lesser
	 * "always-allowed" user. **Defaults to `true`**, the opposite default
	 * from `content-route.ts`'s own HTTP routes (which always run with real
	 * access checks, an HTTP request is never automatically trusted): a
	 * caller building an internal admin tool or a background job wants the
	 * default; a caller building something that should honor a *specific*
	 * real user's own access (e.g. rendering a page as that user would see
	 * it) passes `overrideAccess: false` and a real `user`.
	 */
	overrideAccess?: boolean
}

export type LocalFindOptions<TSlug extends string> = {
	collection: TSlug
	where?: WhereCondition
	/** Restricts to `status: 'published'`, independent of `overrideAccess`/`user`: the direct way for trusted server-side code to scope out drafts without needing a real `access.read` config at all, see `ReadOptions['publishedOnly']` (`content-queries.ts`). */
	publishedOnly?: boolean
	limit?: number
	page?: number
} & LocalAPIOptions

export type LocalFindByIdOptions<TSlug extends string> = {
	collection: TSlug
	id: string
	/** Same idea as `LocalFindOptions['publishedOnly']`. */
	publishedOnly?: boolean
} & LocalAPIOptions

export type LocalCreateOptions<TSlug extends string> = {
	collection: TSlug
	data: CreateDocumentInput
} & LocalAPIOptions

export type LocalUpdateOptions<TSlug extends string> = {
	collection: TSlug
	id: string
	data: UpdateDocumentInput
} & LocalAPIOptions

export type LocalDeleteOptions<TSlug extends string> = {
	collection: TSlug
	id: string
} & LocalAPIOptions

export type LocalPruneOptions<TSlug extends string> = {
	collection: TSlug
	id: string
	knownPaths: string[]
} & LocalAPIOptions

export type LocalFindGlobalOptions<TSlug extends string> = {
	slug: TSlug
} & LocalAPIOptions

export type LocalUpdateGlobalOptions<TSlug extends string> = {
	slug: TSlug
	data: Record<string, unknown>
} & LocalAPIOptions

export type LocalPruneGlobalOptions<TSlug extends string> = {
	slug: TSlug
	knownPaths: string[]
} & LocalAPIOptions

/**
 * `ContentApiClient`'s own in-process sibling (`db/collections.ts`): the
 * exact same Payload-Local-API-named operations
 * (`find`/`findByID`/`create`/`update`/`delete`/`prune`/`listGlobals`/
 * `findGlobal`/`updateGlobal`/`pruneGlobal`), but backed directly by
 * `db/content-operations.ts`/`content-queries.ts` instead of an HTTP `fetch`
 * through `hc<...>()`, for server-side code (a TanStack Start server
 * function/loader, a cron-triggered job) running in the same Worker that
 * would otherwise have to round-trip to its own `/api/*` route to read its
 * own content. Plain awaitable functions, not TanStack Query
 * `queryOptions()`/`mutationOptions()` like `base` (`content-client.ts`)
 * returns: that distinction is deliberate, see `base`'s own doc comment,
 * this is for a call site that wants a bare `await`, not React-facing
 * caching/mutation state.
 */
export type LocalAPI = {
	find: <TSlug extends GeneratedCollectionSlug>(
		options: LocalFindOptions<TSlug>
	) => Promise<PaginatedResult<TypedLocalDocumentRow<TSlug>>>
	/** Throws if `id` doesn't exist in `collection` (or `access.read` denies it), matching Payload's own Local API default (https://payloadcms.com/docs/local-api/overview#find-by-id) and this package's existing `ContentApiClient.findByID`'s identical non-optional contract, not a silent `undefined`. */
	findByID: <TSlug extends GeneratedCollectionSlug>(
		options: LocalFindByIdOptions<TSlug>
	) => Promise<TypedLocalDocumentRow<TSlug>>
	create: <TSlug extends GeneratedCollectionSlug>(
		options: LocalCreateOptions<TSlug>
	) => Promise<TypedLocalDocumentRow<TSlug>>
	update: <TSlug extends GeneratedCollectionSlug>(
		options: LocalUpdateOptions<TSlug>
	) => Promise<TypedLocalDocumentRow<TSlug>>
	delete: <TSlug extends GeneratedCollectionSlug>(
		options: LocalDeleteOptions<TSlug>
	) => Promise<void>
	prune: <TSlug extends GeneratedCollectionSlug>(
		options: LocalPruneOptions<TSlug>
	) => Promise<TypedLocalDocumentRow<TSlug>>
	/** Loosely typed on purpose, same as `ContentApiClient.listGlobals`: an aggregate list spans every global's own distinct `data` shape, not one slug at a time. */
	listGlobals: (options?: LocalAPIOptions) => Promise<
		({ slug: string } & Omit<GlobalRow, 'data'> & {
				data: Record<string, unknown>
			})[]
	>
	findGlobal: <TSlug extends GeneratedGlobalSlug>(
		options: LocalFindGlobalOptions<TSlug>
	) => Promise<TypedLocalGlobalRow<TSlug> | null>
	updateGlobal: <TSlug extends GeneratedGlobalSlug>(
		options: LocalUpdateGlobalOptions<TSlug>
	) => Promise<TypedLocalGlobalRow<TSlug>>
	pruneGlobal: <TSlug extends GeneratedGlobalSlug>(
		options: LocalPruneGlobalOptions<TSlug>
	) => Promise<TypedLocalGlobalRow<TSlug>>
}

export type CreateLocalAPIOptions = {
	/** The consumer's own `drizzle(env.DB, ...)` instance, see `createContentRoute`'s own doc comment (`content-route.ts`). Same value already passed to `createHandler({db, ...})`; calling both from the same module (and exporting both) is the intended shape, see this function's own doc comment. */
	db: ContentDatabase
	/** Tier-2, binding-capable hooks, merged with the isomorphic Tier-1 map every registered collection/global already contributed, same shape and same merge rule as `createHandler`'s own `hooks` param. */
	hooks?: Record<string, CollectionHooks>
}

/**
 * Builds the in-process Local API. **No Tier-2 `access` override param**,
 * unlike `hooks`: every access function registered so far is a pure
 * user-role check with no binding dependency (same isomorphic-safe
 * reasoning `CollectionAccess`'s own doc comment gives, `base.types.ts`),
 * so there's nothing a binding-capable Tier-2 entry would add yet; add one
 * here, mirroring `hooks`, if a real binding-aware access check is ever
 * needed.
 *
 * **Same circular-import-trap constraint `createHandler()` already has**
 * (see `db/CLAUDE.md`'s own section on this): `collectHooks()`/
 * `collectAccess()` read `collections/registry.ts` synchronously, once, at
 * call time, so whatever calls `createLocalAPI()` needs a consumer's own
 * `base.config.ts` to have already run first. Calling this from the exact
 * same module as `createHandler()` (`src/config/api/index.ts`, which
 * already has the required `import './config/base.config'` side-effect
 * import ahead of its own `createHandler()` call) and exporting both is the
 * intended shape, not a second, separate server entry point.
 */
export function createLocalAPI({ db, hooks }: CreateLocalAPIOptions): LocalAPI {
	const mergedHooks = { ...collectHooks(), ...hooks }
	const access = collectAccess()

	return {
		find: async <TSlug extends GeneratedCollectionSlug>({
			collection,
			where,
			publishedOnly,
			limit,
			page,
			user,
			overrideAccess = true
		}: LocalFindOptions<TSlug>) => {
			const collectionAccess = access[collection] as
				| CollectionAccess
				| undefined
			const readResult = overrideAccess
				? true
				: await resolveAccess(collectionAccess?.read, { req: { user } })
			if (readResult === false) {
				return {
					docs: [],
					totalDocs: 0,
					limit: 0,
					page: 1,
					totalPages: 1,
					hasNextPage: false,
					hasPrevPage: false
				}
			}
			const accessWhere = readResult === true ? undefined : readResult
			return listDocuments(db, collection, {
				where,
				accessWhere,
				publishedOnly,
				limit,
				page
			}) as Promise<PaginatedResult<TypedLocalDocumentRow<TSlug>>>
		},
		findByID: async <TSlug extends GeneratedCollectionSlug>({
			collection,
			id,
			publishedOnly,
			user,
			overrideAccess = true
		}: LocalFindByIdOptions<TSlug>) => {
			const collectionAccess = access[collection] as
				| CollectionAccess
				| undefined
			const readResult = overrideAccess
				? true
				: await resolveAccess(collectionAccess?.read, { req: { user }, id })
			if (readResult === false) {
				throw new Error(`No document "${id}" in collection "${collection}".`)
			}
			const accessWhere = readResult === true ? undefined : readResult
			const row = await getDocument(db, collection, id, {
				accessWhere,
				publishedOnly
			})
			if (!row) {
				throw new Error(`No document "${id}" in collection "${collection}".`)
			}
			return row as TypedLocalDocumentRow<TSlug>
		},
		create: async <TSlug extends GeneratedCollectionSlug>({
			collection,
			data,
			user,
			overrideAccess = true
		}: LocalCreateOptions<TSlug>) => {
			const collectionAccess = access[collection] as
				| CollectionAccess
				| undefined
			return performCreate(db, collection, data, collectionAccess, {
				hooks: mergedHooks[collection],
				user,
				overrideAccess
			}) as Promise<TypedLocalDocumentRow<TSlug>>
		},
		update: async <TSlug extends GeneratedCollectionSlug>({
			collection,
			id,
			data,
			user,
			overrideAccess = true
		}: LocalUpdateOptions<TSlug>) => {
			const collectionAccess = access[collection] as
				| CollectionAccess
				| undefined
			const row = await performUpdate(
				db,
				collection,
				id,
				data,
				collectionAccess,
				{
					hooks: mergedHooks[collection],
					user,
					overrideAccess
				}
			)
			if (!row) {
				throw new Error(`No document "${id}" in collection "${collection}".`)
			}
			return row as TypedLocalDocumentRow<TSlug>
		},
		delete: async <TSlug extends GeneratedCollectionSlug>({
			collection,
			id,
			user,
			overrideAccess = true
		}: LocalDeleteOptions<TSlug>) => {
			const collectionAccess = access[collection] as
				| CollectionAccess
				| undefined
			await performDelete(db, collection, id, collectionAccess, {
				user,
				overrideAccess
			})
		},
		prune: async <TSlug extends GeneratedCollectionSlug>({
			collection,
			id,
			knownPaths,
			user,
			overrideAccess = true
		}: LocalPruneOptions<TSlug>) => {
			const collectionAccess = access[collection] as
				| CollectionAccess
				| undefined
			const row = await performPrune(
				db,
				collection,
				id,
				knownPaths,
				collectionAccess,
				{
					user,
					overrideAccess
				}
			)
			if (!row) {
				throw new Error(`No document "${id}" in collection "${collection}".`)
			}
			return row as TypedLocalDocumentRow<TSlug>
		},
		listGlobals: async ({
			user,
			overrideAccess = true
		}: LocalAPIOptions = {}) => {
			const slugs = await listGlobalSlugs(db)
			const rows = await Promise.all(
				slugs.map(async (slug) => {
					const globalAccess = access[slug] as GlobalAccess | undefined
					const allowed = overrideAccess
						? true
						: await resolveAccess(globalAccess?.read, { req: { user } })
					if (allowed === false) return null
					const row = await getGlobal(db, slug)
					return row ? { slug, ...row } : null
				})
			)
			return rows.filter((row): row is NonNullable<typeof row> => row !== null)
		},
		findGlobal: async <TSlug extends GeneratedGlobalSlug>({
			slug,
			user,
			overrideAccess = true
		}: LocalFindGlobalOptions<TSlug>) => {
			const globalAccess = access[slug] as GlobalAccess | undefined
			const allowed = overrideAccess
				? true
				: await resolveAccess(globalAccess?.read, { req: { user } })
			if (allowed === false) return null
			const row = await getGlobal(db, slug)
			return (row ?? null) as TypedLocalGlobalRow<TSlug> | null
		},
		updateGlobal: async <TSlug extends GeneratedGlobalSlug>({
			slug,
			data,
			user,
			overrideAccess = true
		}: LocalUpdateGlobalOptions<TSlug>) => {
			const globalAccess = access[slug] as GlobalAccess | undefined
			return performUpsertGlobal(db, slug, data, globalAccess, {
				hooks: mergedHooks[slug],
				user,
				overrideAccess
			}) as Promise<TypedLocalGlobalRow<TSlug>>
		},
		pruneGlobal: async <TSlug extends GeneratedGlobalSlug>({
			slug,
			knownPaths,
			user,
			overrideAccess = true
		}: LocalPruneGlobalOptions<TSlug>) => {
			const globalAccess = access[slug] as GlobalAccess | undefined
			const row = await performPruneGlobal(db, slug, knownPaths, globalAccess, {
				user,
				overrideAccess
			})
			if (!row) throw new Error(`No global "${slug}".`)
			return row as TypedLocalGlobalRow<TSlug>
		}
	}
}
