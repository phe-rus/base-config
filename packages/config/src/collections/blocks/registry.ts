import { z } from 'zod'
import type { BlockConfig } from './shared/types'

/**
 * A live, runtime registry rather than the closed `Record<BlockSlug, BlockConfig>`
 * this used to be: mirrors `collections/registry.ts`'s own
 * `collectionsBySlug`/`globalsBySlug` pattern, for the same reason: a
 * plugin package (e.g. `@baseconfig/plugin-form-builder`) can't add a member to a
 * union type it doesn't own, so this needs to be something it can register
 * *into* instead. Starts empty, exactly like `collectionsBySlug`: this
 * package ships no built-in blocks at all, every block a consumer can pick
 * in `BlocksField` comes from its own `config.blocks` (Payload-style, the
 * block tree lives consumer-side, see `www/src/config/blocks`).
 * `registerBlocks()` is what fills it.
 */
export const blocksBySlug: Record<string, BlockConfig> = {}

/** Called once by `baseConfig()` with `config.blocks ?? []`, see that function's own doc comment. A slug collision silently overwrites, matching how `collectionsBySlug`/`globalsBySlug` already resolve collisions (last write wins, no error); not guarded further since block slugs are far less likely to collide than collection slugs. */
export function registerBlocks(blocks: BlockConfig[]) {
	for (const block of blocks) {
		blocksBySlug[block.slug] = block
	}
}

/**
 * Lives here rather than in the barrel `index.ts` so `shared/define-block.tsx`
 * can import it without pulling the barrel back in (see that file's own doc
 * comment for the exact cycle that would create). Built lazily, on every
 * call, from the *current* `blocksBySlug` registry, never cached as a
 * top-level constant the way this used to be a static `blocksSchema`
 * export. That matters once blocks became registry-based: `define.ts`'s
 * `schemaResolvers.blocks` is evaluated once, at that module's own eval
 * time, which happens when `www/src/config/collections/*.ts` files are
 * first imported, *before* `baseConfig({plugins: [...]})` has run and
 * registered a plugin's own blocks (e.g.
 * `@baseconfig/plugin-form-builder`'s `formBlock`). `define.ts` wraps this
 * in `z.lazy(() => getBlocksSchema())` instead, deferring the actual
 * discriminated-union build until a real validation happens, always after
 * `baseConfig()` has finished, by which point every plugin's blocks are in
 * the registry.
 *
 * `slugs` is a `blocks` field's own restriction list (its `blocks: [...]`,
 * `BlocksFieldConfig['blocks']`): when given, only those registered blocks
 * participate in the union, so a restricted field rejects any other block
 * instance at validation time. An unknown slug is a config typo (autocomplete
 * against `GeneratedBlockSlug` should have caught it), not a valid schema:
 * throw loudly at build/validation time rather than silently producing a
 * union that never matches. Omitting `slugs` (or passing `undefined`) keeps
 * the historical behavior: every registered block is allowed.
 */
export function getBlocksSchema(slugs?: string[]) {
	const registered = Object.values(blocksBySlug)
	if (slugs && slugs.length > 0) {
		for (const slug of slugs) {
			if (!blocksBySlug[slug]) {
				throw new Error(
					`getBlocksSchema: '${slug}' is not a registered block. ` +
						`Registered: ${Object.keys(blocksBySlug).join(', ') || '(none)'}`
				)
			}
		}
	}
	const schemas = registered
		.filter(
			(block) => !slugs || slugs.length === 0 || slugs.includes(block.slug)
		)
		.map((block) => block.schema)
	// A restricted field that names nothing registered, or an empty registry
	// (no consumer registered any blocks), still needs a usable schema:
	// `z.discriminatedUnion` with zero options would throw. `z.array(z.never())`
	// parses only the empty array, which is the one shape a `blocks` field is
	// valid as when no block is available, and rejects any block instance.
	if (schemas.length === 0) return z.array(z.never())
	// `discriminatedUnion` wants each member's discriminant statically
	// provable, real for every individual block's own `z.object({blockType:
	// z.literal(...), ...})` schema, but lost once erased to `ZodTypeAny` and
	// collected through a runtime registry. Still a real discriminated union
	// at runtime (every `BlockConfig.schema` is one), just not provable to
	// this degree by the type checker once dynamic, same trade-off the rest
	// of this registry-based design already accepts.
	return z.array(z.discriminatedUnion('blockType', schemas as any))
}
