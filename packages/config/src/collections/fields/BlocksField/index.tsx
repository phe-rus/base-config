import { buttonVariants } from '@baseconfig/ui/components/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@baseconfig/ui/components/dialog'
import { ArrayField } from '@baseconfig/ui/forms'
import { cn } from '@baseconfig/ui/lib/utils'
import { IconBox, IconPlus } from '@tabler/icons-react'
import { blocksBySlug } from '../../blocks'

type BlocksFieldProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts`, same reasoning applies here. */
	form: any
	name: string
	label?: string
	description?: string
	/** Block slugs to omit from the "Add block" menu, used by `grid.tsx` to cap itself at one level of nesting. */
	exclude?: string[]
	/**
	 * The field's own allow-list, `BlocksFieldConfig['blocks']`, forwarded by
	 * the generic `case 'blocks'` renderer (`fields/renderer.tsx`). When set,
	 * only these registered slugs show in the "Pick block" menu; `undefined`
	 * (or an empty array) means every registered block. The same restriction
	 * is enforced schema-side (`getBlocksSchema(slugs)`, unknown slugs throw)
	 * and in the generated types; this prop is the picker half of it.
	 */
	blocks?: string[]
	/** See `BlockFieldsProps`' own doc comment (`../../blocks/shared/types.ts`), passed straight through to every block's own `Fields`. */
	uploadFolder?: string
	id?: string
	/** Fewest/most block instances allowed, Payload's `minRows`/`maxRows`. Schema-side validation, see `fields/schema.ts`'s `case 'blocks'`; the UI reflects `maxRows` as a live count plus a disabled "Add block" button. */
	minRows?: number
	maxRows?: number
}

export function BlocksField({
	form,
	name,
	label,
	description,
	exclude = [],
	blocks,
	uploadFolder,
	id,
	minRows,
	maxRows
}: BlocksFieldProps) {
	const slugs = Object.keys(blocksBySlug).filter(
		(slug) =>
			!exclude.includes(slug) &&
			(!blocks || blocks.length === 0 || blocks.includes(slug))
	)

	// `BlockConfig['group']`: the "Pick block" dialog is one section per
	// distinct group, ungrouped blocks first with no heading, instead of one
	// flat grid. `Map` keyed on the group so iteration order is insertion
	// order and `undefined` (ungrouped) sorts naturally first.
	const grouped = new Map<string | undefined, string[]>()
	for (const slug of slugs) {
		const key = blocksBySlug[slug].group
		grouped.set(key, [...(grouped.get(key) ?? []), slug])
	}

	return (
		<form.AppField name={name}>
			{(field: any) => {
				const count = Array.isArray(field.state.value)
					? field.state.value.length
					: 0
				const maxed = typeof maxRows === 'number' && count >= maxRows
				return (
					<ArrayField
						label={label}
						description={description}
						// The "Add <label>" row is a bottom-of-stack action, not a
						// top-of-field one, Payload's own placement.
						addAtBottom
						renderItemHeader={({ path, index, item }) => {
							const block = blocksBySlug[item?.blockType as string]
							if (!block) return null
							return (
								<div className='flex min-w-0 items-center gap-2'>
									<span className='font-mono text-xs! tabular-nums'>
										{String(index + 1).padStart(2, '0')}
									</span>
									<span
										className={cn(
											'font-mono text-[8px]!',
											'bg-card rounded p-1'
										)}
									>
										{block.slug}
									</span>
									{!block.disableBlockName ? (
										// The per-instance block name, edited in
										// place: a transparent, headline-styled
										// input in the collapsed header (same
										// invisible chrome as a document's title
										// input in `collection-form.tsx`), so the
										// block's own `fields` fill the expanded
										// body and never repeat a "Block name"
										// field.
										<form.AppField name={`${path}.blockName`}>
											{(f: any) => (
												<input
													type='text'
													name={f.name}
													aria-label='Block name'
													value={f.state.value ?? ''}
													placeholder='Block header'
													onChange={(e) => f.handleChange(e.target.value)}
													onMouseDown={(e) => e.stopPropagation()}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'min-w-0 flex-1 bg-transparent border-0 outline-0',
														'text-xs font-semibold placeholder:text-muted-foreground/60',
														'field-sizing-content min-w-12 resize-none whitespace-pre-wrap'
													)}
												/>
											)}
										</form.AppField>
									) : null}
								</div>
							)
						}}
						renderAdd={(add) => (
							<div className='flex flex-col gap-1'>
								<Dialog>
									<DialogTrigger
										disabled={maxed}
										className={cn(
											'w-fit! bg-transparent! shadow-none!',
											'flex items-center gap-1'
										)}
									>
										<div
											className={buttonVariants({
												size: 'icon-xs',
												variant: 'secondary',
												className: 'rounded-full!'
											})}
										>
											<IconPlus />
										</div>
										Add {label ?? name}
									</DialogTrigger>
									<DialogContent className='sm:max-w-lg'>
										<DialogHeader>
											<DialogTitle>Pick block</DialogTitle>
											<DialogDescription>
												Click a block to add it to the page
												{blocks && blocks.length > 0
													? ` (this field allows: ${blocks.join(', ')})`
													: null}
											</DialogDescription>
										</DialogHeader>

										{grouped.size === 0 ? (
											<p className='text-muted-foreground text-xs'>
												{blocks && blocks.length > 0
													? `None of the blocks this field allows (${blocks.join(', ')}) are registered.`
													: 'No blocks available.'}
											</p>
										) : (
											[...grouped.entries()].map(([group, groupSlugs]) => (
												<div
													key={group ?? '__ungrouped'}
													className='flex flex-col gap-2'
												>
													{group ? (
														<h3 className='text-xs font-semibold text-muted-foreground'>
															{group}
														</h3>
													) : null}
													<section className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
														{groupSlugs.map((slug) => {
															const block = blocksBySlug[slug]
															const Icon = block.Icon ?? IconBox
															return (
																<DialogClose
																	key={slug}
																	onClick={() =>
																		add({
																			blockType: slug,
																			...block.defaultValue
																		})
																	}
																	className={cn(
																		'flex flex-col items-center gap-2 rounded-md p-3',
																		'border border-dashed bg-input/20',
																		'hover:bg-input/50 cursor-pointer transition-colors'
																	)}
																>
																	<span className='flex size-10 items-center justify-center rounded-md bg-input text-muted-foreground'>
																		<Icon className='size-5' />
																	</span>
																	<span className='text-center text-xs font-medium'>
																		{block.label}
																	</span>
																</DialogClose>
															)
														})}
													</section>
												</div>
											))
										)}
									</DialogContent>
								</Dialog>
								{minRows !== undefined && count < minRows ? (
									<p className='text-muted-foreground text-xs'>
										Minimum {minRows} block{minRows === 1 ? '' : 's'} ({count}{' '}
										so far).
									</p>
								) : maxed ? (
									<p className='text-muted-foreground text-xs'>
										Maximum {maxRows} block{maxRows === 1 ? '' : 's'} reached.
									</p>
								) : null}
							</div>
						)}
					>
						{({ path, value }) => {
							const block = blocksBySlug[value?.blockType as string]
							if (!block) {
								return (
									<p className='text-muted-foreground text-xs'>
										Unknown block type "{value?.blockType}".
									</p>
								)
							}
							return (
								<div className='flex flex-col gap-3'>
									<block.Fields
										form={form}
										path={path}
										uploadFolder={uploadFolder}
										id={id}
									/>
								</div>
							)
						}}
					</ArrayField>
				)
			}}
		</form.AppField>
	)
}
