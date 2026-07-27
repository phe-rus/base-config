import type { QueryClient } from '@tanstack/react-query'
import type { FC } from 'react'
import type { z } from 'zod'
import type { BetterAuthAdminClient } from './db/collections'
import type { BasePlugin } from './plugins/types'

// `@base/config`'s own root shape — independent of any one consumer's actual
// values. A consuming app (e.g. `www/src/hooks/config/base.config.ts`)
// imports these types and fills in the real collections/globals/admin
// settings for its own site.

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
}

/**
 * `collections`/`globals` use this file's own `CollectionConfig`/`GlobalConfig`
 * (both already generic, defaulted to `TSlug = string` below) — no separate
 * type parameters needed here: a consuming app's concrete `CollectionConfig`
 * (bound to its own slug union, e.g. `www/src/hooks/config`'s `CollectionSlug`)
 * already satisfies these structurally, since that union extends `string`.
 */
export type BaseConfigProps = {
	hostDomain: string
	config: AdminSettings
	collections: CollectionConfig[]
	globals: GlobalConfig[]
	/** Each contributes config the engine already knows how to consume (`definePlugin()`, `plugins/types.ts`) — `baseConfig()` registers them via `registerPlugins()`. */
	plugins: BasePlugin[]
	/** Client-only localStorage collections, no D1 persistence yet — this just documents current reality. */
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
 * consuming app binds `TSlug` to its own concrete slug union (e.g.
 * `www/src/hooks/config`'s `CollectionSlug`) and adds anything
 * collection-specific (e.g. `color`).
 */
export type BaseConfig<TSlug extends string> = {
	slug: TSlug
	label: string
	schema: z.ZodTypeAny
	defaultValues: () => Record<string, unknown>
	Fields: FC<CollectionFieldsProps>
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
		 * forced into the title/slug shape.
		 */
		columns?: { key: string; label: string }[]
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
