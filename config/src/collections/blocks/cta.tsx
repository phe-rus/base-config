import { buttonVariants } from '@base/ui/components/button'
import { IconClick } from '@tabler/icons-react'
import { z } from 'zod'
import type { BlockConfig, BlockFieldsProps } from './types'

export const ctaBlockSchema = z.object({
	blockType: z.literal('cta'),
	heading: z.string().optional(),
	text: z.string().optional(),
	buttonLabel: z.string().optional(),
	buttonLink: z.string().optional()
})

function CtaBlockFields({ form, path }: BlockFieldsProps) {
	return (
		<div className='flex flex-col gap-3'>
			<form.AppField name={`${path}.heading`}>
				{(f: any) => (
					<f.Input label='Heading' placeholder='Call to action heading' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.text`}>
				{(f: any) => (
					<f.Textarea label='Text' placeholder='Short supporting text' />
				)}
			</form.AppField>
			<form.AppField name={`${path}.buttonLabel`}>
				{(f: any) => <f.Input label='Button label' placeholder='Learn more' />}
			</form.AppField>
			<form.AppField name={`${path}.buttonLink`}>
				{(f: any) => <f.Input label='Button link' placeholder='https://…' />}
			</form.AppField>
		</div>
	)
}

function CtaBlockRender({ data }: { data: Record<string, unknown> }) {
	const heading = typeof data.heading === 'string' ? data.heading : undefined
	const text = typeof data.text === 'string' ? data.text : undefined
	const buttonLabel =
		typeof data.buttonLabel === 'string' ? data.buttonLabel : undefined
	const buttonLink =
		typeof data.buttonLink === 'string' ? data.buttonLink : undefined

	if (!heading && !text && !(buttonLabel && buttonLink)) return null

	return (
		<section className='flex flex-col items-center gap-4 py-12 text-center'>
			{heading ? <h2>{heading}</h2> : null}
			{text ? <p className='text-muted-foreground max-w-xl'>{text}</p> : null}
			{buttonLabel && buttonLink ? (
				<a href={buttonLink} className={buttonVariants()}>
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
		heading: undefined,
		text: undefined,
		buttonLabel: undefined,
		buttonLink: undefined
	},
	Fields: CtaBlockFields,
	Render: CtaBlockRender,
	Icon: IconClick
}
