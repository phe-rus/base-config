import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@baseconfig/ui/components/collapsible'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@baseconfig/ui/components/tabs'
import { IconChevronDown } from '@tabler/icons-react'
import type { FC } from 'react'
import type { CollectionFieldsProps } from '../base.types'
import {
	StorageWidget,
	type StorageWidgetTriggerProps
} from '../admin/widgets/storage-widget'
import { withTabPrefix } from './schema'
import type { FieldConfig, TabConfig } from './types'
import { uploadFile } from './upload'

/**
 * The four field types that resolve to an app-specific component rather than
 * a generic form primitive (same reasoning as `FieldSchemaResolvers` in
 * `schema.ts`), the consumer passes its real `MetaFields`/`RelationsField`/
 * `BlocksField`/`RelationshipField` in here rather than this file importing
 * them directly, so `baseConfig` stays reusable across a different app's
 * different collections/blocks. `upload` isn't here: every `upload` field is
 * backed by the single `uploadFile` in `./upload.ts` automatically, so no
 * collection ever wires its own upload mechanics again.
 *
 * Generic over `TCollectionSlug` so `relationship.targetType` can match the
 * consumer's real `RelationshipField` component (whose `targetType` prop is
 * its own concrete slug union, not a bare `string`), same pattern as
 * `TabConfig<TCollectionSlug, TBlockSlug>`.
 */
export type FieldRenderers<TCollectionSlug extends string = string> = {
	meta?: FC<{ form: any; uploadFolder?: string; id?: string }>
	relations?: FC<{ form: any; name: string; excludeId?: string }>
	blocks?: FC<{
		form: any
		name: string
		label?: string
		description?: string
		uploadFolder?: string
		id?: string
		minRows?: number
		maxRows?: number
		/** The field's own `blocks: [...]` allow-list (undefined = every registered block), forwarded so `BlocksField` can filter the "Pick block" menu and show the restriction. */
		blocks?: string[]
		/** The field's own `exclude: [...]` list, forwarded so `BlocksField` can hide those slugs (a `grid`-style block capping itself at one nesting level). */
		exclude?: string[]
	}>
	relationship?: FC<{
		label?: string
		description?: string
		targetType?: TCollectionSlug | TCollectionSlug[]
		excludeId?: string
	}>
	menu?: FC<{
		form: any
		name: string
		label?: string
		description?: string
		startAsMegaMenu?: boolean
		relationTo?: TCollectionSlug | TCollectionSlug[]
	}>
	links?: FC<{
		form: any
		name: string
		label?: string
		description?: string
		relationTo?: TCollectionSlug | TCollectionSlug[]
	}>
}

/** A stable React key for a container field (`row`/`collapsible`/`group`/`tabs`/`ui`): none of these have a `name` to key off, so `prefix` + the field's own position stands in instead. Safe as an index key specifically because `fields`/`tabs` arrays are hand-authored config, never a runtime-reorderable list (unlike `ArrayField`'s own dynamic items). */
function containerKey(prefix: string | undefined, index: number): string {
	return prefix ? `${prefix}.__field_${index}` : `__field_${index}`
}

function dotJoin(prefix: string | undefined, name: string): string {
	return prefix ? `${prefix}.${name}` : name
}

export function renderField(
	field: FieldConfig<any, any>,
	form: any,
	prefix: string | undefined,
	id: string,
	renderers: FieldRenderers<any>,
	/**
	 * The owning collection/global's own `slug`, every one gets its own
	 * storage folder automatically. An `upload` field's own `prefix` (see
	 * `UploadFieldConfig`) nests under it, after the document's own `id`,
	 * e.g. `pages/<id>/<prefix>/<filename>`, so two different documents'
	 * uploads never collide on filename.
	 */
	uploadFolder?: string,
	/** This field's own position in its parent `fields`/`tabs` array, only consumed by the container branches below, for `containerKey`. */
	index = 0
) {
	// Container types (`row`/`collapsible`/`group`/`tabs`-as-field/`ui`) have
	// no `name` of their own, they fan out into their own `fields`/`tabs`
	// (or, for `ui`, render a bare component) rather than binding one
	// `form.AppField` path. Handled before `const name = ...` below so
	// `field.name` is never accessed on one of these.
	if (field.type === 'row') {
		return (
			<div key={containerKey(prefix, index)} className='flex flex-row gap-3'>
				{field.fields.map((childField, childIndex) => (
					<div key={containerKey(prefix, childIndex)} className='flex-1'>
						{renderField(
							childField,
							form,
							prefix,
							id,
							renderers,
							uploadFolder,
							childIndex
						)}
					</div>
				))}
			</div>
		)
	}

	if (field.type === 'collapsible') {
		return (
			<Collapsible
				key={containerKey(prefix, index)}
				defaultOpen={!field.initCollapsed}
				className='flex flex-col gap-3 rounded-md border p-4'
			>
				<CollapsibleTrigger className='flex items-center justify-between text-sm font-medium'>
					{field.label ?? 'Details'}
					<IconChevronDown className='size-4' />
				</CollapsibleTrigger>
				<CollapsibleContent className='flex flex-col gap-3'>
					{field.fields.map((childField, childIndex) =>
						renderField(
							childField,
							form,
							prefix,
							id,
							renderers,
							uploadFolder,
							childIndex
						)
					)}
				</CollapsibleContent>
			</Collapsible>
		)
	}

	if (field.type === 'group') {
		const nextPrefix = field.name ? dotJoin(prefix, field.name) : prefix
		return (
			<fieldset
				key={containerKey(prefix, index)}
				className='flex flex-col gap-3 rounded-md border p-4'
			>
				{field.label ? (
					<legend className='text-sm font-medium px-1'>{field.label}</legend>
				) : null}
				{field.description ? (
					<p className='text-sm text-muted-foreground'>{field.description}</p>
				) : null}
				{field.fields.map((childField, childIndex) =>
					renderField(
						childField,
						form,
						nextPrefix,
						id,
						renderers,
						uploadFolder,
						childIndex
					)
				)}
			</fieldset>
		)
	}

	if (field.type === 'tabs') {
		return (
			<Tabs
				key={containerKey(prefix, index)}
				defaultValue={field.tabs[0]?.id}
				className='mb-3'
			>
				<TabsList variant='line' className='gap-3 px-0 mb-3'>
					{field.tabs.map((subtab) => (
						<TabsTrigger key={subtab.id} value={subtab.id} className='px-0'>
							{subtab.label}
						</TabsTrigger>
					))}
				</TabsList>
				{field.tabs.map((subtab) => {
					const nextPrefix = subtab.name ? dotJoin(prefix, subtab.name) : prefix
					return (
						<TabsContent
							key={subtab.id}
							value={subtab.id}
							className='flex flex-col gap-5'
						>
							{subtab.fields.map((childField, childIndex) =>
								renderField(
									childField,
									form,
									nextPrefix,
									id,
									renderers,
									uploadFolder,
									childIndex
								)
							)}
						</TabsContent>
					)
				})}
			</Tabs>
		)
	}

	if (field.type === 'ui') {
		const { Component } = field
		return <Component key={containerKey(prefix, index)} />
	}

	const name = prefix ? `${prefix}.${field.name}` : field.name

	// `meta`/`relations` (as currently implemented) hardcode their own
	// paths/props rather than taking an arbitrary `name`, they're rendered
	// directly, not wrapped in `form.AppField`.
	if (field.type === 'meta') {
		const Meta = renderers.meta
		return Meta ? (
			<Meta key={name} form={form} uploadFolder={uploadFolder} id={id} />
		) : null
	}

	if (field.type === 'relations') {
		const Relations = renderers.relations
		return Relations ? (
			<Relations key={name} form={form} name={name} excludeId={id} />
		) : null
	}

	if (field.type === 'blocks') {
		const Blocks = renderers.blocks
		return Blocks ? (
			<Blocks
				key={name}
				form={form}
				name={name}
				label={field.label}
				description={field.description}
				uploadFolder={uploadFolder}
				id={id}
				minRows={field.minRows}
				maxRows={field.maxRows}
				blocks={field.blocks}
				exclude={field.exclude}
			/>
		) : null
	}

	if (field.type === 'menu') {
		const Menu = renderers.menu
		return Menu ? (
			<Menu
				key={name}
				form={form}
				name={name}
				label={field.label}
				description={field.description}
				startAsMegaMenu={field.startAsMegaMenu}
				relationTo={field.relationTo}
			/>
		) : null
	}

	if (field.type === 'links') {
		const Links = renderers.links
		return Links ? (
			<Links
				key={name}
				form={form}
				name={name}
				label={field.label}
				description={field.description}
				relationTo={field.relationTo}
			/>
		) : null
	}

	if (field.type === 'relationship') {
		const Relationship = renderers.relationship
		if (!Relationship) return null
		return (
			<form.AppField key={name} name={name}>
				{() => (
					<Relationship
						label={field.label}
						description={field.description}
						targetType={field.relationTo}
						excludeId={id}
					/>
				)}
			</form.AppField>
		)
	}

	if (field.type === 'array') {
		return (
			<form.AppField key={name} name={name}>
				{(f: any) => (
					<f.ArrayField label={field.label} description={field.description}>
						{({ path }: { path: string }) => (
							<div className='flex flex-col gap-3'>
								{field.fields.map((childField, childIndex) =>
									renderField(
										childField,
										form,
										path,
										id,
										renderers,
										uploadFolder,
										childIndex
									)
								)}
							</div>
						)}
					</f.ArrayField>
				)}
			</form.AppField>
		)
	}

	return (
		<form.AppField key={name} name={name}>
			{(f: any) => {
				switch (field.type) {
					case 'text':
						return (
							<f.Input
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'textarea':
						return (
							<f.Textarea
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'richtext': {
						const uploadPrefix = [uploadFolder, id, field.prefix]
							.filter(Boolean)
							.join('/')
						return (
							<f.RichText
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								onUpload={(file: File) =>
									uploadFile(file, uploadPrefix || undefined)
								}
								renderBrowser={(browserProps: StorageWidgetTriggerProps) => (
									<StorageWidget
										{...browserProps}
										defaultFolder={uploadPrefix || undefined}
										accept='image/*'
									/>
								)}
							/>
						)
					}
					case 'checkbox':
						return (
							<f.Checkbox
								label={field.label}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'switch':
						return (
							<f.Switch
								label={field.label}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'date':
						return (
							<f.DatePicker
								label={field.label}
								description={field.description}
								placeholder={field.placeholder}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'keywords':
						return (
							<f.KeywordsInput
								label={field.label}
								description={field.description}
								placeholder={field.placeholder}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'select':
						return (
							<f.Select
								label={field.label}
								description={field.description}
								placeholder={field.placeholder}
								options={field.options}
								defaultValue={field.defaultValue as string | undefined}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'radio':
						return (
							<f.RadioGroup
								label={field.label}
								description={field.description}
								options={field.options}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'email':
						return (
							<f.Email
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'number':
						return (
							<f.Number
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								min={field.min}
								max={field.max}
								step={field.step}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'password':
						return (
							<f.Password
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'confirmPassword':
						return (
							<f.ConfirmPassword
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'hidden':
						return (
							<f.Hidden required={field.required} disabled={field.disabled} />
						)
					case 'code':
						return (
							<f.Code
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								language={field.language}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'json':
						return (
							<f.JSON
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'slug':
						return (
							<f.Slug
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'point':
						return (
							<f.Point
								label={field.label}
								description={field.description}
								required={field.required}
								disabled={field.disabled}
							/>
						)
					case 'upload': {
						const uploadPrefix = [uploadFolder, id, field.prefix]
							.filter(Boolean)
							.join('/')
						return (
							<f.Upload
								label={field.label}
								description={field.description}
								accept={field.accept}
								required={field.required}
								disabled={field.disabled}
								onUpload={(file: File) =>
									uploadFile(file, uploadPrefix || undefined)
								}
								renderBrowser={(browserProps: StorageWidgetTriggerProps) => (
									<StorageWidget
										{...browserProps}
										defaultFolder={uploadPrefix || undefined}
										accept={field.accept}
									/>
								)}
							/>
						)
					}
					default:
						return null
				}
			}}
		</form.AppField>
	)
}

/**
 * Turns a plain `FieldConfig[]` into a real `Fields` component with no tab
 * chrome at all: for globals (`footer`, `topbar`), which render their
 * field(s) directly rather than inside `Tabs`.
 */
export function createFlatFieldsRenderer<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
>(
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[],
	renderers: FieldRenderers<TCollectionSlug> = {},
	/** The owning global's own `slug`, see `renderField`'s `uploadFolder` param. */
	uploadFolder?: string
): FC<CollectionFieldsProps> {
	return function GeneratedFlatFields({ form, id }: CollectionFieldsProps) {
		return (
			<>
				{fields.map((field, index) =>
					renderField(
						field,
						form,
						undefined,
						id,
						renderers,
						uploadFolder,
						index
					)
				)}
			</>
		)
	}
}

/**
 * Turns a declarative `TabConfig[]` into a real `Fields` component: the
 * same `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` chrome every collection
 * uses, dispatching each field by type. A direct leaf field's `name` is
 * written relative to its own tab (see `withTabPrefix`): `tab: 'post'`
 * with a field named `'content'` resolves to the real path `post.content`.
 * A container field (`row`/`collapsible`/`group`/`tabs`-as-field/`ui`) is
 * rendered with the tab's own plain prefix instead (`tab.flat ? undefined :
 * tab.tab`), it has no `name` for `withTabPrefix`'s shorthand to apply to,
 * see `flattenTabFields`'s own doc comment (`fields/schema.ts`) for why
 * this deliberately doesn't try to extend that shorthand through a
 * container.
 */
export function createFieldsRenderer<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
>(
	tabs: TabConfig<TCollectionSlug, TBlockSlug>[],
	renderers: FieldRenderers<TCollectionSlug> = {},
	/** The owning collection's own `slug`, see `renderField`'s `uploadFolder` param. */
	uploadFolder?: string
): FC<CollectionFieldsProps> {
	return function GeneratedFields({ form, id }: CollectionFieldsProps) {
		return (
			<Tabs defaultValue={tabs[0]?.tab} className='mb-20'>
				<TabsList variant='line' className='sticky top-32 z-5 gap-3 px-0 mb-3'>
					{tabs.map((tab) => (
						<TabsTrigger key={tab.tab} value={tab.tab} className='px-0'>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>

				{tabs.map((tab) => (
					<TabsContent
						key={tab.tab}
						value={tab.tab}
						className='flex flex-col gap-5'
					>
						{tab.fields.map((field, index) => {
							switch (field.type) {
								case 'row':
								case 'collapsible':
								case 'group':
								case 'tabs':
								case 'ui':
									return renderField(
										field,
										form,
										tab.flat ? undefined : tab.tab,
										id,
										renderers,
										uploadFolder,
										index
									)
								default:
									return renderField(
										{
											...field,
											name: withTabPrefix(tab.tab, field.name, tab.flat)
										},
										form,
										undefined,
										id,
										renderers,
										uploadFolder,
										index
									)
							}
						})}
					</TabsContent>
				))}
			</Tabs>
		)
	}
}
