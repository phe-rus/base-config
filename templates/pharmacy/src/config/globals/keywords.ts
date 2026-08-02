import type { GlobalConfig } from '@baseconfig/core/collections/types'
import { defineGlobal } from '@baseconfig/core'

export const keywords: GlobalConfig = defineGlobal({
	slug: 'keywords',
	label: 'Keywords',
	fields: [
		{
			name: 'keywords',
			type: 'array',
			label: 'Keywords',
			description:
				'The shared pool of keywords available everywhere a Keywords field is used (SEO metadata, related-post keyword filters, …) — typing a new one anywhere adds it here too.',
			fields: [
				{
					name: 'label',
					type: 'text',
					label: 'Keyword',
					placeholder: 'e.g. seo'
				}
			]
		}
	]
})
