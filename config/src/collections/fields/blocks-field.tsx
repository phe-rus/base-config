import { buttonVariants } from '@base/ui/components/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@base/ui/components/dialog'
import { ArrayField } from '@base/ui/forms'
import { cn } from '@base/ui/lib/utils'
import { IconBox, IconPlus } from '@tabler/icons-react'
import { blocksBySlug } from '../blocks'

type BlocksFieldProps = {
	/** See the note on `CollectionFieldsProps['form']` in `../types.ts` — same reasoning applies here. */
	form: any
	name: string
	label?: string
	description?: string
	/** Block slugs to omit from the "Add block" menu — used to cap `columns` at one level of nesting. */
	exclude?: string[]
}

export function BlocksField({
	form,
	name,
	label,
	description,
	exclude = []
}: BlocksFieldProps) {
	const slugs = Object.keys(blocksBySlug).filter(
		(slug) => !exclude.includes(slug)
	)

	return (
		<form.AppField name={name}>
			{() => (
				<ArrayField
					label={label}
					description={description}
					getItemLabel={(item) =>
						blocksBySlug[item?.blockType as string]?.label ?? 'Unknown block'
					}
					renderAdd={(add) => (
						<>
							<Dialog>
								<DialogTrigger
									className={cn(
										buttonVariants({
											size: 'default',
											variant: 'outline',
											className: 'justify-start border-dashed py-1!'
										})
									)}
								>
									<IconPlus />
									Add block
								</DialogTrigger>
								<DialogContent className='sm:max-w-lg'>
									<DialogHeader>
										<DialogTitle>Pick block</DialogTitle>
										<DialogDescription>
											Click a block to add it to the page
										</DialogDescription>
									</DialogHeader>

									<section className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
										{slugs.map((slug) => {
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
														'flex flex-col items-center gap-2 rounded-md p-4',
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
								</DialogContent>
							</Dialog>
						</>
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
						return <block.Fields form={form} path={path} />
					}}
				</ArrayField>
			)}
		</form.AppField>
	)
}
