import { Button } from '@pherus/ui/button'
import { cn } from '@pherus/ui/lib/utils'
import { ArrayField } from '@base/ui/forms'
import { IconPlus } from '@tabler/icons-react'
import { appearanceValues, collectionPath } from '../types'
import { collectionsBySlug } from '../registry'
import { RelationshipField, type RelationshipValue } from './relationship-field'

const APPEARANCE_OPTIONS = appearanceValues.map((value) => ({
	label: value[0].toUpperCase() + value.slice(1),
	value
}))

type NavMenuFieldProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts` — same reasoning applies here. */
	form: any
	name: string
	label?: string
	description?: string
	/** New items start flagged as a mega menu (grouped columns) instead of a plain link — e.g. the footer, which is always column groups. */
	startAsMegaMenu?: boolean
}

function newItem(startAsMegaMenu?: boolean) {
	return {
		label: '',
		appearance: 'default',
		mode: 'internal',
		isMegaMenu: !!startAsMegaMenu,
		category: true
	}
}

/**
 * A navigation menu — every item is a link by default (reference an existing
 * page/post/policy, or a hand-typed URL), and can be flagged "Mega menu"
 * instead, which trades the link fields for either grouped columns (default)
 * or one flat list. Dispatched by the generic renderer for a `type: 'menu'`
 * field (see `renderer.tsx`) — a collection/global author never imports this
 * directly, just declares `{name, type: 'menu', label, description,
 * startAsMegaMenu?}` in its `fields` array (see
 * `hooks/config/globals/topbar.ts`/`footer.ts`).
 */
export function NavMenuField({
	form,
	name,
	label = 'Navigation items',
	description = 'A link by default (reference a page/post/policy, or a custom URL) — flag "Mega menu" to turn it into a dropdown instead.',
	startAsMegaMenu
}: NavMenuFieldProps) {
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
							onClick={() => add(newItem(startAsMegaMenu))}
						>
							<IconPlus className='size-3.5' />
							Add item
						</Button>
					)}
				>
					{({ path }: { path: string }) => (
						<NavItemFields form={form} path={path} />
					)}
				</ArrayField>
			)}
		</form.AppField>
	)
}

function NavItemFields({ form, path }: { form: any; path: string }) {
	return (
		<div className='flex flex-col gap-3'>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
				<form.AppField name={`${path}.label`}>
					{(f: any) => <f.Input label='Label' placeholder='About' />}
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

			<form.AppField name={`${path}.isMegaMenu`}>
				{(f: any) => (
					<>
						<f.Checkbox label='Mega menu' />
						{f.state.value ? (
							<MegaMenuFields form={form} path={path} />
						) : (
							<NavLinkModeFields form={form} path={path} />
						)}
					</>
				)}
			</form.AppField>
		</div>
	)
}

/** The link's own mode (reference vs custom URL) + `to` + "open in new tab" — reused for a top-level link item and for every link inside a mega menu's flat list/columns. When `disabled`, `to` still renders but can't be edited, and the mode/reference/open-in-new-tab controls are hidden entirely (a mega menu item has no link of its own). */
function NavLinkModeFields({
	form,
	path,
	disabled
}: {
	form: any
	path: string
	disabled?: boolean
}) {
	if (disabled) {
		return (
			<form.AppField name={`${path}.to`}>
				{(f: any) => <f.Input label='To' placeholder='https://…' disabled />}
			</form.AppField>
		)
	}

	return (
		<form.AppField name={`${path}.mode`}>
			{(f: any) => (
				<>
					<f.RadioGroup
						label='Link type'
						options={[
							{ label: 'Reference', value: 'internal' },
							{ label: 'Custom URL', value: 'custom' }
						]}
					/>
					{f.state.value === 'custom' ? (
						<form.AppField name={`${path}.to`}>
							{(tf: any) => <tf.Input label='To' placeholder='https://…' />}
						</form.AppField>
					) : (
						<>
							<form.AppField name={`${path}.reference`}>
								{() => (
									<RelationshipField
										label='Reference'
										onValueChange={(value: RelationshipValue | undefined) =>
											form.setFieldValue(
												`${path}.to`,
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
							<form.AppField name={`${path}.to`}>
								{(tf: any) => (
									<tf.Input label='To' placeholder='/slug' disabled />
								)}
							</form.AppField>
						</>
					)}
					<form.AppField name={`${path}.openInNewTab`}>
						{(of: any) => <of.Checkbox label='Open in new tab' />}
					</form.AppField>
				</>
			)}
		</form.AppField>
	)
}

/** One link entry inside a mega menu's flat list or a column's list — same fields as a top-level link (minus appearance/mega-menu, which only apply at the item level). */
function NavMenuLinkFields({ form, path }: { form: any; path: string }) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.label`}>
				{(f: any) => <f.Input label='Label' placeholder='About' />}
			</form.AppField>
			<NavLinkModeFields form={form} path={path} />
		</div>
	)
}

/** A mega menu item's own body — the link fields are irrelevant here (`to` stays visible but disabled), so this only ever shows the category toggle and either grouped columns or one flat list. */
function MegaMenuFields({ form, path }: { form: any; path: string }) {
	return (
		<>
			<NavLinkModeFields form={form} path={path} disabled />
			<form.AppField name={`${path}.category`}>
				{(f: any) => (
					<>
						<f.Checkbox label='Category' />
						{f.state.value === false ? (
							<form.AppField name={`${path}.links`}>
								{(lf: any) => (
									<lf.ArrayField label='Menu items'>
										{({ path: linkPath }: { path: string }) => (
											<NavMenuLinkFields form={form} path={linkPath} />
										)}
									</lf.ArrayField>
								)}
							</form.AppField>
						) : (
							<form.AppField name={`${path}.columns`}>
								{(cf: any) => (
									<cf.ArrayField label='Columns'>
										{({ path: columnPath }: { path: string }) => (
											<div
												className={cn(
													'flex flex-col gap-3 pl-3',
													'border-l border-dashed'
												)}
											>
												<form.AppField name={`${columnPath}.title`}>
													{(tf: any) => (
														<tf.Input
															label='Column title'
															placeholder='Company'
														/>
													)}
												</form.AppField>
												<form.AppField name={`${columnPath}.links`}>
													{(clf: any) => (
														<clf.ArrayField label='Menu items'>
															{({ path: linkPath }: { path: string }) => (
																<NavMenuLinkFields
																	form={form}
																	path={linkPath}
																/>
															)}
														</clf.ArrayField>
													)}
												</form.AppField>
											</div>
										)}
									</cf.ArrayField>
								)}
							</form.AppField>
						)}
					</>
				)}
			</form.AppField>
		</>
	)
}
