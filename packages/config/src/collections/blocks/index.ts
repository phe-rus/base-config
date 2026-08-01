import { z } from 'zod'
import { blocksBySlug } from './registry'

export { blocksBySlug, registerBlocks } from './registry'
export { BlockRenderer } from './shared/block-renderer'
export type { BlockData } from './shared/block-renderer'
export { RelatedPostsGroupRender } from './RelatedPosts'

/**
 * Built lazily, on every call, from the *current* `blocksBySlug` registry,
 * never cached as a top-level constant the way this used to be a static
 * `blocksSchema` export. That mattered once blocks became registry-based:
 * `define.ts`'s `schemaResolvers.blocks` is evaluated once, at that
 * module's own eval time, which happens when `www/src/config/collections/*.ts`
 * files are first imported, *before* `baseConfig({plugins: [...]})` has
 * run and registered a plugin's own blocks (e.g.
 * `@baseconfig/plugin-form-builder`'s `formBlock`). `define.ts` wraps this in
 * `z.lazy(() => getBlocksSchema())` instead, deferring the actual
 * discriminated-union build until a real validation happens, always after
 * `baseConfig()` has finished, by which point every plugin's blocks are in
 * the registry.
 */
export function getBlocksSchema() {
	const schemas = Object.values(blocksBySlug).map((block) => block.schema)
	// `discriminatedUnion` wants each member's discriminant statically
	// provable, real for every individual block's own `z.object({blockType:
	// z.literal(...), ...})` schema, but lost once erased to `ZodTypeAny` and
	// collected through a runtime registry. Still a real discriminated union
	// at runtime (every `BlockConfig.schema` is one), just not provable to
	// this degree by the type checker once dynamic, same trade-off the rest
	// of this registry-based design already accepts.
	return z.array(z.discriminatedUnion('blockType', schemas as any))
}

export type { BlockConfig, BlockFieldsProps, BlockSlug } from './shared/types'
