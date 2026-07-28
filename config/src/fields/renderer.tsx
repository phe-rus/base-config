import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@base/ui/components/tabs'
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
 * `schema.ts`) — the consumer passes its real `MetaFields`/`RelationsField`/
 * `BlocksField`/`RelationshipField` in here rather than this file importing
 * them directly, so `baseConfig` stays reusable across a different app's
 * different collections/blocks. `upload` isn't here — every `upload` field is
 * backed by the single `uploadFile` in `./upload.ts` automatically, so no
 * collection ever wires its own upload mechanics again.
 *
 * Generic over `TCollectionSlug` so `relationship.targetType` can match the
 * consumer's real `RelationshipField` component (whose `targetType` prop is
 * its own concrete slug union, not a bare `string`) — same pattern as
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
	}>
	relationship?: FC<{
		label?: string
		description?: string
		targetType?: TCollectionSlug
		excludeId?: string
	}>
	menu?: FC<{
		form: any
		name: string
		label?: string
		description?: string
		startAsMegaMenu?: boolean
	}>
}

function renderField(
	field: FieldConfig<any, any>,
	form: any,
	prefix: string | undefined,
	id: string,
	renderers: FieldRenderers<any>,
	/**
	 * The owning collection/global's own `slug` — every one gets its own
	 * storage folder automatically. An `upload` field's own `prefix` (see
	 * `UploadFieldConfig`) nests under it, after the document's own `id` —
	 * e.g. `pages/<id>/<prefix>/<filename>` — so two different documents'
	 * uploads never collide on filename.
	 */
	uploadFolder?: string
) {
	const name = prefix ? `${prefix}.${field.name}` : field.name

	// `meta`/`relations` (as currently implemented) hardcode their own
	// paths/props rather than taking an arbitrary `name` — they're rendered
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
						targetType={
							Array.isArray(field.relationTo) ? undefined : field.relationTo
						}
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
								{field.fields.map((childField) =>
									renderField(
										childField,
										form,
										path,
										id,
										renderers,
										uploadFolder
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
					case 'richtext':
						return (
							<f.RichText
								label={field.label}
								placeholder={field.placeholder}
								description={field.description}
								required={field.required}
							/>
						)
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
 * chrome at all — for globals (`footer`, `topbar`), which render their
 * field(s) directly rather than inside `Tabs`.
 */
export function createFlatFieldsRenderer<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
>(
	fields: FieldConfig<TCollectionSlug, TBlockSlug>[],
	renderers: FieldRenderers<TCollectionSlug> = {},
	/** The owning global's own `slug` — see `renderField`'s `uploadFolder` param. */
	uploadFolder?: string
): FC<CollectionFieldsProps> {
	return function GeneratedFlatFields({ form, id }: CollectionFieldsProps) {
		return (
			<>
				{fields.map((field) =>
					renderField(field, form, undefined, id, renderers, uploadFolder)
				)}
			</>
		)
	}
}

/**
 * Turns a declarative `TabConfig[]` into a real `Fields` component — the
 * same `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` chrome every collection
 * uses, dispatching each field by type. Each field's `name` is written
 * relative to its own tab (see `withTabPrefix`) — `tab: 'post'` with a field
 * named `'content'` resolves to the real path `post.content`.
 */
export function createFieldsRenderer<
	TCollectionSlug extends string = string,
	TBlockSlug extends string = string
>(
	tabs: TabConfig<TCollectionSlug, TBlockSlug>[],
	renderers: FieldRenderers<TCollectionSlug> = {},
	/** The owning collection's own `slug` — see `renderField`'s `uploadFolder` param. */
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
						{tab.fields.map((field) =>
							renderField(
								{
									...field,
									name: withTabPrefix(tab.tab, field.name, tab.flat)
								},
								form,
								undefined,
								id,
								renderers,
								uploadFolder
							)
						)}
					</TabsContent>
				))}
			</Tabs>
		)
	}
}
