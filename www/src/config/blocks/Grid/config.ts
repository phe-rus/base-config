import { defineBlock } from '@baseconfig/core'
import { IconLayoutGrid } from '@tabler/icons-react'

export const gridBlock = defineBlock({
	slug: 'grid',
	label: 'Grid',
	Icon: IconLayoutGrid,
	interfaceName: 'GridBlock',
	fields: [
		{
			name: 'variant',
			type: 'select',
			label: 'Layout',
			description: 'How each item is wrapped when this grid renders publicly.',
			defaultValue: 'default',
			options: [
				{ label: 'Default', value: 'default' },
				{ label: 'Card', value: 'card' },
				{ label: 'Bordered', value: 'bordered' }
			]
		},
		{
			name: 'items',
			type: 'blocks',
			label: 'Items',
			description: 'Any block goes here, each one lays out as one grid cell.',
			// The nesting cap the old hand-written `Fields.tsx` hardcoded as
			// `exclude={['grid']}`; a `blocks` field's `exclude` is a
			// renderer-only restriction (BlocksField ANDs it with the field's
			// `blocks` allow-list) so a grid can never hold another grid.
			exclude: ['grid']
		}
	]
})
