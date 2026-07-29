import type { BasiccnContent } from '@base/ui/basiccn'
import { Preview } from '@base/ui/basiccn/preview'
import { buttonVariants } from '@base/ui/components/button'
import { IconClick } from '@tabler/icons-react'
import { z } from 'zod'
import { LinksField } from '../fields/links-field'
import { linksSchema, type LinkItemValue } from '../types'
import type { BlockConfig, BlockFieldsProps } from './types'

export const ctaBlockSchema = z.object({
	blockType: z.literal('cta'),
	content: z.custom<BasiccnContent>().optional(),
	links: linksSchema.optional()
})

function CtaBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.content`}>
				{(f: any) => (
					<f.RichText label='Content' placeholder='Write something…' />
				)}
			</form.AppField>
			<LinksField form={form} name={`${path}.links`} />
		</div>
	)
}

/** Same disclosed SSR-hydration-only gap as `richtext.tsx`'s own `RichTextBlockRender` — see that function's own doc comment for the full explanation (tiptap's `Preview` needs a real DOM, so this content is absent from server-rendered HTML until client JS hydrates). */
function CtaBlockRender({ data }: { data: Record<string, unknown> }) {
	const content = data.content as BasiccnContent | undefined
	const links = Array.isArray(data.links) ? (data.links as LinkItemValue[]) : []

	if (!content && links.length === 0) return null

	return (
		<section className='flex flex-col items-center gap-4 py-12 text-center'>
			{content ? <Preview content={content} /> : null}
			{links.length > 0 ? (
				<div className='flex flex-wrap items-center justify-center gap-2'>
					{links.map((link, index) =>
						link.label && link.to ? (
							<a
								key={index}
								href={link.to}
								className={buttonVariants({ variant: link.appearance })}
								target={link.openInNewTab ? '_blank' : undefined}
								rel={link.openInNewTab ? 'noreferrer' : undefined}
							>
								{link.label}
							</a>
						) : null
					)}
				</div>
			) : null}
		</section>
	)
}

export const ctaBlock: BlockConfig = {
	slug: 'cta',
	label: 'Call to action',
	schema: ctaBlockSchema,
	defaultValue: {
		content: undefined,
		links: []
	},
	Fields: CtaBlockFields,
	Render: CtaBlockRender,
	Icon: IconClick
}
