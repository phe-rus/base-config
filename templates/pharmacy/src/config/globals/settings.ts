import type { GlobalConfig } from '@baseconfig/core/collections/types'
import { defineGlobal } from '@baseconfig/core'

export const settings: GlobalConfig = defineGlobal({
	slug: 'settings',
	label: 'Settings',
	fields: [
		{
			name: 'siteName',
			type: 'text',
			label: 'Site name'
		}
	]
})
