import type { QueryClient } from '@tanstack/react-query'
import type { FC } from 'react'
import type { z } from 'zod'
import type { BlockConfig } from './collections/blocks/shared/types'
import type { BetterAuthAdminClient } from './db/collections'
import type { EndpointFactory } from './api/content-route'
import type { WhereCondition } from './db/content-queries'
import type { FieldConfig, TabConfig } from './fields/types'

// `@baseconfig/core`'s own root shape, independent of any one consumer's actual
// values. A consuming app (e.g. `www/src/config/base.config.ts`) imports
// these types and fills in the real collections/globals/admin settings for
// its own site.

/**
 * Every non-auth operation a Collection Hook can run alongside, modeled on
 * Payload's own operation names (https://payloadcms.com/docs/hooks/collections).
 * `'find'`/`'findByID'` only ever appear on `beforeOperation`/`afterOperation`/
 * `beforeRead`/`afterRead`/`afterError`, never on a write-only hook
 * (`beforeValidate`/`beforeChange`/`afterChange`/`beforeDelete`/`afterDelete`,
 * each already narrows its own `operation` field further, see their own
 * hook types below).
 */
export type HookOperation = 'create' | 'update' | 'delete' | 'find' | 'findByID'

/**
 * Custom, hook-defined data threaded between every hook running on the same
 * request, Payload's own `context` (https://payloadcms.com/docs/hooks/context):
 * starts as a fresh `{}` per operation (`content-route.ts`'s route handlers,
 * `content-operations.ts`'s `perform*` functions all receive and forward the
 * same object instance), a hook writes to it like a plain object and a later
 * hook in the same chain reads it back, e.g. a `beforeChange` hook stashing a
 * value an `afterChange` hook on the same write wants without recomputing it.
 * Never persisted anywhere, and never shared *across* two different
 * requests/operations.
 */
export type HookRequestContext = Record<string, unknown>

/**
 * What every Collection Hook receives, at minimum, modeled on Payload's own
 * per-hook argument objects (each real hook type below extends this with
 * whatever else that specific hook gets, e.g. `data`/`doc`/`id`). `collection`
 * is a collection's own slug for a document operation, or a global's own slug
 * for a global operation, both are looked up from the same flat
 * `collectHooks()` map (`collections/registry.ts`), since collection/global
 * slugs are already required to be disjoint (see that file's own
 * `registerBaseConfig`). `req.user` is whoever performed this operation,
 * `undefined`/`null` for an anonymous request or a Local API call with no
 * `user` passed, exactly the same semantics as `AccessArgs['req']['user']`,
 * safe to hand to an isomorphic hook for the same reason `AccessArgs.req.user`
 * already is: plain session data, never a binding. The one thing this doesn't
 * give a hook for free is a real reference *to* that user as a relatable
 * document: `users` is deliberately excluded from `RelationshipField` (see
 * `collections/fields/Relationship/index.tsx`'s own doc comment), a
 * `beforeChange` hook that wants to stamp e.g. `data.authorId = req.user?.id`
 * onto a plain field is the current way to record who authored something.
 */
export type HookArgs<TUser = AccessUser> = {
	collection: string
	context: HookRequestContext
	req: { user?: TUser | null }
}

/**
 * Runs at the very start of every operation, before access control, before
 * any other hook, Payload's own `beforeOperation` (https://payloadcms.com/docs/hooks/collections#beforeoperation).
 * Side-effects only here (logging, rate-limit bookkeeping via `context`,
 * etc.): Payload's own version can rewrite the operation's raw arguments, but
 * this engine's own operations each take a differently-shaped, already
 * validated set of params (a create's `data`, an update's `id` + `fields`, a
 * delete's `id`, a find's `where`/`limit`/`page`), there's no single "args
 * bag" shape to rewrite uniformly the way Payload's internal operation
 * dispatch has; a hook that wants to change what gets written still does
 * that in `beforeChange`/`beforeValidate`, which run right after.
 */
export type CollectionBeforeOperationHook<TUser = AccessUser> = (
	args: HookArgs<TUser> & { operation: HookOperation }
) => void | Promise<void>

/**
 * Runs on `create`/`update`, immediately after `beforeOperation`. Modeled on
 * Payload's own `beforeValidate` (https://payloadcms.com/docs/hooks/collections#beforevalidate),
 * **with different timing**, disclosed here rather than silently claimed:
 * Payload's own `beforeValidate` runs *before* its schema validation ever
 * happens. This engine's own schema validation (`content-route.ts`'s
 * `zValidator`, running as Hono middleware) already happened by the time any
 * hook runs at all, restructuring where that validation happens was out of
 * scope for this pass. In practice `beforeValidate` here means "the first
 * content hook to see this write," immediately before `beforeChange`, not
 * "runs before the incoming body is checked against its schema." A genuinely
 * malformed body is already rejected (400) before either hook ever fires.
 */
export type CollectionBeforeValidateHook<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & {
		operation: 'create' | 'update'
		data: Partial<TDoc>
		/** The full document before changes are applied. Present on updates; `undefined` on creates, see `data`'s own note on why an id isn't available yet either way. */
		originalDoc?: TDoc
	}
) => Partial<TDoc> | Promise<Partial<TDoc>>

/**
 * Runs against the incoming field-level data immediately before it's
 * persisted, Payload's own `beforeChange` (https://payloadcms.com/docs/hooks/collections#beforechange):
 * a document create's own `data`, or a document/global update's own partial
 * `fields` diff (see `content-route.ts`'s own `updateDocumentSchema`/
 * `upsertGlobalSchema`, both already diff-shaped, not a whole-document
 * replace), returning the (possibly modified) version actually written.
 * `data` only ever represents the delta being saved, same as Payload's own:
 * on update it may omit `id` and any unchanged fields, read `originalDoc.id`
 * instead; on create the document doesn't have an id worth reading yet at
 * this stage (`afterChange` below does).
 */
export type CollectionBeforeChangeHook<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & {
		operation: 'create' | 'update'
		data: Partial<TDoc>
		originalDoc?: TDoc
	}
) => Partial<TDoc> | Promise<Partial<TDoc>>

/**
 * Runs once a create/update has actually happened, given the resulting row,
 * Payload's own `afterChange` (https://payloadcms.com/docs/hooks/collections#afterchange).
 * Side-effects only (recomputing a derived value on a *different* document,
 * syncing to an external system, ...), still isomorphic-safe as long as it
 * only calls back into this package's own data layer, never a binding (see
 * `CollectionHooks`' own top-of-file note on that boundary).
 */
export type CollectionAfterChangeHook<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & {
		operation: 'create' | 'update'
		doc: Partial<TDoc>
		/** The document before changes were applied. `undefined` on a create, there's no "previous" version yet. */
		previousDoc?: TDoc
	}
) => void | Promise<void>

/**
 * Runs right after a document (or each document in a list) is read back from
 * D1, before it's returned or cached, Payload's own `beforeRead`
 * (https://payloadcms.com/docs/hooks/collections#beforeread). Payload's own
 * version runs before hidden-field removal and locale flattening, this
 * engine has neither concept (no field-level `hidden`-from-API flag, no
 * localization), so `beforeRead` and `afterRead` below run back-to-back
 * around the same single read, both real, both fired, just with less
 * daylight between them than Payload's own richer read pipeline has. Returns
 * the (possibly modified) doc that continues down the read path. `Partial<TDoc>`,
 * not `TDoc`: same reasoning as every write hook's `data`/`doc` (a real row's
 * stored `data` blob is never guaranteed to have every generated field
 * populated, an older document predating a newly-added field, for one).
 */
export type CollectionBeforeReadHook<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & { doc: Partial<TDoc>; query?: WhereCondition }
) => Partial<TDoc> | Promise<Partial<TDoc>>

/**
 * Runs as the last step before a document is actually returned to the
 * caller (and, for a cacheable read, before it's written to the public
 * cache), Payload's own `afterRead` (https://payloadcms.com/docs/hooks/collections#afterread).
 * See `CollectionBeforeReadHook`'s own doc comment for why this runs
 * immediately alongside it rather than after a separate transform pass, and
 * for why `doc`/the return value are `Partial<TDoc>`.
 */
export type CollectionAfterReadHook<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & { doc: Partial<TDoc>; query?: WhereCondition }
) => Partial<TDoc> | Promise<Partial<TDoc>>

/**
 * Runs before the delete operation, Payload's own `beforeDelete`
 * (https://payloadcms.com/docs/hooks/collections#beforedelete). Gets just
 * the `id` (the row still exists at this point, a hook that needs the full
 * document can still read it through this package's own data layer),
 * side-effects only, not a way to veto the delete (that's what
 * `access.delete` is for, an authorization concern, not a hook's job).
 */
export type CollectionBeforeDeleteHook<TUser = AccessUser> = (
	args: HookArgs<TUser> & { id: string }
) => void | Promise<void>

/**
 * Runs immediately after the delete operation removes the row, Payload's own
 * `afterDelete` (https://payloadcms.com/docs/hooks/collections#afterdelete).
 * `doc` is the row as it was *right before* deletion (`content-operations.ts`'s
 * `performDelete` fetches it first, but only when `afterDelete` is actually
 * registered, no wasted read otherwise), since there's nothing left to read
 * once the row is actually gone. Side-effects only, return value discarded.
 */
export type CollectionAfterDeleteHook<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & { id: string; doc: Partial<TDoc> }
) => void | Promise<void>

/**
 * Runs once an operation has fully completed, wrapping its result, Payload's
 * own `afterOperation` (https://payloadcms.com/docs/hooks/collections#afteroperation).
 * Can replace/modify `result` (the response about to be sent back), the one
 * hook type here that isn't scoped to a single document: `operation: 'find'`
 * hands it a whole paginated list result, not a single `doc`.
 */
export type CollectionAfterOperationHook<
	TResult = unknown,
	TUser = AccessUser
> = (
	args: HookArgs<TUser> & { operation: HookOperation; result: TResult }
) => TResult | Promise<TResult>

/**
 * Runs when an operation throws, Payload's own `afterError`
 * (https://payloadcms.com/docs/hooks/collections#aftererror). Useful for
 * logging to a third-party service (Sentry, Datadog, ...) without touching
 * every route handler individually. Can return a replacement `result` (the
 * JSON body actually sent back), returning nothing keeps the default
 * `{error: string}` shape `content-route.ts`'s own `.onError()` already
 * builds. `collection` may be an empty string when the error happened before
 * a collection/global slug was even resolved (a malformed route, for one).
 */
export type CollectionAfterErrorHook<TUser = AccessUser> = (
	args: HookArgs<TUser> & { error: Error; result: { error: string } }
) => { error: string } | void | Promise<{ error: string } | void>

/**
 * Modeled on Payload's own collection-level hooks
 * (https://payloadcms.com/docs/hooks/collections), the full non-auth set:
 * `beforeOperation`/`beforeValidate`/`beforeChange`/`beforeRead`/
 * `afterChange`/`afterRead`/`beforeDelete`/`afterDelete`/`afterOperation`/
 * `afterError`. **Every entry is an array of hooks, run in order**, exactly
 * like Payload's own (`hooks: {beforeChange: [fn1, fn2]}`), not a single
 * function: a plugin and the consumer's own collection config can each push
 * their own hook onto the same event without one clobbering the other; a
 * "transforming" hook (`beforeValidate`/`beforeChange`/`beforeRead`/
 * `afterRead`/`afterOperation`/`afterError`) receives the *previous* hook's
 * own returned value in the chain, not always the original input, same as
 * Payload's own array semantics.
 *
 * **Deliberately excludes Payload's auth-lifecycle hooks**
 * (`beforeLogin`/`afterLogin`/`afterLogout`/`afterRefresh`/`afterMe`/
 * `afterForgotPassword`/`refresh`/`me`): this engine delegates auth entirely
 * to better-auth (see `db/CLAUDE.md`'s "real, server-backed users collection"
 * section), which already has its own, real, working hook/plugin system for
 * exactly these lifecycle moments (`auth.ts`'s own `hooks`/`plugins` options,
 * https://www.better-auth.com/docs/concepts/hooks). Re-declaring them here
 * with no actual login/logout/refresh code underneath them to call from
 * would be decorative, a hook that's typed and documented but never fires,
 * worse than not offering the option at all.
 *
 * **Must stay pure: no server-only bindings (`env`, `EMAIL`, `MEDIA`).**
 * `defineCollection`/`defineGlobal`'s config is isomorphic (the same object
 * is evaluated in the browser too, for `RelationshipField`/the registry), a
 * hook that genuinely needs a binding (e.g. sending an email) doesn't belong
 * here; it gets registered directly where `createHandler()` is actually
 * called instead (`www/src/api/index.ts`, already server-only, already has
 * `env` in scope), see `createHandler`'s own `hooks` param.
 *
 * **Generic over `TDoc`**, a collection/global's own real per-field document
 * shape once generated (`GeneratedCollectionDoc`/`GeneratedGlobalDoc` below),
 * `Record<string, unknown>` (this type's own long-standing default) for an
 * un-generated consumer or a plugin package that can't reference one app's
 * specific slugs. `BaseConfig`'s own `TDoc` param is what actually threads
 * the right lookup in (`GeneratedCollectionDoc` for a `CollectionConfig`,
 * `GeneratedGlobalDoc` for a `GlobalConfig`). **This only actually resolves
 * to the real interface when the collection/global's own slug is passed as
 * an explicit type argument**, e.g. `defineCollection<'docs'>({slug: 'docs',
 * ...})`: TS's own generic inference can't reach `TSlug` from just `slug:
 * 'docs'` into a *sibling* property's callback parameter through a
 * conditional type like `GeneratedCollectionDoc<TSlug>` (confirmed
 * empirically, not a guess: without the explicit type argument, a hook's
 * `data`/`doc` silently widens back to `Partial<Record<string, unknown>>`,
 * no error, no warning). `Partial<TDoc>` for a write's incoming/outgoing
 * data, `TDoc` (not `Partial`) for a genuinely-read document: a real row's
 * stored `data` blob is never guaranteed to have every generated field
 * populated (an older document predating a newly-added field), but a write's
 * `data`/`doc` is a partial diff by design (see each hook's own doc comment
 * above), while a read's `doc` is the actual persisted row, whatever fields
 * it happens to have.
 */
export type CollectionHooks<
	TDoc = Record<string, unknown>,
	TUser = AccessUser
> = {
	beforeOperation?: CollectionBeforeOperationHook<TUser>[]
	beforeValidate?: CollectionBeforeValidateHook<TDoc, TUser>[]
	beforeChange?: CollectionBeforeChangeHook<TDoc, TUser>[]
	beforeRead?: CollectionBeforeReadHook<TDoc, TUser>[]
	afterChange?: CollectionAfterChangeHook<TDoc, TUser>[]
	afterRead?: CollectionAfterReadHook<TDoc, TUser>[]
	beforeDelete?: CollectionBeforeDeleteHook<TUser>[]
	afterDelete?: CollectionAfterDeleteHook<TDoc, TUser>[]
	afterOperation?: CollectionAfterOperationHook<unknown, TUser>[]
	afterError?: CollectionAfterErrorHook<TUser>[]
}

/**
 * The one piece of a real request an access function gets to see, modeled on
 * Payload's own `AccessArgs<T>` (https://payloadcms.com/docs/access-control/overview):
 * `req.user` is whatever `session.user` the caller had (or `undefined` for an
 * anonymous request/an in-process Local API call with no `user` passed),
 * `id`/`data` are only present for a single-document operation (update/delete
 * by id, or a create/update's incoming body), never for a list read. Kept
 * generic over `TUser` rather than hardcoding this package's own
 * `{role?: string | null}` shape, since this package has no opinion on what
 * a consumer's real user object looks like beyond the two fields (`role`,
 * `id`) it already reads today.
 */
export type AccessArgs<TUser = AccessUser> = {
	req: { user?: TUser | null }
	id?: string
	data?: Record<string, unknown>
}

/** The default shape this package's own access checks are written against: whatever `session.user.role` already is today (`'admin' | 'user' | null`, see `content-route.ts`'s former `SessionLike`), left open to extra consumer-added fields via the index signature rather than closed to exactly this. `id`/`name`/`email`/`image` are the other fields called out explicitly, every real better-auth session user has all four (better-auth's own base user schema, https://www.better-auth.com/docs/concepts/users-accounts), so a `beforeChange` hook stamping a denormalized `{id, name, email, image}` snapshot onto a plain field (see `HookArgs`'s own doc comment) doesn't need an unsafe cast just to satisfy generated `string` fields. */
export type AccessUser = {
	role?: string | null
	id?: string
	name?: string
	email?: string
	image?: string | null
} & Record<string, unknown>

/**
 * Modeled on Payload's own `Access<T>` type
 * (https://payloadcms.com/docs/access-control/overview): a function run per
 * operation, per collection/global, returning whether it's allowed.
 * Boolean-only here (`create`/`update`/`delete`/`admin`), unlike `ReadAccess`
 * below: none of the canonical examples this was modeled on (`anyone`,
 * `authenticated`) narrow *which* rows a write applies to, only whether it's
 * allowed at all. Row-level write scoping (Payload's own write-side `Where`
 * return, e.g. "can only update rows you own") would need re-fetching the
 * existing row and checking it against a returned `Where`, a separate,
 * bigger piece not built here.
 */
export type Access<TUser = AccessUser> = (
	args: AccessArgs<TUser>
) => boolean | Promise<boolean>

/**
 * Same idea as `Access`, for `read` alone: a `read` access function can also
 * return a `WhereCondition` (see `db/content-queries.ts`'s own doc comment
 * for why that type is deliberately narrow, status/slug equality only) to
 * scope *which* documents are visible rather than an all-or-nothing boolean,
 * Payload's own `authenticatedOrPublished` pattern
 * (https://payloadcms.com/docs/access-control/overview#authenticatedorpublished):
 * a logged-in user sees everything, an anonymous one is scoped down to
 * `{status: {equals: 'published'}}`. `content-route.ts` passes this straight
 * through as `ReadOptions['accessWhere']`.
 */
export type ReadAccess<TUser = AccessUser> = (
	args: AccessArgs<TUser>
) => boolean | WhereCondition | Promise<boolean | WhereCondition>

/**
 * A collection's own access control, modeled on Payload's collection-level
 * `access` (https://payloadcms.com/docs/access-control/collections):
 * `admin`/`create`/`read`/`update`/`delete`, each independently optional.
 * **Unset means open, not denied**: matches Payload's own documented
 * default (an operation with no `access` function allows everyone), not a
 * "safe by default, deny unless configured" choice, deliberately, since a
 * consumer is expected to state real access (`authenticated`, etc.) on every
 * collection that needs it, the same way Payload's own generated templates
 * always do, rather than this package guessing a default that's wrong for
 * half of them either way. `content-route.ts` is the one place these
 * actually get called; a Local API call (`api/local-api.ts`) can bypass this
 * entirely via `overrideAccess`, mirroring Payload's own Local API default.
 */
export type CollectionAccess<TUser = AccessUser> = {
	/** Whether this collection is usable from the admin UI at all for this user. Declared for parity; not yet enforced anywhere (the admin panel's own session guard is a separate, coarser, already-existing gate, see `admin/CLAUDE.md`). */
	admin?: Access<TUser>
	create?: Access<TUser>
	read?: ReadAccess<TUser>
	update?: Access<TUser>
	delete?: Access<TUser>
}

/** Same idea as `CollectionAccess`, for a global: no `create`/`delete`, a global's own table always has exactly one row (see `content-queries.ts`'s `upsertGlobal`). */
export type GlobalAccess<TUser = AccessUser> = {
	admin?: Access<TUser>
	read?: ReadAccess<TUser>
	update?: Access<TUser>
}

/**
 * Payload's own plugin shape (https://payloadcms.com/docs/plugins/overview):
 * "a function that takes in an existing config and returns a *modified*
 * config." `baseConfig({plugins: [...]})` runs every plugin over the
 * incoming config first, before registering `collections`/`globals` or
 * building the RPC client, so a plugin's own added collections/globals
 * (e.g. a form-builder plugin's `forms`/`form-submissions`) get registered
 * exactly like hand-written ones, with zero special-casing.
 */
export type Plugin = (config: BaseConfigProps) => BaseConfigProps

export type AdminSettings = {
	/**
	 * Admin panel route prefix, without a leading slash (e.g. `'admin'`),
	 * call sites build `/${adminPath}/...` themselves (see the breadcrumb in
	 * `admin/views/topbar.tsx`, which takes this as a `config` prop rather than
	 * importing any one consumer's config directly). This is a *display*
	 * value: whatever routing framework the consumer uses fixes the real
	 * route by its own convention (e.g. TanStack Start's file-based routing
	 * fixes it by physical folder structure), changing this alone doesn't
	 * reroute anything on its own.
	 */
	adminPath: string
	adminIcon: string
	/**
	 * Plain provider names (e.g. `['github', 'google']`) for the admin auth
	 * screens' own social sign-in buttons, not introspectable from the
	 * client (social providers are configured server-side, with real
	 * secrets), so a consumer states them once here rather than passing them
	 * to every `LoginView`/`CreateAccountView` individually. Omit for none.
	 */
	socialProviders?: string[]
	/**
	 * The CMS API's own CORS allowlist, string entries matched by exact
	 * equality, `RegExp` entries via `.test()`. Isomorphic-safe (plain data,
	 * no secret/binding), unlike `handleEmail`, see `createHandler`'s own
	 * `cors` param doc comment for how this is consumed. Omit (or leave
	 * empty) for a permissive default: every request's own `Origin` is
	 * echoed back (the only valid way to be maximally permissive under
	 * credentialed CORS, a literal `'*'` isn't allowed alongside
	 * `credentials: true`).
	 */
	cors?: (string | RegExp)[]
}

/**
 * `collections`/`globals` use this file's own `CollectionConfig`/`GlobalConfig`
 * (both already generic, defaulted to `TSlug = string` below), no separate
 * type parameters needed here: `defineCollection<TSlug extends string>()`
 * (`define.ts`) already returns a `CollectionConfig` narrowed to whatever
 * literal `slug` a consumer actually passed (e.g. `'products'`), and that
 * satisfies this structurally, since every such union extends `string`.
 */
export type BaseConfigProps = {
	/**
	 * The server-rendered/non-browser fallback origin for this package's
	 * internal `/api/*` RPC client (`define.ts`'s `baseConfig()` builds a
	 * real `hc<BaseConfigRouteType>()` client itself now, a consumer no
	 * longer builds or injects one, see `contentClient`/`storageClient`'s
	 * removal below). In an actual browser, `window.location.origin` is used
	 * instead, same-origin, always correct regardless of custom domains or
	 * dev-server ports, and this value is only ever read during SSR, where
	 * there's no `window` to ask.
	 */
	hostDomain: string
	config: AdminSettings
	collections: CollectionConfig[]
	globals: GlobalConfig[]
	/**
	 * Every block a consumer can pick in the admin, almost always populated
	 * by a plugin (e.g. `@baseconfig/plugin-form-builder`'s `formBlock`) or,
	 * in this repo's reference consumer, www's own `config/blocks` tree
	 * (this package ships no built-in blocks, see
	 * `collections/blocks/CLAUDE.md`). `baseConfig()` merges these into the
	 * live `blocksBySlug` registry (`collections/blocks/registry.ts`) as a
	 * side effect, same pattern `collections`/`globals` already use, and
	 * `base gen` emits one named interface per block (auto-named PascalCase
	 * slug, `BlockConfig['interfaceName']` overrides it) combined into the
	 * `ContentBlock` union.
	 */
	blocks?: BlockConfig[]
	/**
	 * Server-only endpoint builders, almost always populated by a plugin,
	 * see `EndpointFactory`'s own doc comment (`content-route.ts`) for
	 * the full mechanism this enables: a plugin registers a function here
	 * instead of real endpoints (which would need bindings this isomorphic
	 * config can never have), and `createHandler()` calls it once it has
	 * those bindings in hand. This is *the* piece that keeps a plugin's
	 * entire footprint inside `base.config.ts`'s own `plugins: [...]`.
	 * Without it, a plugin needing a real endpoint would force a second,
	 * separate call somewhere in the consumer's server entry.
	 */
	endpointFactories?: EndpointFactory[]
	/**
	 * Not yet read anywhere in this package: a real gap, not a documented
	 * behavior. Content collections' actual offline behavior today rides
	 * entirely on whatever `networkMode`/cache policy the consumer's own
	 * `queryClient` (below) was constructed with (`www`'s is `'offlineFirst'`,
	 * see `www/src/utils/query/context.ts`), not on this flag.
	 */
	offlineFirst: boolean
	/**
	 * The consumer's own `QueryClient` (e.g. `www`'s `getContext()`), a
	 * general dependency, not just for `usersDataSource`: anything in this
	 * package that needs TanStack Query reaches for this one shared instance
	 * rather than each feature threading its own through separately.
	 */
	queryClient: QueryClient
	/**
	 * Wires the real, server-backed `users` collection (see
	 * `CollectionConfig['auth']`); omit if no collection has `auth: true`.
	 * Pass the consumer's own `authClient` (better-auth's client, with the
	 * `adminClient()` plugin registered) directly, never the server-side
	 * `auth.api` instance: this config flows through `baseConfig()` into
	 * files imported by isomorphic route code, and `auth.api` carries
	 * server-only bindings (D1, KV) that must never reach the client
	 * bundle. `baseConfig()` calls `registerUsersDataSource()` with this
	 * (paired with `queryClient` above), once, as a side effect (same
	 * pattern as registering `collections`/`globals` into the registry
	 * below). A deliberate exception to this package otherwise having no
	 * dependency on any particular auth library, see
	 * `BetterAuthAdminClient`'s own comment.
	 */
	auth?: BetterAuthAdminClient
	/**
	 * Payload-modeled plugins, see `Plugin`'s own doc comment. Run over the
	 * incoming config first, in order, before anything else in
	 * `baseConfig()`, a later plugin sees an earlier plugin's own
	 * additions (more `collections`/`globals`/etc. already appended).
	 */
	plugins?: Plugin[]
}

export type CollectionFieldsProps = {
	/**
	 * Left loosely typed on purpose: `Fields` is dispatched generically by
	 * the registry (see `collections/registry.ts`), so it can't know the
	 * exact `useAppForm<Schema>` instantiation for whichever collection it
	 * ends up rendering ahead of time, the same trade-off any config-driven
	 * field dispatch makes.
	 */
	form: any
	/** The row's own id, e.g. so a relation picker can exclude the document currently being edited. */
	id: string
}

/**
 * The generic shape behind both a collection and a global config, a
 * consuming app binds `TSlug` to its own concrete slug (usually just the
 * literal string it passed to `defineCollection`/`defineGlobal`, inferred
 * automatically, see `CollectionSlug`'s own doc comment,
 * `collections/types.ts`) and adds anything collection-specific (e.g. `color`).
 *
 * `TDoc` is what `hooks` actually gets typed against (`CollectionHooks<TDoc>`),
 * left as its own param rather than derived from `TSlug` in here directly:
 * `CollectionConfig`/`GlobalConfig` below each need a *different* lookup for
 * the same `TSlug` (`GeneratedCollectionDoc`/`GeneratedGlobalDoc`, two
 * separate generated interfaces), so the choice of which one has to happen
 * at their own definition, not this shared shape.
 */
export type BaseConfig<TSlug extends string, TDoc = Record<string, unknown>> = {
	slug: TSlug
	label: string
	schema: z.ZodTypeAny
	defaultValues: () => Record<string, unknown>
	Fields: FC<CollectionFieldsProps>
	/** Pure, isomorphic-safe lifecycle hooks, see `CollectionHooks`' own doc comment for the tier-1/tier-2 split. */
	hooks?: CollectionHooks<TDoc>
}

export type CollectionConfig<TSlug extends string = string> = BaseConfig<
	TSlug,
	GeneratedCollectionDoc<TSlug>
> & {
	/**
	 * The raw `tabs` a consumer passed to `defineCollection()`, retained
	 * (not just consumed to build `schema`/`defaultValues`/`Fields` and
	 * discarded) specifically so a build-time generator can walk a
	 * registered collection's real field tree, e.g. to emit a per-collection
	 * TypeScript document interface (see `db/content-types-schema.ts`).
	 * Never read by anything at request-handling time, introspection-only.
	 */
	tabs: TabConfig<string, string>[]
	/**
	 * A literal Tailwind class (e.g. `'bg-olive-400/35'`) for the collection's
	 * type dot. Kept as a full class so it stays visible to Tailwind's
	 * static scanner.
	 */
	color?: string
	/**
	 * The public URL prefix segment for this collection's documents, no
	 * leading/trailing slashes (e.g. `'post'`, not `'/post/'`). Omit for a
	 * collection whose documents live at the site root (a document's own
	 * `slug` becomes the whole path, e.g. `pages`' `home-page` →
	 * `/home-page`); set it to give every document in this collection a
	 * shared prefix instead (e.g. `posts` with `path: 'post'` → a document
	 * whose slug is `post-about-something` resolves to
	 * `/post/post-about-something`). See `collectionPath()`
	 * (`collections/types.ts`) for the one place this is turned into an
	 * actual URL, no public rendering reads this yet (see "Not done yet"
	 * in the project's own docs), but `RelationshipField`'s nav-link
	 * auto-sync already does.
	 */
	path?: string
	/**
	 * Marks this as *the* users collection: real, server-backed accounts
	 * (list/create/update/remove via the consumer's own auth engine), not
	 * client-only `localStorage` like every other collection. Wires in two
	 * built-in, centrally-implemented pieces instead of the usual
	 * `localStorage` data source and blank-draft "Create new" button: a
	 * server-backed collection (see `db/collections.ts`'s
	 * `registerUsersDataSource`) and a real create dialog (email/password
	 * upfront, since an account can't start blank), see
	 * `admin/widgets/auth-widget.tsx`. There is exactly one such collection
	 * in practice (one `user` table); this stays a boolean rather than an
	 * enum of data-source kinds until a second real need for a
	 * server-backed collection actually shows up.
	 */
	auth?: boolean
	/**
	 * Admin-display overrides, mirroring Payload's own `admin` collection
	 * option (https://payloadcms.com/docs/configuration/collections#admin-options),
	 * grouping the "how this collection's own list view looks" settings in
	 * one place rather than scattering them as top-level config keys.
	 *
	 * Every field key below (`defaultColumns`/`filterKey`/`groupBy`)
	 * autocompletes against this collection's own real generated document
	 * shape, **`(keyof GeneratedCollectionDoc<TSlug> & string) | 'title' |
	 * 'slug' | 'status' | 'updatedAt' | 'createdAt'`**, this collection's
	 * own field names plus the five base columns every document already
	 * has (`db/collections.ts`'s `withBaseFields`), so a typo'd key is a
	 * real compile error, not a silently-ignored no-op column. **This only
	 * actually narrows once the collection's own slug is passed as an
	 * explicit type argument**, e.g. `defineCollection<'docs'>({slug:
	 * 'docs', ...})`, the identical TS-inference caveat `CollectionHooks`'s
	 * own doc comment already documents for the exact same underlying
	 * reason (a sibling property's type can't be inferred from `slug`
	 * through a conditional type without it); an un-generated consumer, or
	 * one that doesn't pass the explicit slug, falls back to a plain
	 * `string`, today's behavior, not a hard requirement.
	 *
	 * **Not enforced: duplicate `defaultColumns` keys.** A real "no two
	 * entries name the same field" check needs a genuinely recursive
	 * tuple-uniqueness type, a deliberate scope cut for now, not an
	 * oversight, `CollectionTable` itself doesn't dedupe either, a repeated
	 * key just renders the same column twice.
	 */
	admin?: {
		/**
		 * Which real `data` field stands in for the generic `title`/`slug`
		 * document-identity fields every other collection has, e.g. `users`
		 * has no real `title`, so `useAsTitle: 'name'` tells `CollectionForm`'s
		 * header and `CollectionTable`'s auto-derived columns to show/edit
		 * `name` directly instead of a synthetic title.
		 */
		useAsTitle?: string
		/**
		 * Which of this collection's own fields `CollectionTable` shows as
		 * columns, beyond the fixed generic ones every collection gets
		 * (selection checkbox, ID, Status, Updated, Delete, see
		 * `admin/views/collection-table.tsx`). Omit for the default
		 * `[{key: 'title', label: 'Title'}, {key: 'slug', label: 'Slug'}]`,
		 * matching every collection's own base fields. A collection with its
		 * own more meaningful fields (e.g. `users`' `name`/`email`/`role`)
		 * can show those instead of being forced into the title/slug shape.
		 * `type` is optional (omitted for the hand-written title/slug
		 * default, where it isn't needed), when present, `CollectionTable`
		 * uses it to render a value's cell correctly for that field's own
		 * type rather than guessing from the runtime value alone (a plain
		 * `value || '-'` fallback treats a real `false` the same as "no
		 * value," which is wrong specifically for `checkbox`/`switch`
		 * columns, see that component's own doc comment). Payload's own
		 * `admin.defaultColumns` is a bare `string[]`; this stays the richer
		 * `{key, label, type?}[]` shape instead, dropping the custom
		 * `label`/`type` capability real collections here already rely on
		 * (`docs`' own `category` column, `users`' `role` switch) would be a
		 * real regression, not a faithful port.
		 */
		defaultColumns?: {
			key:
				| (keyof GeneratedCollectionDoc<TSlug> & string)
				| 'title'
				| 'slug'
				| 'status'
				| 'updatedAt'
				| 'createdAt'
			label: string
			type?: string
		}[]
		/**
		 * Which column the table's search box filters on, must be one of
		 * `defaultColumns`' keys (or `'title'`/`'slug'` if `defaultColumns`
		 * was omitted). Defaults to the first entry in `defaultColumns` (or
		 * `'title'`) if omitted.
		 */
		filterKey?:
			| (keyof GeneratedCollectionDoc<TSlug> & string)
			| 'title'
			| 'slug'
		/**
		 * Sorts `CollectionTable`'s rows so every document sharing the same
		 * value for this field lands next to each other, before any explicit
		 * column sort is applied. This is deliberately *not* a grouped view
		 * with its own section headers, the table stays exactly the same
		 * shape and columns, rows sharing a group just end up adjacent
		 * instead of interleaved. Must name one of `defaultColumns`' keys.
		 * An array-valued field (e.g. `keywords`) groups by its first item;
		 * documents with no value for this field sort last.
		 */
		groupBy?:
			| (keyof GeneratedCollectionDoc<TSlug> & string)
			| 'title'
			| 'slug'
			| 'status'
			| 'updatedAt'
	}
	/** Pure, isomorphic-safe per-operation access control, see `CollectionAccess`'s own doc comment. Omit for open (every operation allowed to everyone), same as Payload's own default. */
	access?: CollectionAccess
}

/**
 * Two independent, deliberately empty interfaces a consumer's own generated
 * `src/config/base.types.ts` augments via `declare module '@baseconfig/core'`,
 * mirroring Payload's own `declare module 'payload' { interface
 * GeneratedTypes extends Config {} }`. Confirmed empirically before writing
 * this: TypeScript's interface-merging rules require every declaration of
 * the same property to share an identical type, so these have to start
 * with zero properties, not a placeholder like `Record<string, unknown>`
 * (that would conflict the moment a consumer's own augmentation tries to
 * add concrete `posts`/`products` keys). Two separate interfaces, not one
 * `{collections: {}, globals: {}}` wrapper, for the same reason: a
 * wrapper's own nested property would hit the identical conflict.
 *
 * A consumer never touches these three directly, `db/content-types-schema.ts`
 * (the generator) emits the actual `declare module` block. `db/content-client.ts`'s
 * `base` object reads `GeneratedCollectionTypes`/`GeneratedGlobalTypes`, and
 * `BlocksFieldConfig['blocks']` autocompletes through `GeneratedBlockSlug`
 * (itself derived from `GeneratedBlockTypes`).
 */
export interface GeneratedCollectionTypes {}
export interface GeneratedGlobalTypes {}
export interface GeneratedBlockTypes {}

/** A registered collection's real slug, once a consumer's own generated `src/config/base.types.ts` has augmented `GeneratedCollectionTypes`. Falls back to a plain `string` (today's behavior) when nothing has augmented it yet, so an un-generated consumer keeps compiling exactly as before. */
export type GeneratedCollectionSlug =
	keyof GeneratedCollectionTypes extends never
		? string
		: keyof GeneratedCollectionTypes

/** Same fallback shape as `GeneratedCollectionSlug`, for globals. */
export type GeneratedGlobalSlug = keyof GeneratedGlobalTypes extends never
	? string
	: keyof GeneratedGlobalTypes

/**
 * A registered block's real slug, once a consumer's own generated
 * `src/config/base.types.ts` has augmented `GeneratedBlockTypes` (the
 * generator emits one `interface GeneratedBlockTypes` member per registered
 * block, slug keyed to the block's own named interface, see
 * `db/content-types-schema.ts`'s augmentation block). The union that gives
 * a `blocks` field's own `blocks: [...]` restriction list its autocomplete
 * (`BlocksFieldConfig['blocks']`): the consumer owns the block tree, so the
 * slugs it can pick from are exactly the ones *it* registered, not a
 * library-side union a plugin couldn't add to. Falls back to a plain
 * `string` when nothing has augmented it yet, so an un-generated consumer
 * (or a plugin package, which never sees a consumer's augmentation) keeps
 * compiling exactly as before.
 */
export type GeneratedBlockSlug = keyof GeneratedBlockTypes extends never
	? string
	: keyof GeneratedBlockTypes

/** A collection's real per-field document shape once generated; `Record<string, unknown>` (today's behavior) for any slug that isn't a known key yet, covering both "nothing generated" and, defensively, a slug the generator doesn't recognize. */
export type GeneratedCollectionDoc<TSlug extends string> =
	TSlug extends keyof GeneratedCollectionTypes
		? GeneratedCollectionTypes[TSlug]
		: Record<string, unknown>

/** Same fallback shape as `GeneratedCollectionDoc`, for globals. */
export type GeneratedGlobalDoc<TSlug extends string> =
	TSlug extends keyof GeneratedGlobalTypes
		? GeneratedGlobalTypes[TSlug]
		: Record<string, unknown>

/** Globals (Top bar, Footer, …) are singletons: same shape as a collection minus the table/list. */
export type GlobalConfig<TSlug extends string = string> = BaseConfig<
	TSlug,
	GeneratedGlobalDoc<TSlug>
> & {
	/**
	 * Marks this global as fully custom-rendered: `Fields` renders directly
	 * as the whole page, with no `GlobalForm` wrapper (no document load/save,
	 * no localStorage persistence, `schema`/`defaultValues` are unused
	 * placeholders). For a global that isn't really a document to edit, e.g.
	 * Storage, a live file browser hitting its own API directly. Set via
	 * `defineGlobal({component: ...})` rather than `{fields: ...}`, see
	 * `define.ts`. `admin/views/provider.tsx`'s `resolveRouteView` is the
	 * one place that reads this flag.
	 */
	custom?: boolean
	/**
	 * The raw `fields` a consumer passed to `defineGlobal({fields: ...})`,
	 * retained the same way `CollectionConfig['tabs']` is, for the same
	 * build-time-introspection reason. Absent for a `custom: true` global
	 * (there's no field list at all, `component` replaces it), same
	 * "unused placeholder" treatment `schema`/`defaultValues` already get
	 * in that case.
	 */
	fields?: FieldConfig<string, string>[]
	/** Same idea as `CollectionConfig['access']`, see `GlobalAccess`'s own doc comment for what's different for a global. */
	access?: GlobalAccess
}
