import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import type {
	AccessUser,
	CollectionAccess,
	CollectionHooks,
	GlobalAccess,
	HookOperation,
	HookRequestContext
} from '../base.types'
import {
	AccessDeniedError,
	buildHookFind,
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
	listGlobalSlugs,
	UnknownTableError
} from '../db/content-queries'
import type {
	ContentDatabase,
	DocumentRow,
	WhereCondition
} from '../db/content-queries'
import { createKVContentCache } from './content-cache'
import type { KVNamespaceLike } from './content-cache'

export type { KVNamespaceLike } from './content-cache'

type SessionLike = { user: AccessUser }

type ContentRouteEnv = { Variables: { session?: SessionLike } }

export type ContentRouteType = ReturnType<typeof createContentRoute>

/**
 * A Payload-style custom endpoint (https://payloadcms.com/docs/rest-api/overview):
 * `collection`/`path`/`method` describe where it's mounted (`/api/<collection><path>`,
 * registered *before* the generic `/:collection`/`/:collection/:id` wildcards,
 * same registration-order rule `/globals` already relies on, since e.g.
 * `form-submissions` + `/submit` would otherwise ambiguously match
 * `/:collection/:id` with `id: 'submit'`). `handler` is a plain Hono
 * handler, loosely typed (`Context`, not this file's own internal
 * `ContentRouteEnv`) since a plugin author outside this file can't name
 * that type. Always Tier 2 (never declared inside `defineCollection`'s
 * isomorphic config, same as binding-capable hooks, see
 * `CollectionHooks`' own doc comment): a custom endpoint's whole reason to
 * exist is almost always binding/DB access, so it's registered directly at
 * `createHandler({endpoints: [...]})` instead.
 */
export type ContentEndpoint = {
	collection: string
	path: string
	method: 'get' | 'post' | 'put' | 'patch' | 'delete'
	handler: (c: Context) => Response | Promise<Response>
}

/**
 * What an `EndpointFactory` is handed: always `db`, the one binding every
 * conceivable endpoint factory needs (content persistence). Deliberately
 * just this, no capability-specific bindings (email, payments, anything
 * else one particular plugin might want) live here; a plugin that needs
 * something beyond `db` owns that entirely on its own contract instead
 * (see `EndpointFactory`'s own doc comment for how, e.g.
 * `@baseconfig/plugin-form-builder`'s own `handleEmail`, configured once,
 * directly on `formBuilderPlugin({handleEmail})`, read back by its own
 * `formBuilderEndpoints` via its own options registry, never threaded
 * through here). This keeps `createHandler()`'s own signature stable as
 * more plugins with completely different needs (Stripe keys, a queue
 * binding, whatever) get added later, none of them need a matching new
 * field here.
 */
export type EndpointFactoryBindings = {
	db: ContentDatabase
}

/**
 * **The mechanism that makes "plugins only configured in `base.config.ts`"
 * real**, not just true for isomorphic collections/blocks/hooks. A plugin
 * (e.g. `formBuilderPlugin()`) can't hand `createHandler()` real
 * `ContentEndpoint`s directly: building one needs `db`, a real binding the
 * plugin's own isomorphic `Plugin` function (running inside `baseConfig()`,
 * evaluated in the browser too) can never have. What it *can* safely
 * include in its returned config is this: a plain function reference that
 * *knows how* to build its endpoints once it's later handed `db`, the
 * function itself touches no binding just by existing in the client
 * bundle, only by being *called*, and it's only ever called from
 * `createHandler()` (server-only). Any *other* capability a specific
 * plugin needs (a secret, an email sender, anything) is a plain function
 * reference too, just as safe to merely hold in the plugin's own
 * isomorphic config as `db` is to hold here, since the actual risk is only
 * ever in a function's *body* (does it import/reference something
 * server-only?), never in the mere existence of a function value in the
 * bundle. That's exactly how `@baseconfig/plugin-form-builder`'s own
 * `formBuilderPlugin({handleEmail})` stays fully self-contained: one call
 * configures everything the plugin needs, with no second, separate
 * `createHandler()` param required for it. `baseConfig()` registers every
 * `BaseConfigProps['endpointFactories']` entry (`collections/registry.ts`'s
 * `registerEndpointFactories()`); `createHandler()` calls
 * `collectEndpointFactories()` and invokes each with `{db}`, merging the
 * result with its own Tier-2 `endpoints` param.
 */
export type EndpointFactory = (
	bindings: EndpointFactoryBindings
) => ContentEndpoint[]

export type ContentRouteBindings = {
	db: ContentDatabase
	/**
	 * Optional public-read cache binding, omit for no caching at all (every
	 * read goes straight to D1). Wrapped in `createKVContentCache`
	 * (`content-cache.ts`) at the top of `createContentRoute`, so every route
	 * handler below reads/writes through the resulting `ContentCache`
	 * (`get`/`put`/`delete` keyed by a `CacheResource`), never this raw
	 * binding directly. Only ever consulted/populated for a genuinely scoped
	 * document/list read (`access.read` returned a `WhereCondition`, not a
	 * plain `true`, see `resolveAccess()`'s own doc comment), and every global
	 * read (globals have no draft/published concept at all); a request whose
	 * `access.read` resolved to `true` (sees everything, potentially drafts
	 * included) always bypasses it, caching that response under a key with no
	 * per-session component would leak it to the next, less-privileged
	 * request hitting the same key.
	 *
	 * A **warm-on-write** pattern for a write that still has a live `row`
	 * (`POST`/`PATCH`/prune, via `warmPublicCaches()`), not "invalidate and
	 * let the next read repopulate": the write itself recomputes exactly what
	 * a real anonymous read would now find (`publicAccessWhere()`/
	 * `matchesWhere()`) and repopulates the cache directly, so the D1 cost of
	 * a stale cache lands on the write (paid once, by the editor) instead of
	 * on however many visitors hit a cold cache before someone happens to
	 * read it. `DELETE` (no surviving row) still just refreshes the `list`
	 * resource (`refreshListCache()`) and invalidates the rest. Covers four
	 * `CacheResource` kinds: a single document by `id`
	 * (`GET /:collection/:id`), a single document by `slug`
	 * (`GET /:collection?where={"slug":{"equals":"..."}}` with no other
	 * filter/pagination, the query a public page-by-slug lookup actually
	 * makes, since a public URL never knows a document's internal `id`), the
	 * whole unfiltered collection (`GET /:collection` with no `where`/
	 * `limit`/`page` at all, the query a nav-tree/index view actually makes),
	 * and a single global (`GET /globals/:slug`, also reused by the aggregate
	 * `GET /globals`). A genuinely filtered/paginated list still has no
	 * single natural cache key the way any of these does, so it stays
	 * uncached, see `content-cache.ts`'s own doc comment.
	 */
	cache?: KVNamespaceLike
	/**
	 * Tier-1 (isomorphic, pure) hooks, keyed by collection/global slug:
	 * `createHandler()` builds this by merging `collectHooks()`
	 * (`collections/registry.ts`) with its own Tier-2 `hooks` param before
	 * ever reaching here; a consumer calling `createContentRoute()`
	 * directly (bypassing `createHandler()`) can pass its own map too. See
	 * `CollectionHooks`' own doc comment for what a hook may/may not do.
	 */
	hooks?: Record<string, CollectionHooks>
	/**
	 * Per-collection/global access control, keyed by slug, same Tier-1/Tier-2
	 * merge shape as `hooks` above: `createHandler()` builds this by merging
	 * `collectAccess()` (`collections/registry.ts`) with its own Tier-2
	 * `access` param before ever reaching here. See `CollectionAccess`'/
	 * `GlobalAccess`'s own doc comments (`base.types.ts`) for what a slug
	 * with no entry here means (open, not denied) and what each operation
	 * gets checked against.
	 */
	access?: Record<string, CollectionAccess | GlobalAccess>
	/** See `ContentEndpoint`'s own doc comment. */
	endpoints?: ContentEndpoint[]
}

const createDocumentSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	slug: z.string().optional(),
	status: z.enum(['draft', 'published']).optional(),
	data: z.record(z.string(), z.unknown())
})

const updateDocumentSchema = z.object({
	title: z.string().optional(),
	slug: z.string().optional(),
	status: z.enum(['draft', 'published']).optional(),
	fields: z.record(z.string(), z.unknown()).optional()
})

const upsertGlobalSchema = z.record(z.string(), z.unknown())

/**
 * `knownPaths` is computed client-side (`fields/schema.ts`'s
 * `knownFieldPaths`, from the collection/global's own *currently
 * registered* `tabs`/`fields`) and sent as part of the request rather than
 * this route consulting `collectionsBySlug`/`globalsBySlug` itself:
 * deliberately keeps this route registry-free (see its own doc comment, and
 * `listGlobalSlugs`' doc comment in `content-queries.ts` for the real dev-mode
 * SSR race a registry-based check here would reopen), and Prune is gated by
 * the same `access.update` check a hand-edited `update` PATCH already
 * crosses, a deliberately destructive action, not a lesser trust boundary. `.min(1)`
 * guards against ever writing an *empty* allowlist (which would prune every
 * field, not just orphaned ones) from a client bug or a genuinely-empty
 * config, either way not something this route should silently allow.
 */
const pruneSchema = z.object({ knownPaths: z.array(z.string()).min(1) })

/**
 * `where` arrives as a JSON-encoded query string (`?where={"status":{"equals":"published"}}`)
 * rather than separate `?status=...`/`?slug=...` params, matches Payload's
 * own REST convention (`?where[status][equals]=published`, here flattened
 * to one param since Hono has no built-in bracket-notation query parser)
 * and keeps this route's query shape extensible without new params per
 * filterable column. Only `status`/`slug` are accepted, see
 * `WhereCondition`'s own doc comment in `content-queries.ts`.
 */
const listQuerySchema = z.object({
	where: z
		.string()
		.optional()
		.transform((value, ctx) => {
			if (!value) return undefined
			try {
				return z
					.object({
						status: z
							.object({ equals: z.enum(['draft', 'published']) })
							.optional(),
						slug: z.object({ equals: z.string() }).optional()
					})
					.parse(JSON.parse(value))
			} catch {
				ctx.addIssue({ code: 'custom', message: 'Invalid `where` filter' })
				return z.NEVER
			}
		}),
	limit: z.coerce.number().int().positive().optional(),
	page: z.coerce.number().int().positive().optional()
})

/**
 * What an anonymous visitor's own `read` access would resolve to for this
 * collection, recomputed after every write specifically to decide what to
 * warm the public cache with. Deliberately **not** whatever the actual
 * writer's own access resolved to: an authenticated editor's `resolveAccess`
 * call already returns `true` (sees everything, drafts included) for their
 * own request, which says nothing about what a real anonymous visitor would
 * be shown, and warming the public cache with an editor's-eye view of a
 * draft would leak it.
 */
function publicAccessWhere(collectionAccess: CollectionAccess | undefined) {
	return resolveAccess(collectionAccess?.read, { req: { user: undefined } })
}

/**
 * Whether `row` is actually visible under `where`, replicated in memory
 * rather than re-querying D1: safe because `WhereCondition` is deliberately
 * narrow, `status`/`slug` equality only (`content-queries.ts`'s own doc
 * comment), the same two fields already sitting on `row`. Used right after a
 * write, on the row the write itself already returned, to decide whether
 * warming the document/slug cache with it would actually match what a real
 * anonymous `GET` would find.
 */
function matchesWhere(row: DocumentRow, where: WhereCondition): boolean {
	if (where.status && row.status !== where.status.equals) return false
	if (where.slug && row.slug !== where.slug.equals) return false
	return true
}

/** The exact single-document `PaginatedResult` envelope a real `GET /:collection?where={"slug":...}` would produce for one match, built in memory instead of re-querying D1, to warm `{kind: 'document-slug'}` from a write's own returned row. */
function singleDocResult(row: DocumentRow) {
	return {
		docs: [row],
		totalDocs: 1,
		limit: 1,
		page: 1,
		totalPages: 1,
		hasNextPage: false,
		hasPrevPage: false
	}
}

/**
 * Content CRUD, factored out as a plain Hono app rather than something a
 * consumer hand-writes: `createBaseConfigRoute()` mounts this at the
 * *root* of the API (`.route('/', createContentRoute({db, cache}))`), not
 * under a `/content` prefix, so a collection's real REST address is
 * `/api/<slug>` (`/api/pages`, `/api/posts`) and a global's is
 * `/api/globals/<slug>`, matching Payload's own REST shape exactly.
 *
 * **Takes only `db`, nothing else.** Every collection/global is its own
 * real table now (see `content-schema.ts`), but this route never checks a
 * JS-side registry to know which slugs are real: it just calls straight
 * into `content-queries.ts`, and a slug with no matching table surfaces as
 * `UnknownTableError`, caught by the `onError` handler below and turned
 * into a 404. `GET /globals` (list every global) is the one operation that
 * genuinely needs to enumerate *which* slugs exist: `listGlobalSlugs()`
 * answers that by asking the live database directly (which tables have a
 * `data` column but no `status` column), not a registry. No consumer-side
 * file needs to exist, change, or be passed in for any of this to work.
 *
 * `:collection`/`:id` are wildcard path segments living alongside the
 * literal `/globals` routes in the same app, **registered first,
 * deliberately** (see the chain below): Hono's router resolves an
 * ambiguous match (`/globals` could be `/:collection` with `collection:
 * 'globals'`) by registration order, not by static-vs-dynamic priority,
 * confirmed empirically, not assumed. This does mean `globals` is a
 * reserved collection slug, the same constraint Payload itself has around
 * its own reserved top-level paths.
 *
 * **Every route is chained off a single expression, never a bare
 * `app.get(...)` statement.** Hono's RPC type inference (`hc<AppType>()`)
 * only accumulates a route's type information through the *return value*
 * of `.get()`/`.post()`/etc, see `www/src/lib/route.ts`'s own doc comment
 * for why this matters for a consumer's typed RPC client.
 *
 * **Every operation is gated by that collection/global's own `access`
 * config** (`ContentRouteBindings['access']`, `CollectionAccess`/
 * `GlobalAccess` in `base.types.ts`), Payload's own per-collection access
 * model: `create`/`read`/`update`/`delete` each independently optional, and
 * **unset means open, not denied**, matching Payload's own documented
 * default. A collection with no `access` config at all is fully open, reads
 * and writes both; a consumer states real access (`authenticated`,
 * `authenticatedOrPublished`, etc, see `templates/basics`' own
 * `src/config/access/*.ts` for the canonical examples) on whichever
 * collections need it, the same way Payload's own generated templates
 * always do. `read` alone can also return a `WhereCondition` instead of a
 * plain boolean, to scope *which* documents are visible (e.g.
 * `authenticatedOrPublished`'s `{status: {equals: 'published'}}` for an
 * anonymous request) rather than an all-or-nothing allow/deny, see
 * `ReadAccess`'s own doc comment. `resolveAccess()` above is what every
 * route below actually calls.
 *
 * **`cache` (optional) fronts single-document/single-global public reads,
 * by `id` or by `slug`, plus the aggregate globals list**, see
 * `ContentRouteBindings['cache']`'s own doc comment for the three shapes it
 * covers. A plain filtered/paginated document list is still never cached,
 * no single natural cache key the way one document does.
 *
 * **`hooks`/`endpoints` (both optional)**, see `CollectionHooks`'/
 * `ContentEndpoint`'s own doc comments. `endpoints` are mounted first,
 * ahead of every built-in route, via a `reduce()` (a plugin's endpoint list
 * is only known at runtime, so it can't be part of the single static
 * chained expression the built-in routes are, meaning custom endpoints
 * aren't part of `ContentRouteType`'s own RPC-inferred shape, which is
 * fine: nothing in this package's own admin UI calls a plugin's endpoint
 * through the typed client, only a public page's plain `fetch()` does).
 */
export function createContentRoute({
	db,
	cache: cacheBinding,
	hooks,
	access,
	endpoints
}: ContentRouteBindings) {
	const cache = cacheBinding ? createKVContentCache(cacheBinding) : undefined
	const find = buildHookFind(db)

	/**
	 * Shared by both globals routes below (`GET /globals` and
	 * `GET /globals/:slug`) so the aggregate list route benefits from the
	 * same cache-aside behavior the single-global route already had:
	 * before this, `GET /globals` called `getGlobal` directly, bypassing
	 * `cache` entirely even though every individual slug was otherwise
	 * cached.
	 */
	async function getCachedGlobal(slug: string) {
		if (cache) {
			const cached = await cache.get({ kind: 'global', slug })
			if (cached) return cached
		}
		const row = await getGlobal(db, slug)
		const result = row ? { slug, ...row } : null
		if (cache && result) {
			await cache.put({ kind: 'global', slug }, result)
		}
		return result
	}

	/**
	 * Called after every global write (`PATCH`/prune): globals have no
	 * draft/published concept (`GlobalAccess['read']` is boolean-only, never
	 * a `WhereCondition`, unlike a collection's `read`), so whoever can read
	 * this slug at all sees the exact same row, warming straight from the
	 * write's own result is always safe once anonymous access isn't outright
	 * denied.
	 */
	async function warmGlobalCache(
		slug: string,
		globalAccess: GlobalAccess | undefined,
		row: { data: Record<string, unknown>; updatedAt: Date }
	) {
		if (!cache) return
		const allowedAnonymously =
			(await resolveAccess(globalAccess?.read, {
				req: { user: undefined }
			})) !== false
		if (allowedAnonymously) {
			await cache.put({ kind: 'global', slug }, { slug, ...row })
		} else {
			await cache.delete({ kind: 'global', slug })
		}
	}

	/**
	 * Called after every collection write that still has a live `row`
	 * (`POST`/`PATCH`/prune, **not** `DELETE`, nothing to warm a document with
	 * there): shifts the D1 cost of repopulating the public cache from "the
	 * next visitor's read" to "this write," so a publish is what pays for a
	 * fresh cache, not whoever happens to load the page first afterward.
	 * `{kind: 'document'}`/`{kind: 'document-slug'}` are warmed straight from
	 * `row` already in memory, no extra D1 call; `{kind: 'list'}` genuinely
	 * needs a fresh `listDocuments` call (a single write can't know the
	 * *rest* of the collection), one D1 read paid once per write rather than
	 * once per stale-cache visitor. Never warms with a row an anonymous
	 * visitor wouldn't actually be allowed to see, see `publicAccessWhere`'s
	 * own doc comment for why that's recomputed here rather than trusted from
	 * the write's own caller.
	 */
	async function warmPublicCaches(
		collection: string,
		collectionAccess: CollectionAccess | undefined,
		row: DocumentRow
	) {
		if (!cache) return
		const publicWhere = await publicAccessWhere(collectionAccess)
		if (publicWhere === false) {
			await cache.delete({ kind: 'list', collection })
			return
		}
		if (publicWhere === true || matchesWhere(row, publicWhere)) {
			await cache.put({ kind: 'document', collection, id: row.id }, row)
			if (row.slug) {
				await cache.put(
					{ kind: 'document-slug', collection, slug: row.slug },
					singleDocResult(row)
				)
			}
		}
		const listAccessWhere = publicWhere === true ? undefined : publicWhere
		const freshList = await listDocuments(db, collection, {
			accessWhere: listAccessWhere
		})
		await cache.put({ kind: 'list', collection }, freshList)
	}

	/** Same idea as `warmPublicCaches`, for `DELETE`: no surviving `row` to warm a document with, just the `{kind: 'list'}` refresh. */
	async function refreshListCache(
		collection: string,
		collectionAccess: CollectionAccess | undefined
	) {
		if (!cache) return
		const publicWhere = await publicAccessWhere(collectionAccess)
		if (publicWhere === false) {
			await cache.delete({ kind: 'list', collection })
			return
		}
		const listAccessWhere = publicWhere === true ? undefined : publicWhere
		const freshList = await listDocuments(db, collection, {
			accessWhere: listAccessWhere
		})
		await cache.put({ kind: 'list', collection }, freshList)
	}

	/**
	 * The four hook types that wrap a *whole* operation rather than a single
	 * write (`content-operations.ts`'s own top-of-file doc comment explains
	 * why those live here, not there): `beforeOperation` at the very start
	 * (before access control), `afterOperation` wrapping the final result,
	 * both fired for every route below, reads included, and
	 * `beforeRead`/`afterRead` around the three routes that actually read a
	 * document back from D1 (`GET /:collection`, `GET /:collection/:id`,
	 * `GET /globals/:slug`), see `CollectionBeforeReadHook`'s own doc
	 * comment for why `GET /globals` (the aggregate list) doesn't also run
	 * these per-item.
	 */
	async function runBeforeOperation(
		collection: string,
		operation: HookOperation,
		user: AccessUser | undefined
	): Promise<HookRequestContext> {
		const context: HookRequestContext = {}
		for (const hook of hooks?.[collection]?.beforeOperation ?? []) {
			await hook({ collection, context, req: { user }, operation, find })
		}
		return context
	}

	async function runAfterOperation<TResult>(
		collection: string,
		operation: HookOperation,
		user: AccessUser | undefined,
		context: HookRequestContext,
		result: TResult
	): Promise<TResult> {
		let out = result
		for (const hook of hooks?.[collection]?.afterOperation ?? []) {
			out = (await hook({
				collection,
				context,
				req: { user },
				operation,
				result: out,
				find
			})) as TResult
		}
		return out
	}

	async function runBeforeRead(
		collection: string,
		user: AccessUser | undefined,
		context: HookRequestContext,
		doc: Record<string, unknown>,
		query?: WhereCondition
	): Promise<Record<string, unknown>> {
		let out = doc
		for (const hook of hooks?.[collection]?.beforeRead ?? []) {
			out = await hook({
				collection,
				context,
				req: { user },
				doc: out,
				query,
				find
			})
		}
		return out
	}

	async function runAfterRead(
		collection: string,
		user: AccessUser | undefined,
		context: HookRequestContext,
		doc: Record<string, unknown>,
		query?: WhereCondition
	): Promise<Record<string, unknown>> {
		let out = doc
		for (const hook of hooks?.[collection]?.afterRead ?? []) {
			out = await hook({
				collection,
				context,
				req: { user },
				doc: out,
				query,
				find
			})
		}
		return out
	}

	/** `beforeRead`/`afterRead`, run back-to-back around one already-fetched row, see those hook types' own doc comment for why there's no real transform step between them here. Skipped entirely (returns `row.data` unchanged) when the collection has neither registered, the common case. */
	async function readDocument(
		collection: string,
		user: AccessUser | undefined,
		context: HookRequestContext,
		row: DocumentRow,
		query?: WhereCondition
	): Promise<DocumentRow> {
		const collectionHooks = hooks?.[collection]
		if (
			!collectionHooks?.beforeRead?.length &&
			!collectionHooks?.afterRead?.length
		) {
			return row
		}
		let data = await runBeforeRead(collection, user, context, row.data, query)
		data = await runAfterRead(collection, user, context, data, query)
		return { ...row, data }
	}

	const withEndpoints = (endpoints ?? []).reduce(
		(current, endpoint) =>
			current.on(
				endpoint.method.toUpperCase(),
				`/${endpoint.collection}${endpoint.path}`,
				endpoint.handler
			),
		new Hono<ContentRouteEnv>().onError(async (error, c) => {
			if (error instanceof UnknownTableError) {
				return c.json({ error: 'Not found' }, 404)
			}
			if (error instanceof AccessDeniedError) {
				return c.text('Unauthorized', 401)
			}
			console.error(error)
			// Route params are still readable here (the error happened during
			// or after routing matched), `collection`/`slug` covers both the
			// `/:collection*` and `/globals/:slug` shapes, `''` when neither
			// resolved (a malformed request that never matched either).
			const collection = c.req.param('collection') ?? c.req.param('slug') ?? ''
			let result = { error: 'Internal Server Error' }
			for (const hook of hooks?.[collection]?.afterError ?? []) {
				const replacement = await hook({
					collection,
					context: {},
					req: { user: c.get('session')?.user },
					error,
					result,
					find,
					origin: new URL(c.req.url).origin
				})
				if (replacement) result = replacement
			}
			return c.json(result, 500)
		})
	)

	const app = withEndpoints
		// No `beforeOperation`/`afterOperation`/`beforeRead`/`afterRead` on
		// this one route: it's an aggregate over *every* registered global,
		// not one collection/global slug, and every hook type here is keyed
		// per-slug, there's no single natural slug to look hooks up under
		// for the response as a whole (each individual global's own
		// `GET /globals/:slug` below still runs them normally).
		.get('/globals', async (c) => {
			const user = c.get('session')?.user
			const slugs = await listGlobalSlugs(db)
			const rows = await Promise.all(
				slugs.map(async (slug) => {
					const globalAccess = access?.[slug] as GlobalAccess | undefined
					const allowed = await resolveAccess(globalAccess?.read, {
						req: { user }
					})
					if (allowed === false) return null
					const cached = await getCachedGlobal(slug)
					return {
						slug,
						data: cached?.data ?? {},
						updatedAt: cached?.updatedAt ?? new Date(0)
					}
				})
			)
			return c.json(
				rows.filter((row): row is NonNullable<typeof row> => row !== null)
			)
		})
		.get('/globals/:slug', async (c) => {
			const slug = c.req.param('slug')
			const user = c.get('session')?.user
			const context = await runBeforeOperation(slug, 'findByID', user)
			const globalAccess = access?.[slug] as GlobalAccess | undefined
			const allowed = await resolveAccess(globalAccess?.read, {
				req: { user }
			})
			if (allowed === false) return c.json({ error: 'Not found' }, 404)
			const cached = await getCachedGlobal(slug)
			let result: {
				slug: string
				data: Record<string, unknown>
				updatedAt: Date
			} | null = cached
			if (result) {
				let data = await runBeforeRead(slug, user, context, result.data)
				data = await runAfterRead(slug, user, context, data)
				result = { ...result, data }
			}
			return c.json(
				await runAfterOperation(slug, 'findByID', user, context, result)
			)
		})
		.patch(
			'/globals/:slug',
			zValidator('json', upsertGlobalSchema),
			async (c) => {
				const slug = c.req.param('slug')
				const user = c.get('session')?.user
				const context = await runBeforeOperation(slug, 'update', user)
				const globalAccess = access?.[slug] as GlobalAccess | undefined
				const fields = c.req.valid('json')
				const row = await performUpsertGlobal(db, slug, fields, globalAccess, {
					hooks: hooks?.[slug],
					user,
					overrideAccess: false,
					context,
					origin: new URL(c.req.url).origin
				})
				await warmGlobalCache(slug, globalAccess, row)
				const result = await runAfterOperation(slug, 'update', user, context, {
					slug,
					...row
				})
				return c.json(result)
			}
		)
		.post(
			'/globals/:slug/prune',
			zValidator('json', pruneSchema),
			async (c) => {
				const slug = c.req.param('slug')
				const user = c.get('session')?.user
				const context = await runBeforeOperation(slug, 'update', user)
				const globalAccess = access?.[slug] as GlobalAccess | undefined
				const { knownPaths } = c.req.valid('json')
				const row = await performPruneGlobal(
					db,
					slug,
					knownPaths,
					globalAccess,
					{
						user,
						overrideAccess: false
					}
				)
				if (!row) return c.json({ error: 'Not found' }, 404)
				await warmGlobalCache(slug, globalAccess, row)
				const result = await runAfterOperation(slug, 'update', user, context, {
					slug,
					...row
				})
				return c.json(result)
			}
		)
		.get('/:collection', zValidator('query', listQuerySchema), async (c) => {
			const collection = c.req.param('collection')
			const user = c.get('session')?.user
			const context = await runBeforeOperation(collection, 'find', user)
			const collectionAccess = access?.[collection] as
				| CollectionAccess
				| undefined
			const readResult = await resolveAccess(collectionAccess?.read, {
				req: { user }
			})
			if (readResult === false) {
				const empty = {
					docs: [],
					totalDocs: 0,
					limit: 0,
					page: 1,
					totalPages: 1,
					hasNextPage: false,
					hasPrevPage: false
				}
				return c.json(
					await runAfterOperation(collection, 'find', user, context, empty)
				)
			}
			const accessWhere = readResult === true ? undefined : readResult
			const { where, limit, page } = c.req.valid('query')

			// Two cacheable list shapes, both only ever reachable for a
			// genuinely scoped (non-`true`) read, see
			// `ContentRouteBindings['cache']`'s own doc comment:
			// - a single document by slug (`?where={"slug":{"equals":"..."}}`,
			//   no other filter/pagination), the query a public page-by-slug
			//   lookup actually makes, since a public URL never knows a
			//   document's internal `id`.
			// - the whole, unfiltered, unpaginated collection (no `where` at
			//   all), the query a nav-tree/index view actually makes, see
			//   `content-cache.ts`'s own `{kind: 'list'}` doc comment for why
			//   one key per collection is safe here specifically.
			// A genuinely filtered/paginated list (any other combination)
			// still has no single natural cache key the way either of these
			// does, so it stays uncached.
			//
			// **`beforeRead`/`afterRead` only run on a fresh D1 fetch below,
			// never on a cache hit here**: a cached response was already
			// hook-transformed once, when it was warmed (`warmPublicCaches`
			// currently warms the raw row, a real, disclosed gap: a
			// `beforeRead`/`afterRead` hook registered on a *cacheable*
			// collection won't see a request served straight from cache).
			const slug = where?.slug?.equals
			const cacheableSlugLookup =
				cache && accessWhere && slug && !where?.status && !limit && !page
			const cacheableListLookup =
				cache && accessWhere && !slug && !where?.status && !limit && !page

			if (cacheableSlugLookup) {
				const cached = await cache.get({
					kind: 'document-slug',
					collection,
					slug
				})
				if (cached) {
					return c.json(
						await runAfterOperation(collection, 'find', user, context, cached)
					)
				}
			}
			if (cacheableListLookup) {
				const cached = await cache.get({ kind: 'list', collection })
				if (cached) {
					return c.json(
						await runAfterOperation(collection, 'find', user, context, cached)
					)
				}
			}

			const listResult = await listDocuments(db, collection, {
				where,
				accessWhere,
				limit,
				page
			})
			const docs = await Promise.all(
				listResult.docs.map(async (row) =>
					readDocument(collection, user, context, row)
				)
			)
			const result = { ...listResult, docs }

			// Same convention `/:collection/:id` already follows: only a real
			// hit gets cached, never a "not found" result, otherwise a
			// document created later under a previously-missed slug would
			// stay invisible until something else happened to invalidate it.
			if (cacheableSlugLookup && result.docs.length > 0) {
				await cache.put({ kind: 'document-slug', collection, slug }, result)
			}
			// Unlike the slug shape, an empty result is safe to cache here:
			// there's exactly one `list` key per collection, so a later
			// `POST` (create) trivially invalidates it regardless of whether
			// it was previously cached empty or non-empty, no "previously
			// missed slug" problem to worry about.
			if (cacheableListLookup) {
				await cache.put({ kind: 'list', collection }, result)
			}

			return c.json(
				await runAfterOperation(collection, 'find', user, context, result)
			)
		})
		.get('/:collection/:id', async (c) => {
			const { collection, id } = c.req.param()
			const user = c.get('session')?.user
			const context = await runBeforeOperation(collection, 'findByID', user)
			const collectionAccess = access?.[collection] as
				| CollectionAccess
				| undefined
			const readResult = await resolveAccess(collectionAccess?.read, {
				req: { user },
				id
			})
			if (readResult === false) return c.json({ error: 'Not found' }, 404)
			const accessWhere = readResult === true ? undefined : readResult

			// Only a genuinely scoped (non-`true`) read ever touches the cache:
			// a `true` result can see everything, including drafts, and this
			// cache has no per-session key component to safely store that under.
			// Same cache-hit caveat as `GET /:collection` above: `beforeRead`/
			// `afterRead` only run on the fresh-fetch path below.
			if (cache && accessWhere) {
				const cached = await cache.get({ kind: 'document', collection, id })
				if (cached) {
					return c.json(
						await runAfterOperation(
							collection,
							'findByID',
							user,
							context,
							cached
						)
					)
				}
			}
			const row = await getDocument(db, collection, id, { accessWhere })
			if (!row) return c.json({ error: 'Not found' }, 404)
			const hydrated = await readDocument(collection, user, context, row)
			if (cache && accessWhere) {
				await cache.put({ kind: 'document', collection, id }, hydrated)
			}
			return c.json(
				await runAfterOperation(collection, 'findByID', user, context, hydrated)
			)
		})
		.post(
			'/:collection',
			zValidator('json', createDocumentSchema),
			async (c) => {
				const collection = c.req.param('collection')
				const user = c.get('session')?.user
				const context = await runBeforeOperation(collection, 'create', user)
				const collectionAccess = access?.[collection] as
					| CollectionAccess
					| undefined
				const body = c.req.valid('json')
				const row = await performCreate(
					db,
					collection,
					body,
					collectionAccess,
					{
						hooks: hooks?.[collection],
						user,
						overrideAccess: false,
						context,
						origin: new URL(c.req.url).origin
					}
				)
				await warmPublicCaches(collection, collectionAccess, row)
				const result = await runAfterOperation(
					collection,
					'create',
					user,
					context,
					row
				)
				return c.json(result, 201)
			}
		)
		.patch(
			'/:collection/:id',
			zValidator('json', updateDocumentSchema),
			async (c) => {
				const { collection, id } = c.req.param()
				const user = c.get('session')?.user
				const context = await runBeforeOperation(collection, 'update', user)
				const collectionAccess = access?.[collection] as
					| CollectionAccess
					| undefined
				const body = c.req.valid('json')

				// Read the slug this document had *before* the write, in case
				// this update renames it: a slug change needs its old cache
				// entry invalidated too, not just whatever slug the row has
				// after the write.
				const existing = cache
					? await getDocument(db, collection, id)
					: undefined

				const row = await performUpdate(
					db,
					collection,
					id,
					body,
					collectionAccess,
					{
						hooks: hooks?.[collection],
						user,
						overrideAccess: false,
						context,
						origin: new URL(c.req.url).origin
					}
				)
				if (!row) return c.json({ error: 'Not found' }, 404)
				if (cache) {
					// Invalidate the *old* shape first, unconditionally: covers a
					// slug rename or a document that just became unpublished,
					// neither of which `warmPublicCaches` below would otherwise
					// know to clean up (it only ever writes the *current* row's
					// own resources).
					await cache.delete({ kind: 'document', collection, id })
					if (existing?.slug) {
						await cache.delete({
							kind: 'document-slug',
							collection,
							slug: existing.slug
						})
					}
					if (row.slug && row.slug !== existing?.slug) {
						await cache.delete({
							kind: 'document-slug',
							collection,
							slug: row.slug
						})
					}
					// Then warm: covers publish, unpublish, and a plain draft
					// edit alike, repopulating exactly what a real anonymous
					// read would now find (nothing, if the edit made the doc
					// non-public), see `warmPublicCaches`' own doc comment.
					await warmPublicCaches(collection, collectionAccess, row)
				}
				const result = await runAfterOperation(
					collection,
					'update',
					user,
					context,
					row
				)
				return c.json(result)
			}
		)
		.post(
			'/:collection/:id/prune',
			zValidator('json', pruneSchema),
			async (c) => {
				const { collection, id } = c.req.param()
				const user = c.get('session')?.user
				const context = await runBeforeOperation(collection, 'update', user)
				const collectionAccess = access?.[collection] as
					| CollectionAccess
					| undefined
				const { knownPaths } = c.req.valid('json')

				const existing = cache
					? await getDocument(db, collection, id)
					: undefined

				const row = await performPrune(
					db,
					collection,
					id,
					knownPaths,
					collectionAccess,
					{
						user,
						overrideAccess: false
					}
				)
				if (!row) return c.json({ error: 'Not found' }, 404)

				if (cache) {
					await cache.delete({ kind: 'document', collection, id })
					if (existing?.slug) {
						await cache.delete({
							kind: 'document-slug',
							collection,
							slug: existing.slug
						})
					}
					// The list cache holds full rows, `data` included, so a
					// prune (it only ever touches `data`) still needs a warm.
					await warmPublicCaches(collection, collectionAccess, row)
				}
				const result = await runAfterOperation(
					collection,
					'update',
					user,
					context,
					row
				)
				return c.json(result)
			}
		)
		.delete('/:collection/:id', async (c) => {
			const { collection, id } = c.req.param()
			const user = c.get('session')?.user
			const context = await runBeforeOperation(collection, 'delete', user)
			const collectionAccess = access?.[collection] as
				| CollectionAccess
				| undefined

			// Same reasoning as the PATCH handler above: read the slug before
			// deleting, since there's nothing left to read it from afterward.
			const existing = cache ? await getDocument(db, collection, id) : undefined
			await performDelete(db, collection, id, collectionAccess, {
				hooks: hooks?.[collection],
				user,
				overrideAccess: false,
				context,
				origin: new URL(c.req.url).origin
			})
			if (cache) {
				await cache.delete({ kind: 'document', collection, id })
				if (existing?.slug) {
					await cache.delete({
						kind: 'document-slug',
						collection,
						slug: existing.slug
					})
				}
				// No surviving row to warm a document with, but the unfiltered
				// list no longer includes it, worth a fresh warm too.
				await refreshListCache(collection, collectionAccess)
			}
			const result = await runAfterOperation(
				collection,
				'delete',
				user,
				context,
				{ ok: true }
			)
			return c.json(result)
		})

	return app
}
