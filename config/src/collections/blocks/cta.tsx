import type { BasiccnContent } from '@base/ui/basiccn'
import { Preview } from '@base/ui/basiccn/preview'
import { buttonVariants } from '@base/ui/components/button'
import { IconClick } from '@tabler/icons-react'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const ctaBlockSchema = z.object({
	blockType: z.literal('cta'),
	content: z.custom<BasiccnContent>().optional(),
	buttonLabel: z.string().optional(),
	link: z.string().optional()
})

function CtaBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.content`}>
				{(f: any) => (
					<f.RichText label='Content' placeholder='Write something…' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.buttonLabel`}>
				{(f: any) => <f.Input label='Button label' placeholder='Learn more' />}
			</form.AppField>
			<form.AppField name={`${path}.link`}>
				{(f: any) => <f.Input label='Link' placeholder='https://…' />}
			</form.AppField>
		</div>
	)
}

/** Same disclosed SSR-hydration-only gap as `richtext.tsx`'s own `RichTextBlockRender` — see that function's own doc comment for the full explanation (tiptap's `Preview` needs a real DOM, so this content is absent from server-rendered HTML until client JS hydrates). */
function CtaBlockRender({ data }: { data: Record<string, unknown> }) {
	const content = data.content as BasiccnContent | undefined
	const buttonLabel =
		typeof data.buttonLabel === 'string' ? data.buttonLabel : undefined
	const link = typeof data.link === 'string' ? data.link : undefined

	if (!content && !(buttonLabel && link)) return null

	return (
		<section className='flex flex-col items-center gap-4 py-12 text-center'>
			{content ? <Preview content={content} /> : null}
			{buttonLabel && link ? (
				<a href={link} className={buttonVariants()}>
					{buttonLabel}
				</a>
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
		buttonLabel: undefined,
		link: undefined
	},
	Fields: CtaBlockFields,
	Render: CtaBlockRender,
	Icon: IconClick
}
