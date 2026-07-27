import type { BasiccnContent } from '@base/ui/basiccn'
import { z } from 'zod'
import { pluginFieldTypes } from '../plugins/registry'
import type { FieldConfig, TabConfig } from './types'

/** The shape an `upload`-type field's value actually is — exported so a fixed composite (e.g. `metaSchema`'s SEO image) can reuse the exact same shape. */
export const uploadValueSchema = z.object({
	url: z.string(),
	name: z.string(),
	size: z.number()
})

/**
 * The four composite field types (`meta`/`relations`/`blocks`/`menu`) resolve
 * to an app-specific schema that this framework-side module has no business
 * knowing about — `collections/types.ts`'s `metaSchema`/`relationsSchema`/
 * `navMenuSchema` and `collections/blocks`'s `blocksSchema` are *this
 * package's own* real shapes, wired in centrally by `define.ts`, but a
 * different consumer swapping in different collections/blocks would supply
 * different ones — the consumer passes them in here rather than this file
 * importing them directly, so `@base/config` stays reusable.
 */
export type FieldSchemaResolvers = {
	meta?: z.ZodTypeAny
	relations?: z.ZodTypeAny
	blocks?: z.ZodTypeAny
	menu?: z.ZodTypeAny
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

/** The base (non-optional) schema for one field's own value — `fieldsToSchema` applies `.optional()` unless `field.required`. */
function baseFieldSchema(
	field: FieldConfig<any, any>,
	resolvers: FieldSchemaResolvers
): z.ZodTypeAny {
	switch (field.type) {
		case 'text':
		case 'textarea':
		case 'date':
		case 'select':
		case 'radio':
			return z.string()
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
		case 'plugin':
			return pluginFieldTypes[field.pluginType]?.schema(field) ?? z.unknown()
	}
}

/** Builds one `z.object` shape from a flat field list — used for one `array` field's item shape, or (via `tabsToSchema`) a whole collection. Field `name`s may be dot-paths (`'hero.content'`); those get exploded into nested objects, matching how `form.AppField`'s `name` already works. */
export function fieldsToSchema(
	fields: FieldConfig<any, any>[],
	resolvers: FieldSchemaResolvers = {}
): z.ZodObject<Record<string, z.ZodTypeAny>> {
	const tree: SchemaTree = {}
	for (const field of fields) {
		const base = baseFieldSchema(field, resolvers)
		setPath(tree, field.name, field.required ? base : base.optional())
	}
	return treeToZodObject(tree)
}

/** A field's name relative to its own tab — skipped when it already equals the tab id (e.g. a `content`/`metadata` tab holding one field of the same name), or when the whole tab is marked `flat: true` (see `TabConfig['flat']`), so authors never write a redundant `name: 'content'` inside `tab: 'content'` twice. */
export function withTabPrefix(
	tab: string,
	fieldName: string,
	flat?: boolean
): string {
	return flat || fieldName === tab ? fieldName : `${tab}.${fieldName}`
}

/** Every tab's fields, flattened, with each field's `name` resolved relative to its own tab via `withTabPrefix` — the single place both `tabsToSchema` and `deriveDefaultValues` (see `define.ts`) get a collection's real, full field-path list from. */
export function flattenTabFields(
	tabs: TabConfig<any, any>[]
): FieldConfig<any, any>[] {
	return tabs.flatMap((tab) =>
		tab.fields.map((field) => ({
			...field,
			name: withTabPrefix(tab.tab, field.name, tab.flat)
		}))
	)
}

/** Builds one collection/global's whole schema from its tabs — tabs are a UI grouping only, so this just flattens every tab's fields (resolving each one's real path via `flattenTabFields`) before building the object. */
export function tabsToSchema(
	tabs: TabConfig<any, any>[],
	resolvers: FieldSchemaResolvers = {}
): z.ZodObject<Record<string, z.ZodTypeAny>> {
	return fieldsToSchema(flattenTabFields(tabs), resolvers)
}

type ValueTree = { [key: string]: unknown }

/** Same dot-path walk as `setPath`/`treeToZodObject` above, but for plain values — and it always creates the intermediate object for a dotted path (e.g. `'post.content'` ensures `post: {}` exists) even when the leaf itself has no default, matching every hand-written `defaultValues()` this replaces. */
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
 */
function fieldDefaultValue(field: FieldConfig<any, any>): unknown {
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

/** Derives a collection/global's default document data straight from its fields — no more hand-written `defaultValues()` per collection. */
export function deriveDefaultValues(
	fields: FieldConfig<any, any>[]
): Record<string, unknown> {
	const tree: ValueTree = {}
	for (const field of fields) {
		const { node, key } = ensurePath(tree, field.name)
		const value = fieldDefaultValue(field)
		if (value !== undefined) {
			node[key] = value
		}
	}
	return tree
}
