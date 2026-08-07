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
import {
	StorageWidget,
	type StorageWidgetTriggerProps
} from '../admin/widgets/storage-widget'
import type { CollectionFieldsProps } from '../base.types'
import { KeywordsField } from '../collections/fields/KeywordsField'
import { withTabPrefix } from './schema'
import type { FieldConfig, TabConfig } from './types'
import { uploadFile } from './upload'

/**
 * The composite field types that resolve to an app-specific component rather
 * than a generic form primitive (same reasoning as `FieldSchemaResolvers` in
 * `schema.ts`), the consumer passes its real `MetaFields`/`BlocksField`/
 * `RelationshipField` in here rather than this file importing them directly,
 * so `baseConfig` stays reusable across a different app's different
 * collections/blocks. `upload` isn't here: every `upload` field is backed by
 * the single `uploadFile` in `./upload.ts` automatically, so no collection
 * ever wires its own upload mechanics again. `keywords` isn't here either:
 * every `keywords` field is backed by the single `KeywordsField`
 * (`collections/fields/KeywordsField`) which wires the shared keyword pool
 * itself.
 *
 * Generic over `TCollectionSlug` so `relationship.targetType` can match the
 * consumer's real `RelationshipField` component (whose `targetType` prop is
 * its own concrete slug union, not a bare `string`), same pattern as
 * `TabConfig<TCollectionSlug, TBlockSlug>`.
 */
export type FieldRenderers<TCollectionSlug extends string = string> = {
	meta?: FC<{ form: any; uploadFolder?: string; id?: string }>
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
		hasMany?: boolean
		minRows?: number
		maxRows?: number
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

	// A static "an admin shouldn't see this at all" flag, distinct from the
	// dedicated `hidden` field *type* below (a value with no UI concept),
	// see `BaseFieldConfig['admin']['hidden']`'s own doc comment. The field
	// still gets a real `form.AppField`/schema entry, so its value survives
	// untouched, it's just never rendered here.
	if (field.admin?.hidden) return null

	const name = prefix ? `${prefix}.${field.name}` : field.name

	// `meta` (as currently implemented) hardcodes its own paths/props rather
	// than taking an arbitrary `name`, it's rendered directly, not wrapped in
	// `form.AppField`.
	if (field.type === 'meta') {
		const Meta = renderers.meta
		return Meta ? (
			<Meta key={name} form={form} uploadFolder={uploadFolder} id={id} />
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
				description={field.admin?.description}
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
				description={field.admin?.description}
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
				description={field.admin?.description}
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
						description={field.admin?.description}
						targetType={field.relationTo}
						excludeId={id}
						hasMany={field.hasMany}
						minRows={field.minRows}
						maxRows={field.maxRows}
					/>
				)}
			</form.AppField>
		)
	}

	// `keywords` is a framework-owned composite now, not a generic primitive:
	// `KeywordsField` wires the shared keyword pool (`useKeywordSuggestions`)
	// into the generic `KeywordsInput`, and renders its own `form.AppField`
	// (it has a real value to bind), so it's dispatched before the generic
	// leaf-field wrapper below, same as `relationship`.
	if (field.type === 'keywords') {
		return <KeywordsField key={name} form={form} name={name} field={field} />
	}

	if (field.type === 'array') {
		return (
			<form.AppField key={name} name={name}>
				{(f: any) => (
					<f.ArrayField
						label={field.label}
						description={field.admin?.description}
					>
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
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
								autoComplete={field.admin?.autoComplete}
								dir={field.admin?.rtl ? 'rtl' : undefined}
							/>
						)
					case 'textarea':
						return (
							<f.Textarea
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
								autoComplete={field.admin?.autoComplete}
								dir={field.admin?.rtl ? 'rtl' : undefined}
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
								description={field.admin?.description}
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
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'switch':
						return (
							<f.Switch
								label={field.label}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'date':
						return (
							<f.DatePicker
								label={field.label}
								description={field.admin?.description}
								placeholder={field.placeholder}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'select':
						return (
							<f.Select
								label={field.label}
								description={field.admin?.description}
								placeholder={field.placeholder}
								options={field.options}
								defaultValue={field.defaultValue as string | undefined}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'combobox':
						return (
							<f.Combobox
								label={field.label}
								description={field.admin?.description}
								placeholder={field.placeholder}
								emptyLabel={field.emptyLabel}
								options={field.options}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'radio':
						return (
							<f.RadioGroup
								label={field.label}
								description={field.admin?.description}
								options={field.options}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'email':
						return (
							<f.Email
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
								autoComplete={field.admin?.autoComplete}
								dir={field.admin?.rtl ? 'rtl' : undefined}
							/>
						)
					case 'number':
						return (
							<f.Number
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								min={field.min}
								max={field.max}
								step={field.step}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'password':
						return (
							<f.Password
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
								autoComplete={field.admin?.autoComplete}
								dir={field.admin?.rtl ? 'rtl' : undefined}
							/>
						)
					case 'confirmPassword':
						return (
							<f.ConfirmPassword
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
								dir={field.admin?.rtl ? 'rtl' : undefined}
							/>
						)
					case 'hidden':
						return (
							<f.Hidden
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'code':
						return (
							<f.Code
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								language={field.language}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'json':
						return (
							<f.JSON
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'slug':
						return (
							<f.Slug
								label={field.label}
								placeholder={field.placeholder}
								description={field.admin?.description}
								required={field.required}
								dir={field.admin?.rtl ? 'rtl' : undefined}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'point':
						return (
							<f.Point
								label={field.label}
								description={field.admin?.description}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
							/>
						)
					case 'upload': {
						const uploadPrefix = [uploadFolder, id, field.prefix]
							.filter(Boolean)
							.join('/')
						return (
							<f.Upload
								label={field.label}
								description={field.admin?.description}
								accept={field.accept}
								required={field.required}
								disabled={field.disabled || field.admin?.readOnly}
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
 * field(s) directly rather than inside `Tabs`. A field with
 * `admin.position === 'sidebar'` is split into a fixed right-hand column
 * (`md:grid-cols-[minmax(0,1fr)_280px]`), everything else stays in the
 * main column; with no sidebar fields this is a plain `md:max-w-lg` stack,
 * byte-for-byte the single-column layout the old hand-written wrappers
 * rendered.
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
		const renderOne = (field: FieldConfig<any, any>, index: number) =>
			renderField(field, form, undefined, id, renderers, uploadFolder, index)

		const sidebar = fields.filter(
			(field) => 'admin' in field && field.admin?.position === 'sidebar'
		)

		if (sidebar.length === 0) {
			return (
				<div className='flex flex-col w-full md:max-w-lg mr-auto'>
					{fields.map(renderOne)}
				</div>
			)
		}

		const main = fields.filter(
			(field) => !('admin' in field) || field.admin?.position !== 'sidebar'
		)

		return (
			<div className='grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_280px]'>
				<div className='flex flex-col w-full md:max-w-lg gap-5'>
					{main.map(renderOne)}
				</div>
				<aside className='flex flex-col gap-5'>{sidebar.map(renderOne)}</aside>
			</div>
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
		const renderTabField = (
			field: FieldConfig<any, any>,
			index: number,
			tab: TabConfig<any, any>
		) => {
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
		}

		const renderTabColumns = (tab: TabConfig<any, any>) => {
			return (
				<>
					{tab.fields.map((field, index) => renderTabField(field, index, tab))}
				</>
			)
		}

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
						{renderTabColumns(tab)}
					</TabsContent>
				))}
			</Tabs>
		)
	}
}
