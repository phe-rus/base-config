import { Button } from '@baseconfig/ui/components/button'
import { ArrayField } from '@baseconfig/ui/forms'
import { IconPlus } from '@tabler/icons-react'
import { collectionsBySlug } from '../../registry'
import {
	appearanceValues,
	collectionPath,
	type CollectionSlug
} from '../../types'
import { RelationshipField, type RelationshipSelection } from '../Relationship'

const APPEARANCE_OPTIONS = appearanceValues.map((value) => ({
	label: value[0].toUpperCase() + value.slice(1),
	value
}))

export type LinkModeFieldsProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts`, same reasoning applies here. */
	form: any
	/** The dotted path to this link's own mode/target value (`linkValueSchema` in `../types.ts`), never the label/appearance, which a caller (`LinksField` below, or `NavMenuField`'s own per-item fields) renders separately alongside this. */
	name: string
	/** Restrict the "Reference" mode's picker to one or more collections, omit to search every collection this app has registered. Forwarded straight to `RelationshipField`'s own `targetType`. */
	relationTo?: CollectionSlug | CollectionSlug[]
}

/**
 * A link's own mode (reference vs custom URL) + `to` + "open in new tab":
 * pick an existing document (reference, auto-synced into a real `to` path
 * via `collectionPath()`) or type a custom URL. Deliberately excludes
 * `label`/`appearance`, those are a *link item*'s own fields (see
 * `LinksField` below), not part of the link's mode/target itself, and
 * `NavMenuField`'s own items already have their own separate label/
 * appearance fields (`nav-menu-field.tsx`'s `NavItemFields`), this is the
 * one piece shared between both callers.
 */
export function LinkModeFields({
	form,
	name,
	relationTo
}: LinkModeFieldsProps) {
	return (
		<form.AppField name={`${name}.mode`}>
			{(f: any) => (
				<div className='flex flex-col gap-3'>
					<f.RadioGroup
						label='Link type'
						options={[
							{ label: 'Reference', value: 'internal' },
							{ label: 'Custom URL', value: 'custom' }
						]}
					/>
					{f.state.value === 'custom' ? (
						<form.AppField name={`${name}.to`}>
							{(tf: any) => <tf.Input label='URL' placeholder='https://…' />}
						</form.AppField>
					) : (
						<>
							<form.AppField name={`${name}.reference`}>
								{() => (
									<RelationshipField
										label='Reference'
										targetType={relationTo}
										onValueChange={(value: RelationshipSelection | undefined) =>
											form.setFieldValue(
												`${name}.to`,
												value
													? collectionPath(
															collectionsBySlug[value.collection],
															value.slug
														)
													: ''
											)
										}
									/>
								)}
							</form.AppField>
							<form.AppField name={`${name}.to`}>
								{(tf: any) => (
									<tf.Input label='Resolved URL' placeholder='/slug' disabled />
								)}
							</form.AppField>
						</>
					)}
					<form.AppField name={`${name}.openInNewTab`}>
						{(of: any) => <of.Checkbox label='Open in new tab' />}
					</form.AppField>
				</div>
			)}
		</form.AppField>
	)
}

export type LinksFieldProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts`, same reasoning applies here. */
	form: any
	name: string
	label?: string
	description?: string
	/** Restrict every item's "Reference" mode to one or more collections, omit to search every collection this app has registered. */
	relationTo?: CollectionSlug | CollectionSlug[]
}

/**
 * A list of links, each its own `label` + button `appearance` (the real
 * shadcn `Button` variants, `appearanceValues`) alongside `LinkModeFields`'
 * own mode/target/open-in-new-tab. No mega-menu option at all (that's
 * `NavMenuField`'s own extra complexity, this is a plain array, nothing
 * more), deliberately narrower, for a block (`cta`/`banner`) that wants
 * several independently-styled buttons instead of one. The real logic
 * behind `type: 'links'` (`fields/types.ts`'s `LinksFieldConfig`,
 * dispatched via `fields/renderer.tsx`), also reused directly by blocks
 * that call it without going through the generic per-field-type renderer
 * (`cta.tsx`/`banner.tsx`, the same "a block reuses a composite field
 * component directly" pattern the framework's own `RelationshipField`/
 * `BlocksField` use). `ArrayField`'s own default row
 * label (`item?.label ?? ...`, `@baseconfig/ui`'s `Array/index.tsx`) already
 * works here for free, every item genuinely has a real `label`.
 */
export function LinksField({
	form,
	name,
	label = 'Links',
	description,
	relationTo
}: LinksFieldProps) {
	return (
		<form.AppField name={name}>
			{() => (
				<ArrayField
					label={label}
					description={description}
					renderAdd={(add: (item: Record<string, any>) => void) => (
						<Button
							type='button'
							variant='secondary'
							size='sm'
							onClick={() =>
								add({ label: '', appearance: 'default', mode: 'internal' })
							}
						>
							<IconPlus className='size-3.5' />
							Add link
						</Button>
					)}
				>
					{({ path }: { path: string }) => (
						<div className='flex flex-col gap-3'>
							<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
								<form.AppField name={`${path}.label`}>
									{(f: any) => (
										<f.Input label='Label' placeholder='Learn more' />
									)}
								</form.AppField>
								<form.AppField name={`${path}.appearance`}>
									{(f: any) => (
										<f.Select
											label='Appearance'
											options={APPEARANCE_OPTIONS}
											defaultValue='default'
										/>
									)}
								</form.AppField>
							</div>
							<LinkModeFields form={form} name={path} relationTo={relationTo} />
						</div>
					)}
				</ArrayField>
			)}
		</form.AppField>
	)
}
