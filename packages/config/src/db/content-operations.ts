import type {
	AccessArgs,
	CollectionAccess,
	CollectionHooks,
	GlobalAccess,
	HookRequestContext
} from '../base.types'
import {
	createDocument,
	deleteDocument,
	getDocument,
	pruneDocument,
	pruneGlobal,
	updateDocument,
	upsertGlobal
} from './content-queries'
import type {
	ContentDatabase,
	CreateDocumentInput,
	DocumentRow,
	GlobalRow,
	UpdateDocumentInput,
	WhereCondition
} from './content-queries'

/**
 * Thrown by every write operation below when `overrideAccess` isn't set and
 * the resolved access check denies the operation. `content-route.ts`'s own
 * `.onError()` catches this specifically (same pattern `UnknownTableError`
 * already has for an unrecognized slug) and turns it into a 401; a Local
 * API caller (`api/local-api.ts`) just lets it propagate, matching
 * Payload's own Local API throwing when a real (`overrideAccess: false`)
 * access check denies a call.
 */
export class AccessDeniedError extends Error {
	constructor() {
		super('Access denied.')
		this.name = 'AccessDeniedError'
	}
}

/**
 * Resolves one access function against `args`, defaulting to `true` (open)
 * when `accessFn` is `undefined`, see `CollectionAccess`'s own doc comment
 * (`base.types.ts`) for why that's the deliberate default rather than
 * "deny." Typed against the union of `Access`'s and `ReadAccess`'s return
 * shapes so this one helper serves both a write check (boolean-only in
 * practice) and a `read` check (which may also return a `WhereCondition`).
 * Exported so `content-route.ts`'s own read routes (list/single-document
 * `GET`, which also need the *raw* resolved value to decide cache
 * eligibility, see that file's own doc comments) can call it directly,
 * rather than going through `performFind`-style wrapper this file
 * deliberately doesn't have, see this file's own top-of-file doc comment
 * for why reads aren't wrapped the same way writes are below.
 */
export async function resolveAccess<TUser>(
	accessFn:
		| ((
				args: AccessArgs<TUser>
		  ) => boolean | WhereCondition | Promise<boolean | WhereCondition>)
		| undefined,
	args: AccessArgs<TUser>
): Promise<boolean | WhereCondition> {
	if (!accessFn) return true
	return await accessFn(args)
}

/**
 * Shared by both `content-route.ts` (HTTP) and `api/local-api.ts` (in-process):
 * the validate-then-hook-then-persist shape every *write* operation follows,
 * so a collection's `beforeValidate`/`beforeChange`/`afterChange` hooks and
 * its `access` rules can't drift between the two entry points, one calls
 * `content-queries.ts` directly, the other reimplements this same bundling a
 * second time.
 *
 * **Reads (`find`/`findByID`/`findGlobal`/`listGlobals`) are deliberately
 * NOT wrapped the same way here.** Unlike a write, a read's surrounding
 * logic genuinely differs between the two callers: `content-route.ts` needs
 * the raw resolved access value to decide public-read cache eligibility
 * (see its own doc comments) and has its own slug-lookup cache-aside
 * shape, `api/local-api.ts` needs neither. Forcing both through one shared
 * read wrapper would mean either leaking cache-eligibility state back out
 * of it (defeating the point of a shared abstraction) or duplicating the
 * cache logic inside it (which isn't this file's concern). Both callers
 * instead call `resolveAccess()` above directly and build their own
 * `ReadOptions`, real, disclosed duplication of a few lines, not a hidden
 * gap: the one thing that actually needs to stay identical (which access
 * function runs, and what "unset means open" resolves to) already does,
 * since both call the exact same `resolveAccess()`.
 *
 * **`beforeOperation`/`afterOperation`/`beforeRead`/`afterRead`/`afterError`
 * are not called from this file.** Those wrap the *whole* operation
 * (including access control, and, for reads, a code path this file has no
 * function for at all), so they're each caller's own job: `content-route.ts`
 * calls them directly around its route handlers (every operation, including
 * reads), `api/local-api.ts` does not yet (a disclosed, real gap: a Local
 * API call still runs `beforeValidate`/`beforeChange`/`afterChange`/
 * `beforeDelete`/`afterDelete` identically to an HTTP request, since those
 * live here, but not the four operation/read-wrapping hooks).
 */
export type WriteContext<TUser> = {
	hooks?: CollectionHooks<Record<string, unknown>, TUser>
	user?: TUser | null
	/** Skips the access check entirely (Payload's own Local API default) rather than treating it as always-`true`: a write bypassed this way never even calls the collection's own access function. */
	overrideAccess?: boolean
	/** Shared per-operation context threaded into every hook this write triggers, see `HookRequestContext`'s own doc comment. A caller that also runs `beforeOperation`/`afterOperation` around this same operation (`content-route.ts` does) passes the *same* object instance here, so a value one of those hooks wrote is visible to `beforeChange`/`afterChange` too. Defaults to a fresh `{}` when omitted. */
	context?: HookRequestContext
}

async function checkWriteAccess<TUser>(
	accessFn:
		| ((args: AccessArgs<TUser>) => boolean | Promise<boolean>)
		| undefined,
	args: AccessArgs<TUser>,
	overrideAccess?: boolean
): Promise<void> {
	if (overrideAccess) return
	const allowed = await resolveAccess(accessFn, args)
	if (allowed !== true) throw new AccessDeniedError()
}

export async function performCreate<TUser>(
	db: ContentDatabase,
	collection: string,
	input: CreateDocumentInput,
	collectionAccess: CollectionAccess<TUser> | undefined,
	{ hooks, user, overrideAccess, context = {} }: WriteContext<TUser>
): Promise<DocumentRow> {
	await checkWriteAccess(
		collectionAccess?.create,
		{ req: { user }, data: input.data },
		overrideAccess
	)
	const base = { collection, context, req: { user } } as const
	let data: Record<string, unknown> = input.data
	for (const hook of hooks?.beforeValidate ?? []) {
		data = await hook({ ...base, operation: 'create', data })
	}
	for (const hook of hooks?.beforeChange ?? []) {
		data = await hook({ ...base, operation: 'create', data })
	}
	const row = await createDocument(db, collection, { ...input, data })
	for (const hook of hooks?.afterChange ?? []) {
		await hook({ ...base, operation: 'create', doc: row.data })
	}
	return row
}

export async function performUpdate<TUser>(
	db: ContentDatabase,
	collection: string,
	id: string,
	input: UpdateDocumentInput,
	collectionAccess: CollectionAccess<TUser> | undefined,
	{ hooks, user, overrideAccess, context = {} }: WriteContext<TUser>
): Promise<DocumentRow | undefined> {
	await checkWriteAccess(
		collectionAccess?.update,
		{ req: { user }, id, data: input.fields },
		overrideAccess
	)
	// Fetched once, up front, whenever either hook chain is actually
	// registered: `originalDoc` (`beforeValidate`/`beforeChange`) and
	// `previousDoc` (`afterChange`) both need the pre-write row, no reason to
	// fetch it twice.
	const originalDoc =
		hooks?.beforeValidate?.length ||
		hooks?.beforeChange?.length ||
		hooks?.afterChange?.length
			? await getDocument(db, collection, id)
			: undefined
	const base = { collection, context, req: { user } } as const
	let fields: Record<string, unknown> | undefined = input.fields
	if (fields) {
		for (const hook of hooks?.beforeValidate ?? []) {
			fields = await hook({
				...base,
				operation: 'update',
				data: fields ?? {},
				originalDoc: originalDoc?.data
			})
		}
		for (const hook of hooks?.beforeChange ?? []) {
			fields = await hook({
				...base,
				operation: 'update',
				data: fields ?? {},
				originalDoc: originalDoc?.data
			})
		}
	}
	const row = await updateDocument(db, collection, id, { ...input, fields })
	if (row) {
		for (const hook of hooks?.afterChange ?? []) {
			await hook({
				...base,
				operation: 'update',
				doc: row.data,
				previousDoc: originalDoc?.data
			})
		}
	}
	return row
}

export async function performDelete<TUser>(
	db: ContentDatabase,
	collection: string,
	id: string,
	collectionAccess: CollectionAccess<TUser> | undefined,
	{ hooks, user, overrideAccess, context = {} }: WriteContext<TUser>
): Promise<void> {
	await checkWriteAccess(
		collectionAccess?.delete,
		{ req: { user }, id },
		overrideAccess
	)
	const base = { collection, context, req: { user } } as const
	for (const hook of hooks?.beforeDelete ?? []) {
		await hook({ ...base, id })
	}
	// Only fetched when something will actually use it: no wasted read for
	// the (default) case where `afterDelete` isn't registered.
	const existing = hooks?.afterDelete?.length
		? await getDocument(db, collection, id)
		: undefined
	await deleteDocument(db, collection, id)
	if (existing) {
		for (const hook of hooks?.afterDelete ?? []) {
			await hook({ ...base, id, doc: existing.data })
		}
	}
}

/** Prune is treated as an `update` for access purposes, the same trust boundary a hand-edited `update` already crosses, see `content-route.ts`'s own `pruneSchema` doc comment. */
export async function performPrune<TUser>(
	db: ContentDatabase,
	collection: string,
	id: string,
	knownPaths: string[],
	collectionAccess: CollectionAccess<TUser> | undefined,
	{ user, overrideAccess }: Omit<WriteContext<TUser>, 'hooks' | 'context'>
): Promise<DocumentRow | undefined> {
	await checkWriteAccess(
		collectionAccess?.update,
		{ req: { user }, id },
		overrideAccess
	)
	return pruneDocument(db, collection, id, knownPaths)
}

export async function performUpsertGlobal<TUser>(
	db: ContentDatabase,
	slug: string,
	fields: Record<string, unknown>,
	globalAccess: GlobalAccess<TUser> | undefined,
	{ hooks, user, overrideAccess, context = {} }: WriteContext<TUser>
): Promise<GlobalRow> {
	await checkWriteAccess(
		globalAccess?.update,
		{ req: { user }, data: fields },
		overrideAccess
	)
	const base = { collection: slug, context, req: { user } } as const
	let changedFields = fields
	for (const hook of hooks?.beforeValidate ?? []) {
		changedFields = await hook({
			...base,
			operation: 'update',
			data: changedFields
		})
	}
	for (const hook of hooks?.beforeChange ?? []) {
		changedFields = await hook({
			...base,
			operation: 'update',
			data: changedFields
		})
	}
	const row = await upsertGlobal(db, slug, changedFields)
	for (const hook of hooks?.afterChange ?? []) {
		await hook({ ...base, operation: 'update', doc: row.data })
	}
	return row
}

/** Same idea as `performPrune`, for a global. */
export async function performPruneGlobal<TUser>(
	db: ContentDatabase,
	slug: string,
	knownPaths: string[],
	globalAccess: GlobalAccess<TUser> | undefined,
	{ user, overrideAccess }: Omit<WriteContext<TUser>, 'hooks' | 'context'>
): Promise<GlobalRow | undefined> {
	await checkWriteAccess(
		globalAccess?.update,
		{ req: { user } },
		overrideAccess
	)
	return pruneGlobal(db, slug, knownPaths)
}

/**
 * Re-exported here so a caller building `WriteContext`-shaped params doesn't
 * also need a separate import from `content-queries.ts` just for the
 * "read the existing row first, for cache-invalidation slug tracking"
 * pattern both `content-route.ts` (unchanged) and `api/local-api.ts` need
 * around `performUpdate`/`performPrune`/`performDelete`.
 */
export { getDocument }
