import type {
	CollectionConfig as BaseCollectionConfig,
	CollectionHooks,
	GlobalConfig as BaseGlobalConfig
} from '../base.types'
import type { EndpointFactory } from '../api/content-route'
import type { CollectionConfig, GlobalConfig } from './types'

// A plain, passive store, populated by a consumer's `base.config.ts` (e.g.
// `www/src/hooks/config/base.config.ts`) calling `registerBaseConfig` as a
// side effect of being imported, not by this file importing that config
// directly. That would create a circular dependency: the consumer's
// collections are built with `defineCollection` (`../define.ts`), which
// wires in `RelationshipField`, which needs `contentCollections`
// (`../db/collections.ts`), which needs this very registry to look up a
// collection's schema by slug, so this registry has to stay unaware of any
// consumer's config for the cycle not to close.
export const collectionsBySlug = {} as Record<
	CollectionConfig['slug'],
	CollectionConfig
>
export const globalsBySlug = {} as Record<GlobalConfig['slug'], GlobalConfig>

/**
 * Takes `BaseConfigProps`'s own generic (`TSlug = string`) config shape,
 * that's what `baseConfig.collections`/`baseConfig.globals` are typed as at
 * that boundary, and casts each entry to this app's concrete slug union
 * when storing it. Safe because the values really are this app's own
 * `CollectionConfig`/`GlobalConfig`; only their *declared* type at the
 * `BaseConfigProps` boundary is the wider, generic one.
 */
export function registerBaseConfig(
	collections: BaseCollectionConfig[],
	globals: BaseGlobalConfig[]
) {
	for (const collection of collections) {
		collectionsBySlug[collection.slug as CollectionConfig['slug']] =
			collection as CollectionConfig
	}
	for (const global of globals) {
		globalsBySlug[global.slug as GlobalConfig['slug']] = global as GlobalConfig
	}

	// Collections and globals share one flat `/admin/<slug>` lookup now (see
	// `admin/views/provider.tsx`'s `resolveRouteView`, which checks
	// `globalsBySlug` before `collectionsBySlug`), a slug used by both would
	// make the collection silently unreachable rather than erroring, since
	// the global branch always wins first. `CollectionConfig['slug']`/
	// `GlobalConfig['slug']` are separate closed unions with no
	// compile-time guarantee they stay disjoint, so this is the one place
	// that actually validates it, against the real registered config rather
	// than the type declarations alone.
	for (const slug of Object.keys(collectionsBySlug)) {
		if (slug in globalsBySlug) {
			throw new Error(
				`"${slug}" is registered as both a collection and a global: every collection/global must have a unique slug across both.`
			)
		}
	}
}

/**
 * The bridge `content-route.ts` (server-only) reads Tier-1 hooks through,
 * safe specifically *because* `CollectionHooks` must stay pure/binding-free
 * (see that type's own doc comment): a server-only file reading something
 * that's also reachable from the client bundle is fine, it's the reverse
 * (client code reaching a binding) that's forbidden. Collection and global
 * hooks share one flat map, keyed by slug, safe because
 * `registerBaseConfig` above already enforces collection/global slugs stay
 * disjoint. `createHandler()` calls this once, internally, and merges the
 * result with whatever Tier-2 (binding-capable) `hooks` a consumer passed
 * in directly, see that function's own doc comment.
 */
export function collectHooks(): Record<string, CollectionHooks> {
	const hooks: Record<string, CollectionHooks> = {}
	for (const collection of Object.values(collectionsBySlug)) {
		if (collection.hooks) hooks[collection.slug] = collection.hooks
	}
	for (const global of Object.values(globalsBySlug)) {
		if (global.hooks) hooks[global.slug] = global.hooks
	}
	return hooks
}

const endpointFactories: EndpointFactory[] = []

/** Called once by `baseConfig()` with `config.endpointFactories ?? []`, see `EndpointFactory`'s own doc comment (`content-route.ts`) for the full mechanism. */
export function registerEndpointFactories(factories: EndpointFactory[]) {
	endpointFactories.push(...factories)
}

/** `createHandler()` calls this once, internally, invoking every registered factory with the real bindings it has and merging the results with its own Tier-2 `endpoints` param. */
export function collectEndpointFactories(): EndpointFactory[] {
	return endpointFactories
}
