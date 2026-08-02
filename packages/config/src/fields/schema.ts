import type { BasiccnContent } from '@baseconfig/ui/basiccn'
import { z } from 'zod'
import type { FieldConfig, TabConfig } from './types'

/** The shape an `upload`-type field's value actually is, exported so a fixed composite (e.g. `metaSchema`'s SEO image) can reuse the exact same shape. */
export const uploadValueSchema = z.object({
	url: z.string(),
	name: z.string(),
	size: z.number()
})

/** Plain TS shape of `uploadValueSchema`, an `upload`-type field's real value. */
export type UploadValue = z.infer<typeof uploadValueSchema>

/**
 * The four composite field types (`meta`/`relations`/`blocks`/`menu`) resolve
 * to an app-specific schema that this framework-side module has no business
 * knowing about: `collections/types.ts`'s `metaSchema`/`relationsSchema`/
 * `navMenuSchema` and `collections/blocks`'s `blocksSchema` are *this
 * package's own* real shapes, wired in centrally by `define.ts`, but a
 * different consumer swapping in different collections/blocks would supply
 * different ones, the consumer passes them in here rather than this file
 * importing them directly, so `@baseconfig/core` stays reusable.
 */
export type FieldSchemaResolvers = {
	meta?: z.ZodTypeAny
	relations?: z.ZodTypeAny
	blocks?: z.ZodTypeAny
	menu?: z.ZodTypeAny
	links?: z.ZodTypeAny
}

type SchemaTree = { [key: string]: z.ZodTypeAny | SchemaTree }

function setPath(tree: SchemaTree, path: string, schema: z.ZodTypeAny) {
	const parts = path.split('.')
	let node = tree
	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i]
		const existing = node[key]
		if (!existing || existing instanceof z.ZodType) {
			node[key] = {}
		}
		node = node[key] as SchemaTree
	}
	node[parts[parts.length - 1]] = schema
}

function treeToZodObject(
	tree: SchemaTree
): z.ZodObject<Record<string, z.ZodTypeAny>> {
	const shape: Record<string, z.ZodTypeAny> = {}
	for (const [key, value] of Object.entries(tree)) {
		shape[key] =
			value instanceof z.ZodType ? value : treeToZodObject(value).optional()
	}
	return z.object(shape)
}

/**
 * A field type that either fans out into its own `fields`/`tabs` (never
 * itself contributing one schema/defaultValue path) or contributes nothing
 * at all (`ui`), narrows `FieldConfig` down to exactly the types
 * `expandFields` below has already resolved away by the time `baseFieldSchema`/
 * `fieldDefaultValue` ever see a field, so their own switches stay
 * exhaustive over "real, schema-contributing fields only."
 */
export type LeafFieldConfig = Exclude<
	FieldConfig<any, any>,
	{ type: 'row' | 'collapsible' | 'group' | 'tabs' | 'ui' }
>

function dotJoin(prefix: string | undefined, name: string): string {
	return prefix ? `${prefix}.${name}` : name
}

/**
 * Resolves `row`/`collapsible`/`group`/`tabs`-as-field/`ui` containers away,
 * returning a flat list of real, schema-contributing fields with their
 * final dotted `name` already applied, the one shared core both
 * `fieldsToSchema`/`deriveDefaultValues` (for a flat field list with no tab
 * involved at all, e.g. `array`'s own item shape or a global's `fields`)
 * and `flattenTabFields` (for one tab's own field list, layered underneath
 * `withTabPrefix`'s tab-specific naming rule, see that function's own doc
 * comment) use to resolve nesting the same way. `row`/`collapsible` never
 * nest data (no `name` at all, pure layout, so `prefix` passes through
 * unchanged); unnamed `group`/`tabs` sub-tabs behave the same (fields
 * splice flat into `prefix`); named ones nest under `${prefix}.${name}`.
 * `ui` fields are dropped entirely. Idempotent, safe to call on an
 * already-flat list (every entry just re-resolves to its own unchanged
 * name), which is exactly what happens when `deriveDefaultValues` is
 * called on `flattenTabFields`'s own output in `define.ts`.
 */
export function expandFields(
	fields: FieldConfig<any, any>[],
	prefix?: string
): LeafFieldConfig[] {
	const result: LeafFieldConfig[] = []
	for (const field of fields) {
		switch (field.type) {
			case 'row':
			case 'collapsible':
				result.push(...expandFields(field.fields, prefix))
				break
			case 'group':
				result.push(
					...expandFields(
						field.fields,
						field.name ? dotJoin(prefix, field.name) : prefix
					)
				)
				break
			case 'tabs':
				for (const subtab of field.tabs) {
					result.push(
						...expandFields(
							subtab.fields,
							subtab.name ? dotJoin(prefix, subtab.name) : prefix
						)
					)
				}
				break
			case 'ui':
				break
			default:
				result.push({ ...field, name: dotJoin(prefix, field.name) })
		}
	}
	return result
}

/** The base (non-optional) schema for one field's own value, `fieldsToSchema` applies `.optional()` unless `field.required`. Only ever called on a `LeafFieldConfig` (post-`expandFields`): `row`/`collapsible`/`group`/`tabs`/`ui` never reach here. */
function baseFieldSchema(
	field: LeafFieldConfig,
	resolvers: FieldSchemaResolvers
): z.ZodTypeAny {
	switch (field.type) {
		case 'text':
		case 'textarea': {
			let schema = z.string()
			if (field.minLength !== undefined) schema = schema.min(field.minLength)
			if (field.maxLength !== undefined) schema = schema.max(field.maxLength)
			return schema
		}
		case 'date':
		case 'select':
		case 'radio':
		case 'password':
		case 'confirmPassword':
		case 'hidden':
		case 'code':
		case 'slug':
			return z.string()
		case 'email':
			return z.string().email()
		case 'number':
			return z.number()
		case 'json':
			return z.unknown()
		case 'point':
			return z.object({
				lat: z.number().optional(),
				lng: z.number().optional()
			})
		case 'richtext':
			return z.custom<BasiccnContent>()
		case 'checkbox':
		case 'switch':
			return z.boolean()
		case 'keywords':
			return z.array(z.string())
		case 'upload':
			return uploadValueSchema
		case 'array':
			return z.array(fieldsToSchema(field.fields, resolvers))
		case 'relationship':
			return field.hasMany ? z.array(z.string()) : z.string()
		case 'meta':
			return resolvers.meta ?? z.record(z.string(), z.unknown())
		case 'relations':
			return resolvers.relations ?? z.array(z.unknown())
		case 'blocks':
			return resolvers.blocks ?? z.array(z.unknown())
		case 'menu':
			return resolvers.menu ?? z.array(z.unknown())
		case 'links':
			return resolvers.links ?? z.array(z.unknown())
	}
}

/** Builds one `z.object` shape from a field list, used for one `array` field's item shape, a global's own `fields`, or (via `tabsToSchema`) a whole collection. Resolves `row`/`collapsible`/`group`/`tabs`/`ui` containers via `expandFields` first, then field `name`s (real dot-paths after that resolution) get exploded into nested objects, matching how `form.AppField`'s `name` already works. */
export function fieldsToSchema(
	fields: FieldConfig<any, any>[],
	resolvers: FieldSchemaResolvers = {}
): z.ZodObject<Record<string, z.ZodTypeAny>> {
	const tree: SchemaTree = {}
	for (const field of expandFields(fields)) {
		const base = baseFieldSchema(field, resolvers)
		setPath(tree, field.name, field.required ? base : base.optional())
	}
	return treeToZodObject(tree)
}

/** A field's name relative to its own tab, skipped when it already equals the tab id (e.g. a `content`/`metadata` tab holding one field of the same name), or when the whole tab is marked `flat: true` (see `TabConfig['flat']`), so authors never write a redundant `name: 'content'` inside `tab: 'content'` twice. Only ever applied to a field sitting directly in a tab's own `fields`, a field nested inside a `row`/`collapsible`/`group`/`tabs` container skips this shorthand (see `flattenTabFields`'s own doc comment) and always gets the tab's plain prefix instead. */
export function withTabPrefix(
	tab: string,
	fieldName: string,
	flat?: boolean
): string {
	return flat || fieldName === tab ? fieldName : `${tab}.${fieldName}`
}

/**
 * Every tab's fields, flattened, with each field's `name` resolved to its
 * real final dotted path, the single place both `tabsToSchema` and
 * `deriveDefaultValues` (see `define.ts`) get a collection's real, full
 * field-path list from. A direct leaf field (sitting immediately in
 * `tab.fields`) gets `withTabPrefix`'s exact existing behavior, special
 * case included. A container (`row`/`collapsible`/`group`/`tabs`/`ui`)
 * gets expanded via `expandFields`, seeded with the tab's own plain prefix
 * (`tab.flat ? undefined : tab.tab`), **without** `withTabPrefix`'s
 * "equals the tab id" shorthand threaded through it. That's a deliberate,
 * narrow scope decision: the shorthand only ever mattered for a
 * single-field, non-flat tab written as `{tab: 'content', fields: [{name:
 * 'content', ...}]}` (real, existing usage, `pages.ts`'s own `content`/
 * `metadata` tabs), extending it through a nested container as well would
 * add real complexity for a combination nothing here actually uses.
 */
export function flattenTabFields(
	tabs: TabConfig<any, any>[]
): LeafFieldConfig[] {
	return tabs.flatMap((tab) =>
		tab.fields.flatMap((field): LeafFieldConfig[] => {
			switch (field.type) {
				case 'row':
				case 'collapsible':
				case 'group':
				case 'tabs':
				case 'ui':
					return expandFields([field], tab.flat ? undefined : tab.tab)
				default:
					return [
						{ ...field, name: withTabPrefix(tab.tab, field.name, tab.flat) }
					]
			}
		})
	)
}

/** Builds one collection/global's whole schema from its tabs, tabs are a UI grouping only, so this just flattens every tab's fields (resolving each one's real path via `flattenTabFields`) before building the object. */
export function tabsToSchema(
	tabs: TabConfig<any, any>[],
	resolvers: FieldSchemaResolvers = {}
): z.ZodObject<Record<string, z.ZodTypeAny>> {
	return fieldsToSchema(flattenTabFields(tabs), resolvers)
}

/**
 * The flat list of a collection/global's real, *current* field paths
 * (`flattenTabFields`/`expandFields`'s own already-resolved dotted `name`s),
 * the source of truth a "prune" operation (`db/prune.ts`) compares a
 * document's stored `data` against: any key reachable in stored data but not
 * in this list no longer corresponds to any field in the current config
 * (renamed/removed since that data was last written) and gets dropped.
 * `array`/`blocks`/`relations`/`menu`/`links`/`meta`/`relationship`/`upload`
 * fields are leaves here (see `expandFields`'s own doc comment for exactly
 * which types recurse vs. resolve to one path), so this only ever
 * reconciles top-level/nested-group structure, never an array item's own
 * internal shape, a deliberate v1 scope decision, not an oversight.
 */
export function knownFieldPaths(fields: LeafFieldConfig[]): string[] {
	return fields.map((field) => field.name)
}

type ValueTree = { [key: string]: unknown }

/** Same dot-path walk as `setPath`/`treeToZodObject` above, but for plain values, and it always creates the intermediate object for a dotted path (e.g. `'post.content'` ensures `post: {}` exists) even when the leaf itself has no default, matching every hand-written `defaultValues()` this replaces. */
function ensurePath(
	tree: ValueTree,
	path: string
): { node: ValueTree; key: string } {
	const parts = path.split('.')
	let node = tree
	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i]
		if (typeof node[key] !== 'object' || node[key] === null) {
			node[key] = {}
		}
		node = node[key] as ValueTree
	}
	return { node, key: parts[parts.length - 1] }
}

/**
 * A field only gets a default when it explicitly opts in (`field.defaultValue`)
 * or is one of the container types that already default to an empty
 * container today (`array` → `[]`, `blocks`/`relations` → `[]`, `meta` →
 * `{title: '', description: ''}`, matching every hand-written `defaultValues()`
 * this replaces byte-for-byte). Every other field is simply left undefined.
 * Only ever called on a `LeafFieldConfig` (post-`expandFields`).
 */
function fieldDefaultValue(field: LeafFieldConfig): unknown {
	if (field.defaultValue !== undefined) return field.defaultValue
	switch (field.type) {
		case 'array':
		case 'blocks':
		case 'relations':
		case 'menu':
			return []
		case 'meta':
			return { title: '', description: '' }
		default:
			return undefined
	}
}

/** Derives a collection/global's default document data straight from its fields, no more hand-written `defaultValues()` per collection. Resolves `row`/`collapsible`/`group`/`tabs`/`ui` containers via `expandFields` first (idempotent, safe whether `fields` is a raw list or already-flattened, e.g. `defineCollection`'s own `deriveDefaultValues(flattenTabFields(definition.tabs))` call). */
export function deriveDefaultValues(
	fields: FieldConfig<any, any>[]
): Record<string, unknown> {
	const tree: ValueTree = {}
	for (const field of expandFields(fields)) {
		const { node, key } = ensurePath(tree, field.name)
		const value = fieldDefaultValue(field)
		if (value !== undefined) {
			node[key] = value
		}
	}
	return tree
}
