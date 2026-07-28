import { buttonVariants } from '@base/ui/components/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@base/ui/components/dialog'
import { cn } from '@base/ui/lib/utils'
import { ArrayField } from '@base/ui/forms'
import { IconPlus } from '@tabler/icons-react'
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
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Pick block</DialogTitle>
										<DialogDescription>
											Click a block to add it to the page
										</DialogDescription>
									</DialogHeader>

									<section className='grid grid-cols-2 md:grid-cols-3 gap-3'>
										{slugs.map((slug) => (
											<article
												key={slug}
												onClick={() =>
													add({
														blockType: slug,
														...blocksBySlug[slug].defaultValue
													})
												}
												className={cn(
													'flex flex-col p-4 rounded-md',
													'bg-input hover:bg-input/50 cursor-pointer transition-colors'
												)}
											>
												{blocksBySlug[slug].label}
											</article>
										))}
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
