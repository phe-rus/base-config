import {
	IconBlockquote,
	IconCode,
	IconH1,
	IconH2,
	IconH3,
	IconLink,
	IconList,
	IconListCheck,
	IconListDetails,
	IconMinus,
	IconPhoto,
	IconTable,
	IconTextPlus,
	type Icon
} from '@tabler/icons-react'
import type { Editor } from '@tiptap/react'

export interface CommandItem {
	id: string
	label: string
	icon: Icon
	group: string
	keywords?: string[]
	run: (editor: Editor) => void
}

/**
 * The single source of truth for "things you can insert": both the slash
 * command menu (`plugins/slash.ts`) and the add-block button next to the
 * drag handle read from this list, so a new insertable thing is defined
 * once, not once per menu.
 */
export const commands: CommandItem[] = [
	{
		id: 'paragraph',
		label: 'Text',
		icon: IconTextPlus,
		group: 'Basic',
		keywords: ['paragraph', 'text'],
		run: (editor) => editor.chain().focus().setParagraph().run()
	},
	{
		id: 'heading-1',
		label: 'Heading 1',
		icon: IconH1,
		group: 'Basic',
		keywords: ['h1', 'title'],
		run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
	},
	{
		id: 'heading-2',
		label: 'Heading 2',
		icon: IconH2,
		group: 'Basic',
		keywords: ['h2', 'subtitle'],
		run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
	},
	{
		id: 'heading-3',
		label: 'Heading 3',
		icon: IconH3,
		group: 'Basic',
		keywords: ['h3'],
		run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
	},
	{
		id: 'bullet-list',
		label: 'Bullet list',
		icon: IconList,
		group: 'Lists',
		keywords: ['ul', 'unordered'],
		run: (editor) => editor.chain().focus().toggleBulletList().run()
	},
	{
		id: 'ordered-list',
		label: 'Ordered list',
		icon: IconListDetails,
		group: 'Lists',
		keywords: ['ol', 'numbered'],
		run: (editor) => editor.chain().focus().toggleOrderedList().run()
	},
	{
		id: 'task-list',
		label: 'Task list',
		icon: IconListCheck,
		group: 'Lists',
		keywords: ['todo', 'checkbox'],
		run: (editor) => editor.chain().focus().toggleTaskList().run()
	},
	{
		id: 'blockquote',
		label: 'Blockquote',
		icon: IconBlockquote,
		group: 'Basic',
		keywords: ['quote'],
		run: (editor) => editor.chain().focus().toggleBlockquote().run()
	},
	{
		id: 'code-block',
		label: 'Code block',
		icon: IconCode,
		group: 'Basic',
		keywords: ['code', 'codeblock'],
		run: (editor) => editor.chain().focus().toggleCodeBlock().run()
	},
	{
		id: 'image',
		label: 'Image',
		icon: IconPhoto,
		group: 'Utilities',
		keywords: ['picture', 'photo', 'img'],
		run: (editor) =>
			editor
				.chain()
				.focus()
				.insertContent({ type: 'image', attrs: { src: '' } })
				.run()
	},
	{
		id: 'table',
		label: 'Table',
		icon: IconTable,
		group: 'Utilities',
		keywords: ['grid', 'table'],
		run: (editor) =>
			editor
				.chain()
				.focus()
				.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
				.run()
	},
	{
		id: 'link',
		label: 'Link',
		icon: IconLink,
		group: 'Utilities',
		keywords: ['url', 'href', 'anchor'],
		run: (editor) => {
			const href = window.prompt('URL')
			if (!href) return
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'text',
					text: href,
					marks: [{ type: 'link', attrs: { href } }]
				})
				.run()
		}
	},
	{
		id: 'horizontal-rule',
		label: 'Divider',
		icon: IconMinus,
		group: 'Utilities',
		keywords: ['hr', 'rule', 'separator'],
		run: (editor) => editor.chain().focus().setHorizontalRule().run()
	}
]

export function filterCommands(query: string): CommandItem[] {
	const trimmed = query.trim().toLowerCase()
	if (!trimmed) return commands
	return commands.filter((item) => {
		const haystack = [item.label, item.id, ...(item.keywords ?? [])]
			.join(' ')
			.toLowerCase()
		return haystack.includes(trimmed)
	})
}

export interface CommandGroup {
	group: string
	items: CommandItem[]
}

export function groupCommands(items: CommandItem[]): CommandGroup[] {
	const groups: CommandGroup[] = []
	for (const item of items) {
		let bucket = groups.find((candidate) => candidate.group === item.group)
		if (!bucket) {
			bucket = { group: item.group, items: [] }
			groups.push(bucket)
		}
		bucket.items.push(item)
	}
	return groups
}
