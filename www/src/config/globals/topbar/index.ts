import type { GlobalConfig } from '@baseconfig/core/collections/types'
import { defineGlobal } from '@baseconfig/core'
import { revalidateTopbar } from './hooks/revalidate'

export const topbar: GlobalConfig = defineGlobal({
	slug: 'topbar',
	label: 'Top bar',
	fields: [
		{
			name: 'items',
			type: 'menu',
			label: 'Navigation items',
			relationTo: ['pages', 'docs'],
			admin: {
				description:
					'Simple links, a single dropdown list, or a full multi-column mega menu.'
			}
		}
	],
	hooks: {
		afterChange: [revalidateTopbar]
	}
})
