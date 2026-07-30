import type { QueryClient } from '@tanstack/react-query'
import type { FC } from 'react'
import type { z } from 'zod'
import type { BlockConfig } from './collections/blocks/types'
import type { BetterAuthAdminClient } from './db/collections'
import type { EndpointFactory } from './api/content-route'

// `@baseconfig/core`'s own root shape — independent of any one consumer's actual
// values. A consuming app (e.g. `www/src/config/base.config.ts`) imports
// these types and fills in the real collections/globals/admin settings for
// its own site.

/**
 * What a `beforeChange`/`afterChange` hook is told about the write it's
 * running alongside — modeled on Payload's own collection hooks
 * (`beforeChange`/`afterChange` receive `{data, originalDoc, operation, ...}`),
 * trimmed to what this repo's own write path (`content-route.ts`) actually
 * has in hand at each point. `slug` is a collection's own slug for a
 * document write, or a global's own slug for a global write — both are
 * looked up from the same flat `collectHooks()` map (`collections/registry.ts`),
 * since collection/global slugs are already required to be disjoint (see
 * that file's own `registerBaseConfig`).
 */
export type HookContext = {
	slug: string
	operation: 'create' | 'update'
}

/**
 * Modeled on Payload's own collection-level hooks
 * (https://payloadcms.com/docs/hooks/collections) — trimmed to the two
 * load-bearing ones (`beforeChange`/`afterChange`; more can be added the
 * same way later). **Must stay pure — no server-only bindings (`env`,
 * `EMAIL`, `MEDIA`).** `defineCollection`/`defineGlobal`'s config is
 * isomorphic (the same object is evaluated in the browser too, for
 * `RelationshipField`/the registry), and this session already established
 * that server-only bindings must never be reachable from isomorphic code —
 * a hook that genuinely needs one (e.g. sending an email) doesn't belong
 * here; it gets registered directly where `createHandler()` is actually
 * called instead (`www/src/api/index.ts`, already server-only, already has
 * `env` in scope) — see `createHandler`'s own `hooks` param.
 *
 * `beforeChange` runs against the incoming field-level data before it's
 * persisted — a document create's own `data`, or a document/global
 * update's own partial `fields` diff (see `content-route.ts`'s own
 * `updateDocumentSchema`/`upsertGlobalSchema` — both already diff-shaped,
 * not a whole-document replace) — and returns the (possibly modified)
 * version actually written. `afterChange` runs once the write has actually
 * happened, given the resulting row; its return value is discarded
 * (side-effects only, e.g. recomputing a derived field on a *different*
 * document — still isomorphic-safe as long as it only calls back into this
 * package's own data layer, not a binding).
 */
export type CollectionHooks = {
	beforeChange?: (
		data: Record<string, unknown>,
		ctx: HookContext
	) => Record<string, unknown> | Promise<Record<string, unknown>>
	afterChange?: (
		doc: Record<string, unknown>,
		ctx: HookContext
	) => void | Promise<void>
}

/**
 * Payload's own plugin shape (https://payloadcms.com/docs/plugins/overview):
 * "a function that takes in an existing config and returns a *modified*
 * config." `baseConfig({plugins: [...]})` runs every plugin over the
 * incoming config first, before registering `collections`/`globals` or
 * building the RPC client — so a plugin's own added collections/globals
 * (e.g. a form-builder plugin's `forms`/`form-submissions`) get registered
 * exactly like hand-written ones, with zero special-casing.
 */
export type Plugin = (config: BaseConfigProps) => BaseConfigProps

export type AdminSettings = {
	/**
	 * Admin panel route prefix, without a leading slash (e.g. `'admin'`) —
	 * call sites build `/${adminPath}/...` themselves (see the breadcrumb in
	 * `admin/views/topbar.tsx`, which takes this as a `config` prop rather than
	 * importing any one consumer's config directly). This is a *display*
	 * value: whatever routing framework the consumer uses fixes the real
	 * route by its own convention (e.g. TanStack Start's file-based routing
	 * fixes it by physical folder structure) — changing this alone doesn't
	 * reroute anything on its own.
	 */
	adminPath: string
	adminIcon: string
	/**
	 * Plain provider names (e.g. `['github', 'google']`) for the admin auth
	 * screens' own social sign-in buttons — not introspectable from the
	 * client (social providers are configured server-side, with real
	 * secrets), so a consumer states them once here rather than passing them
	 * to every `LoginView`/`CreateAccountView` individually. Omit for none.
	 */
	socialProviders?: string[]
	/**
	 * The CMS API's own CORS allowlist — string entries matched by exact
	 * equality, `RegExp` entries via `.test()`. Isomorphic-safe (plain data,
	 * no secret/binding), unlike `handleEmail` — see `createHandler`'s own
	 * `cors` param doc comment for how this is consumed. Omit (or leave
	 * empty) for a permissive default: every request's own `Origin` is
	 * echoed back (the only valid way to be maximally permissive under
	 * credentialed CORS — a literal `'*'` isn't allowed alongside
	 * `credentials: true`).
	 */
	cors?: (string | RegExp)[]
}

/**
 * `collections`/`globals` use this file's own `CollectionConfig`/`GlobalConfig`
 * (both already generic, defaulted to `TSlug = string` below) — no separate
 * type parameters needed here: `defineCollection<TSlug extends string>()`
 * (`define.ts`) already returns a `CollectionConfig` narrowed to whatever
 * literal `slug` a consumer actually passed (e.g. `'products'`), and that
 * satisfies this structurally, since every such union extends `string`.
 */
export type BaseConfigProps = {
	/**
	 * The server-rendered/non-browser fallback origin for this package's
	 * internal `/api/*` RPC client (`define.ts`'s `baseConfig()` builds a
	 * real `hc<BaseConfigRouteType>()` client itself now — a consumer no
	 * longer builds or injects one, see `contentClient`/`storageClient`'s
	 * removal below). In an actual browser, `window.location.origin` is used
	 * instead — same-origin, always correct regardless of custom domains or
	 * dev-server ports — and this value is only ever read during SSR, where
	 * there's no `window` to ask.
	 */
	hostDomain: string
	config: AdminSettings
	collections: CollectionConfig[]
	globals: GlobalConfig[]
	/**
	 * Extra block types beyond this package's own 7 built-ins (richtext/
	 * media/cta/banner/grid/columns/relatedPosts) — almost always populated
	 * by a plugin (e.g. `@baseconfig/plugin-form-builder`'s `formBlock`) rather
	 * than hand-written here directly. `baseConfig()` merges these into the
	 * live `blocksBySlug` registry (`collections/blocks/registry.ts`) as a
	 * side effect, same pattern `collections`/`globals` already use.
	 */
	blocks?: BlockConfig[]
	/**
	 * Server-only endpoint builders, almost always populated by a plugin —
	 * see `EndpointFactory`'s own doc comment (`content-route.ts`) for
	 * the full mechanism this enables: a plugin registers a function here
	 * instead of real endpoints (which would need bindings this isomorphic
	 * config can never have), and `createHandler()` calls it once it has
	 * those bindings in hand. This is *the* piece that keeps a plugin's
	 * entire footprint inside `base.config.ts`'s own `plugins: [...]` —
	 * without it, a plugin needing a real endpoint would force a second,
	 * separate call somewhere in the consumer's server entry.
	 */
	endpointFactories?: EndpointFactory[]
	/**
	 * Not yet read anywhere in this package — a real gap, not a documented
	 * behavior. Content collections' actual offline behavior today rides
	 * entirely on whatever `networkMode`/cache policy the consumer's own
	 * `queryClient` (below) was constructed with (`www`'s is `'offlineFirst'`
	 * — see `www/src/utils/query/context.ts`), not on this flag.
	 */
	offlineFirst: boolean
	/**
	 * The consumer's own `QueryClient` (e.g. `www`'s `getContext()`) — a
	 * general dependency, not just for `usersDataSource`: anything in this
	 * package that needs TanStack Query reaches for this one shared instance
	 * rather than each feature threading its own through separately.
	 */
	queryClient: QueryClient
	/**
	 * Wires the real, server-backed `users` collection (see
	 * `CollectionConfig['auth']`) — omit if no collection has `auth: true`.
	 * Pass the consumer's own `authClient` (better-auth's client, with the
	 * `adminClient()` plugin registered) directly — never the server-side
	 * `auth.api` instance: this config flows through `baseConfig()` into
	 * files imported by isomorphic route code, and `auth.api` carries
	 * server-only bindings (D1, KV) that must never reach the client
	 * bundle. `baseConfig()` calls `registerUsersDataSource()` with this
	 * (paired with `queryClient` above), once, as a side effect (same
	 * pattern as registering `collections`/`globals` into the registry
	 * below). A deliberate exception to this package otherwise having no
	 * dependency on any particular auth library — see
	 * `BetterAuthAdminClient`'s own comment.
	 */
	auth?: BetterAuthAdminClient
	/**
	 * Payload-modeled plugins — see `Plugin`'s own doc comment. Run over the
	 * incoming config first, in order, before anything else in
	 * `baseConfig()` — a later plugin sees an earlier plugin's own
	 * additions (more `collections`/`globals`/etc. already appended).
	 */
	plugins?: Plugin[]
}

export type CollectionFieldsProps = {
	/**
	 * Left loosely typed on purpose: `Fields` is dispatched generically by
	 * the registry (see `collections/registry.ts`), so it can't know the
	 * exact `useAppForm<Schema>` instantiation for whichever collection it
	 * ends up rendering ahead of time — the same trade-off any config-driven
	 * field dispatch makes.
	 */
	form: any
	/** The row's own id — e.g. so a relation picker can exclude the document currently being edited. */
	id: string
}

/**
 * The generic shape behind both a collection and a global config — a
 * consuming app binds `TSlug` to its own concrete slug (usually just the
 * literal string it passed to `defineCollection`/`defineGlobal`, inferred
 * automatically — see `CollectionSlug`'s own doc comment,
 * `collections/types.ts`) and adds anything collection-specific (e.g. `color`).
 */
export type BaseConfig<TSlug extends string> = {
	slug: TSlug
	label: string
	schema: z.ZodTypeAny
	defaultValues: () => Record<string, unknown>
	Fields: FC<CollectionFieldsProps>
	/** Pure, isomorphic-safe lifecycle hooks — see `CollectionHooks`' own doc comment for the tier-1/tier-2 split. */
	hooks?: CollectionHooks
}

export type CollectionConfig<TSlug extends string = string> =
	BaseConfig<TSlug> & {
		/**
		 * A literal Tailwind class (e.g. `'bg-olive-400/35'`) for the collection's
		 * type dot. Kept as a full class so it stays visible to Tailwind's
		 * static scanner.
		 */
		color?: string
		/**
		 * The public URL prefix segment for this collection's documents — no
		 * leading/trailing slashes (e.g. `'post'`, not `'/post/'`). Omit for a
		 * collection whose documents live at the site root (a document's own
		 * `slug` becomes the whole path, e.g. `pages`' `home-page` →
		 * `/home-page`); set it to give every document in this collection a
		 * shared prefix instead (e.g. `posts` with `path: 'post'` → a document
		 * whose slug is `post-about-something` resolves to
		 * `/post/post-about-something`). See `collectionPath()`
		 * (`collections/types.ts`) for the one place this is turned into an
		 * actual URL — no public rendering reads this yet (see "Not done yet"
		 * in the project's own docs), but `RelationshipField`'s nav-link
		 * auto-sync already does.
		 */
		path?: string
		/**
		 * Marks this as *the* users collection — real, server-backed accounts
		 * (list/create/update/remove via the consumer's own auth engine), not
		 * client-only `localStorage` like every other collection. Wires in two
		 * built-in, centrally-implemented pieces instead of the usual
		 * `localStorage` data source and blank-draft "Create new" button: a
		 * server-backed collection (see `db/collections.ts`'s
		 * `registerUsersDataSource`) and a real create dialog (email/password
		 * upfront, since an account can't start blank) — see
		 * `admin/widgets/auth-widget.tsx`. There is exactly one such collection
		 * in practice (one `user` table); this stays a boolean rather than an
		 * enum of data-source kinds until a second real need for a
		 * server-backed collection actually shows up.
		 */
		auth?: boolean
		/**
		 * Which of this collection's own `data` fields `CollectionTable` shows
		 * as columns, beyond the fixed generic ones every collection gets
		 * (selection checkbox, ID, Status, Updated, Delete — see
		 * `admin/views/collection-table.tsx`). Omit for the default
		 * `[{key: 'title', label: 'Title'}, {key: 'slug', label: 'Slug'}]`,
		 * matching every collection's own base fields (`db/collections.ts`'s
		 * `withBaseFields`). A collection with its own more meaningful fields
		 * (e.g. `users`' `name`/`email`/`role`) can show those instead of being
		 * forced into the title/slug shape. `type` is optional (omitted for the
		 * hand-written title/slug default, where it isn't needed) — when
		 * present, `CollectionTable` uses it to render a value's cell
		 * correctly for that field's own type rather than guessing from the
		 * runtime value alone (a plain `value || '—'` fallback treats a real
		 * `false` the same as "no value," which is wrong specifically for
		 * `checkbox`/`switch` columns — see that component's own doc comment).
		 */
		columns?: { key: string; label: string; type?: string }[]
		/**
		 * Which column the table's search box filters on — must be one of
		 * `columns`' keys (or `'title'`/`'slug'` if `columns` was omitted).
		 * Defaults to the first entry in `columns` (or `'title'`) if omitted.
		 */
		filterKey?: string
		/**
		 * Admin-display overrides, mirroring Payload's own `admin` collection
		 * option. Only `useAsTitle` exists so far: which real `data` field
		 * stands in for the generic `title`/`slug` document-identity fields
		 * every other collection has (`db/collections.ts`'s `withBaseFields`)
		 * — e.g. `users` has no real `title`, so `useAsTitle: 'name'` tells
		 * `CollectionForm`'s header and `CollectionTable`'s auto-derived
		 * columns to show/edit `name` directly instead of a synthetic title.
		 */
		admin?: { useAsTitle?: string }
	}

/** Globals (Top bar, Footer, …) are singletons — same shape as a collection minus the table/list. */
export type GlobalConfig<TSlug extends string = string> = BaseConfig<TSlug> & {
	/**
	 * Marks this global as fully custom-rendered — `Fields` renders directly
	 * as the whole page, with no `GlobalForm` wrapper (no document load/save,
	 * no localStorage persistence, `schema`/`defaultValues` are unused
	 * placeholders). For a global that isn't really a document to edit — e.g.
	 * Storage, a live file browser hitting its own API directly. Set via
	 * `defineGlobal({component: ...})` rather than `{fields: ...}` — see
	 * `define.ts`. `admin/views/provider.tsx`'s `resolveRouteView` is the
	 * one place that reads this flag.
	 */
	custom?: boolean
}
