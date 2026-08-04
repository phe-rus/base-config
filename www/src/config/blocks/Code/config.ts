import { defineBlock } from '@baseconfig/core'
import { IconCode } from '@tabler/icons-react'
import { CodeBlockFields } from './Fields'

const codeLanguages = [
	{ label: 'TypeScript', value: 'ts' },
	{ label: 'TSX', value: 'tsx' },
	{ label: 'JavaScript', value: 'js' },
	{ label: 'JSX', value: 'jsx' },
	{ label: 'JSON', value: 'json' }
]

export const codeBlock = defineBlock({
	slug: 'code',
	label: 'Code',
	interfaceName: 'CodeBlock',
	fields: [
		{
			name: 'language',
			type: 'select',
			label: 'Language',
			defaultValue: 'ts',
			options: codeLanguages
		},
		{ name: 'code', type: 'code', label: 'Code' }
	],
	Fields: CodeBlockFields,
	Icon: IconCode
})
